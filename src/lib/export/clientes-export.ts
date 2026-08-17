import writeExcelFile from "write-excel-file/node";
import { buildCsv } from "./csv";

export type ClienteExportRow = {
  nome: string;
  documento: string;
  email: string;
  telefone: string;
  cidade: string;
  estado: string;
  franquia: string;
  profit: string;
  plano: string;
  valorMensal: number | null;
  vencimento: string;
  status: string;
  quantidadeContratos: number;
  linkContrato: string;
};

const HEADERS = [
  "Nome",
  "CPF/CNPJ",
  "E-mail",
  "Telefone",
  "Cidade",
  "Estado",
  "Franquia",
  "Profit",
  "Plano",
  "Valor mensal",
  "Vencimento",
  "Status",
  "Qtd. contratos",
  "Contrato",
];

function toRowValues(row: ClienteExportRow): (string | number)[] {
  return [
    row.nome,
    row.documento,
    row.email,
    row.telefone,
    row.cidade,
    row.estado,
    row.franquia,
    row.profit,
    row.plano,
    row.valorMensal ?? "",
    row.vencimento,
    row.status,
    row.quantidadeContratos,
    row.linkContrato,
  ];
}

export function buildClientesCsv(rows: ClienteExportRow[]): string {
  return buildCsv(HEADERS, rows.map(toRowValues));
}

export async function buildClientesXlsx(rows: ClienteExportRow[]): Promise<Buffer> {
  const sheetData = [HEADERS, ...rows.map(toRowValues)];
  return writeExcelFile(sheetData).toBuffer();
}
