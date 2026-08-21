import { TIPO_CONTRATO_LABEL } from "@/lib/carteira-calculos";
import type { AnalyticsContratoRow } from "@/lib/dashboard-analytics/types";
import { baseVigente, churnEEncerrados, endOfMonthMs, lifetimeMedioMeses } from "./shared";

export type Indicador = "mrr" | "tcv" | "clientes" | "churn" | "ticketMedio" | "lifetime" | "retencao" | "renovacao";
export type Periodo = "3m" | "6m" | "12m" | "24m";
export type Agrupamento = "mes" | "franquia" | "plano" | "uf" | "tipoContrato";

export const INDICADOR_LABEL: Record<Indicador, string> = {
  mrr: "MRR",
  tcv: "TCV contratado",
  clientes: "Clientes ativos",
  churn: "Churn (clientes)",
  ticketMedio: "Ticket médio (MRR)",
  lifetime: "Lifetime médio (meses)",
  retencao: "Retenção (%)",
  renovacao: "Renovações",
};

export const PERIODO_MESES: Record<Periodo, number> = { "3m": 3, "6m": 6, "12m": 12, "24m": 24 };

export const AGRUPAMENTO_LABEL: Record<Agrupamento, string> = {
  mes: "Geral (sem quebra)",
  franquia: "Franquia",
  plano: "Plano",
  uf: "UF",
  tipoContrato: "Tipo de contrato",
};

function groupKeyOf(row: AnalyticsContratoRow, agrupamento: Agrupamento): string {
  switch (agrupamento) {
    case "franquia":
      return row.franquia;
    case "plano":
      return row.plano;
    case "uf":
      return row.clienteEstado ?? "Não informado";
    case "tipoContrato":
      return TIPO_CONTRATO_LABEL[row.tipoContrato];
    default:
      return "Geral";
  }
}

function indicadorNoIntervalo(
  rowsGrupo: AnalyticsContratoRow[],
  bucketStartMs: number,
  bucketEndMs: number,
  indicador: Indicador,
  agora: number,
): number {
  const vigentes = baseVigente(rowsGrupo, bucketEndMs, agora);
  switch (indicador) {
    case "mrr":
      return vigentes.filter((d) => d.tipoContrato === "MENSAL").reduce((s, d) => s + d.valorMensal, 0);
    case "tcv":
      return rowsGrupo
        .filter((d) => d.tipoContrato !== "MENSAL" && d.inicioContrato.getTime() >= bucketStartMs && d.inicioContrato.getTime() <= bucketEndMs)
        .reduce((s, d) => s + d.valorContrato, 0);
    case "clientes":
      return new Set(vigentes.map((d) => d.clienteId)).size;
    case "churn": {
      const { churnIds } = churnEEncerrados(rowsGrupo, { start: bucketStartMs, end: bucketEndMs });
      return churnIds.size;
    }
    case "ticketMedio": {
      const mrrRows = vigentes.filter((d) => d.tipoContrato === "MENSAL");
      const clientesMrr = new Set(mrrRows.map((d) => d.clienteId)).size;
      const mrr = mrrRows.reduce((s, d) => s + d.valorMensal, 0);
      return clientesMrr > 0 ? mrr / clientesMrr : 0;
    }
    case "lifetime":
      return lifetimeMedioMeses(vigentes, agora) ?? 0;
    case "retencao": {
      const { churnIds } = churnEEncerrados(rowsGrupo, { start: bucketStartMs, end: bucketEndMs });
      const baseline = new Set(baseVigente(rowsGrupo, bucketStartMs, agora).map((d) => d.clienteId)).size;
      const churnRate = baseline > 0 ? (churnIds.size / baseline) * 100 : 0;
      return 100 - churnRate;
    }
    case "renovacao":
      return rowsGrupo.filter(
        (d) => d.origemContrato === "RENOVACAO" && d.inicioContrato.getTime() >= bucketStartMs && d.inicioContrato.getTime() <= bucketEndMs,
      ).length;
  }
}

export type PerformancePonto = { bucket: string } & Record<string, number | string>;

export function getPerformanceSeries(
  historyFiltrado: AnalyticsContratoRow[],
  opts: { indicador: Indicador; periodo: Periodo; agrupamento: Agrupamento },
  agora: number,
): { data: PerformancePonto[]; grupos: string[] } {
  const nMeses = PERIODO_MESES[opts.periodo];
  const hoje = new Date(agora);
  const buckets: Array<{ bucket: string; startMs: number; endMs: number }> = [];
  for (let i = nMeses - 1; i >= 0; i--) {
    const y = hoje.getUTCFullYear();
    const m = hoje.getUTCMonth() - i;
    const startMs = Date.UTC(y, m, 1);
    const endMs = Math.min(endOfMonthMs(y, m), agora);
    const d = new Date(startMs);
    buckets.push({ bucket: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`, startMs, endMs });
  }

  const grupos =
    opts.agrupamento === "mes"
      ? ["Geral"]
      : Array.from(new Set(historyFiltrado.map((r) => groupKeyOf(r, opts.agrupamento)))).sort();

  const data: PerformancePonto[] = buckets.map(({ bucket, startMs, endMs }) => {
    const ponto: PerformancePonto = { bucket };
    for (const grupo of grupos) {
      const rowsGrupo =
        opts.agrupamento === "mes" ? historyFiltrado : historyFiltrado.filter((r) => groupKeyOf(r, opts.agrupamento) === grupo);
      ponto[grupo] = Number(indicadorNoIntervalo(rowsGrupo, startMs, endMs, opts.indicador, agora).toFixed(2));
    }
    return ponto;
  });

  return { data, grupos };
}
