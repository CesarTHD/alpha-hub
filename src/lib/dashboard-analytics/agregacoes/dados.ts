import { STATUS_CONTRATO_LABEL, TIPO_CONTRATO_LABEL, diffMeses } from "@/lib/carteira-calculos";
import type { AnalyticsContratoRow } from "@/lib/dashboard-analytics/types";

export type DadoRow = {
  contratoId: string;
  clienteId: string;
  cliente: string;
  franquia: string;
  cidade: string;
  uf: string;
  plano: string;
  status: string;
  tipoContrato: string;
  mrr: number;
  tcv: number;
  inicio: Date;
  vencimento: Date | null;
  lifetimeMeses: number;
  dataSaida: Date | null;
};

/** Normaliza o snapshot (1 linha por cliente) para a tabela bruta da aba
 *  Dados — mesma fonte usada pelas outras abas, sem nenhuma coluna inventada. */
export function buildDadosRows(snapshotFiltrado: AnalyticsContratoRow[], agora: number): DadoRow[] {
  return snapshotFiltrado.map((d) => ({
    contratoId: d.contratoId,
    clienteId: d.clienteId,
    cliente: d.cliente,
    franquia: d.franquia,
    cidade: d.clienteCidade ?? "—",
    uf: d.clienteEstado ?? "—",
    plano: d.plano,
    status: STATUS_CONTRATO_LABEL[d.status],
    tipoContrato: TIPO_CONTRATO_LABEL[d.tipoContrato],
    mrr: d.tipoContrato === "MENSAL" ? d.valorMensal : 0,
    tcv: d.tipoContrato !== "MENSAL" ? d.valorContrato : 0,
    inicio: d.inicioContrato,
    vencimento: d.fimContrato,
    lifetimeMeses: diffMeses(d.inicioContrato, new Date(d.dataSaida?.getTime() ?? agora)),
    dataSaida: d.dataSaida,
  }));
}
