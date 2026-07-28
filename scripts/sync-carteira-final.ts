/**
 * Sincronização final da carteira legada (`carteira_profits`) — complementa
 * `scripts/import-carteira-profits.ts` (que só cria o que ainda não existe)
 * cobrindo o caso de clientes JÁ importados cujas linhas na fonte mudaram
 * desde a última importação (troca de franquia, plano, valor, tipo de
 * contrato ou status).
 *
 * Para cada cliente agrupado por nome (mesma regra de dedup do script
 * original — `documento = LEGADO-<slug(nome)>`):
 * - Se não existe em `clientes` -> cria cliente + carteira + contratos +
 *   eventos, reaproveitando a mesma lógica testada do import original,
 *   registrando em `legado_importacoes` para manter o histórico consistente.
 * - Se já existe -> compara o estado ATUAL (franquia ativa, contrato
 *   vigente) com a ÚLTIMA linha da fonte (por Início Contrato) e aplica só a
 *   diferença: fecha/abre `cliente_carteira` numa transferência, ou
 *   atualiza os campos do contrato vigente — sempre emitindo um evento
 *   descrevendo o que mudou. Nunca cria um cliente duplicado.
 *
 * Nunca toca em franquias.email/telefone/cidade/estado de franquias já
 * existentes — a fonte não tem esses campos, então uma franquia já
 * cadastrada nunca é atualizada, só criada quando ainda não existe.
 *
 * Uso:
 *   npx tsx scripts/sync-carteira-final.ts               (relatório, nada é gravado)
 *   npx tsx scripts/sync-carteira-final.ts --apply        (aplica de fato)
 */
import "dotenv/config";
import { Client } from "pg";
import { db } from "@/lib/db";

const LOTE_IMPORTACAO = new Date().toISOString().slice(0, 19);

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
  if (Number.isNaN(data.getTime())) return null;
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

function numerosDiferentes(a: unknown, b: number | null, epsilon = 0.005) {
  if (b == null) return false;
  return Math.abs(Number(a) - b) > epsilon;
}

