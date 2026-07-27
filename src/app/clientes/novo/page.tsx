import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { NovoClienteForm } from "@/components/clientes/novo-cliente-form";

export const dynamic = "force-dynamic";

export default async function NovoClientePage() {
  const franquias = await db.franquia.findMany({
    where: { deletedAt: null, ativo: true },
    orderBy: { nome: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Novo cliente" description="Cadastra o cliente e já cria o primeiro contrato." />
      <NovoClienteForm franquias={franquias} />
    </div>
  );
}
