"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { canManageFranquias } from "@/lib/rbac";
import type { ActionState } from "./action-state";

const schema = z.object({
  franquiaId: z.string().min(1),
  profitId: z.string().min(1, "Selecione o novo Profit responsável"),
});

export async function trocarProfitResponsavel(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = schema.safeParse({
    franquiaId: formData.get("franquiaId"),
    profitId: formData.get("profitId"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const usuario = await getCurrentUser();
  if (canManageFranquias(usuario) === "none") {
    return { ok: false, message: "Acesso negado." };
  }

  const { franquiaId, profitId } = parsed.data;

  const vinculoAtual = await db.franquiaProfitHistorico.findFirst({
    where: { franquiaId, ativo: true },
    include: { profit: true },
  });

  if (vinculoAtual?.profitId === profitId) {
    return { ok: false, message: "Este Profit já é o responsável por esta franquia." };
  }

  // Sequential on purpose — see comment in src/app/franquias/page.tsx.
  const franquia = await db.franquia.findUniqueOrThrow({ where: { id: franquiaId } });
  const novoProfit = await db.profit.findUniqueOrThrow({ where: { id: profitId } });

  const agora = new Date();

  await db.$transaction(async (tx) => {
    if (vinculoAtual) {
      await tx.franquiaProfitHistorico.update({
        where: { id: vinculoAtual.id },
        data: { ativo: false, dataFim: agora },
      });
    }

    await tx.franquiaProfitHistorico.create({
      data: { franquiaId, profitId, dataInicio: agora, ativo: true },
    });

    const clientesAtivos = await tx.clienteCarteira.findMany({
      where: { franquiaId, ativo: true },
      select: { clienteId: true },
    });

    if (clientesAtivos.length > 0) {
      await tx.evento.createMany({
        data: clientesAtivos.map((c) => ({
          clienteId: c.clienteId,
          tipoEvento: "ALTERACAO_PROFIT" as const,
          dataEvento: agora,
          observacao: `Profit responsável pela franquia ${franquia.nome} alterado de ${
            vinculoAtual?.profit.nome ?? "(sem responsável)"
          } para ${novoProfit.nome}.`,
          usuarioResponsavelId: usuario.id,
        })),
      });
    }
  });

  revalidatePath("/franquias");
  revalidatePath("/eventos");
  return { ok: true, message: "Profit responsável atualizado." };
}
