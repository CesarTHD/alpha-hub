/**
 * Estágio 1 da automação de dados cadastrais via D4Sign.
 *
 * Lista todos os documentos da conta D4Sign (poucas chamadas, não uma por cliente — ver
 * listarTodosDocumentosD4Sign) e casa cada cliente sem `linkContratoD4Sign` pelo nome. Considera
 * documentos "Finalizado" E "Aguardando Assinaturas"/"Aguardando Signatários" (nunca
 * "Cancelado") — Finalizado sempre tem prioridade quando existe.
 *
 * Cliente que não acha nenhum candidato pelo match exato (encontrarCandidatos) cai num fallback
 * fuzzy (encontrarCandidatosFuzzy, em src/lib/d4sign/match.ts) que tolera erro de digitação,
 * plural/singular e palavra composta junta/separada — mas exige igual as palavras que de fato
 * IDENTIFICAM o cliente (ignora descritor de categoria genérico tipo "pizzaria"/"burguer", comum
 * demais pra distinguir cliente). Proposta vinda desse fallback é sempre confiança BAIXA, mesmo
 * que só haja um candidato — o nome bateu por aproximação, não por igualdade.
 *
 * Um cliente pode ter mais de um candidato no mesmo nível de prioridade (ex.: dois documentos
 * "Finalizado" com nome parecido — contrato antigo + renovação). Nesse caso, se o cliente já tem
 * um contrato cadastrado pra comparar, baixa cada candidato, extrai os dados via regex
 * (src/lib/contrato-extracao.ts) e pontua a semelhança (plano, tipo, valor, e data de criação do
 * documento no D4Sign vs. início do contrato cadastrado) — fica só com o de maior pontuação. Sem
 * contrato pra comparar, ou sem cota de download disponível, propõe todos os empatados como
 * MEDIA e deixa a decisão pra revisão manual.
 *
 * Só GRAVA a proposta de match em `propostas_d4sign`, sempre com status PENDENTE — nunca escreve
 * em `clientes` ou `contratos`. A aplicação de fato só acontece na tela de revisão (admin),
 * depois de um humano conferir os dados extraídos do documento contra o que já está cadastrado.
 *
 * Uso:
 *   npm run d4sign:match -- --dry-run
 *   npm run d4sign:match -- --max-downloads=20
 *   npm run d4sign:match
 */
import "dotenv/config";
import { db } from "@/lib/db";
import { downloadD4SignDocumentPdf, listarTodosDocumentosD4Sign, D4SignError } from "@/lib/d4sign/client";
import {
  encontrarCandidatos,
  encontrarCandidatosFuzzy,
  calcularFrequenciaPalavras,
  nomeCasaExatamente,
  PRIORIDADE_STATUS,
  type CandidatoMatch,
} from "@/lib/d4sign/match";
import { extrairDataCriacaoDocumento } from "@/lib/d4sign/audit";
import { extractPdfText } from "@/lib/pdf/extract-text";
import { extractContratoFromText, type ContratoExtraido } from "@/lib/contrato-extracao";

const DOWNLOADS_PADRAO = 8; // conservador: a cota de download do D4Sign é baixa (ver README/histórico)

type ContratoAtual = {
  plano: string;
  tipoContrato: string;
  valorContrato: number;
  inicioContrato: Date;
};

function parseMaxDownloads(): number {
  const arg = process.argv.find((a) => a.startsWith("--max-downloads="));
  if (!arg) return DOWNLOADS_PADRAO;
  const n = Number(arg.split("=")[1]);
  return Number.isFinite(n) && n >= 0 ? n : DOWNLOADS_PADRAO;
}

/** Quanto mais próximos plano/tipo/valor/data do que já está cadastrado, maior a pontuação. Sem
 * contrato pra comparar, não dá pra pontuar por conteúdo (volta 0 sempre). */
