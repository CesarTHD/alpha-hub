import "dotenv/config";
import { db } from "@/lib/db";
import { calcularFimContrato } from "@/lib/contrato-lifecycle";

// Auditoria (só leitura) — contratos TCV (Trimestral/Quadrimestral/Semestral/
// Anual) cujo fimContrato está DEPOIS do prazo nominal do plano
// (inicioContrato + duração do tipoContrato, mesma fórmula usada na criação
// — calcularFimContrato). MENSAL fica de fora, não tem prazo fixo pra
// comparar.
//
// Não altera nada — só lista pra investigação. Esperado aparecer aqui
// contratos ENCERRADO por renovação tardia (o cliente renovou depois do
// vencimento natural, então fimContrato = início do novo contrato, mais
// distante que o prazo nominal — não é bug). O que vale investigar é
// contrato ATIVO/PAUSADO/VENCIDO com essa divergência, ou fimContrato "solto"
// sem nenhum contrato seguinte explicando a diferença.
//
// Uso: npx tsx scripts/auditoria-vigencia-maior-que-contratado.ts
async function main() {
  const contratos = await db.contrato.findMany({
    where: {
      tipoContrato: { not: "MENSAL" },
      fimContrato: { not: null },
      deletedAt: null,
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
                select: {
                  nome: true,
                  historicoProfit: { where: { ativo: true }, select: { profit: { select: { nome: true } } } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { inicioContrato: "asc" },
  });

  const divergentes = contratos
    .map((c) => ({ c, nominal: calcularFimContrato(c.inicioContrato, c.tipoContrato)! }))
    .filter(({ c, nominal }) => c.fimContrato!.getTime() > nominal.getTime());

  console.log(`${contratos.length} contrato(s) TCV com fimContrato preenchido.`);
  console.log(`${divergentes.length} com fimContrato DEPOIS do prazo nominal do plano:\n`);

  for (const { c, nominal } of divergentes) {
    const franquia = c.cliente.carteiraHistorico[0]?.franquia;
    const profit = franquia?.historicoProfit[0]?.profit.nome ?? "—";
    const diasAMais = Math.round((c.fimContrato!.getTime() - nominal.getTime()) / (1000 * 60 * 60 * 24));

    // Renovação tardia explica a diferença? Confere se existe um próximo
    // contrato do cliente começando exatamente no fimContrato atual.
    const proximoContrato = await db.contrato.findFirst({
      where: { clienteId: c.clienteId, inicioContrato: c.fimContrato! },
    });

    console.log(
      `${c.cliente.nome} | franquia: ${franquia?.nome ?? "—"} | profit: ${profit} | status: ${c.status} | tipo: ${c.tipoContrato} | ` +
        `contrato: ${c.id} | início: ${c.inicioContrato.toISOString().slice(0, 10)} | fimContrato: ${c.fimContrato!.toISOString().slice(0, 10)} | ` +
        `nominal: ${nominal.toISOString().slice(0, 10)} | ${diasAMais} dia(s) a mais | ` +
        `${proximoContrato ? "explicado por renovação (" + proximoContrato.id + ")" : "SEM explicação — revisar"}`,
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
