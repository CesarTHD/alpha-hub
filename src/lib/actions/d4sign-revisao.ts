"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { canReviewD4Sign } from "@/lib/rbac";
import { downloadD4SignDocumentPdf, D4SignError } from "@/lib/d4sign/client";
import { buildD4SignViewLink, extractD4SignUuid } from "@/lib/d4sign/link";
import { normalizarDocumento } from "@/lib/cnpj";
import { extrairContratoDePdf } from "./contrato-pdf-pipeline";
import { importarDeArquivo } from "./importar-contrato-pdf";
import { compararContrato, type Inconsistencia } from "@/lib/contrato-comparacao";
import type { ContratoExtraido } from "@/lib/contrato-extracao";

export type CadastroAtual = {
  documento: string;
  email: string | null;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  segmento: string | null;
};

export type AnaliseProposta = {
  /** null quando os dados vieram de um PDF enviado manualmente, sem link do D4Sign. */
  uuidDocumento: string | null;
  extraido: ContratoExtraido;
  atual: CadastroAtual;
  diffContrato: Inconsistencia[];
};

export type AnaliseResult = { ok: true; data: AnaliseProposta } | { ok: false; message: string };

async function buscarPropostaPendente(propostaId: string) {
  const proposta = await db.propostaD4Sign.findUnique({
    where: { id: propostaId },
    include: {
      cliente: {
        include: {
          contratos: { where: { deletedAt: null }, orderBy: { inicioContrato: "desc" } },
        },
      },
    },
  });
  if (!proposta) return { ok: false as const, message: "Proposta não encontrada." };
  if (proposta.status !== "PENDENTE") return { ok: false as const, message: "Essa proposta já foi revisada." };
  return { ok: true as const, proposta };
}

type BuscaPropostaOk = Extract<Awaited<ReturnType<typeof buscarPropostaPendente>>, { ok: true }>;
type ClienteComContratos = BuscaPropostaOk["proposta"]["cliente"];

function montarAnalise(
  cliente: ClienteComContratos,
  extraido: ContratoExtraido,
  uuidDocumento: string | null,
): AnaliseProposta {
  const contratoAtual = cliente.contratos.find(
    (c) => c.status === "ATIVO" || c.status === "PAUSADO" || c.status === "VENCIDO" || c.status === "ENCERRADO",
  );

  const diffContrato = contratoAtual
    ? compararContrato(extraido, {
        plano: contratoAtual.plano,
        tipoContrato: contratoAtual.tipoContrato,
        valorContrato: contratoAtual.valorContrato.toString(),
        valorMensal: contratoAtual.valorMensal.toString(),
        inicioContrato: contratoAtual.inicioContrato.toISOString(),
        renovacaoAutomatica: contratoAtual.renovacaoAutomatica,
      })
    : [];

  return {
    uuidDocumento,
    extraido,
    atual: {
      documento: cliente.documento,
      email: cliente.email,
      telefone: cliente.telefone,
      cidade: cliente.cidade,
      estado: cliente.estado,
      segmento: cliente.segmento,
    },
    diffContrato,
  };
}

/** Baixa e interpreta o documento indicado por `linkOuUuid` (o candidato do match
 * automático por padrão, mas o admin pode trocar por outro link/UUID antes de
 * buscar de novo) e compara com o que já está cadastrado — não altera nada em
 * clientes/contratos, só monta o diff pra revisão. */
export async function analisarPropostaD4Sign(propostaId: string, linkOuUuid: string): Promise<AnaliseResult> {
  const usuario = await getCurrentUser();
  if (!canReviewD4Sign(usuario)) return { ok: false, message: "Acesso negado." };

  const uuid = extractD4SignUuid(linkOuUuid);
  if (!uuid) return { ok: false, message: "Link ou UUID do D4Sign inválido." };

  const busca = await buscarPropostaPendente(propostaId);
  if (!busca.ok) return busca;

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await downloadD4SignDocumentPdf(uuid);
  } catch (err) {
    return { ok: false, message: err instanceof D4SignError ? err.message : "Erro ao baixar o documento do D4Sign." };
  }

  const resultado = await extrairContratoDePdf(pdfBuffer);
  if (!resultado || !resultado.ok || !resultado.data) {
    return { ok: false, message: resultado?.message ?? "Erro ao interpretar o documento." };
  }

  return { ok: true, data: montarAnalise(busca.proposta.cliente, resultado.data, uuid) };
}

/** Mesma análise, mas a partir de um PDF enviado manualmente — usado quando o
 * cliente não tem match automático no D4Sign ou o candidato encontrado está
 * errado e o admin já tem o contrato em mãos. */
