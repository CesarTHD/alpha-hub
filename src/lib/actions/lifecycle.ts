"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import type { ActionState } from "./action-state";
import { optionalText } from "./zod-helpers";

function revalidateCliente(clienteId: string) {
  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/clientes");
  revalidatePath("/eventos");
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Renovação
// ---------------------------------------------------------------------------

const renovacaoSchema = z.object({
  clienteId: z.string().min(1),
  contratoAnteriorId: z.string().min(1),
  plano: z.string().trim().min(1, "Informe o plano"),
  tipoContrato: z.enum(["MENSAL", "TRIMESTRAL", "SEMESTRAL", "ANUAL"]),
  valorContrato: z.coerce.number().positive("Informe o valor total"),
  valorMensal: z.coerce.number().positive("Informe o valor mensal"),
  inicioContrato: z.string().min(1, "Informe a data de início"),
  renovacaoAutomatica: z.coerce.boolean().optional(),
  observacao: optionalText(z.string().trim()),
});

export async function registrarRenovacao(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = renovacaoSchema.safeParse({
    clienteId: formData.get("clienteId"),
    contratoAnteriorId: formData.get("contratoAnteriorId"),
    plano: formData.get("plano"),
    tipoContrato: formData.get("tipoContrato"),
    valorContrato: formData.get("valorContrato"),
    valorMensal: formData.get("valorMensal"),
    inicioContrato: formData.get("inicioContrato"),
    renovacaoAutomatica: formData.get("renovacaoAutomatica") === "on",
    observacao: formData.get("observacao"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const usuario = await getCurrentUser();
  const inicio = new Date(parsed.data.inicioContrato);

  await db.$transaction(async (tx) => {
    await tx.contrato.update({
      where: { id: parsed.data.contratoAnteriorId },
      data: { status: "ENCERRADO", fimContrato: inicio },
    });

    const novoContrato = await tx.contrato.create({
      data: {
        clienteId: parsed.data.clienteId,
        plano: parsed.data.plano,
        tipoContrato: parsed.data.tipoContrato,
        valorContrato: parsed.data.valorContrato,
        valorMensal: parsed.data.valorMensal,
        inicioContrato: inicio,
        renovacaoAutomatica: parsed.data.renovacaoAutomatica ?? false,
        status: "ATIVO",
      },
    });

    await tx.evento.create({
      data: {
        clienteId: parsed.data.clienteId,
        contratoId: novoContrato.id,
        tipoEvento: "RENOVACAO",
        dataEvento: inicio,
        observacao: parsed.data.observacao || null,
        usuarioResponsavelId: usuario.id,
      },
    });
  });

  revalidateCliente(parsed.data.clienteId);
  return { ok: true, message: "Renovação registrada." };
}

// ---------------------------------------------------------------------------
// Pausa / Retomada
// ---------------------------------------------------------------------------

const pausaSchema = z.object({
  clienteId: z.string().min(1),
  contratoId: z.string().min(1),
  motivo: optionalText(z.string().trim()),
});

export async function registrarPausa(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = pausaSchema.safeParse({
    clienteId: formData.get("clienteId"),
    contratoId: formData.get("contratoId"),
    motivo: formData.get("motivo"),
  });
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };

  const usuario = await getCurrentUser();
  const agora = new Date();

  await db.$transaction(async (tx) => {
    await tx.contrato.update({ where: { id: parsed.data.contratoId }, data: { status: "PAUSADO" } });
    await tx.evento.create({
      data: {
        clienteId: parsed.data.clienteId,
        contratoId: parsed.data.contratoId,
        tipoEvento: "PAUSA",
        dataEvento: agora,
        motivo: parsed.data.motivo || null,
        usuarioResponsavelId: usuario.id,
      },
    });
  });

  revalidateCliente(parsed.data.clienteId);
  return { ok: true, message: "Contrato pausado." };
}

export async function registrarRetomada(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = pausaSchema.safeParse({
    clienteId: formData.get("clienteId"),
    contratoId: formData.get("contratoId"),
    motivo: formData.get("motivo"),
  });
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };

  const usuario = await getCurrentUser();
  const agora = new Date();

  await db.$transaction(async (tx) => {
    await tx.contrato.update({ where: { id: parsed.data.contratoId }, data: { status: "ATIVO" } });
    await tx.evento.create({
      data: {
        clienteId: parsed.data.clienteId,
        contratoId: parsed.data.contratoId,
        tipoEvento: "RETOMADA",
        dataEvento: agora,
        motivo: parsed.data.motivo || null,
        usuarioResponsavelId: usuario.id,
      },
    });
  });

  revalidateCliente(parsed.data.clienteId);
  return { ok: true, message: "Contrato retomado." };
}

// ---------------------------------------------------------------------------
// Churn
// ---------------------------------------------------------------------------

const churnSchema = z.object({
  clienteId: z.string().min(1),
  contratoId: z.string().min(1),
  dataSaida: z.string().min(1, "Informe a data de saída"),
  motivo: optionalText(z.string().trim()),
});

export async function registrarChurn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = churnSchema.safeParse({
    clienteId: formData.get("clienteId"),
    contratoId: formData.get("contratoId"),
    dataSaida: formData.get("dataSaida"),
    motivo: formData.get("motivo"),
  });
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };

  const usuario = await getCurrentUser();
  const dataSaida = new Date(parsed.data.dataSaida);

  await db.$transaction(async (tx) => {
    await tx.contrato.update({
      where: { id: parsed.data.contratoId },
      data: { status: "CHURN", dataSaida, fimContrato: dataSaida },
    });

    const carteiraAtiva = await tx.clienteCarteira.findFirst({
      where: { clienteId: parsed.data.clienteId, ativo: true },
    });
    if (carteiraAtiva) {
      await tx.clienteCarteira.update({
        where: { id: carteiraAtiva.id },
        data: { ativo: false, dataFim: dataSaida },
      });
    }

    await tx.evento.create({
      data: {
        clienteId: parsed.data.clienteId,
        contratoId: parsed.data.contratoId,
        tipoEvento: "CHURN",
        dataEvento: dataSaida,
        motivo: parsed.data.motivo || null,
        usuarioResponsavelId: usuario.id,
      },
    });
  });

  revalidateCliente(parsed.data.clienteId);
  return { ok: true, message: "Churn registrado." };
}

