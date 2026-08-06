import { z } from "zod";

export const contratoExtraidoSchema = z.object({
  nome: z.string().nullable(),
  documento: z.string().nullable(),
  email: z.string().nullable(),
  telefone: z.string().nullable(),
  cidade: z.string().nullable(),
  estado: z.string().nullable(),
  cep: z.string().nullable(),
  plano: z.string().nullable(),
  valorContrato: z.number().nullable(),
  tipoContrato: z.enum(["MENSAL", "TRIMESTRAL", "QUADRIMESTRAL", "SEMESTRAL", "ANUAL"]).nullable(),
  duracaoMeses: z.number().nullable(),
  inicioContrato: z.string().nullable(),
  formaPagamento: z.string().nullable(),
  renovacaoAutomatica: z.boolean().nullable(),
});

export type ContratoExtraido = z.infer<typeof contratoExtraidoSchema>;

type TipoContrato = NonNullable<ContratoExtraido["tipoContrato"]>;

/** CNPJs das próprias entidades da Alpha que já assinaram contratos como CONTRATADA (a razão
 * social mudou ao longo do tempo). Se um desses acabar capturado como documento do CONTRATANTE,
 * é sinal de que o bloco errado do texto foi lido (ex.: aditivos de subcontratação, onde os
 * papéis CONTRATANTE/CONTRATADA se invertem) — melhor devolver null do que um dado errado. */
const CNPJS_PROPRIOS_ALPHA = new Set(["48684183000138", "59693915000172"]);

const DURACAO_POR_TIPO: Record<TipoContrato, number> = {
  MENSAL: 1,
  TRIMESTRAL: 3,
  QUADRIMESTRAL: 4,
  SEMESTRAL: 6,
  ANUAL: 12,
};

const FIM_SECAO_CONTRATANTE =
  /CL[ÁA]USULA\s*1[ªº.:]|CL[ÁA]USULA\s*PRIMEIRA|DO\s+OBJETO\s+DO\s+CONTRATO|pelo\s+presente\s+instrumento\s+particular/i;

/** Isola o trecho do texto que descreve o CONTRATANTE (nunca a CONTRATADA nem o foro): do
 * primeiro "CONTRATANTE" até o começo das cláusulas do contrato. Exige a palavra "Endereço"
 * dentro do trecho como prova de que capturou o bloco certo — sem isso, alguns modelos de
 * aditivo/documento não-contratual acabam sem essa palavra e é mais seguro devolver null do
 * que arriscar misturar dados da CONTRATADA. */
function extrairSecaoContratante(text: string): string | null {
  const inicio = text.search(/CONTRATANTE/i);
  if (inicio === -1) return null;

  const resto = text.slice(inicio, inicio + 700);
  const fimMatch = resto.match(FIM_SECAO_CONTRATANTE);
  const secao = fimMatch ? resto.slice(0, fimMatch.index) : resto;

  return /Endere[çc]o/i.test(secao) ? secao : null;
}

function extrairNomeDocumento(secao: string): { nome: string | null; documento: string | null } {
  const cnpjMatch = secao.match(/CNPJ:?\s*([\d./-]{14,20})/i);
  const cpfMatch = secao.match(/CPF:?\s*([\d./-]{11,14})/i);
  const documento = (cnpjMatch?.[1] ?? cpfMatch?.[1] ?? "").replace(/\D/g, "") || null;

  let nomePart = secao
    .replace(/CONTRATANTE/i, "")
    .replace(/,?\s*a\s+empresa\s*/i, " ")
    .split(/Endere[çc]o/i)[0]
    .replace(/CNPJ:?\s*[\d./-]{11,20}/gi, "")
    .replace(/CPF:?\s*[\d./-]{11,20}/gi, "")
    .trim();
  nomePart = nomePart.replace(/[,\s]+$/, "");

  const partes = nomePart
    .split("/")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const nome = partes.length > 0 ? partes[partes.length - 1] : nomePart.replace(/\s+/g, " ").trim();

  return { nome: nome || null, documento };
}

