import { TIPO_CONTRATO_LABEL } from "@/lib/carteira-calculos";
import type { AnalyticsContratoRow, AnalyticsFiltros } from "@/lib/dashboard-analytics/types";
import { baseVigente, buildMonthlySeries, monthBounds, pctChange, prevMonthBounds } from "./shared";

export type ReceitaResult = {
  kpis: {
    mrr: number;
    mrrAnteriorPct: number | null;
    tcvContratadoNoMes: number;
    /** MRR anualizado (MRR × 12) — aproximação simples, não uma contabilização
     *  real de receita anual contratada (a base tem contratos TCV com prazos
     *  distintos de 12 meses, então não existe um "ARR" único e exato). */
    arrAproximado: number;
    ticketMedioMrr: number;
    receitaNovaMrr: number;
    receitaNovaTcv: number;
    receitaRenovacaoMrr: number;
    receitaRenovacaoTcv: number;
    receitaPerdidaMrr: number;
    crescimentoMrrPct: number | null;
    mrrMedioPorFranquia: number;
  };
  serieMrr: Array<{ mes: string; mrr: number }>;
  serieTcv: Array<{ mes: string; tcv: number }>;
  composicaoPorTipo: Array<{ tipo: string; mrr: number }>;
  composicaoPorPlano: Array<{ plano: string; mrr: number }>;
  composicaoPorFranquia: Array<{ franquia: string; mrr: number }>;
  waterfall: {
    mrrInicial: number;
    novo: number;
    churn: number;
    /** Diferença entre o que Novo/Churn explicam e a variação real do MRR —
     *  cobre upgrade/downgrade/expansão, que não têm delta de valor
     *  armazenado em lugar nenhum do banco para serem decompostos
     *  individualmente (ver Evento.ALTERACAO_VALOR, que só guarda texto
     *  livre). Pode ser positivo ou negativo. */
    outrasVariacoes: number;
    mrrFinal: number;
    categoriasIndisponiveis: string[];
  };
};

