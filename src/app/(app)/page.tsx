import { redirect } from "next/navigation";
import { getLinhasCarteira } from "@/lib/dashboard-carteira";
import { PageHeader } from "@/components/layout/page-header";
import { CarteiraDashboard } from "@/components/dashboard/carteira-dashboard";
import { getCurrentUser } from "@/lib/current-user";
import { canManageContratos, canViewDashboard, hasFranquiaScope } from "@/lib/rbac";
import { getAnalyticsDataset } from "@/lib/dashboard-analytics/fetch";
import { DashboardAnalitico } from "@/components/dashboard-analytics/dashboard-analitico";

export const dynamic = "force-dynamic";

// Alterna entre o dashboard atual (intocado) e o novo Dashboard Analítico.
// Único ponto de entrada do novo dashboard — nada mais neste arquivo muda
// quando a flag está desligada.
const USE_ANALYTIC_DASHBOARD = true;

export default async function DashboardPage() {
  const usuario = await getCurrentUser();
  if (canViewDashboard(usuario) === "none") redirect("/clientes");

  const scope = hasFranquiaScope(usuario) ? { franquiaId: usuario.franquiaId } : null;

  if (USE_ANALYTIC_DASHBOARD) {
    const dataset = await getAnalyticsDataset(scope);
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard Analítico"
          description="Visão analítica completa de receita, clientes, retenção, contratos, franquias e distribuição geográfica."
        />
        <DashboardAnalitico dataset={dataset} podeRenovar={canManageContratos(usuario)} />
      </div>
    );
  }

  const rows = await getLinhasCarteira(scope);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Carteira — Dashboard Executivo"
        description="Visão consolidada de MRR, contratos, planos e riscos da carteira."
      />
      <CarteiraDashboard rows={rows} />
    </div>
  );
}