async function readSourceRows(): Promise<Row[]> {
  const source = new Client({ connectionString: process.env.DATABASE_CLONE_URL });
  await source.connect();
  try {
    const res = await source.query(`
      SELECT
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
      id: null,
      cliente: r.cliente,
      franquia: r.franquia,
      status: r.status,
      plano: r.plano,
      tipoContrato: r.tipo_contrato,
      valorContrato: r.valor_contrato == null ? null : Number(r.valor_contrato),
      valorMensal: r.valor_mensal == null ? null : Number(r.valor_mensal),
      inicioContrato: r.inicio_contrato,
      fimContrato: r.fim_contrato,
      renovacaoAuto: r.renovacao_auto,
      dataSaida: r.data_saida,
      profit: r.profit,
    }));
  } finally {
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

async function upsertFranquia(nome: string, apply: boolean) {
  const existing = await db.franquia.findFirst({ where: { nome, deletedAt: null } });
  if (existing) return existing;
  if (!apply) return { id: "PENDENTE", nome } as { id: string; nome: string };
  const franquia = await db.franquia.create({
    data: { nome, cidade: "Não informado", estado: "NI" },
  });
  await sleep(WRITE_DELAY_MS);
  return franquia;
}

// Correções de digitação confirmadas manualmente (mesma unidade, nome duplicado
// por erro de grafia na fonte) — mesclar em vez de tratar como transferência real.
// Ver relatório da sincronização: 100% dos clientes ativos da franquia de origem
// apontavam para a de destino, que já existia como registro separado.
const FRANQUIA_MERGES: Record<string, string> = {
  "Arcageleti & CO": "Arcagelet & CO",
};

async function getSystemUser() {
  const usuario = await db.usuario.findFirst({
    where: { role: "ADMIN", ativo: true, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
  if (!usuario) {
    throw new Error("Nenhum usuário ADMIN ativo encontrado para atribuir a sincronização.");
  }
  return usuario;
}

async function criarClienteCompleto(
  nomeCliente: string,
  documento: string,
  linhasOrdenadas: Row[],
  usuarioId: string,
  apply: boolean,
) {
  if (!apply) return;

  const cliente = await db.cliente.create({
    data: {
      nome: nomeCliente,
      documento,
      observacoes: "Importado da carteira legada (carteira_profits) — sincronização final.",
      createdById: usuarioId,
      updatedById: usuarioId,
    },
  });
  await sleep(WRITE_DELAY_MS);

  await db.evento.create({
    data: {
      clienteId: cliente.id,
      tipoEvento: "CRIACAO_CLIENTE",
      dataEvento: linhasOrdenadas[0].inicioContrato ?? new Date(),
      observacao: "Cliente importado da carteira legada (carteira_profits) — sincronização final.",
      usuarioResponsavelId: usuarioId,
    },
  });
  await sleep(WRITE_DELAY_MS);

  let ultimaCarteiraId: string | null = null;
  let franquiaAnterior: string | null = null;

  for (let i = 0; i < linhasOrdenadas.length; i++) {
    const linha = linhasOrdenadas[i];
    const franquiaNome = linha.franquia?.trim();
    if (!franquiaNome) continue;

    const franquia = await upsertFranquia(franquiaNome, apply);
    const chaveOrigem = `${slug(nomeCliente)}|${slug(franquiaNome)}|${linha.inicioContrato?.toISOString() ?? "sem-data"}`;
    const dataInicio = linha.inicioContrato ?? new Date();

    const carteiraEntry = await db.clienteCarteira.create({
      data: {
        clienteId: cliente.id,
        franquiaId: franquia.id,
        dataInicio,
        ativo: i === linhasOrdenadas.length - 1,
      },
    });
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
          usuarioResponsavelId: usuarioId,
        },
      });
      await sleep(WRITE_DELAY_MS);
    }
    franquiaAnterior = franquiaNome;

    const tipoContrato = linha.tipoContrato ? TIPO_CONTRATO_MAP[linha.tipoContrato] : undefined;
    const dadosSuficientes =
      !!tipoContrato && linha.valorContrato != null && linha.valorMensal != null && linha.inicioContrato != null;
    if (!dadosSuficientes) continue;

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
    await sleep(WRITE_DELAY_MS);
    await registrarImportacao(`${chaveOrigem}|contrato`, "contratos", contrato.id);

    await db.evento.create({
      data: {
        clienteId: cliente.id,
        contratoId: contrato.id,
        tipoEvento: "NOVO_CONTRATO",
        dataEvento: contrato.inicioContrato,
        observacao: "Contrato importado da carteira legada (carteira_profits) — sincronização final.",
        usuarioResponsavelId: usuarioId,
      },
    });
    await sleep(WRITE_DELAY_MS);

    if (status === "CHURN") {
      await db.evento.create({
        data: {
          clienteId: cliente.id,
          contratoId: contrato.id,
          tipoEvento: "CHURN",
          dataEvento: contrato.dataSaida ?? contrato.fimContrato ?? contrato.inicioContrato,
          observacao: "Churn identificado na sincronização final da carteira legada.",
          usuarioResponsavelId: usuarioId,
        },
      });
      await sleep(WRITE_DELAY_MS);
    } else if (status === "PAUSADO") {
      await db.evento.create({
        data: {
          clienteId: cliente.id,
          contratoId: contrato.id,
          tipoEvento: "PAUSA",
          dataEvento: contrato.inicioContrato,
          observacao: "Pausa identificada na sincronização final da carteira legada.",
          usuarioResponsavelId: usuarioId,
        },
      });
      await sleep(WRITE_DELAY_MS);
    }
  }
}

async function main() {
  const apply = process.argv.includes("--apply");
  const rows = await readSourceRows();
  const usuario = await getSystemUser();
  console.log(`Sincronização final — ${rows.length} linha(s) na fonte. apply=${apply} usuário=${usuario.email}`);

  const porCliente = new Map<string, Row[]>();
  for (const r of rows) {
    if (!r.cliente) continue;
    const nome = r.cliente.trim();
    if (!porCliente.has(nome)) porCliente.set(nome, []);
    porCliente.get(nome)!.push(r);
  }

  const criados: string[] = [];
  const alterados: { nome: string; motivos: string[] }[] = [];
  let inalterados = 0;

  for (const [nomeCliente, linhasRaw] of porCliente) {
    const linhas = [...linhasRaw].sort(
      (a, b) => (a.inicioContrato?.getTime() ?? 0) - (b.inicioContrato?.getTime() ?? 0),
    );
    const ultima = linhas[linhas.length - 1];
    const documento = `LEGADO-${slug(nomeCliente)}`;

    const clienteExistente = await db.cliente.findUnique({
      where: { documento },
      include: {
        carteiraHistorico: { where: { ativo: true }, include: { franquia: true } },
        contratos: { orderBy: { inicioContrato: "desc" } },
      },
    });

    if (!clienteExistente) {
      criados.push(nomeCliente);
      await criarClienteCompleto(nomeCliente, documento, linhas, usuario.id, apply);
      continue;
    }

    const motivos: string[] = [];
    const statusEsperado: "ATIVO" | "PAUSADO" | "CHURN" = ultima.status
      ? STATUS_MAP[ultima.status] ?? "ATIVO"
      : "ATIVO";
    const tipoContratoEsperado = ultima.tipoContrato ? TIPO_CONTRATO_MAP[ultima.tipoContrato] : undefined;
    const dadosSuficientes =
      !!tipoContratoEsperado && ultima.valorContrato != null && ultima.valorMensal != null && ultima.inicioContrato != null;

    const carteiraAtiva = clienteExistente.carteiraHistorico[0] ?? null;
    const franquiaAtual = carteiraAtiva?.franquia.nome?.trim() ?? null;
    const franquiaEsperada = ultima.franquia?.trim() ?? null;

    const viraChurnAgora =
      statusEsperado === "CHURN" &&
      clienteExistente.contratos[0] &&
      clienteExistente.contratos[0].status !== "CHURN";

    // --- Franquia (só reconcilia se o cliente segue ativo/pausado na fonte) ---
    if (statusEsperado !== "CHURN" && franquiaEsperada && franquiaEsperada !== franquiaAtual) {
      const isMerge = franquiaAtual && FRANQUIA_MERGES[franquiaAtual] === franquiaEsperada;
      motivos.push(
        isMerge
          ? `Franquia (correção de cadastro, mesma unidade): "${franquiaAtual}" → "${franquiaEsperada}"`
          : `Franquia: "${franquiaAtual ?? "—"}" → "${franquiaEsperada}"`,
      );
      if (apply) {
        const franquia = await upsertFranquia(franquiaEsperada, apply);
        const dataMudanca = ultima.inicioContrato ?? new Date();
        if (carteiraAtiva) {
          await db.clienteCarteira.update({
            where: { id: carteiraAtiva.id },
            data: { ativo: false, dataFim: dataMudanca },
          });
          await sleep(WRITE_DELAY_MS);
        }
        await db.clienteCarteira.create({
          data: { clienteId: clienteExistente.id, franquiaId: franquia.id, dataInicio: dataMudanca, ativo: true },
        });
        await sleep(WRITE_DELAY_MS);
        await db.evento.create({
          data: {
            clienteId: clienteExistente.id,
            tipoEvento: isMerge ? "OBSERVACAO" : "TRANSFERENCIA_FRANQUIA",
            dataEvento: dataMudanca,
            observacao: isMerge
              ? `Correção de cadastro: cliente estava vinculado a "${franquiaAtual}" (duplicata/erro de digitação), consolidado em "${franquiaEsperada}" na sincronização final da carteira legada.`
              : `Sincronização final da carteira legada: transferência de "${franquiaAtual ?? "—"}" para "${franquiaEsperada}".`,
            usuarioResponsavelId: usuario.id,
          },
        });
        await sleep(WRITE_DELAY_MS);
      }
    }

    // --- Contrato vigente vs última linha da fonte ---
    const contratoVigente =
      clienteExistente.contratos.find((c) => c.status === "ATIVO" || c.status === "PAUSADO") ??
      clienteExistente.contratos[0] ??
      null;

    if (dadosSuficientes && !contratoVigente) {
      motivos.push(`Contrato ausente na base — criar (${ultima.plano ?? "?"}, ${statusEsperado})`);
      if (apply) {
        const contrato = await db.contrato.create({
          data: {
            clienteId: clienteExistente.id,
            plano: ultima.plano ?? "Não informado",
            tipoContrato: tipoContratoEsperado!,
            valorContrato: ultima.valorContrato!,
            valorMensal: ultima.valorMensal!,
            inicioContrato: ultima.inicioContrato!,
            fimContrato: ultima.fimContrato,
            renovacaoAutomatica: ultima.renovacaoAuto === "Sim",
            status: statusEsperado,
            dataSaida: parseDataSaida(ultima.dataSaida),
          },
        });
        await sleep(WRITE_DELAY_MS);
        await db.evento.create({
          data: {
            clienteId: clienteExistente.id,
            contratoId: contrato.id,
            tipoEvento: "NOVO_CONTRATO",
            dataEvento: contrato.inicioContrato,
            observacao: "Contrato criado na sincronização final da carteira legada (ausente na base).",
            usuarioResponsavelId: usuario.id,
          },
        });
        await sleep(WRITE_DELAY_MS);
      }
    } else if (dadosSuficientes && contratoVigente) {
      const diffs: string[] = [];
      const planoEsperado = ultima.plano?.trim();
      if (planoEsperado && planoEsperado !== contratoVigente.plano) {
        diffs.push(`plano: "${contratoVigente.plano}" → "${planoEsperado}"`);
      }
      if (tipoContratoEsperado && contratoVigente.tipoContrato !== tipoContratoEsperado) {
        diffs.push(`tipo: ${contratoVigente.tipoContrato} → ${tipoContratoEsperado}`);
      }
      if (numerosDiferentes(contratoVigente.valorContrato, ultima.valorContrato)) {
        diffs.push(`valor contrato: ${contratoVigente.valorContrato} → ${ultima.valorContrato}`);
      }
      if (numerosDiferentes(contratoVigente.valorMensal, ultima.valorMensal)) {
        diffs.push(`valor mensal: ${contratoVigente.valorMensal} → ${ultima.valorMensal}`);
      }
      if (contratoVigente.status !== statusEsperado) {
        diffs.push(`status: ${contratoVigente.status} → ${statusEsperado}`);
      }

      if (diffs.length) {
        motivos.push(`Contrato: ${diffs.join("; ")}`);
        if (apply) {
          await db.contrato.update({
            where: { id: contratoVigente.id },
            data: {
              plano: planoEsperado ?? contratoVigente.plano,
              tipoContrato: tipoContratoEsperado!,
              valorContrato: ultima.valorContrato!,
              valorMensal: ultima.valorMensal!,
              status: statusEsperado,
              renovacaoAutomatica: ultima.renovacaoAuto === "Sim",
              fimContrato: ultima.fimContrato,
              dataSaida: parseDataSaida(ultima.dataSaida),
            },
          });
          await sleep(WRITE_DELAY_MS);
          const dataEventoChurn = parseDataSaida(ultima.dataSaida) ?? ultima.fimContrato ?? new Date();
          await db.evento.create({
            data: {
              clienteId: clienteExistente.id,
              contratoId: contratoVigente.id,
              tipoEvento: statusEsperado === "CHURN" ? "CHURN" : "OBSERVACAO",
              dataEvento: statusEsperado === "CHURN" ? dataEventoChurn : new Date(),
              observacao: `Sincronização final da carteira legada: ${diffs.join("; ")}.`,
              usuarioResponsavelId: usuario.id,
            },
          });
          await sleep(WRITE_DELAY_MS);

          // Virou churn agora -> fecha a carteira ativa, espelhando registrarChurn().
          if (viraChurnAgora && carteiraAtiva) {
            await db.clienteCarteira.update({
              where: { id: carteiraAtiva.id },
              data: { ativo: false, dataFim: parseDataSaida(ultima.dataSaida) ?? ultima.fimContrato ?? new Date() },
            });
            await sleep(WRITE_DELAY_MS);
          }
        }
      }
    }

    if (motivos.length) alterados.push({ nome: nomeCliente, motivos });
    else inalterados++;
  }

  // Franquias de origem de uma mesclagem que ficaram sem clientes ativos -> soft-delete.
  const franquiasDesativadas: string[] = [];
  for (const nomeOrigem of Object.keys(FRANQUIA_MERGES)) {
    const franquia = await db.franquia.findFirst({ where: { nome: nomeOrigem, deletedAt: null } });
    if (!franquia) continue;
    const ativosRestantes = await db.clienteCarteira.count({ where: { franquiaId: franquia.id, ativo: true } });
    if (ativosRestantes === 0) {
      franquiasDesativadas.push(nomeOrigem);
      if (apply) {
        await db.franquia.update({ where: { id: franquia.id }, data: { deletedAt: new Date(), ativo: false } });
        await sleep(WRITE_DELAY_MS);
      }
    }
  }

  console.log("\n=== RELATÓRIO ===");
  console.log(`Clientes novos: ${criados.length}`);
  for (const nome of criados) console.log(`  + ${nome}`);
  console.log(`Clientes alterados: ${alterados.length}`);
  for (const a of alterados) console.log(`  ~ ${a.nome}\n      ${a.motivos.join("\n      ")}`);
  console.log(`Sem alterações: ${inalterados}`);
  if (franquiasDesativadas.length) {
    console.log(`Franquias consolidadas (ficaram sem clientes ativos, desativadas): ${franquiasDesativadas.join(", ")}`);
  }
  console.log(apply ? "\n(alterações aplicadas)" : "\n(dry-run — nada foi gravado; rode com --apply para aplicar)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
