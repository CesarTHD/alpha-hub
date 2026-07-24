/**
 * Importação da carteira legada a partir da tabela `carteira_profits`, que vive
 * no banco apontado por `DATABASE_CLONE_URL` (um clone somente-leitura — este
 * script nunca escreve nela, apenas SELECT).
 *
 * Popula `franquias`, `profits`, `franquia_profit_historico`, `clientes`,
 * `cliente_carteira`, `contratos` e `eventos` no banco da aplicação
 * (`DATABASE_URL`), seguindo o mapeamento de docs/IMPORTACAO_LEGADO.md.
 *
 * Particularidades da fonte descobertas na inspeção:
 * - Não existe CNPJ/CPF (`documento`). Dedup de cliente é por nome (trim) —
 *   documento é sintetizado como `LEGADO-<slug(nome)>`, estável entre reruns.
 * - A coluna `ID` da planilha (`CLI-000XXX`) NÃO é um identificador de cliente
 *   confiável: o mesmo ID aparece em linhas com nomes de cliente totalmente
 *   diferentes (ex.: CLI-000977 cobre 5 clientes distintos). Por isso ela é
 *   ignorada como chave de dedup; a chave de idempotência usada é
 *   `slug(cliente)|slug(franquia)|inicioContrato` (determinística a partir do
 *   próprio conteúdo da linha).
 * - Franquia -> Profit é 1:1 nesta base (nenhuma franquia tem mais de um
 *   Profit distinto), então cada franquia gera um único período em
 *   `franquia_profit_historico`.
 * - `franquias.cidade`/`estado` não existem na fonte — preenchidos com um
 *   placeholder ("Não informado"/"NI") a revisar manualmente depois.
 * - Linhas sem dados suficientes de contrato (plano/tipo/valor/início
 *   faltando, ou `Tipo Contrato` fora do enum — ex. "Quadrimestral") geram o
 *   cliente e o vínculo de carteira, mas não um Contrato.
 *
 * Reprocessar este script não duplica nada: franquias/profits são achados por
 * nome/email antes de criar, e clientes/carteira/contratos usam
 * `legado_importacoes` (mesma tabela/estratégia do scripts/import-legado.ts).
 *
 * Uso:
 *   npm run import:carteira-profits -- --dry-run
 *   npm run import:carteira-profits
 */
import "dotenv/config";
import { Client } from "pg";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";

const LOTE_IMPORTACAO = new Date().toISOString().slice(0, 19);

// Pacing entre escritas: ver "Known gotcha" em AGENTS.md — rajadas de
// requisições em velocidade de máquina contra `prisma dev` + adapter-pg 7.9.0
// podem disparar um erro de prepared statement. Um import em lote como este é
// exatamente esse cenário, então espaçamos as escritas.
const WRITE_DELAY_MS = 200;
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type StatusLegado = "Ativo" | "Pausado" | "Churn";
type TipoContratoLegado = "Mensal" | "Trimestral" | "Semestral" | "Anual" | "Quadrimestral";

interface Row {
  id: string | null;
  cliente: string | null;
  franquia: string | null;
  status: StatusLegado | null;
  plano: string | null;
  tipoContrato: TipoContratoLegado | null;
  valorContrato: number | null;
  valorMensal: number | null;
  inicioContrato: Date | null;
  fimContrato: Date | null;
  renovacaoAuto: string | null;
  dataSaida: string | null;
  profit: string | null;
}

const TIPO_CONTRATO_MAP: Record<string, "MENSAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL"> = {
  Mensal: "MENSAL",
  Trimestral: "TRIMESTRAL",
  Semestral: "SEMESTRAL",
  Anual: "ANUAL",
};

const STATUS_MAP: Record<string, "ATIVO" | "PAUSADO" | "CHURN"> = {
  Ativo: "ATIVO",
  Pausado: "PAUSADO",
  Churn: "CHURN",
};

