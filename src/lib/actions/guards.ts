import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { clienteFranquiaScopeWhere } from "@/lib/rbac";

/**
 * Carrega o usuário autenticado e confirma que o cliente informado está
 * dentro do escopo dele (para FRANQUEADO/OPERACIONAL, apenas clientes da
 * própria franquia). Nunca deriva o escopo de parâmetros vindos do
 * formulário/URL — sempre do usuário autenticado no servidor.
 */
export async function requireClienteAccess(clienteId: string) {
  const usuario = await getCurrentUser();
  const cliente = await db.cliente.findFirst({
    where: { id: clienteId, deletedAt: null, ...clienteFranquiaScopeWhere(usuario) },
    select: { id: true },
  });
  return { usuario, allowed: !!cliente };
}
