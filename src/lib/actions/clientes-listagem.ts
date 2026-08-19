"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { clientesWhere, type ClientesFiltros } from "@/lib/clientes-filtros";
import { marcarContratosVencidos } from "@/lib/contrato-lifecycle";

export type ClienteListagemRow = {
  id: string;
  nome: string;
  franquiaNome: string | null;
  franquiaAtiva: boolean;
  profitNome: string | null;
  plano: string | null;
  tipoContrato: string | null;
  valorMensal: string | null;
  inicioContrato: Date | null;
  fimContrato: Date | null;
  status: string | null;
};

export async function buscarClientes(filtros: ClientesFiltros): Promise<ClienteListagemRow[]> {
  const usuario = await getCurrentUser();
  await marcarContratosVencidos();

  const where = clientesWhere(usuario, filtros);

  const clientesEncontrados = await db.cliente.findMany({
    where,
    orderBy: { nome: "asc" },
    include: {
      carteiraHistorico: {
        orderBy: { dataInicio: "desc" },
        take: 1,
        include: {
          franquia: { include: { historicoProfit: { where: { ativo: true }, include: { profit: true } } } },
        },
      },
      contratos: { where: { deletedAt: null }, orderBy: { inicioContrato: "desc" }, take: 1 },
    },
  });

  // Filtra pelo status/tipo do contrato mais recente — o mesmo que as colunas "Status"/"Tipo" exibem.
  const clientes = clientesEncontrados.filter((c) => {
    const contrato = c.contratos[0];
    if (filtros.status.length > 0 && (!contrato || !filtros.status.includes(contrato.status))) return false;
    if (filtros.tipo.length > 0 && (!contrato || !filtros.tipo.includes(contrato.tipoContrato))) return false;
    return true;
  });

  return clientes.map((c) => {
    const contrato = c.contratos[0];
    const carteira = c.carteiraHistorico[0];
    return {
      id: c.id,
      nome: c.nome,
      franquiaNome: carteira?.franquia.nome ?? null,
      franquiaAtiva: carteira?.ativo ?? true,
      profitNome: carteira?.franquia.historicoProfit[0]?.profit.nome ?? null,
      plano: contrato?.plano ?? null,
      tipoContrato: contrato?.tipoContrato ?? null,
      valorMensal: contrato ? contrato.valorMensal.toString() : null,
      inicioContrato: contrato ? contrato.inicioContrato : null,
      fimContrato: contrato ? contrato.fimContrato : null,
      status: contrato?.status ?? null,
    };
  });
}
