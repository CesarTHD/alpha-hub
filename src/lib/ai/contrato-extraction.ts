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
  plano: z.string().nullable(),
  valorContrato: z.number().nullable(),
  tipoContrato: z.enum(["MENSAL", "TRIMESTRAL", "QUADRIMESTRAL", "SEMESTRAL", "ANUAL"]).nullable(),
  duracaoMeses: z.number().nullable(),
  inicioContrato: z.string().nullable(),
  formaPagamento: z.string().nullable(),
  renovacaoAutomatica: z.boolean().nullable(),
});

export type ContratoExtraido = z.infer<typeof contratoExtraidoSchema>;

const SYSTEM_PROMPT = `Você extrai dados estruturados de contratos da Alpha a partir do texto bruto de um PDF.

Regras:
- Interprete o documento semanticamente. Não use suposições sobre a posição do texto no documento.
- Nunca invente informações. Se um campo não existir claramente no contrato, retorne null para ele.
- "estado" deve ser a sigla de UF com 2 letras (ex.: "SP", "RJ"), nunca o nome completo.
- "valorContrato" é o valor total do contrato como número puro (sem "R$", sem separador de milhar, ponto como separador decimal). Não calcule MRR/valor mensal.
- "inicioContrato" deve ser uma data no formato ISO "AAAA-MM-DD".
- "tipoContrato" e "duracaoMeses" devem ser inferidos da vigência/periodicidade do contrato:
  MENSAL=1 mês, TRIMESTRAL=3 meses, QUADRIMESTRAL=4 meses, SEMESTRAL=6 meses, ANUAL=12 meses.
  Exemplo: "Prestação Anual" -> tipoContrato "ANUAL", duracaoMeses 12.
- "renovacaoAutomatica" é true/false apenas se o contrato mencionar isso explicitamente; caso contrário null.`;

export async function extractContratoFromText(text: string): Promise<ContratoExtraido> {
  const client = new Anthropic();

  const message = await client.messages.parse({
    model: process.env.ANTHROPIC_MODEL || "claude-opus-5",
    max_tokens: 2048,
    thinking: { type: "disabled" },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: text.slice(0, MAX_CONTRACT_CHARS) }],
    output_config: {
      effort: "low",
      format: zodOutputFormat(contratoExtraidoSchema),
    },
  });

  if (!message.parsed_output) {
    throw new Error("A IA não retornou um resultado estruturado válido.");
  }

  return message.parsed_output;
}