function parseDataSaida(valor: string | null): Date | null {
  if (!valor) return null;
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) {
    console.warn(`Aviso: "Data de saída" ilegível (${JSON.stringify(valor)}), ignorando.`);
    return null;
  }
  return data;
}

function slug(s: string) {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function readSourceRows(): Promise<Row[]> {
  const source = new Client({ connectionString: process.env.DATABASE_CLONE_URL });
  await source.connect();
  try {
    const res = await source.query(`
      SELECT
        "ID" as id,
        "Cliente" as cliente,
        "Franquia" as franquia,
        "Status" as status,
        "Plano" as plano,
        "Tipo Contrato" as tipo_contrato,
        "Valor Contrato" as valor_contrato,
        "Valor Mensal" as valor_mensal,
        "Início Contrato" as inicio_contrato,
        "Fim Contrato" as fim_contrato,
        "Renovação Auto" as renovacao_auto,
        "Data de saída (caso de churn)" as data_saida,
        "Profit" as profit
      FROM carteira_profits
    `);
    return res.rows.map((r) => ({
      id: r.id,
      cliente: r.cliente,
      franquia: r.franquia,
      status: r.status,
      plano: r.plano,
      tipoContrato: r.tipo_contrato,
      valorContrato: r.valor_contrato,
      valorMensal: r.valor_mensal,
      inicioContrato: r.inicio_contrato,
      fimContrato: r.fim_contrato,
      renovacaoAuto: r.renovacao_auto,
      dataSaida: r.data_saida,
      profit: r.profit,
    }));
  } finally {
    // Somente leitura: fecha a conexão sem nunca ter executado um comando de escrita.
    await source.end();
  }
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

async function upsertFranquia(nome: string) {
  const existing = await db.franquia.findFirst({ where: { nome, deletedAt: null } });
  if (existing) return existing;
  const franquia = await db.franquia.create({
    data: { nome, cidade: "Não informado", estado: "NI" },
  });
  await sleep(WRITE_DELAY_MS);
  return franquia;
}

async function upsertProfit(nome: string) {
  const email = `${slug(nome).toLowerCase()}@legado.alpha.com.br`;
  const profit = await db.profit.upsert({
    where: { email },
    update: {},
    create: { nome, email },
  });
  await sleep(WRITE_DELAY_MS);
  return profit;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const rows = await readSourceRows();
  console.log(`Lote ${LOTE_IMPORTACAO} — ${rows.length} linha(s) em carteira_profits. dry-run=${dryRun}`);

  const adminUser = dryRun ? null : await getCurrentUser();

  const stats = {
    franquiasCriadas: 0,
    profitsCriados: 0,
    historicosProfitCriados: 0,
    clientesCriados: 0,
    carteiraCriada: 0,
    contratosCriados: 0,
    eventosCriados: 0,
  };

  // --- 1. Franquias + Profits (relação 1:1 confirmada na inspeção) ---
  const franquiaNomes = [...new Set(rows.filter((r) => r.franquia).map((r) => r.franquia!.trim()))];
  const franquiaParaProfit = new Map<string, string>();
  const franquiaDataMinima = new Map<string, Date>();
  for (const r of rows) {
    if (!r.franquia) continue;
    const nome = r.franquia.trim();
    if (r.profit) franquiaParaProfit.set(nome, r.profit.trim());
    if (r.inicioContrato) {
      const atual = franquiaDataMinima.get(nome);
      if (!atual || r.inicioContrato < atual) franquiaDataMinima.set(nome, r.inicioContrato);
    }
  }

  const franquiaPorNome = new Map<string, Awaited<ReturnType<typeof upsertFranquia>>>();
  const profitPorNome = new Map<string, Awaited<ReturnType<typeof upsertProfit>>>();

  for (const nome of franquiaNomes) {
    if (dryRun) {
      console.log(`[dry-run] franquia: ${nome} (profit: ${franquiaParaProfit.get(nome) ?? "?"})`);
      continue;
    }

    const franquiaJaExistia = await db.franquia.findFirst({ where: { nome, deletedAt: null } });
    const franquia = await upsertFranquia(nome);
    franquiaPorNome.set(nome, franquia);
    if (!franquiaJaExistia) stats.franquiasCriadas++;

    const profitNome = franquiaParaProfit.get(nome);
    if (!profitNome) continue;

    let profit = profitPorNome.get(profitNome);
    if (!profit) {
      const email = `${slug(profitNome).toLowerCase()}@legado.alpha.com.br`;
      const profitJaExistia = await db.profit.findUnique({ where: { email } });
      profit = await upsertProfit(profitNome);
      profitPorNome.set(profitNome, profit);
      if (!profitJaExistia) stats.profitsCriados++;
    }

    const historicoExistente = await db.franquiaProfitHistorico.findFirst({
      where: { franquiaId: franquia.id, profitId: profit.id },
    });
    if (!historicoExistente) {
      await db.franquiaProfitHistorico.create({
        data: {
          franquiaId: franquia.id,
          profitId: profit.id,
          dataInicio: franquiaDataMinima.get(nome) ?? new Date(),
          ativo: true,
        },
      });
      stats.historicosProfitCriados++;
      await sleep(WRITE_DELAY_MS);
    }
  }

  // --- 2. Clientes, agrupados por nome (dedup — ver nota de topo sobre o campo "ID") ---
  const linhasPorCliente = new Map<string, Row[]>();
  for (const r of rows) {
    if (!r.cliente) continue;
    const nome = r.cliente.trim();
    if (!linhasPorCliente.has(nome)) linhasPorCliente.set(nome, []);
    linhasPorCliente.get(nome)!.push(r);
  }

  for (const [nomeCliente, linhas] of linhasPorCliente) {
    const ordenadas = [...linhas].sort(
      (a, b) => (a.inicioContrato?.getTime() ?? 0) - (b.inicioContrato?.getTime() ?? 0)
    );
    const documento = `LEGADO-${slug(nomeCliente)}`;

    if (dryRun) {
      console.log(`[dry-run] cliente: ${nomeCliente} (${ordenadas.length} linha(s), documento=${documento})`);
      continue;
    }

    let cliente = await db.cliente.findUnique({ where: { documento } });
    if (!cliente) {
      cliente = await db.cliente.create({
        data: {
          nome: nomeCliente,
          documento,
          observacoes: "Importado da carteira legada (carteira_profits).",
          createdById: adminUser!.id,
          updatedById: adminUser!.id,
        },
      });
      stats.clientesCriados++;
      await sleep(WRITE_DELAY_MS);

      await db.evento.create({
        data: {
          clienteId: cliente.id,
          tipoEvento: "CRIACAO_CLIENTE",
          dataEvento: ordenadas[0].inicioContrato ?? new Date(),
          observacao: "Cliente importado da carteira legada (carteira_profits).",
          usuarioResponsavelId: adminUser!.id,
        },
      });
      stats.eventosCriados++;
      await sleep(WRITE_DELAY_MS);
    }

    let ultimaCarteiraId: string | null = null;
    let franquiaAnterior: string | null = null;

    for (let i = 0; i < ordenadas.length; i++) {
      const linha = ordenadas[i];
      const franquiaNome = linha.franquia?.trim();
      if (!franquiaNome) continue;
      const franquia = franquiaPorNome.get(franquiaNome);
      if (!franquia) continue;

      const chaveOrigem = `${slug(nomeCliente)}|${slug(franquiaNome)}|${linha.inicioContrato?.toISOString() ?? "sem-data"}`;
      const dataInicio = linha.inicioContrato ?? new Date();

      const carteiraJaImportada = await jaImportado(chaveOrigem, "cliente_carteira");
      if (carteiraJaImportada) {
        ultimaCarteiraId = carteiraJaImportada.registroId;
      } else {
        const carteiraEntry = await db.clienteCarteira.create({
          data: {
            clienteId: cliente.id,
            franquiaId: franquia.id,
            dataInicio,
            ativo: i === ordenadas.length - 1,
          },
        });
        stats.carteiraCriada++;
        await sleep(WRITE_DELAY_MS);
        await registrarImportacao(chaveOrigem, "cliente_carteira", carteiraEntry.id);

        if (ultimaCarteiraId) {
          await db.clienteCarteira.update({
            where: { id: ultimaCarteiraId },
            data: { dataFim: dataInicio, ativo: false },
          });
          await sleep(WRITE_DELAY_MS);
        }
        ultimaCarteiraId = carteiraEntry.id;

        if (i > 0 && franquiaAnterior && franquiaAnterior !== franquiaNome) {
          await db.evento.create({
            data: {
              clienteId: cliente.id,
              tipoEvento: "TRANSFERENCIA_FRANQUIA",
              dataEvento: dataInicio,
              observacao: `Transferência de "${franquiaAnterior}" para "${franquiaNome}" (importação da carteira legada).`,
              usuarioResponsavelId: adminUser!.id,
            },
          });
          stats.eventosCriados++;
          await sleep(WRITE_DELAY_MS);
        }
      }
      franquiaAnterior = franquiaNome;

      // --- Contrato (só quando os campos essenciais existem/mapeiam para o enum) ---
      const tipoContrato = linha.tipoContrato ? TIPO_CONTRATO_MAP[linha.tipoContrato] : undefined;
      const dadosSuficientes =
        !!tipoContrato && linha.valorContrato != null && linha.valorMensal != null && linha.inicioContrato != null;
      if (!dadosSuficientes) continue;

      const chaveOrigemContrato = `${chaveOrigem}|contrato`;
      const contratoJaImportado = await jaImportado(chaveOrigemContrato, "contratos");
      if (contratoJaImportado) continue;

      const status = linha.status ? STATUS_MAP[linha.status] ?? "ATIVO" : "ATIVO";
      const contrato = await db.contrato.create({
        data: {
          clienteId: cliente.id,
          plano: linha.plano ?? "Não informado",
          tipoContrato: tipoContrato!,
          valorContrato: linha.valorContrato!,
          valorMensal: linha.valorMensal!,
          inicioContrato: linha.inicioContrato!,
          fimContrato: linha.fimContrato,
          renovacaoAutomatica: linha.renovacaoAuto === "Sim",
          status,
          dataSaida: parseDataSaida(linha.dataSaida),
        },
      });
      stats.contratosCriados++;
      await sleep(WRITE_DELAY_MS);
      await registrarImportacao(chaveOrigemContrato, "contratos", contrato.id);

      await db.evento.create({
        data: {
          clienteId: cliente.id,
          contratoId: contrato.id,
          tipoEvento: "NOVO_CONTRATO",
          dataEvento: contrato.inicioContrato,
          observacao: "Contrato importado da carteira legada (carteira_profits).",
          usuarioResponsavelId: adminUser!.id,
        },
      });
      stats.eventosCriados++;
      await sleep(WRITE_DELAY_MS);

      if (status === "CHURN") {
        await db.evento.create({
          data: {
            clienteId: cliente.id,
            contratoId: contrato.id,
            tipoEvento: "CHURN",
            dataEvento: contrato.dataSaida ?? contrato.fimContrato ?? contrato.inicioContrato,
            observacao: "Churn identificado na importação da carteira legada.",
            usuarioResponsavelId: adminUser!.id,
          },
        });
        stats.eventosCriados++;
        await sleep(WRITE_DELAY_MS);
      } else if (status === "PAUSADO") {
        await db.evento.create({
          data: {
            clienteId: cliente.id,
            contratoId: contrato.id,
            tipoEvento: "PAUSA",
            dataEvento: contrato.inicioContrato,
            observacao: "Pausa identificada na importação da carteira legada.",
            usuarioResponsavelId: adminUser!.id,
          },
        });
        stats.eventosCriados++;
        await sleep(WRITE_DELAY_MS);
      }
    }
  }

  console.log("Importação concluída.", dryRun ? "(dry-run, nada foi gravado)" : stats);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
