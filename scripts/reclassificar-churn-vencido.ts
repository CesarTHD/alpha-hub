import "dotenv/config";
import { db } from "@/lib/db";
import { calcularFimContrato } from "@/lib/contrato-lifecycle";

// Todo contrato CHURN tinha fimContrato sobrescrito para dataSaida por
// registrarChurn (já corrigido — ver lifecycle.ts) — isso apagou o prazo
// originalmente contratado. Aqui reconstruímos esse prazo com a mesma
// fórmula usada na criação (calcularFimContrato) e, com o dado corrigido,
// reavaliamos a classificação:
//
//   - MENSAL não tem prazo fixo (calcularFimContrato = null) — não dá pra
//     avaliar "venceu ou não". Mantém CHURN, só limpa o fimContrato bugado.
//   - TCV com dataSaida < fimContrato reconstruído — saiu antes do fim da
//     vigência de fato. Mantém CHURN, só corrige o fimContrato.
//   - TCV com dataSaida >= fimContrato reconstruído — a saída não foi antes
//     do fim da vigência, então por definição não é Churn. Reclassifica pra
//     ENCERRADO e troca o(s) evento(s) CHURN desse contrato para
//     ENCERRAMENTO_CONTRATO.
//
// Uso:
//   npx tsx scripts/reclassificar-churn-vencido.ts            (dry-run — só mostra o que seria alterado)
//   npx tsx scripts/reclassificar-churn-vencido.ts --apply    (aplica as mudanças)
const APLICAR = process.argv.includes("--apply");

async function main() {
  const contratos = await db.contrato.findMany({
    where: { status: "CHURN", deletedAt: null },
    include: { cliente: { select: { nome: true } } },
  });

  console.log(`${contratos.length} contrato(s) CHURN.\n`);

  let mensalLimpo = 0;
  let churnConfirmado = 0;
  let reclassificados = 0;
  const semDataSaida: typeof contratos = [];

  for (const c of contratos) {
    const fimContratoCorreto = calcularFimContrato(c.inicioContrato, c.tipoContrato);

    if (fimContratoCorreto === null) {
      mensalLimpo++;
      console.log(`[mensal] ${c.cliente.nome} — contrato ${c.id}: mantém CHURN, fimContrato ← null`);
      if (APLICAR) {
        await db.contrato.update({ where: { id: c.id }, data: { fimContrato: null } });
      }
      continue;
    }

    if (!c.dataSaida) {
      semDataSaida.push(c);
      continue;
    }

    if (c.dataSaida.getTime() < fimContratoCorreto.getTime()) {
      churnConfirmado++;
      console.log(
        `[churn confirmado] ${c.cliente.nome} — contrato ${c.id}: fimContrato ← ${fimContratoCorreto.toISOString().slice(0, 10)} (dataSaida ${c.dataSaida.toISOString().slice(0, 10)} é antes)`,
      );
      if (APLICAR) {
        await db.contrato.update({ where: { id: c.id }, data: { fimContrato: fimContratoCorreto } });
      }
      continue;
    }

    reclassificados++;
    console.log(
      `[reclassificado → ENCERRADO] ${c.cliente.nome} — contrato ${c.id}: fimContrato ← ${fimContratoCorreto.toISOString().slice(0, 10)}, dataSaida ${c.dataSaida.toISOString().slice(0, 10)} não é antes do fim`,
    );
    if (APLICAR) {
      await db.contrato.update({
        where: { id: c.id },
        data: { status: "ENCERRADO", fimContrato: fimContratoCorreto },
      });
      await db.evento.updateMany({
        where: { contratoId: c.id, tipoEvento: "CHURN" },
        data: { tipoEvento: "ENCERRAMENTO_CONTRATO" },
      });
    }
  }

  console.log(`\nMENSAL (fimContrato limpo, mantido CHURN): ${mensalLimpo}`);
  console.log(`TCV confirmado como CHURN (fimContrato corrigido): ${churnConfirmado}`);
  console.log(`TCV reclassificado CHURN → ENCERRADO: ${reclassificados}`);

  if (semDataSaida.length > 0) {
    console.log(`\n${semDataSaida.length} contrato(s) CHURN sem dataSaida — NÃO avaliados, revisar manualmente:`);
    for (const c of semDataSaida) {
      console.log(`  - ${c.cliente.nome} — contrato ${c.id}`);
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
