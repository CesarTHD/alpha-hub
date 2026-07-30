const UTF8_BOM = String.fromCharCode(0xfeff);

function escapeCsvField(value: string): string {
  return /[",;\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Delimitador `;` porque o Excel em pt-BR abre CSV com vírgula como separador decimal, não de campo.
 * BOM no início para o Excel reconhecer UTF-8 (sem ele, acentos quebram ao abrir). */
export function buildCsv(headers: string[], rows: (string | number)[][]): string {
  const linhas = [headers, ...rows].map((cols) => cols.map((v) => escapeCsvField(String(v))).join(";"));
  return UTF8_BOM + linhas.join("\r\n");
}