// ---------------------------------------------------------------------------
// Transferência de franquia
// ---------------------------------------------------------------------------

const transferenciaSchema = z.object({
  clienteId: z.string().min(1),
  novaFranquiaId: z.string().min(1, "Selecione a nova franquia"),
  observacao: optionalText(z.string().trim()),
});

export async function transferirFranquia(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = transferenciaSchema.safeParse({
    clienteId: formData.get("clienteId"),
    novaFranquiaId: formData.get("novaFranquiaId"),
    observacao: formData.get("observacao"),
  });
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };

  const usuario = await getCurrentUser();
  const agora = new Date();

  const carteiraAtiva = await db.clienteCarteira.findFirst({
    where: { clienteId: parsed.data.clienteId, ativo: true },
    include: { franquia: true },
  });

  if (carteiraAtiva?.franquiaId === parsed.data.novaFranquiaId) {
    return { ok: false, message: "O cliente já está nesta franquia." };
  }

  await db.$transaction(async (tx) => {
    if (carteiraAtiva) {
      await tx.clienteCarteira.update({
        where: { id: carteiraAtiva.id },
        data: { ativo: false, dataFim: agora },
      });
    }

    await tx.clienteCarteira.create({
      data: { clienteId: parsed.data.clienteId, franquiaId: parsed.data.novaFranquiaId, dataInicio: agora },
    });

    await tx.evento.create({
      data: {
        clienteId: parsed.data.clienteId,
        tipoEvento: "TRANSFERENCIA_FRANQUIA",
        dataEvento: agora,
        observacao: parsed.data.observacao || null,
        usuarioResponsavelId: usuario.id,
      },
    });
  });

  revalidateCliente(parsed.data.clienteId);
  revalidatePath("/franquias");
  return { ok: true, message: "Cliente transferido de franquia." };
}