export async function analisarPropostaPorPdf(propostaId: string, formData: FormData): Promise<AnaliseResult> {
  const usuario = await getCurrentUser();
  if (!canReviewD4Sign(usuario)) return { ok: false, message: "Acesso negado." };

  const busca = await buscarPropostaPendente(propostaId);
  if (!busca.ok) return busca;

  const resultado = await importarDeArquivo(formData);
  if (!resultado || !resultado.ok || !resultado.data) {
    return { ok: false, message: resultado?.message ?? "Erro ao interpretar o documento." };
  }

  return { ok: true, data: montarAnalise(busca.proposta.cliente, resultado.data, null) };
}

export type CamposCadastrais = {
  documento: string;
  email: string;
  telefone: string;
  cidade: string;
  estado: string;
  segmento: string;
};

/** Aplica os dados cadastrais — já revisados e possivelmente editados à mão pelo
 * admin na tela — ao cliente, e salva o link do D4Sign. Nunca mexe em plano/valor
 * de contrato: isso continua exigindo as ações dedicadas (Alterar plano/valor),
 * pra manter o rastro de auditoria certo. */
export async function aplicarPropostaD4Sign(
  propostaId: string,
  linkOuUuid: string | null,
  campos: CamposCadastrais,
) {
  const usuario = await getCurrentUser();
  if (!canReviewD4Sign(usuario)) return { ok: false, message: "Acesso negado." };

  // null quando os dados vieram de um PDF enviado manualmente, sem link do D4Sign.
  const uuid = linkOuUuid ? extractD4SignUuid(linkOuUuid) : null;
  if (linkOuUuid && !uuid) return { ok: false, message: "Link ou UUID do D4Sign inválido." };

  const proposta = await db.propostaD4Sign.findUnique({ where: { id: propostaId } });
  if (!proposta) return { ok: false, message: "Proposta não encontrada." };
  if (proposta.status !== "PENDENTE") return { ok: false, message: "Essa proposta já foi revisada." };

  const documento = normalizarDocumento(campos.documento).documento;
  if (!documento) return { ok: false, message: "Informe o CPF/CNPJ." };

  try {
    await db.$transaction(async (tx) => {
      await tx.cliente.update({
        where: { id: proposta.clienteId },
        data: {
          documento,
          email: campos.email.trim() || null,
          telefone: campos.telefone.trim() || null,
          cidade: campos.cidade.trim() || null,
          estado: campos.estado.trim() ? campos.estado.trim().slice(0, 2).toUpperCase() : null,
          segmento: campos.segmento.trim() || null,
          ...(uuid ? { linkContratoD4Sign: buildD4SignViewLink(uuid) } : {}),
          updatedById: usuario.id,
        },
      });
      await tx.propostaD4Sign.update({
        where: { id: propostaId },
        // Se o admin trocou o link/UUID antes de aplicar, a proposta passa a
        // refletir o documento realmente usado, não mais o candidato original.
        // Sem uuid (upload manual), o candidato original fica registrado mesmo.
        data: {
          status: "APLICADA",
          ...(uuid ? { uuidDocumento: uuid } : {}),
          revisadoEm: new Date(),
          revisadoPorId: usuario.id,
        },
      });
    });
  } catch (err) {
    const duplicado = err instanceof Error && "code" in err && (err as { code?: string }).code === "P2002";
    return {
      ok: false,
      message: duplicado
        ? "Já existe outro cliente com esse CPF/CNPJ — confira antes de aplicar."
        : "Erro ao aplicar os dados no cliente.",
    };
  }

  revalidatePath("/d4sign-revisao");
  revalidatePath(`/clientes/${proposta.clienteId}`);
  return { ok: true, message: "Dados aplicados ao cliente." };
}

/** Marca a proposta como rejeitada — nenhum dado do cliente é alterado. */
export async function rejeitarPropostaD4Sign(propostaId: string) {
  const usuario = await getCurrentUser();
  if (!canReviewD4Sign(usuario)) return { ok: false, message: "Acesso negado." };

  const proposta = await db.propostaD4Sign.findUnique({ where: { id: propostaId } });
  if (!proposta) return { ok: false, message: "Proposta não encontrada." };
  if (proposta.status !== "PENDENTE") return { ok: false, message: "Essa proposta já foi revisada." };

  await db.propostaD4Sign.update({
    where: { id: propostaId },
    data: { status: "REJEITADA", revisadoEm: new Date(), revisadoPorId: usuario.id },
  });

  revalidatePath("/d4sign-revisao");
  return { ok: true, message: "Proposta rejeitada." };
}
