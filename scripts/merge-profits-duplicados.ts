/**
 * Consolidação de Profits duplicados, gerados pela importação da carteira
 * legada (cada um criado com e-mail sintético `<slug>@legado.alpha.com.br`,
 * nunca deduplicado contra o Profit "real" já cadastrado com e-mail
 * @assessorialpha.com — os dois nunca coincidem, então a importação sempre
 * cria uma segunda linha em `profits`).
 *
 * Casos tratados (levantados manualmente — ver relatório impresso por este
 * script antes de decidir os pares):
 *
 * 1. Merge simples (mesmo conjunto de franquias nos dois): "João Victor"
 *    (mantém) <- "JV" (aposentado).
 * 2. Merge com diferença: "Ricardo" (mantém) <- "RICARDO" (aposentado) — o
 *    legado tinha 14 franquias contra 13 do real; a franquia exclusiva
 *    ("Schirma & Co") é transferida para "Ricardo" antes de aposentar
 *    "RICARDO", para não perder a responsabilidade sobre ela.
 * 3. Handover: "Aleks" (real) + "ALEKS" (legado) — a pessoa saiu da empresa.
 *    Todas as franquias de ambos os registros (união, ignorando franquias já
 *    excluídas/soft-deleted) são transferidas para "Yan", e os dois
 *    registros de Aleks são desativados/soft-deleted.
 *
 * Uso:
 *   npx tsx scripts/merge-profits-duplicados.ts            (relatório, nada é gravado)
 *   npx tsx scripts/merge-profits-duplicados.ts --apply     (aplica de fato)
 */
import "dotenv/config";
import { db } from "@/lib/db";

const WRITE_DELAY_MS = 200;
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const PROFIT_IDS = {
  aleksReal: "cmrwfd3wj0001ukto12k53fyb",
  aleksLegado: "cmrzcov3u00018ctofvl4m37o",
  joaoVictorReal: "cmrwfdl690010uktottly6xll",
  jvLegado: "cmrzcp69j000j8ctopfvbshld",
  ricardoReal: "cmrwfe4xa001zuktogz8gl3km",
  ricardoLegado: "cmrzcphff00118ctobny7588c",
  yan: "cms4yr137000001mg66dc076y",
};

type HistoricoAtivo = { id: string; franquiaId: string; franquiaNome: string; franquiaExcluida: boolean };

async function historicosAtivos(profitId: string): Promise<HistoricoAtivo[]> {
  const rows = await db.franquiaProfitHistorico.findMany({
    where: { profitId, ativo: true },
    include: { franquia: true },
  });
  return rows.map((r) => ({
    id: r.id,
    franquiaId: r.franquiaId,
    franquiaNome: r.franquia.nome,
    franquiaExcluida: !!r.franquia.deletedAt,
  }));
}

async function encerrarHistorico(id: string, apply: boolean, dataFim: Date) {
  if (!apply) return;
  await db.franquiaProfitHistorico.update({ where: { id }, data: { ativo: false, dataFim } });
  await sleep(WRITE_DELAY_MS);
}

async function abrirHistorico(profitId: string, franquiaId: string, apply: boolean, dataInicio: Date) {
  if (!apply) return;
  await db.franquiaProfitHistorico.create({
    data: { profitId, franquiaId, dataInicio, ativo: true },
  });
  await sleep(WRITE_DELAY_MS);
}

async function aposentarProfit(profitId: string, apply: boolean) {
  if (!apply) return;
  await db.profit.update({ where: { id: profitId }, data: { deletedAt: new Date(), ativo: false } });
  await sleep(WRITE_DELAY_MS);
}

/** Merge simples/com-diferença: mantém `keepId`, aposenta `retireId`,
 * transferindo qualquer franquia exclusiva do `retireId` antes de fechar. */
