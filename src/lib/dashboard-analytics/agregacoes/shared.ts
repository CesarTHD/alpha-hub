// Helpers puros compartilhados por todas as agregações do Dashboard Analítico.
// Mesmo espírito de src/lib/carteira-calculos.ts: sem Prisma, testável, reaproveitado
// tanto pelas agregações quanto (indiretamente) pelos componentes client via useMemo.
import {
  STATUS_CONTRATO_LABEL,
  TIPO_CONTRATO_LABEL,
  diffMeses,
  fimEfetivoMs,
  vigenteNoInstante,
} from "@/lib/carteira-calculos";
import type { AnalyticsContratoRow, AnalyticsFiltros } from "@/lib/dashboard-analytics/types";

export type Bounds = { start: number; end: number };

export function monthBounds(mesRef: string): Bounds | null {
  if (!mesRef) return null;
  const [y, m] = mesRef.split("-").map(Number);
  if (!y || !m) return null;
  return { start: Date.UTC(y, m - 1, 1, 0, 0, 0), end: Date.UTC(y, m, 0, 23, 59, 59) };
}

export function prevMonthBounds(startMs: number): Bounds {
  const d = new Date(startMs);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  return { start: Date.UTC(y, m - 1, 1, 0, 0, 0), end: Date.UTC(y, m, 0, 23, 59, 59) };
}

export function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function endOfMonthMs(y: number, m: number): number {
  return Date.UTC(y, m + 1, 0, 23, 59, 59);
}

/** Variação percentual vs. base anterior — `null` quando não há base de
 *  comparação (evita mostrar uma seta +/- artificial em cima de zero). */
export function pctChange(atual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return ((atual - anterior) / anterior) * 100;
}

/** Snapshot: 1 linha por cliente, o contrato mais recente — mesma regra do
 *  dashboard atual, usada como base para filtros de estado atual. */
export function snapshotPorCliente(rows: AnalyticsContratoRow[]): AnalyticsContratoRow[] {
  const porCliente = new Map<string, AnalyticsContratoRow>();
  for (const r of rows) {
    const atual = porCliente.get(r.clienteId);
    if (!atual || r.inicioContrato > atual.inicioContrato) porCliente.set(r.clienteId, r);
  }
  return Array.from(porCliente.values());
}

function matchArr(arr: string[], v: string): boolean {
  return arr.length === 0 || arr.includes(v);
}

const ESTE_MES = "Este mês";

function venceEsteMes(vencimentoDias: number | null): boolean {
  if (vencimentoDias === null) return false;
  const hoje = new Date();
  const venc = new Date(hoje);
  venc.setDate(venc.getDate() + vencimentoDias);
  return venc.getFullYear() === hoje.getFullYear() && venc.getMonth() === hoje.getMonth();
}

function matchFaixa(arr: string[], d: AnalyticsContratoRow): boolean {
  if (arr.length === 0) return true;
  if (arr.includes(d.faixaVencimento)) return true;
  return arr.includes(ESTE_MES) && venceEsteMes(d.vencimentoDias);
}

/** Aplica os filtros globais a um snapshot (1 linha por cliente). */
export function filtrarSnapshot(rows: AnalyticsContratoRow[], filtros: AnalyticsFiltros): AnalyticsContratoRow[] {
  return rows.filter(
    (d) =>
      matchArr(filtros.profit, d.profit) &&
      matchArr(filtros.franquia, d.franquia) &&
      matchArr(filtros.status, STATUS_CONTRATO_LABEL[d.status]) &&
      matchArr(filtros.tipo, TIPO_CONTRATO_LABEL[d.tipoContrato]) &&
      matchArr(filtros.plano, d.plano) &&
      matchArr(filtros.uf, d.clienteEstado ?? "") &&
      matchArr(filtros.cidade, d.clienteCidade ?? "") &&
      matchFaixa(filtros.faixaVencimento, d),
  );
}

/** Histórico completo (todos os contratos, inclusive renovações já
 *  encerradas) dos clientes presentes no snapshot filtrado. */
export function historicoDosClientes(
  todasAsLinhas: AnalyticsContratoRow[],
  snapshotFiltrado: AnalyticsContratoRow[],
): AnalyticsContratoRow[] {
  const ids = new Set(snapshotFiltrado.map((d) => d.clienteId));
  return todasAsLinhas.filter((r) => ids.has(r.clienteId));
}

/** Linhas vigentes no instante `refEndMs` (ou agora, se não informado). */
export function baseVigente(rows: AnalyticsContratoRow[], refEndMs: number, agora: number): AnalyticsContratoRow[] {
  return rows.filter((d) => vigenteNoInstante(d, refEndMs, agora));
}

/** Primeiro contrato de cada cliente — usado para não contar renovações como
 *  "novo cliente" ao reconstruir aquisições por mês. */
export function primeiroContratoPorCliente(rows: AnalyticsContratoRow[]): Map<string, AnalyticsContratoRow> {
  const map = new Map<string, AnalyticsContratoRow>();
  for (const r of rows) {
    const atual = map.get(r.clienteId);
    if (!atual || r.inicioContrato < atual.inicioContrato) map.set(r.clienteId, r);
  }
  return map;
}

