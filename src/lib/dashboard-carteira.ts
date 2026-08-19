import { db } from "@/lib/db";
import { marcarContratosVencidos } from "@/lib/contrato-lifecycle";
import { clienteFranquiaScopeWhere, type AuthUser } from "@/lib/rbac";
import { type ContratoRow, MS_DIA, calcularFaixa } from "@/lib/carteira-calculos";

export type DashboardCarteiraScope = { franquiaId: string } | null;

/**
 * Busca todos os contratos (não deletados, de clientes não deletados) da
 * carteira, achatados em uma linha por contrato — inclui o histórico
 * completo (não só o contrato mais recente de cada cliente), necessário
 * para reconstruir a evolução mensal e o lifetime real de clientes que já
 * renovaram. Franquia/Profit exibidos são sempre os ATUAIS do cliente
 * (última carteiraHistorico, ativa ou não), não os vigentes à época de cada
 * contrato histórico.
 */
export async function getLinhasCarteira(scope: DashboardCarteiraScope = null): Promise<ContratoRow[]> {
  await marcarContratosVencidos();

  const usuarioScope: AuthUser = scope
    ? { role: "FRANQUEADO", franquiaId: scope.franquiaId }
    : { role: "ADMIN", franquiaId: null };

  const contratos = await db.contrato.findMany({
    where: {
      deletedAt: null,
      cliente: { deletedAt: null, ...clienteFranquiaScopeWhere(usuarioScope) },
    },
    orderBy: { inicioContrato: "asc" },
    select: {
      id: true,
      clienteId: true,
      plano: true,
      tipoContrato: true,
      status: true,
      valorContrato: true,
      valorMensal: true,
      inicioContrato: true,
      fimContrato: true,
      dataSaida: true,
      renovacaoAutomatica: true,
      eventos: {
        where: { tipoEvento: { in: ["NOVO_CONTRATO", "RENOVACAO"] } },
        take: 1,
        select: { tipoEvento: true },
      },
      cliente: {
        select: {
          nome: true,
          carteiraHistorico: {
            orderBy: { dataInicio: "desc" },
            take: 1,
            select: {
              franquia: {
                select: {
                  nome: true,
                  historicoProfit: {
                    where: { ativo: true },
                    take: 1,
                    select: { profit: { select: { nome: true } } },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const agora = Date.now();

  return contratos.map((c) => {
    const franquia = c.cliente.carteiraHistorico[0]?.franquia;
    const vencimentoDias = c.fimContrato
      ? Math.round((c.fimContrato.getTime() - agora) / MS_DIA)
      : null;

    return {
      contratoId: c.id,
      clienteId: c.clienteId,
      cliente: c.cliente.nome,
      franquia: franquia?.nome ?? "—",
      profit: franquia?.historicoProfit[0]?.profit.nome ?? "—",
      plano: c.plano,
      tipoContrato: c.tipoContrato,
      status: c.status,
      valorContrato: Number(c.valorContrato),
      valorMensal: Number(c.valorMensal),
      inicioContrato: c.inicioContrato,
      fimContrato: c.fimContrato,
      dataSaida: c.dataSaida,
      renovacaoAutomatica: c.renovacaoAutomatica,
      ativo: c.status === "ATIVO",
      vencido: c.status === "VENCIDO",
      pausado: c.status === "PAUSADO",
      churn: c.status === "CHURN",
      vencimentoDias,
      faixaVencimento: calcularFaixa(vencimentoDias),
      origemContrato: c.eventos[0]?.tipoEvento === "RENOVACAO" ? "RENOVACAO" : "NOVO",
    };
  });
}
