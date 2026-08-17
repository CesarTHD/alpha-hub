/**
 * Estágio 2 (automático) da automação de dados cadastrais via D4Sign.
 *
 * Percorre as propostas PENDENTE (geradas por scripts/matching-d4sign.ts) e aplica
 * automaticamente os dados cadastrais ao cliente — exatamente a mesma ação de "Aplicar dados
 * cadastrais" da tela /d4sign-revisao — quando dá pra confiar no match sem revisão humana:
 *
 *   - Nenhuma divergência entre o contrato extraído do PDF e o contrato já cadastrado; OU
 *   - A(s) única(s) divergência(s) são:
 *       · "Renovação automática" (nunca é sobrescrita — a aplicação nunca mexe em Contrato,
 *         só em Cliente, igual à ação manual); e/ou
 *       · "Início do contrato", desde que a diferença seja menor que 30 dias.
 *
 * Qualquer outra divergência (plano, tipo, valor do contrato, valor mensal, ou início do
 * contrato com 30+ dias de diferença) deixa a proposta PENDENTE pra revisão manual em
 * /d4sign-revisao — o script nunca aplica nesses casos.
 *
 * Assim como a aplicação manual, isso NUNCA escreve em `contratos` — só em `clientes`
 * (dados cadastrais + link do D4Sign) e marca a proposta como APLICADA.
 *
 * A cota de download da API do D4Sign não é exposta via headers de rate-limit (confirmado
 * numa chamada de teste) — por isso o orçamento de downloads é conservador por padrão e o
 * script para na hora se a API responder com erro de limite de requisições (mesma detecção
 * reativa de scripts/matching-d4sign.ts). Rode de novo mais tarde pra continuar de onde parou
 * — propostas já aplicadas/rejeitadas não são reprocessadas.
 *
 * Toda proposta que consome um download (baixada e comparada, mesmo em --dry-run) e continua
 * PENDENTE — porque a divergência não é tolerada, faltou CPF/CNPJ, deu erro de extração, etc. —
 * fica marcada com `verificadoAutoEm`. Rodadas seguintes pulam quem já tem essa marca (mesmo com
 * a cota de download resetada), pra não gastar cota reprocessando as mesmas propostas que já
 * foram pra revisão manual em /d4sign-revisao. Use --recheck pra ignorar a marca e reprocessar
 * tudo de novo (ex.: depois de corrigir um bug de extração).
 *
 * Uso:
 *   npm run d4sign:auto-aplicar -- --dry-run
 *   npm run d4sign:auto-aplicar -- --max-downloads=50
 *   npm run d4sign:auto-aplicar -- --recheck
 *   npm run d4sign:auto-aplicar
 */
import "dotenv/config";
import { db } from "@/lib/db";
import { downloadD4SignDocumentPdf, D4SignError } from "@/lib/d4sign/client";
import { buildD4SignViewLink } from "@/lib/d4sign/link";
import { normalizarDocumento } from "@/lib/cnpj";
import { extrairContratoDePdf } from "@/lib/actions/contrato-pdf-pipeline";
import { compararContrato, type ContratoAtual } from "@/lib/contrato-comparacao";
import type { ContratoExtraido } from "@/lib/contrato-extracao";

const DOWNLOADS_PADRAO = 50; // conservador: não dá pra confirmar a cota real via headers da API do D4Sign.
const DIVERGENCIAS_TOLERADAS = new Set(["Renovação automática", "Início do contrato"]);
const LIMITE_DIAS_INICIO = 30;

function parseMaxDownloads(): number {
  const arg = process.argv.find((a) => a.startsWith("--max-downloads="));
  if (!arg) return DOWNLOADS_PADRAO;
  const n = Number(arg.split("=")[1]);
  return Number.isFinite(n) && n >= 0 ? n : DOWNLOADS_PADRAO;
}

function diferencaEmDias(a: string, b: Date): number {
  const dataA = new Date(a.slice(0, 10));
  const dataB = new Date(b.toISOString().slice(0, 10));
  return Math.abs((dataA.getTime() - dataB.getTime()) / 86_400_000);
}

/** Decide se dá pra aplicar sem revisão humana: nenhuma divergência, ou só divergências
 * toleradas (e, no caso de "Início do contrato", dentro do limite de dias). */
