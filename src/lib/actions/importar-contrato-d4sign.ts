"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { canCreateCliente } from "@/lib/rbac";
import { extractD4SignUuid, downloadD4SignDocumentPdf, D4SignError } from "@/lib/d4sign/client";
import { extractPdfText } from "@/lib/pdf/extract-text";
import { extractContratoFromText, type ContratoExtraido } from "@/lib/ai/contrato-extraction";

export type ImportContratoState = {
  ok: boolean;
  message?: string;
  data?: ContratoExtraido;
} | null;

const inputSchema = z.object({
  documentoD4Sign: z.string().trim().min(1, "Informe o link ou UUID do documento"),
});

export async function importarContratoD4Sign(
  _prev: ImportContratoState,
  formData: FormData,
): Promise<ImportContratoState> {
  const parsed = inputSchema.safeParse({
    documentoD4Sign: formData.get("documentoD4Sign"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.flatten().fieldErrors.documentoD4Sign?.[0] };
  }

  const usuario = await getCurrentUser();
  if (!canCreateCliente(usuario)) {
    return { ok: false, message: "Acesso negado." };
  }

  const uuid = extractD4SignUuid(parsed.data.documentoD4Sign);
  if (!uuid) {
    return { ok: false, message: "Link ou UUID do D4Sign inválido." };
  }

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await downloadD4SignDocumentPdf(uuid);
  } catch (err) {
    return {
      ok: false,
      message: err instanceof D4SignError ? err.message : "Erro ao baixar o contrato do D4Sign.",
    };
  }

  let text: string;
  try {
    text = await extractPdfText(pdfBuffer);
  } catch {
    return { ok: false, message: "Não foi possível ler o conteúdo deste PDF." };
  }
  if (!text || text.trim().length < 20) {
    return { ok: false, message: "Não foi possível extrair texto deste PDF." };
  }

  let data: ContratoExtraido;
  try {
    data = await extractContratoFromText(text);
  } catch {
    return {
      ok: false,
      message: "Erro ao interpretar o contrato com IA. Preencha os campos manualmente.",
    };
  }

  return { ok: true, message: "Contrato importado. Revise os dados antes de salvar.", data };
}
