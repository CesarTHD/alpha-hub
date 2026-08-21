// Oportunidades: mesma leitura de "TCV mapeado vs. realizado" e "MRR ativo"
// do painel de vendas do HTML legado (gestao_franquias_v13_5.html), mas
// derivada 100% dos dados que já existem em Contrato — sem tabela nova:
//   - Oportunidade de TCV (mês) = contrato não-mensal cujo fimContrato cai no
//     mês de referência. "Realizado" quando o cliente já tem uma renovação
//     (origemContrato RENOVACAO) começando em/depois desse fim; "Mapeado"
//     enquanto isso não aconteceu (independente do status atual — Ativo,
//     Vencido ou Encerrado sem sucessor).
//   - Oportunidade de MRR = base total de contratos Mensais Ativos (vigentes
//     no fim do mês de referência) — não é um evento pontual do mês, é a
//     carteira recorrente a proteger/expandir.
import type { TipoContrato } from "@/generated/prisma/enums";
import { TIPO_CONTRATO_LABEL } from "@/lib/carteira-calculos";
import type { AnalyticsContratoRow, AnalyticsFiltros } from "@/lib/dashboard-analytics/types";
import { baseVigente, monthBounds, monthKey } from "./shared";

export type OportunidadeStatus = "mapeado" | "realizado";

export type OportunidadeItem = {
  contratoId: string;
  clienteId: string;
  cliente: string;
  franquia: string;
  profit: string;
  plano: string;
  tipoContrato: string;
  tipoContratoRaw: TipoContrato;
  fimContrato: Date;
  valor: number;
  valorMensal: number;
  renovacaoAutomatica: boolean;
  valorRealizado: number | null;
  status: OportunidadeStatus;
};

export type OportunidadesResult = {
  kpis: {
    tcvMapeado: number;
    tcvMapeadoQtd: number;
    tcvRealizado: number;
    tcvRealizadoQtd: number;
    taxaConversaoPct: number | null;
    mrrAtivo: number;
    mrrAtivoContratos: number;
    mrrAtivoClientes: number;
    ticketMedioMrr: number;
  };
  porFranquia: Array<{ franquia: string; mapeado: number; realizado: number }>;
  porProfit: Array<{ profit: string; mapeado: number; realizado: number }>;
  mrrPorFranquia: Array<{ franquia: string; mrr: number }>;
  evolucaoMensal: Array<{ mes: string; mapeado: number; realizado: number }>;
  itens: OportunidadeItem[];
};

/** Renovações (origemContrato RENOVACAO) de cada cliente, ordenadas por início —
 *  usadas para achar, pra cada contrato vencendo, se já existe um sucessor. */
function renovacoesPorCliente(rows: AnalyticsContratoRow[]): Map<string, AnalyticsContratoRow[]> {
  const map = new Map<string, AnalyticsContratoRow[]>();
  for (const r of rows) {
    if (r.origemContrato !== "RENOVACAO") continue;
    const lista = map.get(r.clienteId);
    if (lista) lista.push(r);
    else map.set(r.clienteId, [r]);
  }
  for (const lista of map.values()) lista.sort((a, b) => a.inicioContrato.getTime() - b.inicioContrato.getTime());
  return map;
}

function achaSucessora(porCliente: Map<string, AnalyticsContratoRow[]>, r: AnalyticsContratoRow): AnalyticsContratoRow | null {
  if (!r.fimContrato) return null;
  const fimMs = r.fimContrato.getTime();
  const lista = porCliente.get(r.clienteId);
  if (!lista) return null;
  return lista.find((c) => c.inicioContrato.getTime() >= fimMs) ?? null;
}

