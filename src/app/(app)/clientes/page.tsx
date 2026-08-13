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

  const cidades = await db.cliente.findMany({
    where: { deletedAt: null, cidade: { not: null } },
    select: { cidade: true },
    distinct: ["cidade"],
    orderBy: { cidade: "asc" },
  });
  const cidadeOptions = cidades
    .map((c) => c.cidade!.trim())
    .filter((c) => c.length > 0)
    .map((c) => ({ value: c, label: c }));

  const estados = await db.cliente.findMany({
    where: { deletedAt: null, estado: { not: null } },
    select: { estado: true },
    distinct: ["estado"],
    orderBy: { estado: "asc" },
  });
  const estadoOptions = estados
    .map((e) => e.estado!.trim())
    .filter((e) => e.length > 0)
    .map((e) => ({ value: e, label: e }));

  const clientesIniciais = await buscarClientes({
    nome: "",
    status: [],
    franquia: [],
    profit: [],
    cidade: [],
    estado: [],
    semD4Sign: false,
  });

  return (
    <ClientesScreen
      franquiaOptions={franquiaOptions}
      profitOptions={profitOptions}
      cidadeOptions={cidadeOptions}
      estadoOptions={estadoOptions}
      podeCriarCliente={canCreateCliente(usuario)}
      clientesIniciais={clientesIniciais}
    />
  );
}
