"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { canAccessNpsScreen } from "@/lib/rbac";
import type { ActionState } from "./action-state";
import { optionalText } from "./zod-helpers";

const escala = z.coerce.number().int().min(1).max(10);

const npsRespostaSchema = z.object({
  nomeEmpresa: z.string().trim().min(1, "Informe o nome da empresa"),
  whatsapp: z.string().trim().min(8, "Informe um WhatsApp válido"),
  nps: escala,
  npsComentario: optionalText(z.string()),
  csatAtendimento: escala,
  csatResultado: escala,
  csatEntregas: escala,
  csatComentario: optionalText(z.string()),
  cevSeguranca: escala,
  cevValorizacao: escala,
  cesFacilidade: escala,
  cesComentario: optionalText(z.string()),
  perguntaFinal: optionalText(z.string()),
});

/**
 * Ação pública — chamada pelo formulário em /nps/[franquiaId], sem sessão
 * autenticada. Nunca chama getCurrentUser() aqui.
 */
export async function submeterNpsResposta(
  franquiaId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const franquia = await db.franquia.findFirst({
    where: { id: franquiaId, ativo: true, deletedAt: null },
    select: { id: true },
  });
  if (!franquia) {
    return { ok: false, message: "Formulário não encontrado." };
  }

  const parsed = npsRespostaSchema.safeParse({
    nomeEmpresa: formData.get("nomeEmpresa"),
    whatsapp: formData.get("whatsapp"),
    nps: formData.get("nps"),
    npsComentario: formData.get("npsComentario"),
    csatAtendimento: formData.get("csatAtendimento"),
    csatResultado: formData.get("csatResultado"),
    csatEntregas: formData.get("csatEntregas"),
    csatComentario: formData.get("csatComentario"),
    cevSeguranca: formData.get("cevSeguranca"),
    cevValorizacao: formData.get("cevValorizacao"),
    cesFacilidade: formData.get("cesFacilidade"),
    cesComentario: formData.get("cesComentario"),
    perguntaFinal: formData.get("perguntaFinal"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await db.npsResposta.create({
    data: {
      franquiaId: franquia.id,
      ...parsed.data,
    },
  });

  return { ok: true, message: "Resposta registrada." };
}

export type ClienteParaVinculo = {
  id: string;
  nome: string;
  documento: string;
  franquiaAtualNome: string | null;
};

/** Busca por nome/documento em toda a base de clientes (não só os da
 *  franquia da resposta) — o cliente pode ter sido cadastrado em outra
 *  franquia ou com dados divergentes do que a pessoa digitou no formulário. */
export async function buscarClientesParaVinculo(query: string): Promise<ClienteParaVinculo[]> {
  const usuario = await getCurrentUser();
  if (!canAccessNpsScreen(usuario)) return [];

  const termo = query.trim();
  if (termo.length < 2) return [];

  const clientes = await db.cliente.findMany({
    where: {
      deletedAt: null,
      OR: [
        { nome: { contains: termo, mode: "insensitive" } },
        { documento: { contains: termo, mode: "insensitive" } },
      ],
    },
    take: 20,
    orderBy: { nome: "asc" },
    select: {
      id: true,
      nome: true,
      documento: true,
      carteiraHistorico: {
        where: { ativo: true },
        take: 1,
        select: { franquia: { select: { nome: true } } },
      },
    },
  });

  return clientes.map((c) => ({
    id: c.id,
    nome: c.nome,
    documento: c.documento,
    franquiaAtualNome: c.carteiraHistorico[0]?.franquia.nome ?? null,
  }));
}

export async function vincularClienteNps(
  respostaId: string,
  clienteId: string | null,
): Promise<{ ok: boolean; message?: string }> {
  const usuario = await getCurrentUser();
  if (!canAccessNpsScreen(usuario)) {
    return { ok: false, message: "Acesso negado." };
  }

  const resposta = await db.npsResposta.findUnique({
    where: { id: respostaId },
    select: { franquiaId: true },
  });
  if (!resposta) {
    return { ok: false, message: "Resposta não encontrada." };
  }

  await db.npsResposta.update({
    where: { id: respostaId },
    data: clienteId
      ? { clienteId, vinculadoPorId: usuario.id, vinculadoEm: new Date() }
      : { clienteId: null, vinculadoPorId: null, vinculadoEm: null },
  });

  revalidatePath(`/nps/respostas/${resposta.franquiaId}`);
  return { ok: true, message: clienteId ? "Resposta vinculada." : "Resposta desvinculada." };
}
