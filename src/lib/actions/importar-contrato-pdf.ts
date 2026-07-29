"use server";

import { getCurrentUser } from "@/lib/current-user";
import { canCreateCliente } from "@/lib/rbac";
import { extrairContratoDePdf } from "./contrato-pdf-pipeline";
import type { ImportContratoState } from "./import-contrato-state";

const MAX_PDF_BYTES = 20 * 1024 * 1024;

export async function importarContratoPdf(
  _prev: ImportContratoState,
  formData: FormData,
): Promise<ImportContratoState> {
  const usuario = await getCurrentUser();
  if (!canCreateCliente(usuario)) {
    return { ok: false, message: "Acesso negado." };
  }

  const arquivo = formData.get("arquivoContrato");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { ok: false, message: "Selecione um arquivo PDF do contrato." };
  }
  if (arquivo.type && arquivo.type !== "application/pdf" && !arquivo.name.toLowerCase().endsWith(".pdf")) {
    return { ok: false, message: "O arquivo precisa ser um PDF." };
  }
  if (arquivo.size > MAX_PDF_BYTES) {
    return { ok: false, message: "O arquivo é muito grande (máximo de 20MB)." };
  }

  const buffer = Buffer.from(await arquivo.arrayBuffer());
  return extrairContratoDePdf(buffer);
}
