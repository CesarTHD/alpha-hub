"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { canManageProfits } from "@/lib/rbac";
import type { ActionState } from "./action-state";
import { optionalText } from "./zod-helpers";

const profitSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome"),
  email: z.string().trim().email("E-mail inválido"),
  telefone: optionalText(z.string().trim()),
});

export async function createProfit(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const usuario = await getCurrentUser();
  if (!canManageProfits(usuario)) {
    return { ok: false, message: "Acesso negado." };
  }

  const parsed = profitSchema.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    telefone: formData.get("telefone"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const existente = await db.profit.findFirst({ where: { email: parsed.data.email } });
  if (existente) {
    return { ok: false, fieldErrors: { email: ["Já existe um Profit com este e-mail"] } };
  }

  await db.profit.create({
    data: { ...parsed.data, telefone: parsed.data.telefone || null },
  });
  revalidatePath("/profits");
  return { ok: true, message: "Profit criado com sucesso." };
}

export async function updateProfit(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const usuario = await getCurrentUser();
  if (!canManageProfits(usuario)) {
    return { ok: false, message: "Acesso negado." };
  }

  const parsed = profitSchema.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    telefone: formData.get("telefone"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await db.profit.update({
    where: { id },
    data: { ...parsed.data, telefone: parsed.data.telefone || null },
  });
  revalidatePath("/profits");
  return { ok: true, message: "Profit atualizado com sucesso." };
}

export async function setProfitAtivo(id: string, ativo: boolean) {
  const usuario = await getCurrentUser();
  if (!canManageProfits(usuario)) return;

  await db.profit.update({ where: { id }, data: { ativo } });
  revalidatePath("/profits");
}

export async function excluirProfit(id: string) {
  const usuario = await getCurrentUser();
  if (!canManageProfits(usuario)) {
    return { ok: false, message: "Acesso negado." };
  }

  const emUso = await db.franquiaProfitHistorico.count({ where: { profitId: id, ativo: true } });
  if (emUso > 0) {
    return { ok: false, message: "Não é possível excluir: este Profit é responsável por franquias ativas." };
  }

  await db.profit.update({ where: { id }, data: { deletedAt: new Date(), ativo: false } });
  revalidatePath("/profits");
  return { ok: true };
}
