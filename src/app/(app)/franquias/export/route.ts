import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { hasFranquiaScope } from "@/lib/rbac";
import { calcularChurnPorFranquia } from "@/lib/franquia-metricas";
import { buildFranquiasCsv, buildFranquiasXlsx, type FranquiaExportRow } from "@/lib/export/franquias-export";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const usuario = await getCurrentUser();
  if (hasFranquiaScope(usuario)) {
    return new Response("Acesso negado.", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const formato = searchParams.get("formato") === "xlsx" ? "xlsx" : "csv";

  const franquias = await db.franquia.findMany({
    where: { deletedAt: null },
    orderBy: { nome: "asc" },
    include: {
      historicoProfit: { where: { ativo: true }, include: { profit: true } },
    },
  });
  const churnPorFranquia = await calcularChurnPorFranquia();

  const rows: FranquiaExportRow[] = franquias.map((f) => {
    const churn = churnPorFranquia.get(f.id);
    return {
      nome: f.nome,
      cidade: f.cidade,
      estado: f.estado,
      profit: f.historicoProfit[0]?.profit.nome ?? "",
      clientesAtivos: churn?.clientesAtivos ?? 0,
      clientesChurn: churn?.clientesChurn ?? 0,
      taxaChurn: churn?.taxaChurn ?? 0,
      status: f.ativo ? "Ativa" : "Inativa",
    };
  });

  if (formato === "xlsx") {
    const buffer = await buildFranquiasXlsx(rows);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="franquias.xlsx"',
      },
    });
  }

  const csv = buildFranquiasCsv(rows);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="franquias.csv"',
    },
  });
}
