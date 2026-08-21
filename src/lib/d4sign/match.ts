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

function tokenizar(texto: string): string[] {
  return normalizar(texto)
    .split(/\s+/)
    // length > 1 descarta letra solta (ex.: "Anselmo's" -> "anselmo s")
    .filter((p) => p.length > 1 && !RUIDO.has(p) && !/^\d+$/.test(p));
}

function palavrasSignificativas(texto: string): Set<string> {
  return new Set(tokenizar(texto));
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

// --- Fallback fuzzy: só entra em ação quando encontrarCandidatos() não achou nada -------------
//
// A exigência de "contém todas as palavras" (encontrarCandidatos) erra por falta em casos legítimos
// de erro de digitação ("Pampula" no cliente vs "Pampulha" no documento), plural/singular
// ("Coxinhas" vs "Coxinha") e palavra composta grafada junta/separada ("Hotdog" vs "Hot Dog").
// O fuzzy match abaixo tolera esses casos, mas com uma trava importante: descritores de categoria
// que aparecem em muitos documentos ("pizzaria", "burguer", "restaurante"...) não contam como
// palavra que precisa bater — só as palavras ESPECÍFICAS do nome do cliente (as raras, que de fato
// identificam QUAL cliente é) precisam ter equivalente no documento. Isso evita o falso positivo
// mais perigoso do domínio: duas unidades da mesma marca ("Trilhas da Amazônia Recreio" vs
// "...Copacabana") não podem ser confundidas só porque compartilham as palavras genéricas da marca.

/** Palavra em FREQUENCIA_GENERICA_MIN+ documentos é descritor de categoria/segmento (pizzaria,
 * burguer, restaurante...), não identifica QUAL cliente é — pode ficar de fora do fuzzy match. */
const FREQUENCIA_GENERICA_MIN = 15;

/** Conta em quantos documentos (considerados, nunca Cancelado) cada palavra significativa aparece
 * — usado por encontrarCandidatosFuzzy pra distinguir descritor genérico de palavra específica. */
export function calcularFrequenciaPalavras(documentos: D4SignDocumentoResumo[]): Map<string, number> {
  const frequencia = new Map<string, number>();
  for (const doc of documentos) {
    if (!STATUS_CONSIDERADOS.has(doc.statusName)) continue;
    for (const palavra of palavrasSignificativas(doc.nameDoc)) {
      frequencia.set(palavra, (frequencia.get(palavra) ?? 0) + 1);
    }
  }
  return frequencia;
}

function levenshtein(a: string, b: string): number {
  const linhas = a.length + 1;
  const colunas = b.length + 1;
  const dp: number[][] = Array.from({ length: linhas }, () => new Array(colunas).fill(0));
  for (let i = 0; i < linhas; i++) dp[i][0] = i;
  for (let j = 0; j < colunas; j++) dp[0][j] = j;
  for (let i = 1; i < linhas; i++) {
    for (let j = 1; j < colunas; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[linhas - 1][colunas - 1];
}

/** Duas palavras "significam a mesma coisa" pra fins de match: idênticas, ou próximas o bastante
 * (erro de digitação, plural/singular) pra não ser coincidência. Palavra curta (<=3 letras) exige
 * igualdade exata — sigla/abreviação curta demais pra tolerar distância sem virar colisão (ex.:
 * "jm" vs "pk"). */
function palavrasEquivalentes(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length <= 3 || b.length <= 3) return false;
  const distanciaMaxima = Math.max(a.length, b.length) <= 6 ? 1 : 2;
  return levenshtein(a, b) <= distanciaMaxima;
}

/** true se a palavra do cliente bate com algum token do documento — direto, ou com dois tokens
 * ADJACENTES do documento concatenados (cobre "Hotdog" no cliente vs "Hot Dog" no documento).
 *
 * Só considera como alvo válido um token do documento que TAMBÉM seja específico (raro no
 * corpus) — senão a tolerância por distância de edição vira uma roleta: uma palavra específica
 * curta (ex.: "cast") acaba "batendo" por 1 letra de diferença com um descritor genérico comum
 * (ex.: "casa", em 55 documentos) que não tem nada a ver com o cliente. Toleramos digitação
 * errada entre duas palavras raras — não entre uma rara e uma genérica qualquer. */
function encontraEquivalente(
  palavraAlvo: string,
  tokensDocumento: string[],
  frequenciaPalavras: Map<string, number>,
): boolean {
  const especifico = (p: string) => (frequenciaPalavras.get(p) ?? 0) < FREQUENCIA_GENERICA_MIN;
  const tokensEspecificos = tokensDocumento.filter(especifico);
  if (tokensEspecificos.some((t) => palavrasEquivalentes(t, palavraAlvo))) return true;
  for (let i = 0; i < tokensDocumento.length - 1; i++) {
    const par = tokensDocumento[i] + tokensDocumento[i + 1];
    if (especifico(par) && palavrasEquivalentes(par, palavraAlvo)) return true;
  }
  return false;
}

/**
 * Fallback de encontrarCandidatos() pra quando ela não acha nada: mesma ideia ("documento precisa
 * ter todas as palavras que identificam o cliente"), mas tolerando erro de digitação, plural/
 * singular e palavra composta junta/separada, e ignorando descritores de categoria genéricos
 * demais pra identificar o cliente (ver calcularFrequenciaPalavras).
 *
 * Sempre BAIXA confiança pra quem chama — o nome bateu por aproximação, não por igualdade; exige
 * revisão manual mesmo que os dados do contrato depois batam com o cadastro.
 */
export function encontrarCandidatosFuzzy(
  nomeCliente: string,
  documentos: D4SignDocumentoResumo[],
  frequenciaPalavras: Map<string, number>,
): CandidatoMatch[] {
  const alvo = tokenizar(nomeCliente);
  if (alvo.length === 0) return [];

  const especificas = alvo.filter((p) => (frequenciaPalavras.get(p) ?? 0) < FREQUENCIA_GENERICA_MIN);
  // Uma só palavra específica não tem outra pra "confirmar" o match — vira roleta, principalmente
  // com nome próprio/sobrenome comum (ex.: "Fonseca", "Santana", "Caio"), que é raro no corpus
  // (não conta como descritor genérico) mas ainda assim comum demais como identificador sozinho:
  // some documento é o distrato/contrato de alguma pessoa que por coincidência tem esse mesmo
  // nome. Exige pelo menos duas palavras específicas se confirmando uma à outra.
  if (especificas.length < 2) return [];

  return documentos
    .filter((doc) => STATUS_CONSIDERADOS.has(doc.statusName))
    .filter((doc) => {
      const tokensDoc = tokenizar(doc.nameDoc);
      return especificas.every((palavraAlvo) => encontraEquivalente(palavraAlvo, tokensDoc, frequenciaPalavras));
    })
    .map((doc) => ({ uuidDocumento: doc.uuidDoc, nomeDocumento: doc.nameDoc, statusName: doc.statusName }));
}
