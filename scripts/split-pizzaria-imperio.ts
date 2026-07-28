/**
 * Divide o cliente "Pizzaria império" (documento LEGADO-PIZZARIA-IMPERIO),
 * que hoje mistura o histórico de DOIS clientes reais distintos (mesmo nome
 * "Pizzaria Império"/"Pizzaria império", grafias diferentes que colidiram no
 * mesmo `documento` normalizado), em dois clientes separados — mesmo padrão
 * já usado para separar "Di Napoli".
 *
 * Fonte (carteira_profits), conferida linha a linha:
 *  - "Pizzaria Império" @ Dias Souza & Co — Churn, 12/03 a 12/06/2026.
 *  - "Pizzaria império"  @ Nieri & Co     — Ativo, desde 17/04/2026.
 *
 * O registro combinado original é soft-deletado ao final.
 */
import "dotenv/config";
import { db } from "@/lib/db";

async function main() {
  const usuario = await db.usuario.findFirst({
    where: { role: "ADMIN", ativo: true, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
  if (!usuario) throw new Error("Nenhum ADMIN ativo encontrado.");

  const diasSouza = await db.franquia.findFirstOrThrow({ where: { nome: "Dias Souza & Co" } });
  const nieri = await db.franquia.findFirstOrThrow({ where: { nome: "Nieri & Co" } });

  const antigo = await db.cliente.findUniqueOrThrow({ where: { documento: "LEGADO-PIZZARIA-IMPERIO" } });

  await db.$transaction(async (tx) => {
    // --- Cliente A: Pizzaria Império @ Dias Souza & Co (churn) ---
    const clienteA = await tx.cliente.create({
      data: {
        nome: "Pizzaria Império (Dias Souza)",
        documento: "LEGADO-PIZZARIA-IMPERIO-DIASSOUZA",
        observacoes: "Separado do registro combinado 'Pizzaria império' — cliente distinto (Dias Souza & Co).",
        createdById: usuario.id,
        updatedById: usuario.id,
      },
    });
    await tx.clienteCarteira.create({
      data: {
        clienteId: clienteA.id,
        franquiaId: diasSouza.id,
        dataInicio: new Date("2026-03-12"),
        dataFim: new Date("2026-06-12"),
        ativo: false,
      },
    });
    const contratoA = await tx.contrato.create({
      data: {
        clienteId: clienteA.id,
        plano: "Silver",
        tipoContrato: "TRIMESTRAL",
        valorContrato: 6133.33,
        valorMensal: 2044.44,
        inicioContrato: new Date("2026-03-12"),
        fimContrato: new Date("2026-06-12"),
        renovacaoAutomatica: false,
        status: "CHURN",
        dataSaida: new Date("2026-06-12"),
      },
    });
    await tx.evento.create({
      data: {
        clienteId: clienteA.id,
        tipoEvento: "CRIACAO_CLIENTE",
        dataEvento: new Date("2026-03-12"),
        observacao: "Cliente separado do registro combinado 'Pizzaria império' (Dias Souza & Co).",
        usuarioResponsavelId: usuario.id,
      },
    });
    await tx.evento.create({
      data: {
        clienteId: clienteA.id,
        contratoId: contratoA.id,
        tipoEvento: "NOVO_CONTRATO",
        dataEvento: new Date("2026-03-12"),
        observacao: "Contrato importado da carteira legada (carteira_profits).",
        usuarioResponsavelId: usuario.id,
      },
    });
    await tx.evento.create({
      data: {
        clienteId: clienteA.id,
        contratoId: contratoA.id,
        tipoEvento: "CHURN",
        dataEvento: new Date("2026-06-12"),
        observacao: "Churn identificado na carteira legada.",
        usuarioResponsavelId: usuario.id,
      },
    });

    // --- Cliente B: Pizzaria império @ Nieri & Co (ativo) ---
    const clienteB = await tx.cliente.create({
      data: {
        nome: "Pizzaria império (Nieri)",
        documento: "LEGADO-PIZZARIA-IMPERIO-NIERI",
        observacoes: "Separado do registro combinado 'Pizzaria império' — cliente distinto (Nieri & Co).",
        createdById: usuario.id,
        updatedById: usuario.id,
      },
    });
    await tx.clienteCarteira.create({
      data: {
        clienteId: clienteB.id,
        franquiaId: nieri.id,
        dataInicio: new Date("2026-04-17"),
        ativo: true,
      },
    });
    const contratoB = await tx.contrato.create({
      data: {
        clienteId: clienteB.id,
        plano: "Silver",
        tipoContrato: "TRIMESTRAL",
        valorContrato: 7000,
        valorMensal: 2333.333333,
        inicioContrato: new Date("2026-04-17"),
        fimContrato: new Date("2026-07-17"),
        renovacaoAutomatica: false,
        status: "ATIVO",
      },
    });
    await tx.evento.create({
      data: {
        clienteId: clienteB.id,
        tipoEvento: "CRIACAO_CLIENTE",
        dataEvento: new Date("2026-04-17"),
        observacao: "Cliente separado do registro combinado 'Pizzaria império' (Nieri & Co).",
        usuarioResponsavelId: usuario.id,
      },
    });
    await tx.evento.create({
      data: {
        clienteId: clienteB.id,
        contratoId: contratoB.id,
        tipoEvento: "NOVO_CONTRATO",
        dataEvento: new Date("2026-04-17"),
        observacao: "Contrato importado da carteira legada (carteira_profits).",
        usuarioResponsavelId: usuario.id,
      },
    });

    // --- Retira o registro combinado antigo ---
    await tx.clienteCarteira.updateMany({
      where: { clienteId: antigo.id, ativo: true },
      data: { ativo: false, dataFim: new Date("2026-06-12") },
    });
    await tx.cliente.update({
      where: { id: antigo.id },
      data: { deletedAt: new Date(), updatedById: usuario.id },
    });

    console.log("Cliente A criado:", clienteA.id, clienteA.nome);
    console.log("Cliente B criado:", clienteB.id, clienteB.nome);
    console.log("Registro combinado antigo (soft-delete):", antigo.id, antigo.nome);
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
