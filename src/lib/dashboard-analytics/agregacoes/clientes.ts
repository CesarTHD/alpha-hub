import { diffMeses } from "@/lib/carteira-calculos";
import type { AnalyticsContratoRow, AnalyticsFiltros } from "@/lib/dashboard-analytics/types";
import {
  LIFETIME_BUCKETS,
  baseVigente,
  bucketLifetime,
  buildMonthlySeries,
  churnEEncerrados,
  lifetimeMedioMeses,
  monthBounds,
  primeiroContratoPorCliente,
} from "./shared";

export type ClientesResult = {
  kpis: {
    clientesAtivos: number;
    novosClientes: number;
    renovacoes: number;
    pausados: number;
    encerrados: number;
    churn: number;
    ticketMedio: number;
    lifetimeMedioMeses: number | null;
  };
  serieEvolucaoCarteira: Array<{ mes: string; ativos: number }>;
  serieNovosXEncerrados: Array<{ mes: string; novos: number; encerrados: number }>;
  distribuicaoPorPlano: Array<{ plano: string; clientes: number }>;
  distribuicaoLifetime: Array<{ faixa: string; clientes: number }>;
};

export function computeClientes(historyFiltrado: AnalyticsContratoRow[], filtros: AnalyticsFiltros, agora: number): ClientesResult {
  const refBounds = monthBounds(filtros.mesRef);
  const refEndMs = refBounds ? refBounds.end : agora;

  const baseAtivos = baseVigente(historyFiltrado, refEndMs, agora);
  const ativosIds = new Set(baseAtivos.map((d) => d.clienteId));

  const primeiroContrato = primeiroContratoPorCliente(historyFiltrado);
  const noPeriodo = (t: number) => !refBounds || (t >= refBounds.start && t <= refBounds.end);

  const novosClientes = Array.from(primeiroContrato.values()).filter((r) => noPeriodo(r.inicioContrato.getTime())).length;
  const renovacoes = historyFiltrado.filter(
    (r) => r.origemContrato === "RENOVACAO" && noPeriodo(r.inicioContrato.getTime()),
  ).length;

  const { churnIds, encerradoIds } = churnEEncerrados(historyFiltrado, refBounds);
  const pausados = baseAtivos.filter((d) => d.status === "PAUSADO").length;

  const baseMrr = baseAtivos.filter((d) => d.tipoContrato === "MENSAL");
  const mrrTotal = baseMrr.reduce((s, d) => s + d.valorMensal, 0);
  const clientesMrrCount = new Set(baseMrr.map((d) => d.clienteId)).size;
  const ticketMedio = clientesMrrCount > 0 ? mrrTotal / clientesMrrCount : 0;

  const serieEvolucaoCarteira = buildMonthlySeries(historyFiltrado, refEndMs, agora, (vigentes) => ({
    ativos: new Set(vigentes.map((d) => d.clienteId)).size,
  })).map((p) => ({ mes: p.mes, ativos: p.ativos }));

  const serieNovosXEncerrados = buildMonthlySeries(historyFiltrado, refEndMs, agora, (_vigentes, mesFimMs) => {
    const d = new Date(mesFimMs);
    const inicioMesMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
    const novos = Array.from(primeiroContrato.values()).filter(
      (r) => r.inicioContrato.getTime() >= inicioMesMs && r.inicioContrato.getTime() <= mesFimMs,
    ).length;
    const enc = historyFiltrado.filter(
      (r) =>
        (r.status === "CHURN" || r.status === "ENCERRADO") &&
        r.dataSaida !== null &&
        r.dataSaida.getTime() >= inicioMesMs &&
        r.dataSaida.getTime() <= mesFimMs,
    ).length;
    return { novos, encerrados: enc };
  }).map((p) => ({ mes: p.mes, novos: p.novos, encerrados: p.encerrados }));

  const porPlano = new Map<string, Set<string>>();
  for (const d of baseAtivos) {
    if (!porPlano.has(d.plano)) porPlano.set(d.plano, new Set());
    porPlano.get(d.plano)!.add(d.clienteId);
  }
  const distribuicaoPorPlano = Array.from(porPlano.entries())
    .map(([plano, clientes]) => ({ plano, clientes: clientes.size }))
    .sort((a, b) => b.clientes - a.clientes);

  const lifetimePorCliente = new Map<string, number>();
  const primeiroPorClienteMap = primeiroContrato;
  for (const [clienteId, primeiro] of primeiroPorClienteMap) {
    if (!ativosIds.has(clienteId)) continue;
    lifetimePorCliente.set(clienteId, diffMeses(primeiro.inicioContrato, new Date(refEndMs)));
  }
  const bucketCount = new Map<string, number>(LIFETIME_BUCKETS.map((b) => [b, 0]));
  for (const meses of lifetimePorCliente.values()) {
    const b = bucketLifetime(meses);
    bucketCount.set(b, (bucketCount.get(b) ?? 0) + 1);
  }
  const distribuicaoLifetime = LIFETIME_BUCKETS.map((faixa) => ({ faixa, clientes: bucketCount.get(faixa) ?? 0 }));

  return {
    kpis: {
      clientesAtivos: ativosIds.size,
      novosClientes,
      renovacoes,
      pausados,
      encerrados: encerradoIds.size,
      churn: churnIds.size,
      ticketMedio,
      lifetimeMedioMeses: lifetimeMedioMeses(baseAtivos, agora),
    },
    serieEvolucaoCarteira,
    serieNovosXEncerrados,
    distribuicaoPorPlano,
    distribuicaoLifetime,
  };
}
