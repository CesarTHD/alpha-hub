import "dotenv/config";
import { db } from "@/lib/db";
import type { TipoContrato } from "@/generated/prisma/client";

const MESES: Record<TipoContrato, number> = {
  MENSAL: 1,
  TRIMESTRAL: 3,
  QUADRIMESTRAL: 4,
  SEMESTRAL: 6,
  ANUAL: 12,
};

const PENDENTES: {
  clienteId: string;
  nome: string;
  plano: string;
  tipoContrato: TipoContrato;
  valorContrato: number;
  inicioContrato: Date;
  fimContrato: Date;
}[] = [
  {
    clienteId: "cmrwgh5ao03gcuktoq5mo4uxo",
    nome: "7 GRALLO",
    plano: "Silver",
    tipoContrato: "TRIMESTRAL",
    valorContrato: 7000,
    inicioContrato: new Date("2026-06-19"),
    fimContrato: new Date("2026-09-19"),
  },
  {
    clienteId: "cmrwgixmf03m7uktow0pwusls",
    nome: "Obentô",
    plano: "Silver",
    tipoContrato: "SEMESTRAL",
    valorContrato: 12000,
    inicioContrato: new Date("2026-03-24"),
    fimContrato: new Date("2026-09-24"),
  },
  {
    clienteId: "cmrwgjdls03npuktoouvyj4ss",
    nome: "SICILIANA",
    plano: "Gold",
    tipoContrato: "ANUAL",
    valorContrato: 18750,
    inicioContrato: new Date("2026-03-23"),
    fimContrato: new Date("2027-03-23"),
  },
];

async function main() {
  const usuario = await db.usuario.findFirstOrThrow({
    where: { role: "ADMIN", ativo: true, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });

  for (const p of PENDENTES) {
    const valorMensal = p.valorContrato / MESES[p.tipoContrato];
    const contrato = await db.contrato.create({
      data: {
        clienteId: p.clienteId,
        plano: p.plano,
        tipoContrato: p.tipoContrato,
        valorContrato: p.valorContrato,
        valorMensal,
        inicioContrato: p.inicioContrato,
        fimContrato: p.fimContrato,
        renovacaoAutomatica: false,
        status: "ATIVO",
      },
    });
    await db.evento.create({
      data: {
        clienteId: p.clienteId,
        contratoId: contrato.id,
        tipoEvento: "NOVO_CONTRATO",
        dataEvento: contrato.inicioContrato,
        observacao: "Contrato criado após valor informado manualmente (ausente na carteira legada).",
        usuarioResponsavelId: usuario.id,
      },
    });
    console.log(
      `${p.nome}: contrato ${contrato.id} — ${p.tipoContrato}, total R$${p.valorContrato}, mensal R$${valorMensal.toFixed(2)}`,
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