type CamposCadastrais = Pick<
  ContratoExtraido,
  "nome" | "documento" | "email" | "telefone" | "cidade" | "estado" | "cep"
>;

const CADASTRAIS_VAZIOS: CamposCadastrais = {
  nome: null,
  documento: null,
  email: null,
  telefone: null,
  cidade: null,
  estado: null,
  cep: null,
};

function extrairCadastrais(text: string): CamposCadastrais {
  const secao = extrairSecaoContratante(text);
  if (!secao) return CADASTRAIS_VAZIOS;

  const { nome, documento } = extrairNomeDocumento(secao);
  if (documento && CNPJS_PROPRIOS_ALPHA.has(documento)) return CADASTRAIS_VAZIOS;

  const cepMatch = secao.match(/CEP:?\s*(\d{2}\.?\d{3}-?\d{3})/i);
  const emailMatch = secao.match(/E-?mail:?\s*([\w.+-]+@[\w-]+\.[\w.-]+)/i);
  const telMatch = secao.match(/[Tt]elefone\s*n?[°ºo]?:?\s*([\d()\s.-]{8,20})/i);
  // Cidade/estado só quando escritos por extenso com separador explícito ("Cidade - UF" /
  // "Cidade/UF") logo antes do CEP — sem isso, fica null e quem chama resolve por CEP via
  // ViaCEP (determinístico; ver src/lib/cep.ts), em vez de arriscar um palpite por regex.
  const cidadeEstadoMatch = secao.match(/([A-ZÀ-Ÿ][A-Za-zÀ-ÿ]+)\s*[-–\/]\s*([A-Z]{2})\s*,?\s*CEP/);

  return {
    nome,
    documento,
    email: emailMatch ? emailMatch[1].toLowerCase() : null,
    telefone: telMatch ? telMatch[1].replace(/\D/g, "") || null : null,
    cep: cepMatch ? cepMatch[1].replace(/\D/g, "") : null,
    cidade: cidadeEstadoMatch ? cidadeEstadoMatch[1].trim() : null,
    estado: cidadeEstadoMatch ? cidadeEstadoMatch[2].toUpperCase() : null,
  };
}

