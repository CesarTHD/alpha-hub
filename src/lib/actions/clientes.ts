"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { canCreateCliente, canEditCliente, hasFranquiaScope } from "@/lib/rbac";
import { calcularFimContrato } from "@/lib/contrato-lifecycle";
import type { ActionState } from "./action-state";
import { optionalText } from "./zod-helpers";
import { requireClienteAccess } from "./guards";

const novoClienteSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do cliente"),
  documento: z.string().trim().min(11, "Informe um CPF/CNPJ válido"),
  email: optionalText(z.string().trim().email("E-mail inválido")),
  telefone: optionalText(z.string().trim()),
  cidade: optionalText(z.string().trim()),
  estado: optionalText(z.string().trim()),
  segmento: optionalText(z.string().trim()),
  franquiaId: z.string().min(1, "Selecione a franquia"),
  plano: z.string().trim().min(1, "Informe o plano"),
  tipoContrato: z.enum(["MENSAL", "TRIMESTRAL", "QUADRIMESTRAL", "SEMESTRAL", "ANUAL"]),
  valorContrato: z.coerce.number().positive("Informe o valor total do contrato"),
  valorMensal: z.coerce.number().positive("Informe o valor mensal"),
  inicioContrato: z.string().min(1, "Informe a data de início"),
  renovacaoAutomatica: z.coerce.boolean().optional(),
});

export async function createClienteComContrato(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = novoClienteSchema.safeParse({
    nome: formData.get("nome"),
    documento: formData.get("documento"),
    email: formData.get("email"),
    telefone: formData.get("telefone"),
    cidade: formData.get("cidade"),
    estado: formData.get("estado"),
    segmento: formData.get("segmento"),
    franquiaId: formData.get("franquiaId"),
    plano: formData.get("plano"),
    tipoContrato: formData.get("tipoContrato"),
    valorContrato: formData.get("valorContrato"),
    valorMensal: formData.get("valorMensal"),
    inicioContrato: formData.get("inicioContrato"),
    renovacaoAutomatica: formData.get("renovacaoAutomatica") === "on",
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const usuario = await getCurrentUser();
  if (!canCreateCliente(usuario)) {
    return { ok: false, message: "Acesso negado." };
  }
  if (hasFranquiaScope(usuario) && parsed.data.franquiaId !== usuario.franquiaId) {
    return { ok: false, fieldErrors: { franquiaId: ["Você só pode cadastrar clientes na sua própria franquia"] } };
  }

  const documentoExistente = await db.cliente.findFirst({
    where: { documento: parsed.data.documento, deletedAt: null },
  });
  if (documentoExistente) {
    return { ok: false, fieldErrors: { documento: ["Já existe um cliente com este documento"] } };
  }

  const inicio = new Date(parsed.data.inicioContrato);

  const cliente = await db.$transaction(async (tx) => {
    const cliente = await tx.cliente.create({
      data: {
        nome: parsed.data.nome,
        documento: parsed.data.documento,
        email: parsed.data.email || null,
        telefone: parsed.data.telefone || null,
        cidade: parsed.data.cidade || null,
        estado: parsed.data.estado || null,
        segmento: parsed.data.segmento || null,
        createdById: usuario.id,
        updatedById: usuario.id,
      },
    });

    await tx.clienteCarteira.create({
      data: { clienteId: cliente.id, franquiaId: parsed.data.franquiaId, dataInicio: inicio },
    });

    const contrato = await tx.contrato.create({
      data: {
        clienteId: cliente.id,
        plano: parsed.data.plano,
        tipoContrato: parsed.data.tipoContrato,
        valorContrato: parsed.data.valorContrato,
        valorMensal: parsed.data.valorMensal,
        inicioContrato: inicio,
        fimContrato: calcularFimContrato(inicio, parsed.data.tipoContrato),
        renovacaoAutomatica: parsed.data.renovacaoAutomatica ?? false,
        status: "ATIVO",
      },
    });

    await tx.evento.create({
      data: {
        clienteId: cliente.id,
        contratoId: contrato.id,
        tipoEvento: "NOVO_CONTRATO",
        dataEvento: inicio,
        usuarioResponsavelId: usuario.id,
      },
    });

    return cliente;
  });

  revalidatePath("/clientes");
  redirect(`/clientes/${cliente.id}`);
}

const clienteDadosSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome"),
  documento: z.string().trim().min(11, "Documento inválido"),
  email: optionalText(z.string().trim().email("E-mail inválido")),
  telefone: optionalText(z.string().trim()),
  cidade: optionalText(z.string().trim()),
  estado: optionalText(z.string().trim()),
  segmento: optionalText(z.string().trim()),
  observacoes: optionalText(z.string().trim()),
});

export async function updateClienteDados(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = clienteDadosSchema.safeParse({
    nome: formData.get("nome"),
    documento: formData.get("documento"),
    email: formData.get("email"),
    telefone: formData.get("telefone"),
    cidade: formData.get("cidade"),
    estado: formData.get("estado"),
    segmento: formData.get("segmento"),
    observacoes: formData.get("observacoes"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { usuario, allowed } = await requireClienteAccess(id);
  if (!allowed || !canEditCliente(usuario)) {
    return { ok: false, message: "Acesso negado." };
  }

  await db.cliente.update({
    where: { id },
    data: {
      nome: parsed.data.nome,
      documento: parsed.data.documento,
      email: parsed.data.email || null,
      telefone: parsed.data.telefone || null,
      cidade: parsed.data.cidade || null,
      estado: parsed.data.estado || null,
      segmento: parsed.data.segmento || null,
      observacoes: parsed.data.observacoes || null,
      updatedById: usuario.id,
    },
  });

  revalidatePath(`/clientes/${id}`);
  return { ok: true, message: "Dados do cliente atualizados." };
}
