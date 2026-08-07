import type { D4SignDocumentoResumo } from "./client";

export type CandidatoMatch = {
  uuidDocumento: string;
  nomeDocumento: string;
  statusName: string;
};

/** Palavras que aparecem no nome do arquivo mas não identificam o cliente. */
const RUIDO = new Set([
  "pdf",
  "termo",
  "contrato",
  "franquia",
  "aditivo",
  "renovacao",
  "renovação",
  "prestacao",
  "prestação",
  "servico",
  "serviço",
  "servicos",
  "serviços",
  "de",
  "da",
  "do",
  "e",
  "ltda",
  "me",
  "eireli",
  "epp",
  "unidade",
  "sinal",
]);

/** Status do D4Sign que ainda valem como candidato de contrato de cliente. "Cancelado" nunca
 * entra — documento cancelado não é um contrato válido em nenhuma hipótese. */
const STATUS_CONSIDERADOS = new Set(["Finalizado", "Aguardando Assinaturas", "Aguardando Signatários"]);

/** Prioridade entre status: Finalizado sempre vence — é o único juridicamente completo. As duas
 * variantes de "aguardando" contam como o mesmo nível (só existem porque o D4Sign às vezes
 * chama diferente dependendo de quem falta assinar). */
export const PRIORIDADE_STATUS: Record<string, number> = {
  Finalizado: 0,
  "Aguardando Assinaturas": 1,
  "Aguardando Signatários": 1,
};

const DIACRITICOS_RE = new RegExp("[\\u0300-\\u036f]", "g");

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(DIACRITICOS_RE, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .trim();
}

function palavrasSignificativas(texto: string): Set<string> {
  return new Set(
    normalizar(texto)
      .split(/\s+/)
      // length > 1 descarta letra solta (ex.: "Anselmo's" -> "anselmo s")
      .filter((p) => p.length > 1 && !RUIDO.has(p) && !/^\d+$/.test(p)),
  );
}

function contemTodas(alvo: Set<string>, doc: Set<string>): boolean {
  if (alvo.size === 0) return false;
  for (const palavra of alvo) {
    if (!doc.has(palavra)) return false;
  }
  return true;
}

function mesmoConjunto(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const p of a) if (!b.has(p)) return false;
  return true;
}

/**
 * Todos os documentos do D4Sign (Finalizado ou aguardando assinatura — nunca Cancelado) cujo
 * nome contém TODAS as palavras significativas do nome do cliente (ignora acentuação, pontuação,
 * e ruído como "pdf"/"termo"/"contrato"/números de revisão soltos).
 *
 * Pode devolver mais de um candidato: um cliente real pode ter mais de um documento no D4Sign
 * (contrato antigo + renovação, um aditivo, ou até uma tentativa cancelada e refeita). Decidir
 * qual usar — por prioridade de status e, se ainda empatado, por conteúdo do contrato — é
 * responsabilidade de quem chama (ver scripts/matching-d4sign.ts); aqui só levantamos candidatos.
 */
export function encontrarCandidatos(nomeCliente: string, documentos: D4SignDocumentoResumo[]): CandidatoMatch[] {
  const alvo = palavrasSignificativas(nomeCliente);
  if (alvo.size === 0) return [];

  return documentos
    .filter((doc) => STATUS_CONSIDERADOS.has(doc.statusName))
    .filter((doc) => contemTodas(alvo, palavrasSignificativas(doc.nameDoc)))
    .map((doc) => ({ uuidDocumento: doc.uuidDoc, nomeDocumento: doc.nameDoc, statusName: doc.statusName }));
}

/** true se o nome do documento bate com TODAS e SOMENTE as palavras do nome do cliente (conjunto
 * idêntico, não só "contém todas") — um nome curto como "Big Burguer" contém todas as suas
 * palavras dentro de "Big Bang Burguer" também, o que seria um falso positivo perigoso pra
 * confiança ALTA se "contém todas" já bastasse. */
export function nomeCasaExatamente(nomeCliente: string, nomeDocumento: string): boolean {
  return mesmoConjunto(palavrasSignificativas(nomeCliente), palavrasSignificativas(nomeDocumento));
}
