import "dotenv/config";
import { db } from "@/lib/db";

// Auditoria (só leitura) — contratos ENCERRADO cuja dataSaida é ANTERIOR ao
// fimContrato. Isso é um sinal de que o cliente saiu antes do fim da
// vigência (deveria ser CHURN), não depois dela (ENCERRADO — venceu e não
// renovou). Não altera nada — só lista pra revisão com os Profits antes de
// decidir, caso a caso, se o status deveria virar CHURN.
//
// Uso: npx tsx scripts/auditoria-encerrado-vs-churn.ts
async function main() {
  const contratos = await db.contrato.findMany({
    where: {
      status: "ENCERRADO",
      deletedAt: null,
      dataSaida: { not: null },
      fimContrato: { not: null },
    },
    include: {
      cliente: {
        select: {
          nome: true,
          carteiraHistorico: {
            orderBy: { dataInicio: "desc" },
            take: 1,
            select: {
              franquia: {
                select: { nome: true, historicoProfit: { where: { ativo: true }, select: { profit: { select: { nome: true } } } } },
              },
            },
          },
        },
      },
    },
    orderBy: { dataSaida: "desc" },
  });

  const suspeitos = contratos.filter((c) => c.dataSaida!.getTime() < c.fimContrato!.getTime());

  console.log(`${contratos.length} contrato(s) ENCERRADO com dataSaida e fimContrato preenchidos.`);
  console.log(`${suspeitos.length} com dataSaida ANTERIOR ao fimContrato (saída antes do fim da vigência — candidato a CHURN):\n`);

  for (const c of suspeitos) {
    const franquia = c.cliente.carteiraHistorico[0]?.franquia;
    const profit = franquia?.historicoProfit[0]?.profit.nome ?? "—";
    const diffDias = Math.round((c.fimContrato!.getTime() - c.dataSaida!.getTime()) / (1000 * 60 * 60 * 24));

    console.log(
      `${c.cliente.nome} | franquia: ${franquia?.nome ?? "—"} | profit: ${profit} | contrato: ${c.id} | ` +
        `dataSaida: ${c.dataSaida!.toISOString().slice(0, 10)} | fimContrato: ${c.fimContrato!.toISOString().slice(0, 10)} | ` +
        `saiu ${diffDias} dia(s) antes do fim`,
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
