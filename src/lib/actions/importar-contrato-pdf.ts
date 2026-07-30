"use server";

import { getCurrentUser } from "@/lib/current-user";
import { canCreateCliente, canEditCliente } from "@/lib/rbac";
import { requireClienteAccess } from "./guards";
import { extrairContratoDePdf } from "./contrato-pdf-pipeline";
import type { ImportContratoState } from "./import-contrato-state";

const MAX_PDF_BYTES = 20 * 1024 * 1024;

/** Valida e extrai o PDF enviado — compartilhado pelos fluxos de novo cliente e edição de cadastro. */
async function importarDeArquivo(formData: FormData): Promise<ImportContratoState> {
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

export async function importarContratoPdf(
  _prev: ImportContratoState,
  formData: FormData,
): Promise<ImportContratoState> {
  const usuario = await getCurrentUser();
  if (!canCreateCliente(usuario)) {
    return { ok: false, message: "Acesso negado." };
  }
  return importarDeArquivo(formData);
}

/** Mesmo fluxo de importação, mas para preencher dados cadastrais de um cliente já existente. */
export async function importarDadosClientePdf(
  clienteId: string,
  _prev: ImportContratoState,
  formData: FormData,
): Promise<ImportContratoState> {
  const { usuario, allowed } = await requireClienteAccess(clienteId);
  if (!allowed || !canEditCliente(usuario)) {
    return { ok: false, message: "Acesso negado." };
  }
  return importarDeArquivo(formData);
}
