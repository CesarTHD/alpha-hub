import "dotenv/config";
import { db } from "@/lib/db";

// Fecha ClienteCarteira "fantasma" — vínculo com a franquia ainda marcado
// como ativo (`ativo: true`), mas o cliente não tem nenhum contrato em vigor
// (ATIVO/PAUSADO/VENCIDO), só ENCERRADO. Isso inflava "Clientes ativos" na
// tela de Franquias e a taxa de churn (calcularChurnPorFranquia), porque
// `registrarEncerramento` nunca fechava esse vínculo antes da correção em
// contrato-lifecycle.ts (fecharCarteiraSeSemContratoAtivo).
//
// Não toca carteiras cujo único contrato problemático é CHURN — esse é um
// caso à parte (o churn já devia ter fechado a carteira e não fechou; precisa
// de investigação individual, não de um backfill em massa).
//
// Depende dos dados de scripts/backfill-encerramento-datas.ts já estarem
// aplicados (fimContrato/dataSaida corretos) — rode aquele primeiro.
//
// Uso:
//   npx tsx scripts/backfill-carteira-fantasma.ts            (dry-run — só mostra o que seria alterado)
//   npx tsx scripts/backfill-carteira-fantasma.ts --apply    (aplica as mudanças)
const APLICAR = process.argv.includes("--apply");

async function main() {
  const carteiras = await db.clienteCarteira.findMany({
    where: { ativo: true },
    include: {
      cliente: {
        select: {
          nome: true,
          contratos: {
            where: { deletedAt: null },
            orderBy: { inicioContrato: "desc" },
            select: { status: true, dataSaida: true, fimContrato: true },
          },
        },
      },
      franquia: { select: { nome: true } },
    },
  });

  const alvos = carteiras.filter((cc) => {
    const contratos = cc.cliente.contratos;
    const temContratoEmVigor = contratos.some(
      (c) => c.status === "ATIVO" || c.status === "PAUSADO" || c.status === "VENCIDO",
    );
    const temEncerrado = contratos.some((c) => c.status === "ENCERRADO");
    return !temContratoEmVigor && temEncerrado;
  });

  console.log(`${alvos.length} carteira(s) "fantasma" (só ENCERRADO, sem contrato em vigor).\n`);

  const semData: typeof alvos = [];

  for (const cc of alvos) {
    const ultimoContrato = cc.cliente.contratos[0];
    const dataFim = ultimoContrato.dataSaida ?? ultimoContrato.fimContrato;

    if (!dataFim) {
      semData.push(cc);
      continue;
    }

    console.log(
      `${cc.cliente.nome} — franquia ${cc.franquia.nome}: carteira ← ativo=false, dataFim=${dataFim.toISOString().slice(0, 10)}`,
    );

    if (APLICAR) {
      await db.clienteCarteira.update({ where: { id: cc.id }, data: { ativo: false, dataFim } });
    }
  }

  if (semData.length > 0) {
    console.log(`\n${semData.length} carteira(s) sem data de saída disponível — NÃO corrigidas, revisar manualmente:`);
    for (const cc of semData) {
      console.log(`  - ${cc.cliente.nome} — franquia ${cc.franquia.nome}`);
    }
  }

  console.log(APLICAR ? "\nAplicado." : "\nDry-run — nada foi alterado. Rode com --apply para gravar.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