function pontuarCandidato(extraido: ContratoExtraido, dataCriacaoDocumento: Date | null, atual: ContratoAtual): number {
  let pontos = 0;
  if (extraido.plano && extraido.plano.trim().toLowerCase() === atual.plano.trim().toLowerCase()) pontos += 1;
  if (extraido.tipoContrato && extraido.tipoContrato === atual.tipoContrato) pontos += 1;
  if (extraido.valorContrato != null && Math.abs(extraido.valorContrato - atual.valorContrato) < 0.01) pontos += 1;

  // Data de criação do documento no D4Sign é um sinal mais confiável que o "início" extraído do
  // corpo do contrato (que às vezes é a data da primeira parcela, não da assinatura) — usa ela
  // como referência quando disponível, só cai pro início extraído do texto se não achar.
  const referencia = dataCriacaoDocumento ?? (extraido.inicioContrato ? new Date(extraido.inicioContrato) : null);
  if (referencia) {
    const diffDias = Math.abs((referencia.getTime() - atual.inicioContrato.getTime()) / 86_400_000);
    if (diffDias <= 3) pontos += 2;
    else if (diffDias <= 45) pontos += 1;
  }
  return pontos;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  let orcamentoDownloads = parseMaxDownloads();

  const clientes = await db.cliente.findMany({
    where: { deletedAt: null, linkContratoD4Sign: null },
    select: {
      id: true,
      nome: true,
      contratos: {
        where: { deletedAt: null, status: { in: ["ATIVO", "PAUSADO", "VENCIDO", "ENCERRADO"] } },
        orderBy: { inicioContrato: "desc" },
        take: 1,
        select: { plano: true, tipoContrato: true, valorContrato: true, inicioContrato: true },
      },
    },
    orderBy: { nome: "asc" },
  });
  console.log(`${clientes.length} cliente(s) sem link do D4Sign.`);

  console.log("Listando documentos da conta D4Sign...");
  const documentos = await listarTodosDocumentosD4Sign();
  console.log(`${documentos.length} documento(s) no total.`);
  console.log(`Orçamento de downloads pra desambiguação por conteúdo: ${orcamentoDownloads}.`);
  const frequenciaPalavras = calcularFrequenciaPalavras(documentos);

  const propostasExistentes = await db.propostaD4Sign.findMany({
    select: { clienteId: true, uuidDocumento: true, status: true },
  });
  const statusPorPar = new Map(propostasExistentes.map((p) => [`${p.clienteId}:${p.uuidDocumento}`, p.status]));

  const novasPropostas: { clienteId: string; uuidDocumento: string; nomeDocumento: string; confianca: string }[] = [];
  let semMatch = 0;
  let viaFuzzy = 0;
  let desambiguadosPorConteudo = 0;
  let precisariamDesambiguar = 0;
  let precisariamDesambiguarComContrato = 0;
  let rateLimitAtingido = false;

  for (const cliente of clientes) {
    let todosCandidatos = encontrarCandidatos(cliente.nome, documentos);
    let origemFuzzy = false;
    if (todosCandidatos.length === 0) {
      todosCandidatos = encontrarCandidatosFuzzy(cliente.nome, documentos, frequenciaPalavras);
      origemFuzzy = todosCandidatos.length > 0;
    }
    if (todosCandidatos.length === 0) {
      semMatch++;
      continue;
    }
    if (origemFuzzy) viaFuzzy++;

    // Percorre os níveis de prioridade (Finalizado primeiro) até achar um com candidato ainda
    // não proposto. Só desce de nível se TODOS os candidatos do nível atual já foram REJEITADA —
    // se algum estiver PENDENTE ou já APLICADA, para ali (não faz sentido sugerir um nível pior
    // pro mesmo cliente enquanto o melhor ainda está em aberto ou já foi resolvido com sucesso).
    const niveis = [...new Set(todosCandidatos.map((c) => PRIORIDADE_STATUS[c.statusName] ?? 99))].sort((a, b) => a - b);
    let vencedores: CandidatoMatch[] = [];
    for (const nivel of niveis) {
      const doNivel = todosCandidatos.filter((c) => (PRIORIDADE_STATUS[c.statusName] ?? 99) === nivel);
      const disponiveis = doNivel.filter((c) => !statusPorPar.has(`${cliente.id}:${c.uuidDocumento}`));
      if (disponiveis.length > 0) {
        vencedores = disponiveis;
        break;
      }
      const temPendenteOuAplicada = doNivel.some((c) => {
        const status = statusPorPar.get(`${cliente.id}:${c.uuidDocumento}`);
        return status === "PENDENTE" || status === "APLICADA";
      });
      if (temPendenteOuAplicada) break; // não desce: esse nível já está em aberto ou resolvido
      // senão, todos os candidatos desse nível foram REJEITADA — tenta o próximo nível
    }
    if (vencedores.length === 0) continue;

    if (vencedores.length === 1) {
      const c = vencedores[0];
      const confianca = origemFuzzy
        ? "BAIXA"
        : c.statusName === "Finalizado" && todosCandidatos.length === 1 && nomeCasaExatamente(cliente.nome, c.nomeDocumento)
          ? "ALTA"
          : "MEDIA";
      novasPropostas.push({ clienteId: cliente.id, uuidDocumento: c.uuidDocumento, nomeDocumento: c.nomeDocumento, confianca });
      continue;
    }

    // Mais de um candidato no mesmo nível — tenta desempatar pelo conteúdo do contrato.
    precisariamDesambiguar++;
    if (cliente.contratos[0]) precisariamDesambiguarComContrato++;
    const atual = cliente.contratos[0]
      ? {
          plano: cliente.contratos[0].plano,
          tipoContrato: cliente.contratos[0].tipoContrato as string,
          valorContrato: Number(cliente.contratos[0].valorContrato),
          inicioContrato: cliente.contratos[0].inicioContrato,
        }
      : null;

    if (!atual || orcamentoDownloads <= 0 || rateLimitAtingido) {
      for (const c of vencedores) {
        novasPropostas.push({
          clienteId: cliente.id,
          uuidDocumento: c.uuidDocumento,
          nomeDocumento: c.nomeDocumento,
          confianca: origemFuzzy ? "BAIXA" : "MEDIA",
        });
      }
      continue;
    }

    const pontuados: { candidato: CandidatoMatch; pontos: number }[] = [];
    for (const c of vencedores) {
      if (orcamentoDownloads <= 0 || rateLimitAtingido) break;
      orcamentoDownloads--;
      try {
        const pdf = await downloadD4SignDocumentPdf(c.uuidDocumento);
        const texto = await extractPdfText(pdf);
        const extraido = extractContratoFromText(texto);
        const dataCriacao = extrairDataCriacaoDocumento(texto);
        pontuados.push({ candidato: c, pontos: pontuarCandidato(extraido, dataCriacao, atual) });
      } catch (err) {
        if (err instanceof D4SignError && /limite/i.test(err.message)) {
          console.log(`  [${cliente.nome}] cota de download do D4Sign atingida — parando desambiguação por conteúdo.`);
          rateLimitAtingido = true;
        } else {
          console.log(`  [${cliente.nome}] falha ao baixar "${c.nomeDocumento}": ${err instanceof Error ? err.message : err}`);
        }
      }
    }

    if (pontuados.length === 0) {
      for (const c of vencedores) {
        novasPropostas.push({
          clienteId: cliente.id,
          uuidDocumento: c.uuidDocumento,
          nomeDocumento: c.nomeDocumento,
          confianca: origemFuzzy ? "BAIXA" : "MEDIA",
        });
      }
      continue;
    }

    desambiguadosPorConteudo++;
    const maiorPontuacao = Math.max(...pontuados.map((p) => p.pontos));
    for (const p of pontuados.filter((p) => p.pontos === maiorPontuacao)) {
      novasPropostas.push({
        clienteId: cliente.id,
        uuidDocumento: p.candidato.uuidDocumento,
        nomeDocumento: p.candidato.nomeDocumento,
        confianca: origemFuzzy ? "BAIXA" : "MEDIA",
      });
    }
  }

  const alta = novasPropostas.filter((p) => p.confianca === "ALTA").length;
  const media = novasPropostas.filter((p) => p.confianca === "MEDIA").length;
  const baixa = novasPropostas.filter((p) => p.confianca === "BAIXA").length;
  console.log(
    `\nNovas propostas: ${novasPropostas.length} (ALTA=${alta}, MEDIA=${media}, BAIXA=${baixa} via fuzzy). Sem match: ${semMatch}. ` +
      `Clientes resolvidos só via fuzzy: ${viaFuzzy}. Desambiguados por conteúdo: ${desambiguadosPorConteudo}. ` +
      `Downloads restantes no orçamento: ${orcamentoDownloads}.`,
  );
  console.log(
    `Clientes com candidatos empatados no mesmo nível: ${precisariamDesambiguar} ` +
      `(${precisariamDesambiguarComContrato} têm contrato cadastrado pra comparar).`,
  );

  if (dryRun) {
    console.log("[dry-run] Nenhuma proposta foi gravada.");
    return;
  }

  if (novasPropostas.length === 0) {
    console.log("Nada novo pra gravar.");
    return;
  }

  const resultado = await db.propostaD4Sign.createMany({
    data: novasPropostas,
    skipDuplicates: true,
  });
  console.log(`${resultado.count} proposta(s) gravada(s) como PENDENTE.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
