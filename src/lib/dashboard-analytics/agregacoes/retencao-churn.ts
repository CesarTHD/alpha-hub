import { diffMeses, fimEfetivoMs } from "@/lib/carteira-calculos";
import type { AnalyticsContratoRow, AnalyticsFiltros } from "@/lib/dashboard-analytics/types";
import {
  LIFETIME_BUCKETS,
  baseVigente,
  bucketLifetime,
  churnEEncerrados,
  monthBounds,
  primeiroContratoPorCliente,
} from "./shared";

export type RetencaoChurnResult = {
  kpis: {
    churnRatePct: number;
    clientesChurnados: number;
    retencaoPct: number;
    mrrPerdido: number;
    tcvPerdido: number;
    lifetimeMedioChurnadosMeses: number | null;
    lifetimeMedioCarteiraMeses: number | null;
  };
  churnPorFranquia: Array<{ franquia: string; clientesChurn: number }>;
  churnPorPlano: Array<{ plano: string; clientesChurn: number }>;
  churnMensal: Array<{ mes: string; churn: number }>;
  churnPorFaixaLifetime: Array<{ faixa: string; clientesChurn: number }>;
};

export function computeRetencaoChurn(
  historyFiltrado: AnalyticsContratoRow[],
  filtros: AnalyticsFiltros,
  agora: number,
): RetencaoChurnResult {
  const refBounds = monthBounds(filtros.mesRef);
  const refEndMs = refBounds ? refBounds.end : agora;

  const { churnIds } = churnEEncerrados(historyFiltrado, refBounds);
  const linhasChurn = historyFiltrado.filter((r) => r.status === "CHURN" && churnIds.has(r.clienteId));

  const totalClientesHistorico = new Set(historyFiltrado.map((d) => d.clienteId)).size;
  const baseTaxaPeriodo = refBounds
    ? new Set(baseVigente(historyFiltrado, refBounds.start, agora).map((d) => d.clienteId)).size
    : totalClientesHistorico;
  const churnRatePct = baseTaxaPeriodo > 0 ? (churnIds.size / baseTaxaPeriodo) * 100 : 0;

  const mrrPerdido = linhasChurn.filter((r) => r.tipoContrato === "MENSAL").reduce((s, r) => s + r.valorMensal, 0);
  const tcvPerdido = linhasChurn.filter((r) => r.tipoContrato !== "MENSAL").reduce((s, r) => s + r.valorContrato, 0);

  const primeiroContrato = primeiroContratoPorCliente(historyFiltrado);
  const lifetimesChurn: number[] = [];
  for (const clienteId of churnIds) {
    const primeiro = primeiroContrato.get(clienteId);
    const linhaChurn = linhasChurn.find((r) => r.clienteId === clienteId);
    const fimMs = linhaChurn ? fimEfetivoMs(linhaChurn) : null;
    if (primeiro && fimMs) lifetimesChurn.push(diffMeses(primeiro.inicioContrato, new Date(fimMs)));
  }
  const lifetimeMedioChurnadosMeses =
    lifetimesChurn.length > 0 ? lifetimesChurn.reduce((a, b) => a + b, 0) / lifetimesChurn.length : null;

  const baseAtivos = baseVigente(historyFiltrado, refEndMs, agora);
  const lifetimesCarteira: number[] = [];
  const vistoCarteira = new Set<string>();
  for (const r of baseAtivos) {
    if (vistoCarteira.has(r.clienteId)) continue;
    vistoCarteira.add(r.clienteId);
    const primeiro = primeiroContrato.get(r.clienteId);
    if (primeiro) lifetimesCarteira.push(diffMeses(primeiro.inicioContrato, new Date(refEndMs)));
  }
  const lifetimeMedioCarteiraMeses =
    lifetimesCarteira.length > 0 ? lifetimesCarteira.reduce((a, b) => a + b, 0) / lifetimesCarteira.length : null;

  const porFranquia = new Map<string, number>();
  const porPlano = new Map<string, number>();
  const porFaixa = new Map<string, number>(LIFETIME_BUCKETS.map((b) => [b, 0]));
  for (const clienteId of churnIds) {
    const linha = linhasChurn.find((r) => r.clienteId === clienteId);
    if (!linha) continue;
    porFranquia.set(linha.franquia, (porFranquia.get(linha.franquia) ?? 0) + 1);
    porPlano.set(linha.plano, (porPlano.get(linha.plano) ?? 0) + 1);
    const primeiro = primeiroContrato.get(clienteId);
    const fimMs = fimEfetivoMs(linha);
    if (primeiro && fimMs) {
      const faixa = bucketLifetime(diffMeses(primeiro.inicioContrato, new Date(fimMs)));
      porFaixa.set(faixa, (porFaixa.get(faixa) ?? 0) + 1);
    }
  }

  const churnMensal: Array<{ mes: string; churn: number }> = [];
  if (linhasChurn.length > 0) {
    const porMes = new Map<string, number>();
    for (const r of linhasChurn) {
      if (!r.dataSaida) continue;
      const key = `${r.dataSaida.getUTCFullYear()}-${String(r.dataSaida.getUTCMonth() + 1).padStart(2, "0")}`;
      porMes.set(key, (porMes.get(key) ?? 0) + 1);
    }
    churnMensal.push(...Array.from(porMes.entries()).map(([mes, churn]) => ({ mes, churn })).sort((a, b) => a.mes.localeCompare(b.mes)).slice(-24));
  }

  return {
    kpis: {
      churnRatePct,
      clientesChurnados: churnIds.size,
      retencaoPct: 100 - churnRatePct,
      mrrPerdido,
      tcvPerdido,
      lifetimeMedioChurnadosMeses,
      lifetimeMedioCarteiraMeses,
    },
    churnPorFranquia: Array.from(porFranquia.entries())
      .map(([franquia, clientesChurn]) => ({ franquia, clientesChurn }))
      .sort((a, b) => b.clientesChurn - a.clientesChurn),
    churnPorPlano: Array.from(porPlano.entries())
      .map(([plano, clientesChurn]) => ({ plano, clientesChurn }))
      .sort((a, b) => b.clientesChurn - a.clientesChurn),
    churnMensal,
    churnPorFaixaLifetime: LIFETIME_BUCKETS.map((faixa) => ({ faixa, clientesChurn: porFaixa.get(faixa) ?? 0 })),
  };
}
