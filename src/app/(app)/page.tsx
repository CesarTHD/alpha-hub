import { redirect } from "next/navigation";
import { getLinhasCarteira } from "@/lib/dashboard-carteira";
import { PageHeader } from "@/components/layout/page-header";
import { CarteiraDashboard } from "@/components/dashboard/carteira-dashboard";
import { getCurrentUser } from "@/lib/current-user";
import { canViewDashboard, hasFranquiaScope } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const usuario = await getCurrentUser();
  if (canViewDashboard(usuario) === "none") redirect("/clientes");

  const scope = hasFranquiaScope(usuario) ? { franquiaId: usuario.franquiaId } : null;
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
