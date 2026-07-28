import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";

/**
 * Revalida `ativo`/`deletedAt` contra o banco a cada chamada — o JWT só é
 * atualizado no login, então um usuário desativado precisa perder acesso
 * imediatamente, não apenas quando o token expirar.
 */
export const getCurrentUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const usuario = await db.usuario.findUnique({ where: { id: session.user.id } });
  if (!usuario || !usuario.ativo || usuario.deletedAt) redirect("/login");

  return usuario;
});
