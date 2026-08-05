import type { D4SignDocumentoResumo } from "./client";

export type Confianca = "ALTA" | "MEDIA";

export type CandidatoMatch = {
  uuidDocumento: string;
  nomeDocumento: string;
  confianca: Confianca;
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
 * Casa um cliente com documento(s) "Finalizado" do D4Sign cujo nome contém
 * TODAS as palavras significativas do nome do cliente (ignora acentuação,
 * pontuação, e ruído como "pdf"/"termo"/"contrato"/números de revisão soltos).
 *
 * Confiança ALTA exige as duas coisas: candidato único E conjunto de palavras
 * idêntico (não só "contém todas") — um nome curto como "Big Burguer" contém
 * todas as suas palavras dentro de "Big Bang Burguer" também, o que seria um
 * falso positivo perigoso se isso já bastasse pra confiança alta. Sobrando
 * palavra extra no documento, ou mais de um candidato, cai pra MEDIA — fica
 * pra revisão manual mesmo assim, mas sinalizado como menos confiável.
 *
 * Não desempata por data quando há múltiplos candidatos — baixar todos pra
 * comparar data custaria cota de download à toa; isso fica pra revisão manual.
 */
export function encontrarMelhorCandidato(
  nomeCliente: string,
  documentosFinalizados: D4SignDocumentoResumo[],
): CandidatoMatch | null {
  const alvo = palavrasSignificativas(nomeCliente);
  if (alvo.size === 0) return null;

  const candidatos = documentosFinalizados.filter((doc) => contemTodas(alvo, palavrasSignificativas(doc.nameDoc)));
  if (candidatos.length === 0) return null;

  const escolhido = candidatos[0];
  const confianca: Confianca =
    candidatos.length === 1 && mesmoConjunto(alvo, palavrasSignificativas(escolhido.nameDoc)) ? "ALTA" : "MEDIA";
  return { uuidDocumento: escolhido.uuidDoc, nomeDocumento: escolhido.nameDoc, confianca };
}
