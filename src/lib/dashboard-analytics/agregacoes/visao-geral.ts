import { TIPO_CONTRATO_LABEL } from "@/lib/carteira-calculos";
import type { AnalyticsContratoRow, AnalyticsFiltros, FranquiaBase } from "@/lib/dashboard-analytics/types";
import {
  baseVigente,
  buildMonthlySeries,
  churnEEncerrados,
  monthBounds,
  pctChange,
  prevMonthBounds,
} from "./shared";

export type DeltaKpi = { atual: number; anteriorPct: number | null };

export type VisaoGeralResult = {
  kpis: {
    mrr: DeltaKpi;
    tcvContratadoNoMes: DeltaKpi;
    clientesAtivos: DeltaKpi;
    franquiasAtivas: number;
    ticketMedioMrr: DeltaKpi;
    churnRate: DeltaKpi;
  };
  saude: {
    ativos: number;
    churn: number;
    pausados: number;
    encerrados: number;
    vencidos: number;
    vencendo30: number;
    retencaoPct: number | null;
  };
  serieMrr: Array<{ mes: string; mrr: number }>;
  serieTcv: Array<{ mes: string; tcv: number }>;
  composicaoMrrPorTipo: Array<{ tipo: string; mrr: number }>;
  composicaoMrrPorPlano: Array<{ plano: string; mrr: number }>;
};

function delta(atual: number, anterior: number): DeltaKpi {
  return { atual, anteriorPct: pctChange(atual, anterior) };
}

