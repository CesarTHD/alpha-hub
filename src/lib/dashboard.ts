import { db } from "@/lib/db";
import type { TipoContrato } from "@/generated/prisma/client";

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function segmento(tipoContrato: TipoContrato): "mrr" | "tcv" {
  return tipoContrato === "MENSAL" ? "mrr" : "tcv";
}

function contarPorSegmento(rows: { tipoContrato: TipoContrato }[]) {
  let mrr = 0;
  let tcv = 0;
  for (const row of rows) {
    if (segmento(row.tipoContrato) === "mrr") mrr++;
    else tcv++;
  }
  return { total: rows.length, mrr, tcv };
}

export async function getDashboardData() {
  const agora = new Date();
  const inicioMes = startOfMonth(agora);

  // Sequential on purpose — see comment in src/app/franquias/page.tsx:
  // concurrent Prisma queries over the same pool have been observed to
  // cross-contaminate result rows under Prisma 7.9 + @prisma/adapter-pg
  // against `prisma dev`'s local proxy.
  const clientesAtivosRows = await db.contrato.findMany({
    where: { status: "ATIVO" },
    distinct: ["clienteId"],
    select: { clienteId: true, tipoContrato: true },
  });
  const clientesPausadosRows = await db.contrato.findMany({
    where: { status: "PAUSADO" },
    distinct: ["clienteId"],
    select: { clienteId: true, tipoContrato: true },
  });
  const clientesChurnRows = await db.contrato.findMany({
    where: { status: "CHURN" },
    distinct: ["clienteId"],
    select: { clienteId: true, tipoContrato: true },
  });
  const contratosAtivos = await db.contrato.findMany({
    where: { status: "ATIVO" },
    select: {
      clienteId: true,
      tipoContrato: true,
      valorMensal: true,
      valorContrato: true,
    },
  });
  const franquias = await db.franquia.findMany({
    where: { deletedAt: null },
    include: {
      historicoProfit: { where: { ativo: true }, include: { profit: true } },
      historicoCarteira: { where: { ativo: true }, select: { clienteId: true } },
    },
  });
  const clientes = await db.cliente.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      createdAt: true,
      contratos: {
        select: { inicioContrato: true, status: true, dataSaida: true, fimContrato: true, tipoContrato: true },
      },
      eventos: { where: { tipoEvento: "RENOVACAO" }, select: { dataEvento: true } },
    },
  });

  // Classifica um cliente pelo contrato ativo; sem contrato ativo, pelo mais recente.
  function segmentoCliente(contratosCliente: (typeof clientes)[number]["contratos"]): "mrr" | "tcv" | null {
    if (contratosCliente.length === 0) return null;
    const ativo = contratosCliente.find((c) => c.status === "ATIVO");
    const referencia =
      ativo ??
      contratosCliente.reduce((mais, c) => (c.inicioContrato > mais.inicioContrato ? c : mais), contratosCliente[0]);
    return segmento(referencia.tipoContrato);
  }

  const totalClientes = clientes.length;

  const clientesAtivos = contarPorSegmento(clientesAtivosRows);
  const clientesPausados = contarPorSegmento(clientesPausadosRows);
  const clientesChurn = contarPorSegmento(clientesChurnRows);

  const novosClientesMesClientes = clientes.filter((c) => c.createdAt >= inicioMes);
  const clientesRenovadosMesClientes = clientes.filter((c) => c.eventos.some((e) => e.dataEvento >= inicioMes));

  function contarClientesPorSegmento(lista: typeof clientes) {
    let mrr = 0;
    let tcv = 0;
    for (const c of lista) {
      const s = segmentoCliente(c.contratos);
      if (s === "mrr") mrr++;
      else if (s === "tcv") tcv++;
    }
    return { total: lista.length, mrr, tcv };
  }

  const novosClientesMes = contarClientesPorSegmento(novosClientesMesClientes);
  const clientesRenovadosMes = contarClientesPorSegmento(clientesRenovadosMesClientes);

  const contratosAtivosMRR = contratosAtivos.filter((c) => segmento(c.tipoContrato) === "mrr");
  const contratosAtivosTCV = contratosAtivos.filter((c) => segmento(c.tipoContrato) === "tcv");

  const mrrTotal = contratosAtivosMRR.reduce((sum, c) => sum + Number(c.valorMensal), 0);
  const valorTotalContratadoTCV = contratosAtivosTCV.reduce((sum, c) => sum + Number(c.valorContrato), 0);

  const ticketMedioMRR = clientesAtivos.mrr > 0 ? mrrTotal / clientesAtivos.mrr : 0;
  const ticketMedioTCV = clientesAtivos.tcv > 0 ? valorTotalContratadoTCV / clientesAtivos.tcv : 0;

  const clientesComRenovacao = clientes.filter((c) => c.eventos.length > 0).length;
  const taxaRenovacao = totalClientes > 0 ? (clientesComRenovacao / totalClientes) * 100 : 0;
  const taxaChurn = totalClientes > 0 ? (clientesChurn.total / totalClientes) * 100 : 0;

  const permanenciaDias = clientes
    .map((c) => {
      if (c.contratos.length === 0) return null;
      const inicio = c.contratos.reduce(
        (min, ct) => (ct.inicioContrato < min ? ct.inicioContrato : min),
        c.contratos[0].inicioContrato,
      );
      const churned = c.contratos.find((ct) => ct.status === "CHURN");
      const fim = churned?.dataSaida ?? agora;
      return (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24);
    })
    .filter((v): v is number => v !== null);

  const tempoMedioPermanenciaDias =
    permanenciaDias.length > 0 ? permanenciaDias.reduce((a, b) => a + b, 0) / permanenciaDias.length : 0;

  const mrrPorClienteId = new Map(contratosAtivosMRR.map((c) => [c.clienteId, Number(c.valorMensal)]));

  const rankingFranquias = franquias
    .map((f) => {
      const clientesIds = f.historicoCarteira.map((h) => h.clienteId);
      const mrr = clientesIds.reduce((sum, id) => sum + (mrrPorClienteId.get(id) ?? 0), 0);
      return {
        id: f.id,
        nome: f.nome,
        clientes: clientesIds.length,
        mrr,
        profit: f.historicoProfit[0]?.profit.nome ?? null,
        profitId: f.historicoProfit[0]?.profit.id ?? null,
      };
    })
    .sort((a, b) => b.mrr - a.mrr);

  const profitMap = new Map<string, { nome: string; clientes: number; mrr: number }>();
  for (const f of rankingFranquias) {
    if (!f.profitId) continue;
    const atual = profitMap.get(f.profitId) ?? { nome: f.profit ?? "—", clientes: 0, mrr: 0 };
    atual.clientes += f.clientes;
    atual.mrr += f.mrr;
    profitMap.set(f.profitId, atual);
  }
  const rankingProfits = Array.from(profitMap.values()).sort((a, b) => b.mrr - a.mrr);

  return {
    carteira: {
      clientesAtivos,
      clientesPausados,
      clientesChurn,
      novosClientesMes,
      clientesRenovadosMes,
      totalClientes,
    },
    financeiro: {
      mrr: {
        total: mrrTotal,
        ticketMedio: ticketMedioMRR,
        clientes: clientesAtivos.mrr,
      },
      tcv: {
        valorTotalContratado: valorTotalContratadoTCV,
        ticketMedio: ticketMedioTCV,
        clientes: clientesAtivos.tcv,
      },
    },
    retencao: {
      taxaChurn,
      taxaRenovacao,
      tempoMedioPermanenciaMeses: tempoMedioPermanenciaDias / 30,
    },
    operacao: {
      rankingFranquias,
      rankingProfits,
    },
  };
}
