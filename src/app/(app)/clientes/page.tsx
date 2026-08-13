import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { canCreateCliente } from "@/lib/rbac";
import { buscarClientes } from "@/lib/actions/clientes-listagem";
import { ClientesScreen } from "@/components/clientes/clientes-screen";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const usuario = await getCurrentUser();

  const franquias = await db.franquia.findMany({
    where: { deletedAt: null },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });
  const franquiaOptions = franquias.map((f) => ({ value: f.id, label: f.nome }));

  const profits = await db.profit.findMany({
    where: { deletedAt: null },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });
  const profitOptions = profits.map((p) => ({ value: p.id, label: p.nome }));

  const clientesIniciais = await buscarClientes({ nome: "", status: [], franquia: [], profit: [], semD4Sign: false });

  return (
    <ClientesScreen
      franquiaOptions={franquiaOptions}
      profitOptions={profitOptions}
      podeCriarCliente={canCreateCliente(usuario)}
      clientesIniciais={clientesIniciais}
    />
  );
}
