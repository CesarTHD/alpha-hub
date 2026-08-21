import { buildCsv } from "@/lib/export/csv";
import type { DadoRow } from "@/lib/dashboard-analytics/agregacoes/dados";

const dataStr = (d: Date | null) => (d ? d.toLocaleDateString("pt-BR") : "");

export function buildDadosCsv(rows: DadoRow[]): string {
  const headers = [
    "Cliente",
    "Franquia",
    "Cidade",
    "UF",
    "Plano",
    "Status",
    "Tipo de Contrato",
    "MRR",
    "TCV",
    "Início",
    "Vencimento",
    "Lifetime (meses)",
    "Data de Saída",
  ];
  const linhas = rows.map((r) => [
    r.cliente,
    r.franquia,
    r.cidade,
    r.uf,
    r.plano,
    r.status,
    r.tipoContrato,
    r.mrr.toFixed(2),
    r.tcv.toFixed(2),
    dataStr(r.inicio),
    dataStr(r.vencimento),
    r.lifetimeMeses.toFixed(1),
    dataStr(r.dataSaida),
  ]);
  return buildCsv(headers, linhas);
}
