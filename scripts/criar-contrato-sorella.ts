import "dotenv/config";
import { db } from "@/lib/db";

async function main() {
  const usuario = await db.usuario.findFirstOrThrow({
    where: { role: "ADMIN", ativo: true, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
  const clienteId = "cmrwfpmhy012zukto3f964dxi"; // Sorella Pizzeria

  const contrato = await db.contrato.create({
    data: {
      clienteId,
      plano: "Gold",
      tipoContrato: "QUADRIMESTRAL",
      valorContrato: 8400,
      valorMensal: 2100,
      inicioContrato: new Date("2026-07-13"),
      fimContrato: new Date("2026-11-13"),
      renovacaoAutomatica: false,
      status: "ATIVO",
    },
  });
  await db.evento.create({
    data: {
      clienteId,
      contratoId: contrato.id,
      tipoEvento: "NOVO_CONTRATO",
      dataEvento: contrato.inicioContrato,
      observacao:
        "Contrato criado após adicionar QUADRIMESTRAL ao enum TipoContrato (ausente na base por limitação de schema).",
      usuarioResponsavelId: usuario.id,
    },
  });
  console.log("Contrato criado:", contrato.id, contrato.tipoContrato, contrato.valorMensal.toString());
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
