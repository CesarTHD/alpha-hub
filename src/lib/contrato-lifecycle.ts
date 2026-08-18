import { addMonths } from "date-fns";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import type { TipoContrato } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

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
 *
 * Marca como VENCIDO, não ENCERRADO — "Encerrado" é reservado para quando um
 * Profit, uma Franquia ou o Administrador encerra o contrato manualmente (ver
 * registrarEncerramento em lifecycle.ts). "Vencido" é só o vencimento
 * automático do prazo, sem ninguém ter agido sobre ele ainda.
 *
 * A atualização é feita contrato a contrato (updateMany condicionado a
 * status: "ATIVO", não só por id) para não criar um evento duplicado quando
 * duas requisições concorrentes disparam este sweep ao mesmo tempo — sem essa
 * checagem, as duas veriam o contrato como elegível antes de qualquer uma
 * escrever, e ambas registrariam o evento.
 */
/**
 * Fecha o vínculo do cliente com a franquia (ClienteCarteira) quando ele não
 * tem mais nenhum contrato em vigor (ATIVO/PAUSADO/VENCIDO) — evita carteiras
 * "fantasma" (cliente contando como ativo na franquia sem ter contrato
 * algum). Chamado depois de marcar um contrato como ENCERRADO — Churn já
 * fecha a carteira incondicionalmente, por ser sempre a saída completa do
 * cliente.
 */
export async function fecharCarteiraSeSemContratoAtivo(
  tx: Prisma.TransactionClient,
  clienteId: string,
  dataFim: Date,
) {
  const aindaTemContratoAtivo = await tx.contrato.findFirst({
    where: { clienteId, deletedAt: null, status: { in: ["ATIVO", "PAUSADO", "VENCIDO"] } },
  });
  if (aindaTemContratoAtivo) return;

  const carteiraAtiva = await tx.clienteCarteira.findFirst({ where: { clienteId, ativo: true } });
  if (carteiraAtiva) {
    await tx.clienteCarteira.update({ where: { id: carteiraAtiva.id }, data: { ativo: false, dataFim } });
  }
}

export async function marcarContratosVencidos() {
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
    for (const contrato of vencidos) {
      const { count } = await tx.contrato.updateMany({
        where: { id: contrato.id, status: "ATIVO" },
        data: { status: "VENCIDO" },
      });
      if (count === 0) continue; // outra requisição já processou este contrato

      await tx.evento.create({
        data: {
          clienteId: contrato.clienteId,
          contratoId: contrato.id,
          tipoEvento: "VENCIMENTO_CONTRATO",
          dataEvento: contrato.fimContrato!,
          motivo: "Prazo do contrato vencido sem renovação",
          usuarioResponsavelId: usuario.id,
        },
      });
    }
  });
}