function podeAplicarAutomaticamente(
  diffs: { campo: string }[],
  extraido: ContratoExtraido,
  atual: ContratoAtual,
): boolean {
  return diffs.every((d) => {
    if (!DIVERGENCIAS_TOLERADAS.has(d.campo)) return false;
    if (d.campo === "Início do contrato") {
      if (!extraido.inicioContrato) return false;
      return diferencaEmDias(extraido.inicioContrato, new Date(atual.inicioContrato)) < LIMITE_DIAS_INICIO;
    }
    return true;
  });
}

/** Marca que essa proposta já consumiu um download e foi comparada — mesmo continuando
 * PENDENTE, rodadas futuras (sem --recheck) não vão baixar/comparar ela de novo. */
async function marcarVerificado(id: string) {
  await db.propostaD4Sign.update({ where: { id }, data: { verificadoAutoEm: new Date() } });
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const recheck = process.argv.includes("--recheck");
  let orcamentoDownloads = parseMaxDownloads();

  const usuarioSistema = await db.usuario.findFirst({
    where: { role: "ADMIN", ativo: true, deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, nome: true },
  });
  if (!usuarioSistema) {
    console.log("Nenhum usuário ADMIN ativo encontrado — as propostas aplicadas ficarão sem responsável registrado.");
  } else {
    console.log(`Atribuindo as aplicações automáticas a: ${usuarioSistema.nome}.`);
  }

  const totalPendentes = await db.propostaD4Sign.count({ where: { status: "PENDENTE" } });
  const propostas = await db.propostaD4Sign.findMany({
    where: { status: "PENDENTE", ...(recheck ? {} : { verificadoAutoEm: null }) },
    orderBy: { createdAt: "asc" },
    include: {
      cliente: {
        include: {
          contratos: { where: { deletedAt: null }, orderBy: { inicioContrato: "desc" } },
        },
      },
    },
  });
  // Confiança ALTA primeiro — mesma ordem da tela de revisão.
  propostas.sort((a, b) => (a.confianca === b.confianca ? 0 : a.confianca === "ALTA" ? -1 : 1));

  const jaVerificadas = totalPendentes - propostas.length;
  console.log(
    `${totalPendentes} proposta(s) PENDENTE` +
      (jaVerificadas > 0 && !recheck
        ? ` (${jaVerificadas} já verificada(s) em rodadas anteriores, pulando — use --recheck pra reprocessar)`
        : "") +
      `. ${propostas.length} a processar nesta rodada. Orçamento de downloads: ${orcamentoDownloads}.`,
  );

  let aplicadas = 0;
  let semContrato = 0;
  let semDocumento = 0;
  let divergenciaNaoTolerada = 0;
  let erroDownloadOuExtracao = 0;
  let documentoDuplicado = 0;
  let rateLimitAtingido = false;

  for (const proposta of propostas) {
    if (orcamentoDownloads <= 0 || rateLimitAtingido) break;

    const cliente = proposta.cliente;
    const contratoAtual = cliente.contratos.find(
      (c) => c.status === "ATIVO" || c.status === "PAUSADO" || c.status === "VENCIDO" || c.status === "ENCERRADO",
    );
    if (!contratoAtual) {
      semContrato++;
      continue; // sem contrato cadastrado pra comparar, não dá pra confirmar "sem divergência" — revisão manual.
    }

    orcamentoDownloads--;
    let extraido: ContratoExtraido;
    try {
      const pdf = await downloadD4SignDocumentPdf(proposta.uuidDocumento);
      const resultado = await extrairContratoDePdf(pdf);
      if (!resultado || !resultado.ok || !resultado.data) {
        console.log(`  [${cliente.nome}] não deu pra interpretar o PDF: ${resultado?.message}`);
        erroDownloadOuExtracao++;
        await marcarVerificado(proposta.id);
        continue;
      }
      extraido = resultado.data;
    } catch (err) {
      if (err instanceof D4SignError && /limite/i.test(err.message)) {
        console.log(`  [${cliente.nome}] cota de download do D4Sign atingida — parando.`);
        rateLimitAtingido = true;
        break;
      }
      console.log(`  [${cliente.nome}] falha ao baixar "${proposta.nomeDocumento}": ${err instanceof Error ? err.message : err}`);
      erroDownloadOuExtracao++;
      await marcarVerificado(proposta.id);
      continue;
    }

    const atual: ContratoAtual = {
      plano: contratoAtual.plano,
      tipoContrato: contratoAtual.tipoContrato,
      valorContrato: contratoAtual.valorContrato.toString(),
      valorMensal: contratoAtual.valorMensal.toString(),
      inicioContrato: contratoAtual.inicioContrato.toISOString(),
      renovacaoAutomatica: contratoAtual.renovacaoAutomatica,
    };
    const diffs = compararContrato(extraido, atual);

    if (!podeAplicarAutomaticamente(diffs, extraido, atual)) {
      console.log(`  [${cliente.nome}] divergência fora do tolerado (${diffs.map((d) => d.campo).join(", ") || "nenhuma"}) — revisão manual.`);
      divergenciaNaoTolerada++;
      await marcarVerificado(proposta.id);
      continue;
    }

    const documento = extraido.documento
      ? normalizarDocumento(extraido.documento).documento
      : cliente.documento;
    if (!documento) {
      console.log(`  [${cliente.nome}] sem CPF/CNPJ (nem extraído, nem já cadastrado) — revisão manual.`);
      semDocumento++;
      await marcarVerificado(proposta.id);
      continue;
    }

    const camposCadastrais = {
      documento,
      email: extraido.email ?? cliente.email ?? "",
      telefone: extraido.telefone ?? cliente.telefone ?? "",
      cidade: extraido.cidade ?? cliente.cidade ?? "",
      estado: (extraido.estado ? extraido.estado.slice(0, 2).toUpperCase() : cliente.estado) ?? "",
      segmento: cliente.segmento ?? "",
    };

    if (dryRun) {
      console.log(
        `  [${cliente.nome}] OK pra aplicar automaticamente${diffs.length > 0 ? ` (tolerando: ${diffs.map((d) => d.campo).join(", ")})` : " (sem divergência)"} — [dry-run] não aplicado.`,
      );
      aplicadas++;
      await marcarVerificado(proposta.id);
      continue;
    }

    try {
      await db.$transaction(async (tx) => {
        await tx.cliente.update({
          where: { id: cliente.id },
          data: {
            documento,
            email: camposCadastrais.email.trim() || null,
            telefone: camposCadastrais.telefone.trim() || null,
            cidade: camposCadastrais.cidade.trim() || null,
            estado: camposCadastrais.estado.trim() || null,
            segmento: camposCadastrais.segmento.trim() || null,
            linkContratoD4Sign: buildD4SignViewLink(proposta.uuidDocumento),
            ...(usuarioSistema ? { updatedById: usuarioSistema.id } : {}),
          },
        });
        await tx.propostaD4Sign.update({
          where: { id: proposta.id },
          data: {
            status: "APLICADA",
            revisadoEm: new Date(),
            ...(usuarioSistema ? { revisadoPorId: usuarioSistema.id } : {}),
          },
        });
      });
      console.log(
        `  [${cliente.nome}] aplicado${diffs.length > 0 ? ` (tolerando: ${diffs.map((d) => d.campo).join(", ")})` : " (sem divergência)"}.`,
      );
      aplicadas++;
    } catch (err) {
      const duplicado = err instanceof Error && "code" in err && (err as { code?: string }).code === "P2002";
      if (duplicado) {
        console.log(`  [${cliente.nome}] CPF/CNPJ já usado por outro cliente — revisão manual.`);
        documentoDuplicado++;
      } else {
        console.log(`  [${cliente.nome}] erro ao aplicar: ${err instanceof Error ? err.message : err}`);
        erroDownloadOuExtracao++;
      }
      await marcarVerificado(proposta.id);
    }
  }

  console.log(
    `\n${dryRun ? "[dry-run] Aplicaria" : "Aplicadas"}: ${aplicadas}. ` +
      `Sem contrato pra comparar: ${semContrato}. Divergência fora do tolerado: ${divergenciaNaoTolerada}. ` +
      `Sem CPF/CNPJ: ${semDocumento}. Documento duplicado: ${documentoDuplicado}. Erros: ${erroDownloadOuExtracao}.`,
  );
  const restantes = propostas.length - aplicadas - semContrato - divergenciaNaoTolerada - semDocumento - documentoDuplicado - erroDownloadOuExtracao;
  if (rateLimitAtingido || orcamentoDownloads <= 0) {
    console.log(`Cota de downloads esgotada nesta execução — ${restantes} proposta(s) ainda não processada(s). Rode de novo mais tarde.`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
