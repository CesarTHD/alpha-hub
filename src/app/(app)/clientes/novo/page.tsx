import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { NovoClienteContainer } from "@/components/clientes/novo-cliente-container";
import { getCurrentUser } from "@/lib/current-user";
import { canCreateCliente, hasFranquiaScope } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function NovoClientePage() {
  const usuario = await getCurrentUser();
  if (!canCreateCliente(usuario)) redirect("/clientes");

  const franquias = await db.franquia.findMany({
    where: {
      deletedAt: null,
      ativo: true,
      ...(hasFranquiaScope(usuario) ? { id: usuario.franquiaId } : {}),
    },
    orderBy: { nome: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Novo cliente" description="Cadastra o cliente e já cria o primeiro contrato." />
      <NovoClienteContainer franquias={franquias} />
    </div>
  );
}