async function mergeProfits(label: string, keepId: string, retireId: string, apply: boolean, agora: Date) {
  const keepAtivos = await historicosAtivos(keepId);
  const retireAtivos = await historicosAtivos(retireId);
  const keepFranquiaIds = new Set(keepAtivos.map((h) => h.franquiaId));

  const exclusivas = retireAtivos.filter((h) => !keepFranquiaIds.has(h.franquiaId));

  console.log(`\n--- ${label} ---`);
  console.log(`Mantém ${keepId} (${keepAtivos.length} franquias ativas)`);
  console.log(`Aposenta ${retireId} (${retireAtivos.length} franquias ativas)`);
  if (exclusivas.length) {
    console.log(
      `Franquias exclusivas do registro aposentado, transferidas: ${exclusivas.map((h) => h.franquiaNome).join(", ")}`,
    );
  } else {
    console.log("Nenhuma franquia exclusiva — conjuntos idênticos.");
  }

  for (const h of exclusivas) {
    await abrirHistorico(keepId, h.franquiaId, apply, agora);
  }
  for (const h of retireAtivos) {
    await encerrarHistorico(h.id, apply, agora);
  }
  await aposentarProfit(retireId, apply);

  return { transferidas: exclusivas.map((h) => h.franquiaNome), totalAposentado: retireAtivos.length };
}

async function handoverAleksParaYan(apply: boolean, agora: Date) {
  const reaisAtivos = await historicosAtivos(PROFIT_IDS.aleksReal);
  const legadoAtivos = await historicosAtivos(PROFIT_IDS.aleksLegado);

  const uniao = new Map<string, string>(); // franquiaId -> nome
  for (const h of [...reaisAtivos, ...legadoAtivos]) {
    if (h.franquiaExcluida) continue; // franquia consolidada/excluída — não reabrir vínculo nela
    uniao.set(h.franquiaId, h.franquiaNome);
  }

  console.log(`\n--- Aleks (real + legado) -> Yan ---`);
  console.log(`Aleks (real): ${reaisAtivos.length} franquias ativas`);
  console.log(`ALEKS (legado): ${legadoAtivos.length} franquias ativas`);
  console.log(`União (excluindo franquias já excluídas/consolidadas): ${uniao.size} franquias`);
  console.log([...uniao.values()].sort().join(", "));

  for (const franquiaId of uniao.keys()) {
    await abrirHistorico(PROFIT_IDS.yan, franquiaId, apply, agora);
  }
  for (const h of [...reaisAtivos, ...legadoAtivos]) {
    await encerrarHistorico(h.id, apply, agora);
  }
  await aposentarProfit(PROFIT_IDS.aleksReal, apply);
  await aposentarProfit(PROFIT_IDS.aleksLegado, apply);

  return { totalTransferido: uniao.size };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const agora = new Date();
  console.log(`Consolidação de Profits duplicados. apply=${apply}`);

  const jv = await mergeProfits("João Victor <- JV", PROFIT_IDS.joaoVictorReal, PROFIT_IDS.jvLegado, apply, agora);
  const ricardo = await mergeProfits(
    "Ricardo <- RICARDO",
    PROFIT_IDS.ricardoReal,
    PROFIT_IDS.ricardoLegado,
    apply,
    agora,
  );
  const aleks = await handoverAleksParaYan(apply, agora);

  console.log("\n=== RESUMO ===");
  console.log(
    `João Victor: ${jv.totalAposentado} franquia(s) fechadas em "JV"${jv.transferidas.length ? `, ${jv.transferidas.length} transferida(s): ${jv.transferidas.join(", ")}` : ""}.`,
  );
  console.log(
    `Ricardo: ${ricardo.totalAposentado} franquia(s) fechadas em "RICARDO"${ricardo.transferidas.length ? `, ${ricardo.transferidas.length} transferida(s): ${ricardo.transferidas.join(", ")}` : ""}.`,
  );
  console.log(`Yan: assumiu ${aleks.totalTransferido} franquia(s) que eram do Aleks.`);
  console.log(apply ? "\n(alterações aplicadas)" : "\n(dry-run — nada foi gravado; rode com --apply para aplicar)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
