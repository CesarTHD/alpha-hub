const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export class D4SignError extends Error {}

/** Aceita tanto um UUID puro quanto um link do D4Sign contendo o UUID do documento. */
export function extractD4SignUuid(input: string): string | null {
  const match = input.trim().match(UUID_RE);
  return match ? match[0].toLowerCase() : null;
}

type D4SignDownloadLinkResponse = { url?: string; name?: string; message?: string };
type D4SignApiErrorBody = { status?: boolean; error?: string; message?: string };

/** Lê a mensagem de erro do D4Sign do corpo da resposta, quando houver (`{status:false, error:"..."}`). */
async function readD4SignErrorDetail(response: Response): Promise<string | null> {
  try {
    const body: D4SignApiErrorBody = await response.json();
    return body.error || body.message || null;
  } catch {
    return null;
  }
}

/**
 * Baixa o PDF de um documento do D4Sign. tokenAPI + cryptKey autenticam e autorizam o acesso ao
 * conteúdo (mecanismo de segurança nativo do D4Sign). O endpoint de download da API do D4Sign é
 * POST e não retorna o PDF diretamente: ele retorna um JSON com um link temporário (`url`), que
 * precisa ser baixado em uma segunda requisição para obter o arquivo de fato.
 */
export async function downloadD4SignDocumentPdf(uuid: string): Promise<Buffer> {
  const tokenAPI = process.env.D4SIGN_API_TOKEN;
  const cryptKey = process.env.D4SIGN_CRYPT_KEY;
  const baseUrl = process.env.D4SIGN_BASE_URL || "https://secure.d4sign.com.br/api/v1";

  if (!tokenAPI || !cryptKey) {
    throw new D4SignError("Integração com D4Sign não configurada.");
  }

  const downloadUrl = `${baseUrl}/documents/${uuid}/download?tokenAPI=${encodeURIComponent(tokenAPI)}&cryptKey=${encodeURIComponent(cryptKey)}`;

  let linkResponse: Response;
  try {
    linkResponse = await fetch(downloadUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "pdf", language: "pt", encoding: false }),
    });
  } catch {
    throw new D4SignError("Erro ao conectar com o D4Sign.");
  }

  if (linkResponse.status === 404) {
    throw new D4SignError("Documento não encontrado no D4Sign. Verifique o link/UUID.");
  }
  if (linkResponse.status === 401 || linkResponse.status === 403) {
    const detail = await readD4SignErrorDetail(linkResponse);
    if (detail && /tempo limite|limite de requisi|rate.?limit/i.test(detail)) {
      throw new D4SignError(
        "Limite de requisições ao D4Sign atingido para este método. Aguarde alguns instantes e tente novamente.",
      );
    }
    throw new D4SignError(
      detail
        ? `Erro de autenticação com o D4Sign: ${detail}`
        : "Credenciais do D4Sign inválidas ou sem acesso a este documento.",
    );
  }
  if (!linkResponse.ok) {
    const detail = await readD4SignErrorDetail(linkResponse);
    throw new D4SignError(detail ? `Erro ao baixar o contrato do D4Sign: ${detail}` : "Erro ao baixar o contrato do D4Sign.");
  }

  let linkData: D4SignDownloadLinkResponse;
  try {
    linkData = await linkResponse.json();
  } catch {
    throw new D4SignError("Resposta inesperada do D4Sign ao solicitar o download.");
  }

  if (!linkData.url) {
    throw new D4SignError(linkData.message || "O D4Sign não retornou um link de download para este documento.");
  }

  let fileResponse: Response;
  try {
    fileResponse = await fetch(linkData.url);
  } catch {
    throw new D4SignError("Erro ao baixar o arquivo do D4Sign.");
  }
  if (!fileResponse.ok) {
    throw new D4SignError("Erro ao baixar o arquivo do D4Sign.");
  }

  const buffer = Buffer.from(await fileResponse.arrayBuffer());

  if (!buffer.subarray(0, 5).toString("latin1").startsWith("%PDF-")) {
    console.error(`[D4Sign] Arquivo baixado para o documento ${uuid} não é um PDF válido.`);
    throw new D4SignError("O D4Sign não retornou um arquivo PDF válido para este documento.");
  }

  return buffer;
}
