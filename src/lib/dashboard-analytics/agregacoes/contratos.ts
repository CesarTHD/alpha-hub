import type { AnalyticsContratoRow, AnalyticsFiltros } from "@/lib/dashboard-analytics/types";
import { baseVigente, monthBounds } from "./shared";

export type ContratosResult = {
  kpis: {
    ativos: number;
    pausados: number;
    vencidos: number;
    vencendo7: number;
    vencendo30: number;
    vencendo60: number;
    renovados: number;
    taxaRenovacaoPct: number | null;
    tcvEmRisco: number;
  };
  vencimentosPorMes: Array<{ mes: string; quantidade: number; tcv: number }>;
  renovacaoPorMes: Array<{ mes: string; renovados: number; naoRenovados: number }>;
};

function mesFimContrato(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function computeContratos(historyFiltrado: AnalyticsContratoRow[], filtros: AnalyticsFiltros, agora: number): ContratosResult {
  const refBounds = monthBounds(filtros.mesRef);
  const refEndMs = refBounds ? refBounds.end : agora;
  const noPeriodo = (t: number) => !refBounds || (t >= refBounds.start && t <= refBounds.end);

  const baseAtivos = baseVigente(historyFiltrado, refEndMs, agora);

  const ativos = baseAtivos.filter((d) => d.status === "ATIVO").length;
  const pausados = baseAtivos.filter((d) => d.status === "PAUSADO").length;
  const vencidos = baseAtivos.filter((d) => d.status === "VENCIDO").length;
  const emAberto = baseAtivos.filter((d) => d.status === "ATIVO" || d.status === "PAUSADO" || d.status === "VENCIDO");
  const dentroDe = (dias: number) => emAberto.filter((d) => d.vencimentoDias !== null && d.vencimentoDias >= 0 && d.vencimentoDias <= dias).length;

  const renovados = historyFiltrado.filter((r) => r.origemContrato === "RENOVACAO" && noPeriodo(r.inicioContrato.getTime())).length;
  const encerradosNoPeriodo = historyFiltrado.filter((r) => r.status === "ENCERRADO" && r.dataSaida && noPeriodo(r.dataSaida.getTime())).length;
  const denominadorRenovacao = renovados + encerradosNoPeriodo;
  const taxaRenovacaoPct = denominadorRenovacao > 0 ? (renovados / denominadorRenovacao) * 100 : null;

  const tcvEmRisco = baseAtivos
    .filter(
      (d) =>
        (d.status === "ATIVO" || d.status === "VENCIDO") &&
        !d.renovacaoAutomatica &&
        d.vencimentoDias !== null &&
        d.vencimentoDias <= 30 &&
        d.tipoContrato !== "MENSAL",
    )
    .reduce((s, d) => s + d.valorContrato, 0);

  const contratosComFim = emAberto.filter((d) => d.fimContrato !== null);
  const porMes = new Map<string, { quantidade: number; tcv: number }>();
  for (const d of contratosComFim) {
    const key = mesFimContrato(d.fimContrato!);
    const atual = porMes.get(key) ?? { quantidade: 0, tcv: 0 };
    atual.quantidade += 1;
    atual.tcv += d.tipoContrato !== "MENSAL" ? d.valorContrato : 0;
    porMes.set(key, atual);
  }
  const vencimentosPorMes = Array.from(porMes.entries())
    .map(([mes, v]) => ({ mes, ...v }))
    .sort((a, b) => a.mes.localeCompare(b.mes))
    .slice(0, 24);

  const porMesRenovacao = new Map<string, { renovados: number; naoRenovados: number }>();
  for (const r of historyFiltrado) {
    if (r.origemContrato === "RENOVACAO") {
      const key = `${r.inicioContrato.getUTCFullYear()}-${String(r.inicioContrato.getUTCMonth() + 1).padStart(2, "0")}`;
      const atual = porMesRenovacao.get(key) ?? { renovados: 0, naoRenovados: 0 };
      atual.renovados += 1;
      porMesRenovacao.set(key, atual);
    }
    if (r.status === "ENCERRADO" && r.dataSaida) {
      const key = `${r.dataSaida.getUTCFullYear()}-${String(r.dataSaida.getUTCMonth() + 1).padStart(2, "0")}`;
      const atual = porMesRenovacao.get(key) ?? { renovados: 0, naoRenovados: 0 };
      atual.naoRenovados += 1;
      porMesRenovacao.set(key, atual);
    }
  }
  const renovacaoPorMes = Array.from(porMesRenovacao.entries())
    .map(([mes, v]) => ({ mes, ...v }))
    .sort((a, b) => a.mes.localeCompare(b.mes))
    .slice(-24);

  return {
    kpis: {
      ativos,
      pausados,
      vencidos,
      vencendo7: dentroDe(7),
      vencendo30: dentroDe(30),
      vencendo60: dentroDe(60),
      renovados,
      taxaRenovacaoPct,
      tcvEmRisco,
    },
    vencimentosPorMes,
    renovacaoPorMes,
  };
}
