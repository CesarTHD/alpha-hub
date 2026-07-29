import { extractPdfText } from "@/lib/pdf/extract-text";
import { extractContratoFromText } from "@/lib/ai/contrato-extraction";
import type { ImportContratoState } from "./import-contrato-state";

/** Extrai texto de um PDF de contrato e interpreta os dados com IA. Compartilhado pelos fluxos de importação via D4Sign e via upload direto do arquivo. */
export async function extrairContratoDePdf(pdfBuffer: Buffer): Promise<ImportContratoState> {
  let text: string;
  try {
    text = await extractPdfText(pdfBuffer);
  } catch {
    return { ok: false, message: "Não foi possível ler o conteúdo deste PDF." };
  }
  if (!text || text.trim().length < 20) {
    return { ok: false, message: "Não foi possível extrair texto deste PDF." };
  }

  try {
    const data = await extractContratoFromText(text);
    return { ok: true, message: "Contrato importado. Revise os dados antes de salvar.", data };
  } catch (err) {
    console.error("[IA] Erro ao interpretar contrato:", err);
    return {
      ok: false,
      message: "Erro ao interpretar o contrato com IA. Preencha os campos manualmente.",
    };
  }
}
