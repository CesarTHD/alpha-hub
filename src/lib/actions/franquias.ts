"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type { ActionState } from "./action-state";
import { optionalText } from "./zod-helpers";

const franquiaSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da franquia"),
  cidade: z.string().trim().min(2, "Informe a cidade"),
  estado: z
    .string()
    .trim()
    .length(2, "Use a sigla do estado (2 letras)")
    .toUpperCase(),
  telefone: optionalText(z.string().trim()),
  email: optionalText(z.string().trim().email("E-mail inválido")),
  cnpj: optionalText(z.string().trim().min(11, "CNPJ inválido")),
});

async function checkCnpjDuplicado(cnpj: string | undefined, excludeId?: string) {
  if (!cnpj) return null;
  const existente = await db.franquia.findFirst({
    where: { cnpj, deletedAt: null, ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
  return existente ? { cnpj: ["Já existe uma franquia com este CNPJ"] } : null;
}

export async function createFranquia(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = franquiaSchema.safeParse({
    nome: formData.get("nome"),
    cidade: formData.get("cidade"),
    estado: formData.get("estado"),
    telefone: formData.get("telefone"),
    email: formData.get("email"),
    cnpj: formData.get("cnpj"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const cnpjDuplicado = await checkCnpjDuplicado(parsed.data.cnpj);
  if (cnpjDuplicado) return { ok: false, fieldErrors: cnpjDuplicado };

  await db.franquia.create({
    data: {
      ...parsed.data,
      telefone: parsed.data.telefone || null,
      email: parsed.data.email || null,
      cnpj: parsed.data.cnpj || null,
    },
  });
  revalidatePath("/franquias");
  return { ok: true, message: "Franquia criada com sucesso." };
}

export async function updateFranquia(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = franquiaSchema.safeParse({
    nome: formData.get("nome"),
    cidade: formData.get("cidade"),
    estado: formData.get("estado"),
    telefone: formData.get("telefone"),
    email: formData.get("email"),
    cnpj: formData.get("cnpj"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const cnpjDuplicado = await checkCnpjDuplicado(parsed.data.cnpj, id);
  if (cnpjDuplicado) return { ok: false, fieldErrors: cnpjDuplicado };

  await db.franquia.update({
    where: { id },
    data: {
      ...parsed.data,
      telefone: parsed.data.telefone || null,
      email: parsed.data.email || null,
      cnpj: parsed.data.cnpj || null,
    },
  });
  revalidatePath("/franquias");
  return { ok: true, message: "Franquia atualizada com sucesso." };
}

export async function setFranquiaAtiva(id: string, ativo: boolean) {
  await db.franquia.update({ where: { id }, data: { ativo } });
  revalidatePath("/franquias");
}

export async function excluirFranquia(id: string) {
  const emUso = await db.clienteCarteira.count({ where: { franquiaId: id, ativo: true } });
  if (emUso > 0) {
    return { ok: false, message: "Não é possível excluir: há clientes ativos nesta franquia." };
  }

  await db.franquia.update({ where: { id }, data: { deletedAt: new Date(), ativo: false } });
  revalidatePath("/franquias");
  return { ok: true };
}
