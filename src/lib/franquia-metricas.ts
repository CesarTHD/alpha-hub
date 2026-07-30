import { db } from "@/lib/db";

export type ChurnFranquia = {
  clientesAtivos: number;
  clientesChurn: number;
  taxaChurn: number;
};

/**
 * Taxa de churn por franquia — clientesChurn / (clientesAtivos + clientesChurn) * 100.
 * Mesma fórmula do ranking de franquias do dashboard (ver src/lib/dashboard.ts),
 * recalculada aqui à parte porque lá ela sai de um fetch de clientes já
 * carregado para outras métricas (MRR, permanência, etc.) — duplicar a query
 * inteira só por causa do churn custaria mais do que vale.
 */
export async function calcularChurnPorFranquia(): Promise<Map<string, ChurnFranquia>> {
  const franquias = await db.franquia.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      historicoCarteira: { where: { ativo: true }, select: { clienteId: true } },
    },
  });

  const clientesChurnRows = await db.contrato.findMany({
    where: { status: "CHURN" },
    distinct: ["clienteId"],
    select: { clienteId: true },
  });
  const clienteIdsChurn = new Set(clientesChurnRows.map((r) => r.clienteId));

  // Última franquia do cliente (ativa ou não) — um cliente churnado nunca tem
  // carteira ativa, então a atribuição precisa olhar a última mesmo assim.
  const clientes = await db.cliente.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      carteiraHistorico: {
        orderBy: { dataInicio: "desc" },
        take: 1,
        select: { franquiaId: true },
      },
    },
  });

  const churnPorFranquia = new Map<string, number>();
  for (const c of clientes) {
    if (!clienteIdsChurn.has(c.id)) continue;
    const franquiaId = c.carteiraHistorico[0]?.franquiaId;
    if (!franquiaId) continue;
    churnPorFranquia.set(franquiaId, (churnPorFranquia.get(franquiaId) ?? 0) + 1);
  }

  const resultado = new Map<string, ChurnFranquia>();
  for (const f of franquias) {
    const clientesAtivos = f.historicoCarteira.length;
    const clientesChurn = churnPorFranquia.get(f.id) ?? 0;
    const total = clientesAtivos + clientesChurn;
    resultado.set(f.id, {
      clientesAtivos,
      clientesChurn,
      taxaChurn: total > 0 ? (clientesChurn / total) * 100 : 0,
    });
  }

  return resultado;
}
