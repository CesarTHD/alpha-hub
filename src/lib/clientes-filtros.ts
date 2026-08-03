import type { Prisma } from "@/generated/prisma/client";
import { clienteFranquiaScopeWhere, type AuthUser } from "@/lib/rbac";

export type ClientesFiltros = {
  nome: string;
  status: string[];
  franquia: string[];
  profit: string[];
  semD4Sign: boolean;
};

export function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

/** Mesmo where usado pela lista de clientes e pela exportação — status do
 * contrato mais recente é filtrado depois, em memória (ver comentário na lista). */
export function clientesWhere(usuario: AuthUser, filtros: ClientesFiltros): Prisma.ClienteWhereInput {
  const partes: Prisma.ClienteWhereInput[] = [{ deletedAt: null }, clienteFranquiaScopeWhere(usuario)];

  if (filtros.nome) partes.push({ nome: { contains: filtros.nome, mode: "insensitive" } });
  if (filtros.franquia.length > 0) {
    partes.push({ carteiraHistorico: { some: { ativo: true, franquiaId: { in: filtros.franquia } } } });
  }
  if (filtros.profit.length > 0) {
    partes.push({
      carteiraHistorico: {
        some: {
          ativo: true,
          franquia: { historicoProfit: { some: { ativo: true, profitId: { in: filtros.profit } } } },
        },
      },
    });
  }
  if (filtros.semD4Sign) {
    partes.push({ linkContratoD4Sign: null });
  }

  return { AND: partes };
}
