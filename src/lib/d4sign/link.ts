// Funções puras, sem segredo de API — seguras para importar tanto no servidor
// quanto em componentes client (ao contrário de client.ts, que referencia
// D4SIGN_API_TOKEN/D4SIGN_CRYPT_KEY e nunca deve ser importado no client).

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** Aceita tanto um UUID puro quanto um link do D4Sign contendo o UUID do documento. */
export function extractD4SignUuid(input: string): string | null {
  const match = input.trim().match(UUID_RE);
  return match ? match[0].toLowerCase() : null;
}

/** Link de visualização do documento no D4Sign (o que se abre no navegador, não o de download da API). */
export function buildD4SignViewLink(uuid: string): string {
  return `https://secure.d4sign.com.br/desk/viewblob/${uuid}`;
}

/** Normaliza uma entrada (link ou UUID puro) para o link canônico de visualização.
 * Retorna null se não der pra extrair um UUID válido. */
export function normalizeD4SignLink(input: string): string | null {
  const uuid = extractD4SignUuid(input);
  return uuid ? buildD4SignViewLink(uuid) : null;
}