// ---------------------------------------------------------------------------
// Alteração de plano / valor
// ---------------------------------------------------------------------------

const alteracaoPlanoSchema = z.object({
  clienteId: z.string().min(1),
  contratoId: z.string().min(1),
  novoPlano: z.string().trim().min(1, "Informe o novo plano"),
  observacao: optionalText(z.string().trim()),
});

export async function alterarPlano(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = alteracaoPlanoSchema.safeParse({
    clienteId: formData.get("clienteId"),
    contratoId: formData.get("contratoId"),
    novoPlano: formData.get("novoPlano"),
    observacao: formData.get("observacao"),
  });
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };

  const usuario = await getCurrentUser();
  const contratoAnterior = await db.contrato.findUniqueOrThrow({ where: { id: parsed.data.contratoId } });

  await db.$transaction(async (tx) => {
    await tx.contrato.update({ where: { id: parsed.data.contratoId }, data: { plano: parsed.data.novoPlano } });
    await tx.evento.create({
      data: {
        clienteId: parsed.data.clienteId,
        contratoId: parsed.data.contratoId,
        tipoEvento: "ALTERACAO_PLANO",
        dataEvento: new Date(),
        motivo: `${contratoAnterior.plano} → ${parsed.data.novoPlano}`,
        observacao: parsed.data.observacao || null,
        usuarioResponsavelId: usuario.id,
      },
    });
  });

  revalidateCliente(parsed.data.clienteId);
  return { ok: true, message: "Plano alterado." };
}

const alteracaoValorSchema = z.object({
  clienteId: z.string().min(1),
  contratoId: z.string().min(1),
  novoValorMensal: z.coerce.number().positive("Informe o novo valor mensal"),
  observacao: optionalText(z.string().trim()),
});

export async function alterarValor(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = alteracaoValorSchema.safeParse({
    clienteId: formData.get("clienteId"),
    contratoId: formData.get("contratoId"),
    novoValorMensal: formData.get("novoValorMensal"),
    observacao: formData.get("observacao"),
  });
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };

  const usuario = await getCurrentUser();
  const contratoAnterior = await db.contrato.findUniqueOrThrow({ where: { id: parsed.data.contratoId } });

  await db.$transaction(async (tx) => {
    await tx.contrato.update({
      where: { id: parsed.data.contratoId },
      data: { valorMensal: parsed.data.novoValorMensal },
    });
    await tx.evento.create({
      data: {
        clienteId: parsed.data.clienteId,
        contratoId: parsed.data.contratoId,
        tipoEvento: "ALTERACAO_VALOR",
        dataEvento: new Date(),
        motivo: `${contratoAnterior.valorMensal} → ${parsed.data.novoValorMensal}`,
        observacao: parsed.data.observacao || null,
        usuarioResponsavelId: usuario.id,
      },
    });
  });

  revalidateCliente(parsed.data.clienteId);
  return { ok: true, message: "Valor mensal alterado." };
}

// ---------------------------------------------------------------------------
// Observação
// ---------------------------------------------------------------------------

const observacaoSchema = z.object({
  clienteId: z.string().min(1),
  contratoId: optionalText(z.string().trim()),
  observacao: z.string().trim().min(2, "Escreva a observação"),
});

export async function registrarObservacao(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = observacaoSchema.safeParse({
    clienteId: formData.get("clienteId"),
    contratoId: formData.get("contratoId"),
    observacao: formData.get("observacao"),
  });
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };

  const usuario = await getCurrentUser();

  await db.evento.create({
    data: {
      clienteId: parsed.data.clienteId,
      contratoId: parsed.data.contratoId || null,
      tipoEvento: "OBSERVACAO",
      dataEvento: new Date(),
      observacao: parsed.data.observacao,
      usuarioResponsavelId: usuario.id,
    },
  });

  revalidateCliente(parsed.data.clienteId);
  return { ok: true, message: "Observação registrada." };
}
