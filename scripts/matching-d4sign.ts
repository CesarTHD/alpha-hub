/**
 * Estágio 1 da automação de dados cadastrais via D4Sign.
 *
 * Lista todos os documentos "Finalizado" da conta D4Sign (poucas chamadas,
 * não uma por cliente — ver listarTodosDocumentosD4Sign) e casa cada cliente
 * sem `linkContratoD4Sign` pelo nome. Só GRAVA a proposta de match em
 * `propostas_d4sign`, sempre com status PENDENTE — nunca escreve em
 * `clientes` ou `contratos`. A aplicação de fato só acontece na tela de
 * revisão (admin), depois de um humano conferir os dados extraídos do
 * documento contra o que já está cadastrado.
 *
 * Uso:
 *   npm run d4sign:match -- --dry-run
 *   npm run d4sign:match
 */
import "dotenv/config";
import { db } from "@/lib/db";
import { listarTodosDocumentosD4Sign } from "@/lib/d4sign/client";
import { encontrarMelhorCandidato } from "@/lib/d4sign/match";

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const clientes = await db.cliente.findMany({
    where: { deletedAt: null, linkContratoD4Sign: null },
    select: { id: true, nome: true },
    orderBy: { nome: "asc" },
  });
  console.log(`${clientes.length} cliente(s) sem link do D4Sign.`);

  console.log("Listando documentos da conta D4Sign...");
  const documentos = await listarTodosDocumentosD4Sign();
  const finalizados = documentos.filter((d) => d.statusName === "Finalizado");
  console.log(`${documentos.length} documento(s) no total, ${finalizados.length} finalizado(s).`);

  const propostasExistentes = await db.propostaD4Sign.findMany({
    select: { clienteId: true, uuidDocumento: true },
  });
  const jaProposto = new Set(propostasExistentes.map((p) => `${p.clienteId}:${p.uuidDocumento}`));

  const novasPropostas: { clienteId: string; uuidDocumento: string; nomeDocumento: string; confianca: string }[] = [];
  let semMatch = 0;

  for (const cliente of clientes) {
    const candidato = encontrarMelhorCandidato(cliente.nome, finalizados);
    if (!candidato) {
      semMatch++;
      continue;
    }
    const chave = `${cliente.id}:${candidato.uuidDocumento}`;
    if (jaProposto.has(chave)) continue; // já existe proposta (pendente, aplicada ou rejeitada) pra esse par

    novasPropostas.push({
      clienteId: cliente.id,
      uuidDocumento: candidato.uuidDocumento,
      nomeDocumento: candidato.nomeDocumento,
      confianca: candidato.confianca,
    });
  }

  const alta = novasPropostas.filter((p) => p.confianca === "ALTA").length;
  const media = novasPropostas.filter((p) => p.confianca === "MEDIA").length;
  console.log(`Novas propostas: ${novasPropostas.length} (ALTA=${alta}, MEDIA=${media}). Sem match: ${semMatch}.`);

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
