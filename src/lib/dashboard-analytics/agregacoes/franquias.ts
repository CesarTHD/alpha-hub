import type { AnalyticsContratoRow, AnalyticsFiltros, FranquiaBase } from "@/lib/dashboard-analytics/types";
import { baseVigente, churnEEncerrados, lifetimeMedioMeses, monthBounds, pctChange, prevMonthBounds } from "./shared";

export type FranquiaMetrica = {
  id: string;
  nome: string;
  clientes: number;
  mrr: number;
  tcvContratadoNoMes: number;
  ticketMedio: number;
  clientesChurn: number;
  churnRatePct: number;
  retencaoPct: number;
  lifetimeMedioMeses: number | null;
  crescimentoMrrPct: number | null;
  contratosVencendo30: number;
  contratosVencidos: number;
};

export function computeFranquias(
  historyFiltrado: AnalyticsContratoRow[],
  franquias: FranquiaBase[],
  filtros: AnalyticsFiltros,
  agora: number,
): FranquiaMetrica[] {
  const refBounds = monthBounds(filtros.mesRef);
  const refEndMs = refBounds ? refBounds.end : agora;
  const hoje = new Date(agora);
  const bounds =
    refBounds ?? monthBounds(`${hoje.getUTCFullYear()}-${String(hoje.getUTCMonth() + 1).padStart(2, "0")}`)!;
  const boundsAnterior = prevMonthBounds(bounds.start);

  const franquiasFiltradas = franquias.filter(
    (f) => filtros.franquia.length === 0 || filtros.franquia.includes(f.nome),
  );

  return franquiasFiltradas.map((f) => {
    const rowsFranquia = historyFiltrado.filter((r) => r.franquiaId === f.id);
    const baseAtivos = baseVigente(rowsFranquia, refEndMs, agora);
    const baseAtivosAnterior = baseVigente(rowsFranquia, boundsAnterior.end, agora);
    const baseMrr = baseAtivos.filter((d) => d.tipoContrato === "MENSAL");
    const baseMrrAnterior = baseAtivosAnterior.filter((d) => d.tipoContrato === "MENSAL");

    const mrr = baseMrr.reduce((s, d) => s + d.valorMensal, 0);
    const mrrAnterior = baseMrrAnterior.reduce((s, d) => s + d.valorMensal, 0);

    const tcvContratadoNoMes = rowsFranquia
      .filter((d) => d.tipoContrato !== "MENSAL" && d.inicioContrato.getTime() >= bounds.start && d.inicioContrato.getTime() <= bounds.end)
      .reduce((s, d) => s + d.valorContrato, 0);

    const clientesAtivosIds = new Set(baseAtivos.map((d) => d.clienteId));
    const clientesMrrIds = new Set(baseMrr.map((d) => d.clienteId));
    const ticketMedio = clientesMrrIds.size > 0 ? mrr / clientesMrrIds.size : 0;

    const { churnIds } = churnEEncerrados(rowsFranquia, refBounds);
    const totalHistorico = new Set(rowsFranquia.map((d) => d.clienteId)).size;
    const baseTaxaPeriodo = refBounds
      ? new Set(baseVigente(rowsFranquia, refBounds.start, agora).map((d) => d.clienteId)).size
      : totalHistorico;
    const churnRatePct = baseTaxaPeriodo > 0 ? (churnIds.size / baseTaxaPeriodo) * 100 : 0;

    const vencendo30 = baseAtivos.filter(
      (d) => (d.status === "ATIVO" || d.status === "PAUSADO") && d.vencimentoDias !== null && d.vencimentoDias >= 0 && d.vencimentoDias <= 30,
    ).length;
    const vencidos = baseAtivos.filter((d) => d.status === "VENCIDO").length;

    return {
      id: f.id,
      nome: f.nome,
      clientes: clientesAtivosIds.size,
      mrr,
      tcvContratadoNoMes,
      ticketMedio,
      clientesChurn: churnIds.size,
      churnRatePct,
      retencaoPct: 100 - churnRatePct,
      lifetimeMedioMeses: lifetimeMedioMeses(baseAtivos, agora),
      crescimentoMrrPct: pctChange(mrr, mrrAnterior),
      contratosVencendo30: vencendo30,
      contratosVencidos: vencidos,
    };
  });
}
