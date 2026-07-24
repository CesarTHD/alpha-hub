import { db } from "@/lib/db";

/**
 * Autenticação ainda não implementada (Better Auth/NextAuth é fase seguinte).
 * Até lá, toda ação fica registrada em nome do usuário ADMIN semeado por
 * `prisma/seed.ts`, criando-o sob demanda se o seed não tiver rodado.
 */
export async function getCurrentUser() {
  const existing = await db.usuario.findFirst({ where: { role: "ADMIN", deletedAt: null } });
  if (existing) return existing;

  return db.usuario.create({
    data: {
      nome: "Administrador",
      email: "admin@alpha.com.br",
      senhaHash: "CHANGE_ME",
      role: "ADMIN",
    },
  });
}
