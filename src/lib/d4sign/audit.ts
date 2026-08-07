/** Extrai a data de criação do documento no D4Sign a partir do log de eventos embutido no
 * próprio texto do PDF ("Documento {uuid} criado por ... DATE_ATOM: AAAA-MM-DDTHH:MM:SS-03:00").
 * A API de listagem (`listarTodosDocumentosD4Sign`) não expõe nenhuma data — só nome e status —
 * então isso só dá pra saber lendo o conteúdo do PDF. Útil pra desempatar candidatos de match
 * pela proximidade com o início de contrato já cadastrado, quando o nome sozinho não basta. */
export function extrairDataCriacaoDocumento(texto: string): Date | null {
  const match = texto.match(/criado\s+por[\s\S]{0,200}?DATE_ATOM:\s*(\d{4}-\d{2}-\d{2})/i);
  if (!match) return null;
  const data = new Date(`${match[1]}T00:00:00`);
  return Number.isNaN(data.getTime()) ? null : data;
}
