import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { clientesWhere } from "@/lib/clientes-filtros";
import { buildClientesCsv, buildClientesXlsx, type ClienteExportRow } from "@/lib/export/clientes-export";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const usuario = await getCurrentUser();
  const { searchParams } = new URL(request.url);

  const nome = searchParams.get("nome") ?? "";
  const status = searchParams.getAll("status");
  const franquia = searchParams.getAll("franquia");
  const profit = searchParams.getAll("profit");
  const semD4Sign = searchParams.get("semD4Sign") === "1";
  const formato = searchParams.get("formato") === "xlsx" ? "xlsx" : "csv";

  const where = clientesWhere(usuario, { nome, status, franquia, profit, semD4Sign });

  const clientesEncontrados = await db.cliente.findMany({
    where,
    orderBy: { nome: "asc" },
    include: {
      carteiraHistorico: {
        orderBy: { dataInicio: "desc" },
        take: 1,
        include: {
          franquia: { include: { historicoProfit: { where: { ativo: true }, include: { profit: true } } } },
        },
      },
      contratos: { where: { deletedAt: null }, orderBy: { inicioContrato: "desc" } },
    },
  });

  // Mesmo filtro de status (pelo contrato mais recente) usado na tela de clientes.
  const clientes = status.length > 0
    ? clientesEncontrados.filter((c) => c.contratos[0] && status.includes(c.contratos[0].status))
    : clientesEncontrados;

  const rows: ClienteExportRow[] = clientes.map((c) => {
    const contratoAtual = c.contratos[0];
    const carteira = c.carteiraHistorico[0];
    return {
      nome: c.nome,
      documento: c.documento,
      email: c.email ?? "",
      telefone: c.telefone ?? "",
      cidade: c.cidade ?? "",
      estado: c.estado ?? "",
      franquia: carteira?.franquia.nome ?? "",
      profit: carteira?.franquia.historicoProfit[0]?.profit.nome ?? "",
      plano: contratoAtual?.plano ?? "",
      valorMensal: contratoAtual ? Number(contratoAtual.valorMensal) : null,
      status: contratoAtual?.status ?? "",
      quantidadeContratos: c.contratos.length,
    };
  });

  if (formato === "xlsx") {
    const buffer = await buildClientesXlsx(rows);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="clientes.xlsx"',
      },
    });
  }

  const csv = buildClientesCsv(rows);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="clientes.csv"',
    },
  });
}
