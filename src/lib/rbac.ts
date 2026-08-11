import type { Prisma, Role } from "@/generated/prisma/client";

export type AuthUser = { role: Role; franquiaId: string | null };

export const isAdmin = (u: AuthUser) => u.role === "ADMIN";
export const isCEO = (u: AuthUser) => u.role === "CEO";
export const isDiretor = (u: AuthUser) => u.role === "DIRETOR";
export const isProfit = (u: AuthUser) => u.role === "PROFIT";
export const isFranqueado = (u: AuthUser) => u.role === "FRANQUEADO";
export const isOperacional = (u: AuthUser) => u.role === "OPERACIONAL";

const isAdminOrCEO = (u: AuthUser) => isAdmin(u) || isCEO(u);

/** Gestão de usuários/permissões — exclusivo do ADMIN, mesmo o CEO não acessa. */
export const canManageUsers = (u: AuthUser) => isAdmin(u);

export function canManageFranquias(u: AuthUser): "full" | "editOnly" | "none" {
  if (isAdminOrCEO(u)) return "full"; // create/edit/delete
  if (isProfit(u)) return "editOnly"; // create/edit, sem excluir
  return "none";
}

/** Cadastro de Profits (consultores) não é mencionado nas permissões de
 *  nenhum outro papel além de ADMIN/CEO — mantém-se restrito a eles. */
export const canManageProfits = (u: AuthUser) => isAdminOrCEO(u);

export const canCreateCliente = (u: AuthUser) =>
  isAdminOrCEO(u) || isProfit(u) || isFranqueado(u); // OPERACIONAL só edita, não cria

export const canEditCliente = (u: AuthUser) =>
  isAdminOrCEO(u) || isProfit(u) || isFranqueado(u) || isOperacional(u);

export const canDeleteCliente = (u: AuthUser) => isAdminOrCEO(u);

export const canManageContratos = (u: AuthUser) =>
  isAdminOrCEO(u) || isProfit(u) || isFranqueado(u);

/** Excluir um contrato e cadastrar um contrato adicional para um cliente já
 *  existente são exclusivos do ADMIN, mesmo o CEO não acessa. */
export const canDeleteContrato = (u: AuthUser) => isAdmin(u) || isProfit;
export const canCreateContratoAdicional = (u: AuthUser) => isAdmin(u);

/** Revisão das propostas de match automático com o D4Sign — exclusivo do ADMIN. */
export const canReviewD4Sign = (u: AuthUser) => isAdmin(u);

/** Mover um cliente entre franquias é uma decisão acima do escopo de
 *  FRANQUEADO/OPERACIONAL, que só enxergam a própria franquia. */
export const canTransferirFranquia = (u: AuthUser) => isAdminOrCEO(u) || isProfit(u);

export const canRegisterEvento = (u: AuthUser) =>
  isAdminOrCEO(u) || isProfit(u) || isFranqueado(u) || isOperacional(u);

export function canViewDashboard(u: AuthUser): "full" | "franquia" | "none" {
  if (isAdminOrCEO(u) || isDiretor(u) || isProfit(u)) return "full";
  if (isFranqueado(u)) return "franquia";
  return "none"; // OPERACIONAL
}

export function hasFranquiaScope(u: AuthUser): u is AuthUser & { franquiaId: string } {
  return (isFranqueado(u) || isOperacional(u)) && !!u.franquiaId;
}

/** Restringe consultas de Cliente à franquia do usuário quando aplicável.
 *  Nunca deriva a franquia de parâmetros da URL/formulário — sempre do usuário autenticado. */
export function clienteFranquiaScopeWhere(u: AuthUser): Prisma.ClienteWhereInput {
  if (!hasFranquiaScope(u)) return {};
  return { carteiraHistorico: { some: { ativo: true, franquiaId: u.franquiaId } } };
}

/** Mesma ideia para Evento, que não tem franquiaId direto — passa pelo cliente. */
export function eventoFranquiaScopeWhere(u: AuthUser): Prisma.EventoWhereInput {
  if (!hasFranquiaScope(u)) return {};
  return { cliente: { carteiraHistorico: { some: { ativo: true, franquiaId: u.franquiaId } } } };
}
