import { addMonths } from "date-fns";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import type { TipoContrato } from "@/generated/prisma/enums";

const DURACAO_MESES: Partial<Record<TipoContrato, number>> = {
  TRIMESTRAL: 3,
  QUADRIMESTRAL: 4,
  SEMESTRAL: 6,
  ANUAL: 12,
};

/**
 * Data de fim do contrato a partir do início + duração do tipo contratado.
 * MENSAL não tem duração fixa (renovação mês a mês), então fica sem fim.
 */
export function calcularFimContrato(inicioContrato: Date, tipoContrato: TipoContrato): Date | null {
  const meses = DURACAO_MESES[tipoContrato];
  return meses ? addMonths(inicioContrato, meses) : null;
}

/**
 * Contratos ATIVO cujo prazo (fimContrato) já passou e não foram renovados
 * ficam presos em "ATIVO" para sempre, já que nada muda seu status
 * automaticamente. Chamado no topo das páginas que exibem status de
 * contrato/cliente para manter o dado sempre corrente.
 */
export async function encerrarContratosVencidos() {
  const agora = new Date();

  const vencidos = await db.contrato.findMany({
    where: {
      status: "ATIVO",
      fimContrato: { lt: agora },
      deletedAt: null,
      cliente: { deletedAt: null },
    },
    select: { id: true, clienteId: true, fimContrato: true },
  });

  if (vencidos.length === 0) return;

  const usuario = await getCurrentUser();

  await db.$transaction(async (tx) => {
    await tx.contrato.updateMany({
      where: { id: { in: vencidos.map((c) => c.id) } },
      data: { status: "ENCERRADO" },
    });

    await tx.evento.createMany({
      data: vencidos.map((c) => ({
        clienteId: c.clienteId,
        contratoId: c.id,
        tipoEvento: "ENCERRAMENTO_CONTRATO" as const,
        dataEvento: c.fimContrato!,
        motivo: "Prazo do contrato expirado sem renovação",
        usuarioResponsavelId: usuario.id,
      })),
    });
  });
}
