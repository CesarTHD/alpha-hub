import writeExcelFile from "write-excel-file/node";
import { buildCsv } from "./csv";

export type FranquiaExportRow = {
  nome: string;
  cidade: string;
  estado: string;
  profit: string;
  clientesAtivos: number;
  clientesChurn: number;
  taxaChurn: number;
  status: string;
};

const HEADERS = [
  "Nome",
  "Cidade",
  "Estado",
  "Profit responsável",
  "Clientes ativos",
  "Clientes churn",
  "Taxa de churn (%)",
  "Status",
];

function toRowValues(row: FranquiaExportRow): (string | number)[] {
  return [
    row.nome,
    row.cidade,
    row.estado,
    row.profit,
    row.clientesAtivos,
    row.clientesChurn,
    Number(row.taxaChurn.toFixed(2)),
    row.status,
  ];
}

export function buildFranquiasCsv(rows: FranquiaExportRow[]): string {
  return buildCsv(HEADERS, rows.map(toRowValues));
}

export async function buildFranquiasXlsx(rows: FranquiaExportRow[]): Promise<Buffer> {
  const sheetData = [HEADERS, ...rows.map(toRowValues)];
  return writeExcelFile(sheetData).toBuffer();
}
