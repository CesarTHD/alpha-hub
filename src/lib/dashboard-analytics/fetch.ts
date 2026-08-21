import { db } from "@/lib/db";
import { marcarContratosVencidos } from "@/lib/contrato-lifecycle";
import { clienteFranquiaScopeWhere, type AuthUser } from "@/lib/rbac";
import { MS_DIA, calcularFaixa } from "@/lib/carteira-calculos";
import type { AnalyticsContratoRow, AnalyticsDataset, FranquiaBase } from "@/lib/dashboard-analytics/types";

export type AnalyticsScope = { franquiaId: string } | null;

/**
 * Busca própria do Dashboard Analítico — modelada em getLinhasCarteira()
 * (src/lib/dashboard-carteira.ts), mas com os campos extras (cidade/estado de
 * cliente e franquia, ids de franquia/profit) que a página de Mapa e as
 * agregações por franquia precisam. Não reaproveita a função original porque
 * ela é da versão antiga do dashboard e não deve ser alterada.
 */
export async function getAnalyticsDataset(scope: AnalyticsScope = null): Promise<AnalyticsDataset> {
  await marcarContratosVencidos();

  const usuarioScope: AuthUser = scope
    ? { role: "FRANQUEADO", franquiaId: scope.franquiaId }
    : { role: "ADMIN", franquiaId: null };

  const [contratos, franquiasDb] = await Promise.all([
    db.contrato.findMany({
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
            cidade: true,
            estado: true,
            carteiraHistorico: {
              orderBy: { dataInicio: "desc" },
              take: 1,
              select: {
                franquia: {
                  select: {
                    id: true,
                    nome: true,
                    cidade: true,
                    estado: true,
                    historicoProfit: {
                      where: { ativo: true },
                      take: 1,
                      select: { profit: { select: { id: true, nome: true } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
    db.franquia.findMany({
      where: { deletedAt: null, ...(scope ? { id: scope.franquiaId } : {}) },
      select: { id: true, nome: true, cidade: true, estado: true, ativo: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  const agora = Date.now();

  const rows: AnalyticsContratoRow[] = contratos.map((c) => {
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
      franquiaId: franquia?.id ?? null,
      profitId: franquia?.historicoProfit[0]?.profit.id ?? null,
      clienteCidade: c.cliente.cidade,
      clienteEstado: c.cliente.estado,
      franquiaCidade: franquia?.cidade ?? null,
      franquiaEstado: franquia?.estado ?? null,
    };
  });

  const franquias: FranquiaBase[] = franquiasDb;

  return { rows, franquias };
}
