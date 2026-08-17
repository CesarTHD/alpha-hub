"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { canManageUsers } from "@/lib/rbac";
import type { ActionState } from "./action-state";
import { optionalText } from "./zod-helpers";

const ROLES = ["ADMIN", "CEO", "DIRETOR", "PROFIT", "FRANQUEADO", "OPERACIONAL", "NPS"] as const;
const ROLES_COM_FRANQUIA = ["FRANQUEADO", "OPERACIONAL"];

const usuarioSchema = z
  .object({
    nome: z.string().trim().min(2, "Informe o nome"),
    email: z.string().trim().email("E-mail inválido"),
    role: z.enum(ROLES),
    franquiaId: optionalText(z.string()),
  })
  .refine((d) => !(ROLES_COM_FRANQUIA.includes(d.role) && !d.franquiaId), {
    message: "Selecione a franquia para este papel",
    path: ["franquiaId"],
  });

async function checkEmailDuplicado(email: string, excludeId?: string) {
  const existente = await db.usuario.findFirst({
    where: { email, ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
  return existente ? { email: ["Já existe um usuário com este e-mail"] } : null;
}

export async function createUsuario(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const usuario = await getCurrentUser();
  if (!canManageUsers(usuario)) {
    return { ok: false, message: "Acesso negado." };
  }

  const parsed = usuarioSchema.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    role: formData.get("role"),
    franquiaId: formData.get("franquiaId"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const emailDuplicado = await checkEmailDuplicado(parsed.data.email);
  if (emailDuplicado) return { ok: false, fieldErrors: emailDuplicado };

  await db.usuario.create({
    data: {
      nome: parsed.data.nome,
      email: parsed.data.email,
      role: parsed.data.role,
      franquiaId: ROLES_COM_FRANQUIA.includes(parsed.data.role) ? parsed.data.franquiaId! : null,
    },
  });
  revalidatePath("/usuarios");
  return { ok: true, message: "Usuário criado com sucesso." };
}

export async function updateUsuario(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const usuario = await getCurrentUser();
  if (!canManageUsers(usuario)) {
    return { ok: false, message: "Acesso negado." };
  }

  const parsed = usuarioSchema.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    role: formData.get("role"),
    franquiaId: formData.get("franquiaId"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const emailDuplicado = await checkEmailDuplicado(parsed.data.email, id);
  if (emailDuplicado) return { ok: false, fieldErrors: emailDuplicado };

  await db.usuario.update({
    where: { id },
    data: {
      nome: parsed.data.nome,
      email: parsed.data.email,
      role: parsed.data.role,
      franquiaId: ROLES_COM_FRANQUIA.includes(parsed.data.role) ? parsed.data.franquiaId! : null,
    },
  });
  revalidatePath("/usuarios");
  return { ok: true, message: "Usuário atualizado com sucesso." };
}

export async function setUsuarioAtivo(id: string, ativo: boolean) {
  const usuario = await getCurrentUser();
  if (!canManageUsers(usuario)) return;
  if (usuario.id === id && !ativo) return;

  await db.usuario.update({ where: { id }, data: { ativo } });
  revalidatePath("/usuarios");
}

export async function excluirUsuario(id: string) {
  const usuario = await getCurrentUser();
  if (!canManageUsers(usuario)) {
    return { ok: false, message: "Acesso negado." };
  }
  if (usuario.id === id) {
    return { ok: false, message: "Você não pode excluir seu próprio usuário." };
  }

  await db.usuario.update({ where: { id }, data: { deletedAt: new Date(), ativo: false } });
  revalidatePath("/usuarios");
  return { ok: true };
}