export function computeReceita(
  historyFiltrado: AnalyticsContratoRow[],
  franquiasAtivasCount: number,
  filtros: AnalyticsFiltros,
  agora: number,
): ReceitaResult {
  const refBounds = monthBounds(filtros.mesRef);
  const refEndMs = refBounds ? refBounds.end : agora;
  const hoje = new Date(agora);
  const bounds =
    refBounds ?? monthBounds(`${hoje.getUTCFullYear()}-${String(hoje.getUTCMonth() + 1).padStart(2, "0")}`)!;
  const boundsAnterior = prevMonthBounds(bounds.start);

  const baseAtivos = baseVigente(historyFiltrado, refEndMs, agora);
  const baseAtivosAnterior = baseVigente(historyFiltrado, boundsAnterior.end, agora);
  const baseMrr = baseAtivos.filter((d) => d.tipoContrato === "MENSAL");
  const baseMrrAnterior = baseAtivosAnterior.filter((d) => d.tipoContrato === "MENSAL");

  const mrr = baseMrr.reduce((s, d) => s + d.valorMensal, 0);
  const mrrAnterior = baseMrrAnterior.reduce((s, d) => s + d.valorMensal, 0);

  const noPeriodo = (d: AnalyticsContratoRow) =>
    d.inicioContrato.getTime() >= bounds.start && d.inicioContrato.getTime() <= bounds.end;
  const contratosDoMes = historyFiltrado.filter(noPeriodo);

  const tcvContratadoNoMes = contratosDoMes
    .filter((d) => d.tipoContrato !== "MENSAL")
    .reduce((s, d) => s + d.valorContrato, 0);

  const receitaNovaMrr = contratosDoMes
    .filter((d) => d.tipoContrato === "MENSAL" && d.origemContrato === "NOVO")
    .reduce((s, d) => s + d.valorMensal, 0);
  const receitaNovaTcv = contratosDoMes
    .filter((d) => d.tipoContrato !== "MENSAL" && d.origemContrato === "NOVO")
    .reduce((s, d) => s + d.valorContrato, 0);
  const receitaRenovacaoMrr = contratosDoMes
    .filter((d) => d.tipoContrato === "MENSAL" && d.origemContrato === "RENOVACAO")
    .reduce((s, d) => s + d.valorMensal, 0);
  const receitaRenovacaoTcv = contratosDoMes
    .filter((d) => d.tipoContrato !== "MENSAL" && d.origemContrato === "RENOVACAO")
    .reduce((s, d) => s + d.valorContrato, 0);

  const saiuNoPeriodo = (d: AnalyticsContratoRow) =>
    d.dataSaida !== null && d.dataSaida.getTime() >= bounds.start && d.dataSaida.getTime() <= bounds.end;
  const receitaPerdidaMrr = historyFiltrado
    .filter((d) => d.tipoContrato === "MENSAL" && (d.status === "CHURN" || d.status === "ENCERRADO") && saiuNoPeriodo(d))
    .reduce((s, d) => s + d.valorMensal, 0);

  const churnMrrPuro = historyFiltrado
    .filter((d) => d.tipoContrato === "MENSAL" && d.status === "CHURN" && saiuNoPeriodo(d))
    .reduce((s, d) => s + d.valorMensal, 0);

  const mrrInicialWaterfall = baseVigente(historyFiltrado, bounds.start, agora)
    .filter((d) => d.tipoContrato === "MENSAL")
    .reduce((s, d) => s + d.valorMensal, 0);
  const outrasVariacoes = mrr - mrrInicialWaterfall - receitaNovaMrr + churnMrrPuro;

  const ativosMrrIds = new Set(baseMrr.map((d) => d.clienteId));
  const ativosMrrIdsAnterior = new Set(baseMrrAnterior.map((d) => d.clienteId));
  const ticketMedioMrr = ativosMrrIds.size > 0 ? mrr / ativosMrrIds.size : 0;
  void ativosMrrIdsAnterior;

  const serieMrr = buildMonthlySeries(historyFiltrado, refEndMs, agora, (vigentes) => ({
    mrr: vigentes.filter((d) => d.tipoContrato === "MENSAL").reduce((s, d) => s + d.valorMensal, 0),
  })).map((p) => ({ mes: p.mes, mrr: p.mrr }));

  const serieTcv = buildMonthlySeries(historyFiltrado, refEndMs, agora, (_vigentes, mesFimMs) => {
    const d = new Date(mesFimMs);
    const inicioMesMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
    const tcv = historyFiltrado
      .filter((r) => r.tipoContrato !== "MENSAL" && r.inicioContrato.getTime() >= inicioMesMs && r.inicioContrato.getTime() <= mesFimMs)
      .reduce((s, r) => s + r.valorContrato, 0);
    return { tcv };
  }).map((p) => ({ mes: p.mes, tcv: p.tcv }));

  const composicaoPorTipo = Object.entries(TIPO_CONTRATO_LABEL)
    .map(([tipo, label]) => ({
      tipo: label,
      mrr: tipo === "MENSAL" ? baseMrr.reduce((s, d) => s + d.valorMensal, 0) : 0,
    }))
    .filter((d) => d.mrr > 0);

  const porPlano = new Map<string, number>();
  for (const d of baseMrr) porPlano.set(d.plano, (porPlano.get(d.plano) ?? 0) + d.valorMensal);
  const composicaoPorPlano = Array.from(porPlano.entries())
    .map(([plano, mrr]) => ({ plano, mrr }))
    .sort((a, b) => b.mrr - a.mrr);

  const porFranquia = new Map<string, number>();
  for (const d of baseMrr) porFranquia.set(d.franquia, (porFranquia.get(d.franquia) ?? 0) + d.valorMensal);
  const composicaoPorFranquia = Array.from(porFranquia.entries())
    .map(([franquia, mrr]) => ({ franquia, mrr }))
    .sort((a, b) => b.mrr - a.mrr)
    .slice(0, 15);

  return {
    kpis: {
      mrr,
      mrrAnteriorPct: pctChange(mrr, mrrAnterior),
      tcvContratadoNoMes,
      arrAproximado: mrr * 12,
      ticketMedioMrr,
      receitaNovaMrr,
      receitaNovaTcv,
      receitaRenovacaoMrr,
      receitaRenovacaoTcv,
      receitaPerdidaMrr,
      crescimentoMrrPct: pctChange(mrr, mrrAnterior),
      mrrMedioPorFranquia: franquiasAtivasCount > 0 ? mrr / franquiasAtivasCount : 0,
    },
    serieMrr,
    serieTcv,
    composicaoPorTipo,
    composicaoPorPlano,
    composicaoPorFranquia,
    waterfall: {
      mrrInicial: mrrInicialWaterfall,
      novo: receitaNovaMrr,
      churn: churnMrrPuro,
      outrasVariacoes,
      mrrFinal: mrr,
      categoriasIndisponiveis: ["Upgrade", "Downgrade", "Expansão"],
    },
  };
}