export function computeVisaoGeral(
  historyFiltrado: AnalyticsContratoRow[],
  franquias: FranquiaBase[],
  filtros: AnalyticsFiltros,
  agora: number,
): VisaoGeralResult {
  const refBounds = monthBounds(filtros.mesRef);
  const refEndMs = refBounds ? refBounds.end : agora;
  const bounds = refBounds ?? monthBounds(`${new Date(agora).getUTCFullYear()}-${String(new Date(agora).getUTCMonth() + 1).padStart(2, "0")}`)!;
  const boundsAnterior = prevMonthBounds(bounds.start);

  const baseAtivos = baseVigente(historyFiltrado, refEndMs, agora);
  const baseAtivosAnterior = baseVigente(historyFiltrado, boundsAnterior.end, agora);
  const baseMrr = baseAtivos.filter((d) => d.tipoContrato === "MENSAL");
  const baseMrrAnterior = baseAtivosAnterior.filter((d) => d.tipoContrato === "MENSAL");

  const mrrAtual = baseMrr.reduce((s, d) => s + d.valorMensal, 0);
  const mrrAnterior = baseMrrAnterior.reduce((s, d) => s + d.valorMensal, 0);

  const tcvNoMes = historyFiltrado.filter(
    (d) => d.tipoContrato !== "MENSAL" && d.inicioContrato.getTime() >= bounds.start && d.inicioContrato.getTime() <= bounds.end,
  );
  const tcvNoMesAnterior = historyFiltrado.filter(
    (d) =>
      d.tipoContrato !== "MENSAL" &&
      d.inicioContrato.getTime() >= boundsAnterior.start &&
      d.inicioContrato.getTime() <= boundsAnterior.end,
  );
  const valorTcvNoMes = tcvNoMes.reduce((s, d) => s + d.valorContrato, 0);
  const valorTcvNoMesAnterior = tcvNoMesAnterior.reduce((s, d) => s + d.valorContrato, 0);

  const ativosIds = new Set(baseAtivos.map((d) => d.clienteId));
  const ativosIdsAnterior = new Set(baseAtivosAnterior.map((d) => d.clienteId));
  const ativosMrrIds = new Set(baseMrr.map((d) => d.clienteId));

  const ticketMedioMrrAtual = ativosMrrIds.size > 0 ? mrrAtual / ativosMrrIds.size : 0;
  const ticketMedioMrrAnterior =
    new Set(baseMrrAnterior.map((d) => d.clienteId)).size > 0
      ? mrrAnterior / new Set(baseMrrAnterior.map((d) => d.clienteId)).size
      : 0;

  const { churnIds, encerradoIds } = churnEEncerrados(historyFiltrado, refBounds);
  const { churnIds: churnIdsAnterior } = churnEEncerrados(historyFiltrado, boundsAnterior);

  // Denominador da taxa de churn: sem mês selecionado, é sobre o total
  // histórico de clientes; com mês selecionado, sobre quem já estava na
  // carteira no início daquele mês (mesma correção do dashboard atual).
  const totalClientesHistorico = new Set(historyFiltrado.map((d) => d.clienteId)).size;
  const baseTaxaPeriodo = refBounds
    ? new Set(baseVigente(historyFiltrado, refBounds.start, agora).map((d) => d.clienteId)).size
    : totalClientesHistorico;
  const baseTaxaPeriodoAnterior = new Set(baseVigente(historyFiltrado, boundsAnterior.start, agora).map((d) => d.clienteId))
    .size;

  const churnRateAtual = baseTaxaPeriodo > 0 ? (churnIds.size / baseTaxaPeriodo) * 100 : 0;
  const churnRateAnterior = baseTaxaPeriodoAnterior > 0 ? (churnIdsAnterior.size / baseTaxaPeriodoAnterior) * 100 : 0;

  const franquiasFiltradas = franquias.filter(
    (f) => f.ativo && (filtros.franquia.length === 0 || filtros.franquia.includes(f.nome)),
  );

  const vencidos = baseAtivos.filter((d) => d.status === "VENCIDO").length;
  const vencendo30 = baseAtivos.filter(
    (d) => (d.status === "ATIVO" || d.status === "PAUSADO") && d.vencimentoDias !== null && d.vencimentoDias >= 0 && d.vencimentoDias <= 30,
  ).length;
  const pausados = baseAtivos.filter((d) => d.status === "PAUSADO").length;
  const retencaoPct = 100 - churnRateAtual;

  const serieCompleta = buildMonthlySeries(historyFiltrado, refEndMs, agora, (vigentes) => {
    const mrrMes = vigentes.filter((d) => d.tipoContrato === "MENSAL").reduce((s, d) => s + d.valorMensal, 0);
    return { mrr: mrrMes };
  });

  const serieTcvCompleta = buildMonthlySeries(historyFiltrado, refEndMs, agora, (_vigentes, mesFimMs) => {
    const inicioMes = new Date(mesFimMs);
    const y = inicioMes.getUTCFullYear();
    const m = inicioMes.getUTCMonth();
    const inicioMesMs = Date.UTC(y, m, 1);
    const tcv = historyFiltrado
      .filter((d) => d.tipoContrato !== "MENSAL" && d.inicioContrato.getTime() >= inicioMesMs && d.inicioContrato.getTime() <= mesFimMs)
      .reduce((s, d) => s + d.valorContrato, 0);
    return { tcv };
  });

  const composicaoMrrPorTipo = Object.entries(TIPO_CONTRATO_LABEL)
    .map(([tipo, label]) => ({
      tipo: label,
      mrr: baseAtivos.filter((d) => d.tipoContrato === tipo).reduce((s, d) => s + (d.tipoContrato === "MENSAL" ? d.valorMensal : 0), 0),
    }))
    .filter((d) => d.mrr > 0);

  const porPlano = new Map<string, number>();
  for (const d of baseMrr) porPlano.set(d.plano, (porPlano.get(d.plano) ?? 0) + d.valorMensal);
  const composicaoMrrPorPlano = Array.from(porPlano.entries())
    .map(([plano, mrr]) => ({ plano, mrr }))
    .sort((a, b) => b.mrr - a.mrr);

  return {
    kpis: {
      mrr: delta(mrrAtual, mrrAnterior),
      tcvContratadoNoMes: delta(valorTcvNoMes, valorTcvNoMesAnterior),
      clientesAtivos: delta(ativosIds.size, ativosIdsAnterior.size),
      franquiasAtivas: franquiasFiltradas.length,
      ticketMedioMrr: delta(ticketMedioMrrAtual, ticketMedioMrrAnterior),
      churnRate: delta(churnRateAtual, churnRateAnterior),
    },
    saude: {
      ativos: ativosIds.size,
      churn: churnIds.size,
      pausados,
      encerrados: encerradoIds.size,
      vencidos,
      vencendo30,
      retencaoPct,
    },
    serieMrr: serieCompleta.map((p) => ({ mes: p.mes, mrr: p.mrr })),
    serieTcv: serieTcvCompleta.map((p) => ({ mes: p.mes, tcv: p.tcv })),
    composicaoMrrPorTipo,
    composicaoMrrPorPlano,
  };
}