export function computeOportunidades(
  historyFiltrado: AnalyticsContratoRow[],
  filtros: AnalyticsFiltros,
  agora: number,
): OportunidadesResult {
  const hoje = new Date(agora);
  const mesRefEfetivo = filtros.mesRef || `${hoje.getUTCFullYear()}-${String(hoje.getUTCMonth() + 1).padStart(2, "0")}`;
  const bounds = monthBounds(mesRefEfetivo)!;
  const porCliente = renovacoesPorCliente(historyFiltrado);

  const naoMensais = historyFiltrado.filter((r) => r.tipoContrato !== "MENSAL" && r.fimContrato !== null);
  const vencendoNoMes = naoMensais.filter((r) => r.fimContrato!.getTime() >= bounds.start && r.fimContrato!.getTime() <= bounds.end);

  const itens: OportunidadeItem[] = vencendoNoMes
    .map((r) => {
      const sucessora = achaSucessora(porCliente, r);
      return {
        contratoId: r.contratoId,
        clienteId: r.clienteId,
        cliente: r.cliente,
        franquia: r.franquia,
        profit: r.profit,
        plano: r.plano,
        tipoContrato: TIPO_CONTRATO_LABEL[r.tipoContrato],
        tipoContratoRaw: r.tipoContrato,
        fimContrato: r.fimContrato!,
        valor: r.valorContrato,
        valorMensal: r.valorMensal,
        renovacaoAutomatica: r.renovacaoAutomatica,
        valorRealizado: sucessora ? sucessora.valorContrato : null,
        status: (sucessora ? "realizado" : "mapeado") as OportunidadeStatus,
      };
    })
    .sort((a, b) => a.fimContrato.getTime() - b.fimContrato.getTime());

  const mapeados = itens.filter((i) => i.status === "mapeado");
  const realizados = itens.filter((i) => i.status === "realizado");
  const tcvMapeado = mapeados.reduce((s, i) => s + i.valor, 0);
  const tcvRealizado = realizados.reduce((s, i) => s + (i.valorRealizado ?? 0), 0);

  const baseMrr = baseVigente(historyFiltrado, bounds.end, agora).filter((d) => d.tipoContrato === "MENSAL" && d.status === "ATIVO");
  const mrrAtivo = baseMrr.reduce((s, d) => s + d.valorMensal, 0);
  const mrrAtivoClientes = new Set(baseMrr.map((d) => d.clienteId)).size;

  const porFranquiaMap = new Map<string, { mapeado: number; realizado: number }>();
  const porProfitMap = new Map<string, { mapeado: number; realizado: number }>();
  for (const i of itens) {
    const valor = i.status === "realizado" ? (i.valorRealizado ?? 0) : i.valor;
    const fEntry = porFranquiaMap.get(i.franquia) ?? { mapeado: 0, realizado: 0 };
    const pEntry = porProfitMap.get(i.profit) ?? { mapeado: 0, realizado: 0 };
    fEntry[i.status] += valor;
    pEntry[i.status] += valor;
    porFranquiaMap.set(i.franquia, fEntry);
    porProfitMap.set(i.profit, pEntry);
  }
  const porFranquia = Array.from(porFranquiaMap.entries())
    .map(([franquia, v]) => ({ franquia, ...v }))
    .sort((a, b) => b.mapeado + b.realizado - (a.mapeado + a.realizado))
    .slice(0, 15);
  const porProfit = Array.from(porProfitMap.entries())
    .map(([profit, v]) => ({ profit, ...v }))
    .sort((a, b) => b.mapeado + b.realizado - (a.mapeado + a.realizado));

  const mrrPorFranquiaMap = new Map<string, number>();
  for (const d of baseMrr) mrrPorFranquiaMap.set(d.franquia, (mrrPorFranquiaMap.get(d.franquia) ?? 0) + d.valorMensal);
  const mrrPorFranquia = Array.from(mrrPorFranquiaMap.entries())
    .map(([franquia, mrr]) => ({ franquia, mrr }))
    .sort((a, b) => b.mrr - a.mrr)
    .slice(0, 15);

  const porMes = new Map<string, { mapeado: number; realizado: number }>();
  for (const r of naoMensais) {
    const sucessora = achaSucessora(porCliente, r);
    const key = monthKey(r.fimContrato!);
    const atual = porMes.get(key) ?? { mapeado: 0, realizado: 0 };
    if (sucessora) atual.realizado += sucessora.valorContrato;
    else atual.mapeado += r.valorContrato;
    porMes.set(key, atual);
  }
  const evolucaoMensal = Array.from(porMes.entries())
    .map(([mes, v]) => ({ mes, ...v }))
    .sort((a, b) => a.mes.localeCompare(b.mes))
    .slice(-18);

  return {
    kpis: {
      tcvMapeado,
      tcvMapeadoQtd: mapeados.length,
      tcvRealizado,
      tcvRealizadoQtd: realizados.length,
      taxaConversaoPct: itens.length > 0 ? (realizados.length / itens.length) * 100 : null,
      mrrAtivo,
      mrrAtivoContratos: baseMrr.length,
      mrrAtivoClientes,
      ticketMedioMrr: baseMrr.length > 0 ? mrrAtivo / baseMrr.length : 0,
    },
    porFranquia,
    porProfit,
    mrrPorFranquia,
    evolucaoMensal,
    itens,
  };
}
