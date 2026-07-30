"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { canCreateCliente, canEditCliente } from "@/lib/rbac";
import { requireClienteAccess } from "./guards";
import { downloadD4SignDocumentPdf, D4SignError } from "@/lib/d4sign/client";
import { extractD4SignUuid } from "@/lib/d4sign/link";
import { extrairContratoDePdf } from "./contrato-pdf-pipeline";
import type { ImportContratoState } from "./import-contrato-state";

const inputSchema = z.object({
  documentoD4Sign: z.string().trim().min(1, "Informe o link ou UUID do documento"),
});

/** Baixa e interpreta o PDF do D4Sign — compartilhado pelos fluxos de novo cliente e edição de cadastro. */
async function importarDeD4Sign(formData: FormData): Promise<ImportContratoState> {
  const parsed = inputSchema.safeParse({
    documentoD4Sign: formData.get("documentoD4Sign"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.flatten().fieldErrors.documentoD4Sign?.[0] };
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

  return extrairContratoDePdf(pdfBuffer);
}

export async function importarContratoD4Sign(
  _prev: ImportContratoState,
  formData: FormData,
): Promise<ImportContratoState> {
  const usuario = await getCurrentUser();
  if (!canCreateCliente(usuario)) {
    return { ok: false, message: "Acesso negado." };
  }
  return importarDeD4Sign(formData);
}

/** Mesmo fluxo de importação, mas para preencher dados cadastrais de um cliente já existente. */
export async function importarDadosClienteD4Sign(
  clienteId: string,
  _prev: ImportContratoState,
  formData: FormData,
): Promise<ImportContratoState> {
  const { usuario, allowed } = await requireClienteAccess(clienteId);
  if (!allowed || !canEditCliente(usuario)) {
    return { ok: false, message: "Acesso negado." };
  }
  return importarDeD4Sign(formData);
}