function capitalizar(v: string): string {
  const lower = v.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function extrairPlano(text: string): string | null {
  const citado = text.match(/Plano\s+["“]([^"”]{2,40})["”]/i);
  if (citado) return capitalizar(citado[1].trim());

  // Exige o traço logo depois ("PLANO SILVER - Objetivo...") pra não confundir com títulos de
  // cláusula como "DO PLANO E PRAZO DE VIGÊNCIA", onde "PLANO" também aparece seguido de palavra.
  const palavra = text.match(/PLANO\s+([A-Za-zÀ-ÿ]+)\s*[-–]/);
  if (palavra) return capitalizar(palavra[1]);

  return null;
}

function extrairTipoContrato(text: string): TipoContrato | null {
  const match =
    text.match(/per[íi]odo\s+de\s+presta[çc][ãa]o\s+(Mensal|Trimestral|Quadrimestral|Semestral|Anual)/i) ??
    text.match(/vig[êe]ncia[^]{0,60}?(mensal|trimestral|quadrimestral|semestral|anual)/i);
  if (!match) return null;
  return match[1].toUpperCase() as TipoContrato;
}

function parseNumeroBR(raw: string): number | null {
  const cleaned = raw.trim();
  if (!cleaned) return null;

  let normalizado: string;
  if (cleaned.includes(",")) {
    normalizado = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    normalizado = cleaned.replace(/\./g, "");
  } else {
    normalizado = cleaned;
  }

  const n = Number(normalizado);
  return Number.isFinite(n) ? n : null;
}

function extrairValor(text: string): number | null {
  // Ancorado na cláusula de honorários pra pegar o valor TOTAL, não uma parcela solta que
  // apareça em outra cláusula (ex.: valores de referência de rescisão, multas em R$).
  const anchored = text.match(/receber[áa]\s*,?\s*o\s+valor(?:\s+total)?\s+de\s+R\$\s*([\d.,]*\d)/i);
  if (anchored) {
    const v = parseNumeroBR(anchored[1]);
    if (v !== null) return v;
  }

  const generico = text.match(/R\$\s*([\d.,]*\d)/);
  return generico ? parseNumeroBR(generico[1]) : null;
}

function extrairInicioContrato(text: string): string | null {
  // Só a forma "no dia DD/MM/AAAA" (a mais usada na cláusula de honorários/pagamento). Um
  // fallback "qualquer data DD/MM/AAAA do documento" foi cogitado (é o que o projeto de
  // referência faz) mas descartado: contratos reais têm outras datas soltas (aditivos,
  // referências a "Contrato Original") que virariam falso positivo.
  const explicito = text.match(/(?:no\s+dia|na\s+data\s+de)\s+(\d{2})\/(\d{2})\/(\d{4})/i);
  if (explicito) return `${explicito[3]}-${explicito[2]}-${explicito[1]}`;

  const vig = text.match(/(?:in[íi]cio\s+de\s+vig[êe]ncia|data\s+de\s+assinatura)[^\d]{0,30}(\d{2})\/(\d{2})\/(\d{4})/i);
  if (vig) return `${vig[3]}-${vig[2]}-${vig[1]}`;

  return null;
}

function extrairFormaPagamento(text: string): string | null {
  // Sempre ancorado em "no dia"/"na data de" (a cláusula de honorários/pagamento) — sem isso,
  // "através de"/"por meio de" aparece em várias outras cláusulas do contrato (ex.: como o
  // cliente paga o investimento em mídia, não os honorários da Alpha) e vira falso positivo.
  const porExtenso = text.match(
    /(?:atrav[ée]s\s+de|por\s+meio\s+de)\s+([^{}]{2,40}?)\s*,?\s*(?:no\s+dia|na\s+data\s+de)/i,
  );
  if (porExtenso) {
    const limpo = porExtenso[1].replace(/\s+/g, " ").replace(/[,\s]+$/, "").trim();
    if (limpo) return limpo;
  }

  const viaForma = text.match(/via\s+(PIX|pix|cart[ãa]o|boleto)\s*,?\s*(?:no\s+dia|na\s+data\s+de)/i);
  if (viaForma) return viaForma[1].toUpperCase();

  return null;
}

function extrairRenovacaoAutomatica(text: string): boolean | null {
  const trecho = text.match(/renova[çc][ãa]o[\s\S]{0,200}/i)?.[0];
  if (!trecho) return null;

  if (/n[ãa]o\s+haver[áa]|sem\s+renova[çc][ãa]o/i.test(trecho)) return false;
  if (/autom[áa]tic/i.test(trecho)) return true;
  return null;
}

/** Extrai os dados de um contrato da Alpha via regex, sem IA — modelado nos contratos reais já
 * assinados (dois modelos de cláusula em uso, ver testes). Segue as mesmas regras da extração
 * anterior por IA: nome/documento/email/telefone/cidade/estado/cep são sempre do CONTRATANTE,
 * nunca da CONTRATADA; CNPJ tem preferência sobre CPF quando os dois aparecem; cidade/estado só
 * quando escritos por extenso no endereço (nunca deduzidos do CEP — isso é feito depois, de
 * forma determinística, pela consulta ao CEP em contrato-pdf-pipeline.ts). Campos não encontrados
 * voltam null — nunca um palpite. */
export function extractContratoFromText(text: string): ContratoExtraido {
  const cadastrais = extrairCadastrais(text);
  const tipoContrato = extrairTipoContrato(text);

  return {
    ...cadastrais,
    plano: extrairPlano(text),
    valorContrato: extrairValor(text),
    tipoContrato,
    duracaoMeses: tipoContrato ? DURACAO_POR_TIPO[tipoContrato] : null,
    inicioContrato: extrairInicioContrato(text),
    formaPagamento: extrairFormaPagamento(text),
    renovacaoAutomatica: extrairRenovacaoAutomatica(text),
  };
}