/** Lifetime médio (em meses) de um conjunto de linhas — 1 valor por cliente
 *  (contrato mais antigo até o fim efetivo mais recente, ou até `agora`). */
export function lifetimeMedioMeses(rows: AnalyticsContratoRow[], agora: number): number | null {
  const porCliente = new Map<string, { inicio: Date; fimMs: number | null }>();
  for (const r of rows) {
    const atual = porCliente.get(r.clienteId);
    const fimMs = fimEfetivoMs(r);
    if (!atual) {
      porCliente.set(r.clienteId, { inicio: r.inicioContrato, fimMs });
      continue;
    }
    if (r.inicioContrato < atual.inicio) atual.inicio = r.inicioContrato;
    if (fimMs !== null && (atual.fimMs === null || fimMs > atual.fimMs)) atual.fimMs = fimMs;
  }
  if (porCliente.size === 0) return null;
  let soma = 0;
  for (const { inicio, fimMs } of porCliente.values()) {
    soma += diffMeses(inicio, new Date(fimMs ?? agora));
  }
  return soma / porCliente.size;
}

/**
 * Churn = cliente saiu antes do fim do contrato (status CHURN). Encerrado =
 * contrato chegou ao fim natural e o cliente optou por não renovar (status
 * ENCERRADO). Sem mês de referência, são totais históricos (todo mundo que já
 * saiu); com mês de referência, só quem saiu (`dataSaida`) dentro do mês —
 * mesma distinção usada no dashboard atual.
 */
export function churnEEncerrados(
  history: AnalyticsContratoRow[],
  refBounds: Bounds | null,
): { churnIds: Set<string>; encerradoIds: Set<string> } {
  const dentroDoPeriodo = (r: AnalyticsContratoRow) =>
    !refBounds || (r.dataSaida !== null && r.dataSaida.getTime() >= refBounds.start && r.dataSaida.getTime() <= refBounds.end);

  const churnIds = new Set<string>();
  const encerradoIds = new Set<string>();
  for (const r of history) {
    if (r.status === "CHURN" && dentroDoPeriodo(r)) churnIds.add(r.clienteId);
    if (r.status === "ENCERRADO" && dentroDoPeriodo(r)) encerradoIds.add(r.clienteId);
  }
  return { churnIds, encerradoIds };
}

export const LIFETIME_BUCKETS = ["0–3 meses", "3–6 meses", "6–12 meses", "12–24 meses", "24+ meses"] as const;

export function bucketLifetime(meses: number): (typeof LIFETIME_BUCKETS)[number] {
  if (meses < 3) return "0–3 meses";
  if (meses < 6) return "3–6 meses";
  if (meses < 12) return "6–12 meses";
  if (meses < 24) return "12–24 meses";
  return "24+ meses";
}

export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/**
 * Caminha mês a mês (do primeiro `inicioContrato` do histórico até
 * `min(endBoundMs, agora)`), chamando `calc` com as linhas vigentes ao fim de
 * cada mês — mesma reconstrução de série temporal do dashboard atual,
 * fatorada aqui pra ser reaproveitada por todas as agregações que precisam de
 * uma série mensal (Visão Geral, Receita, Clientes, Retenção&Churn,
 * Performance). Trunca para os últimos 24 pontos.
 */
export function buildMonthlySeries<T extends Record<string, number>>(
  history: AnalyticsContratoRow[],
  endBoundMs: number,
  agora: number,
  calc: (vigentes: AnalyticsContratoRow[], mesFimMs: number) => T,
): Array<{ mes: string } & T> {
  if (history.length === 0) return [];
  const inicioMaisAntigo = history.reduce(
    (min, r) => Math.min(min, r.inicioContrato.getTime()),
    history[0].inicioContrato.getTime(),
  );
  const limite = Math.min(endBoundMs, agora);
  const inicio = new Date(inicioMaisAntigo);
  let y = inicio.getUTCFullYear();
  let m = inicio.getUTCMonth();

  const pontos: Array<{ mes: string } & T> = [];
  while (true) {
    const fimMes = endOfMonthMs(y, m);
    if (fimMes > limite) break;
    const vigentes = baseVigente(history, fimMes, agora);
    pontos.push({ mes: `${y}-${String(m + 1).padStart(2, "0")}`, ...calc(vigentes, fimMes) });
    m++;
    if (m > 11) {
      m = 0;
      y++;
    }
    if (pontos.length > 600) break; // salvaguarda, nunca deveria chegar aqui
  }
  // garante o próprio mês de referência/atual como último ponto
  const fimLimite = Math.min(endBoundMs, agora);
  const ultimoMes = pontos.at(-1)?.mes;
  const dLimite = new Date(fimLimite);
  const chaveLimite = `${dLimite.getUTCFullYear()}-${String(dLimite.getUTCMonth() + 1).padStart(2, "0")}`;
  if (ultimoMes !== chaveLimite) {
    const vigentes = baseVigente(history, fimLimite, agora);
    pontos.push({ mes: chaveLimite, ...calc(vigentes, fimLimite) });
  }
  return pontos.slice(-24);
}
