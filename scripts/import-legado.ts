/**
 * Importação de dados legados — esqueleto.
 *
 * Ver docs/IMPORTACAO_LEGADO.md para o mapeamento completo e a estratégia de
 * deduplicação/reprocessamento. Este script ainda não lê nenhum arquivo real:
 * falta (a) o arquivo de origem e (b) confirmar as colunas finais disponíveis.
 *
 * Uso previsto:
 *   npm run import:legado -- --dry-run
 *   npm run import:legado
 */
import "dotenv/config";
import { db } from "@/lib/db";

const LOTE_IMPORTACAO = new Date().toISOString().slice(0, 19);

interface LinhaLegada {
  id: string;
  cliente: string;
  franquia: string;
  profit: string;
  plano: string;
  tipoContrato: string;
  valorContrato: number;
  valorMensal: number;
  inicioContrato: string;
  fimContrato: string | null;
  renovacaoAutomatica: boolean;
  status: string;
  dataSaida: string | null;
}

function lerLinhasDaPlanilha(_caminho: string): LinhaLegada[] {
  // TODO: implementar leitura real (ex.: biblioteca `xlsx`) quando o arquivo
  // consolidado estiver disponível. Por ora, retorna vazio para manter o
  // script executável sem quebrar.
  return [];
}

async function jaImportado(origemId: string, tabelaDestino: string) {
  return db.importacaoLegado.findUnique({
    where: { origemId_tabelaDestino: { origemId, tabelaDestino } },
  });
}

async function registrarImportacao(origemId: string, tabelaDestino: string, registroId: string) {
  await db.importacaoLegado.upsert({
    where: { origemId_tabelaDestino: { origemId, tabelaDestino } },
    update: { registroId, loteImportacao: LOTE_IMPORTACAO },
    create: { origemId, tabelaDestino, registroId, loteImportacao: LOTE_IMPORTACAO },
  });
}

async function importarLinha(linha: LinhaLegada, dryRun: boolean) {
  // TODO: dedup de cliente por documento/CNPJ (ver docs/IMPORTACAO_LEGADO.md).
  // TODO: upsert de franquia e profit por nome normalizado.
  // TODO: criar cliente_carteira, contrato e eventos iniciais.
  // TODO: gravar em `legado_importacoes` via registrarImportacao() para permitir reprocessamento.
  if (dryRun) {
    console.log("[dry-run] processaria linha", linha.id);
    return;
  }

  const jaExiste = await jaImportado(linha.id, "clientes");
  if (jaExiste) {
    console.log(`linha ${linha.id} já importada anteriormente, pulando duplicidade`);
    return;
  }

  throw new Error("Importação real ainda não implementada — falta arquivo de origem e confirmação de colunas.");
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const linhas = lerLinhasDaPlanilha("scripts/data/legado.xlsx");

  console.log(`Lote ${LOTE_IMPORTACAO} — ${linhas.length} linha(s) encontradas. dry-run=${dryRun}`);

  for (const linha of linhas) {
    await importarLinha(linha, dryRun);
  }

  console.log("Importação concluída.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
