import "dotenv/config";
import { db } from "@/lib/db";

// Contratos ENCERRADO manualmente (antes da correção do formulário de
// encerramento) ficaram sem dataSaida preenchida. O dado confiável pra
// reconstruir essa data é o evento ENCERRAMENTO_CONTRATO daquele contrato
// (dataEvento).
//
// IMPORTANTE: só preenche dataSaida — nunca sobrescreve fimContrato.
// fimContrato é o prazo ORIGINALMENTE contratado (início + duração do plano,
// ver calcularFimContrato) e deve permanecer assim mesmo quando o cliente sai
// antes desse prazo; dataSaida é quem registra a saída real. `fimEfetivoMs`
// (carteira-calculos.ts) já prioriza dataSaida sobre fimContrato no cálculo
// de vigência, então preencher só dataSaida já é suficiente pro dashboard
// parar de contar esses clientes como "vigentes" depois que saíram.
//
// Contratos ENCERRADO sem esse evento (dataSaida nula, mas sem evento
// correspondente) são, em geral, contratos encerrados por RENOVAÇÃO — nesse
// caso fimContrato já é confiável (= início do contrato seguinte) e só
// copiamos ele para dataSaida. Confirmamos isso checando se existe um
// contrato do mesmo cliente iniciando exatamente nessa data; se não existir,
// é uma anomalia e fica de fora (revisão manual).
//
// Uso:
//   npx tsx scripts/backfill-encerramento-datas.ts            (dry-run — só mostra o que seria alterado)
//   npx tsx scripts/backfill-encerramento-datas.ts --apply    (aplica as mudanças)
const APLICAR = process.argv.includes("--apply");

async function main() {
  const contratos = await db.contrato.findMany({
    where: { status: "ENCERRADO", dataSaida: null, deletedAt: null },
    include: {
      cliente: { select: { nome: true } },
      eventos: {
        where: { tipoEvento: "ENCERRAMENTO_CONTRATO" },
        orderBy: { dataEvento: "desc" },
        take: 1,
      },
    },
  });

  console.log(`${contratos.length} contrato(s) ENCERRADO sem dataSaida.\n`);

  const semEventoConfirmados: typeof contratos = [];
  const anomalias: typeof contratos = [];
  let corrigidosPorEvento = 0;
  let divergentes = 0;

  for (const c of contratos) {
    const evento = c.eventos[0];

    if (evento) {
      const fimContratoAtual = c.fimContrato ? c.fimContrato.toISOString().slice(0, 10) : "null";
      const dataCorreta = evento.dataEvento.toISOString().slice(0, 10);
      if (fimContratoAtual !== dataCorreta) divergentes++;
      corrigidosPorEvento++;

      console.log(
        `[evento] ${c.cliente.nome} — contrato ${c.id}: dataSaida ← ${dataCorreta} (fimContrato mantido: ${fimContratoAtual})`,
      );

      if (APLICAR) {
        await db.contrato.update({
          where: { id: c.id },
          data: { dataSaida: evento.dataEvento },
        });
      }
      continue;
    }

    if (!c.fimContrato) {
      anomalias.push(c);
      continue;
    }

    const proximoContrato = await db.contrato.findFirst({
      where: { clienteId: c.clienteId, inicioContrato: c.fimContrato },
    });

    if (!proximoContrato) {
      anomalias.push(c);
      continue;
    }

    semEventoConfirmados.push(c);
    console.log(
      `[renovação] ${c.cliente.nome} — contrato ${c.id}: dataSaida ← ${c.fimContrato.toISOString().slice(0, 10)} (próximo contrato ${proximoContrato.id})`,
    );

    if (APLICAR) {
      await db.contrato.update({ where: { id: c.id }, data: { dataSaida: c.fimContrato } });
    }
  }

  console.log(
    `\ndataSaida preenchida via evento ENCERRAMENTO_CONTRATO: ${corrigidosPorEvento} (${divergentes} com fimContrato diferente da data real de saída — fimContrato NÃO foi alterado)`,
  );
  console.log(`Confirmados como encerramento por renovação: ${semEventoConfirmados.length}`);

  if (anomalias.length > 0) {
    console.log(`\n${anomalias.length} contrato(s) sem evento e sem próximo contrato confirmando renovação — NÃO corrigidos, revisar manualmente:`);
    for (const c of anomalias) {
      console.log(
        `  - ${c.cliente.nome} — contrato ${c.id} (fimContrato=${c.fimContrato ? c.fimContrato.toISOString().slice(0, 10) : "null"}, criado em ${c.createdAt.toISOString().slice(0, 10)})`,
      );
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
