import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const MAX_CONTRACT_CHARS = 15000;

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

/** Modelos onde thinking é adaptativo por padrão e o parâmetro `effort` existe — só nesses vale a pena desligar thinking/reduzir effort para ganhar velocidade. Em modelos mais simples (ex.: Haiku 4.5) esses parâmetros não existem e a API retorna 400. */
const MODELS_WITH_EFFORT_CONTROL = new Set([
  "claude-opus-5",
  "claude-sonnet-5",
  "claude-fable-5",
  "claude-mythos-5",
  "claude-opus-4-8",
  "claude-opus-4-7",
  "claude-opus-4-6",
  "claude-opus-4-5",
  "claude-sonnet-4-6",
]);

const SYSTEM_PROMPT = `Você extrai dados estruturados de contratos da Alpha a partir do texto bruto de um PDF.

Regras:
- Interprete o documento semanticamente. Não use suposições sobre a posição do texto no documento.
- Nunca invente informações. Se um campo não existir claramente no contrato, retorne null para ele.
- "nome", "documento", "email", "telefone", "cidade", "estado" e "cep" são sempre do CONTRATANTE (o
  cliente), nunca da CONTRATADA (a Alpha) — e nunca do foro do contrato, que reflete a jurisdição
  contratual, não o endereço do cliente.
- "documento" (CPF/CNPJ) deve ser TODOS os dígitos, sem pontuação. CNPJ tem 14 dígitos: 8 da raiz + 4
  da filial + 2 dígitos verificadores (ex.: "58.422.191/0001-60" -> "58422191000160"). Nunca devolva
  só a raiz do CNPJ (8 dígitos) — se o contrato mostrar o CNPJ pontuado ou não, transcreva o número
  completo como está escrito, incluindo a parte "/0001-XX" (ou outra filial) no final.
- "cidade" e "estado" só devem ser preenchidos se o nome da cidade/UF estiver escrito por extenso no
  endereço do CONTRATANTE. Nunca deduza a cidade a partir do CEP ou do DDD do telefone — isso é
  feito depois, de forma determinística, por uma consulta real ao CEP, não por você. Se o endereço só
  tiver rua/CEP, sem cidade/UF por extenso, retorne null para os dois.
- "cep" é o CEP do endereço do CONTRATANTE, apenas os 8 dígitos, sem hífen (ex.: "09942210"). null se
  não houver CEP no contrato.
- "estado" deve ser a sigla de UF com 2 letras (ex.: "SP", "RJ"), nunca o nome completo.
- "valorContrato" é o valor total do contrato como número puro (sem "R$", sem separador de milhar, ponto como separador decimal). Não calcule MRR/valor mensal.
- "inicioContrato" deve ser uma data no formato ISO "AAAA-MM-DD".
- "tipoContrato" e "duracaoMeses" devem ser inferidos da vigência/periodicidade do contrato:
  MENSAL=1 mês, TRIMESTRAL=3 meses, QUADRIMESTRAL=4 meses, SEMESTRAL=6 meses, ANUAL=12 meses.
  Exemplo: "Prestação Anual" -> tipoContrato "ANUAL", duracaoMeses 12.
- "renovacaoAutomatica" é true/false apenas se o contrato mencionar isso explicitamente; caso contrário null.`;

export async function extractContratoFromText(text: string): Promise<ContratoExtraido> {
  const client = new Anthropic();
  const model = process.env.ANTHROPIC_MODEL || "claude-opus-5";
  const hasEffortControl = MODELS_WITH_EFFORT_CONTROL.has(model);

  const message = await client.messages.parse({
    model,
    max_tokens: 2048,
    ...(hasEffortControl ? { thinking: { type: "disabled" as const } } : {}),
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: text.slice(0, MAX_CONTRACT_CHARS) }],
    output_config: {
      ...(hasEffortControl ? { effort: "low" as const } : {}),
      format: zodOutputFormat(contratoExtraidoSchema),
    },
  });

  if (!message.parsed_output) {
    throw new Error("A IA não retornou um resultado estruturado válido.");
  }

  return message.parsed_output;
}
