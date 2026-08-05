import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { canReviewD4Sign } from "@/lib/rbac";
import { PageHeader } from "@/components/layout/page-header";
import { RevisaoPropostaItem } from "@/components/d4sign/revisao-proposta-item";

export const dynamic = "force-dynamic";

export default async function D4SignRevisaoPage() {
  const usuario = await getCurrentUser();
  if (!canReviewD4Sign(usuario)) redirect("/");

  const propostas = await db.propostaD4Sign.findMany({
    where: { status: "PENDENTE" },
    include: { cliente: { select: { nome: true } } },
    orderBy: { createdAt: "asc" },
  });

  // Confiança ALTA primeiro — mais provável de já estar certo, mais rápido de revisar.
  const ordenadas = [...propostas].sort((a, b) => {
    if (a.confianca === b.confianca) return 0;
    return a.confianca === "ALTA" ? -1 : 1;
  });

  const segmentosCadastrados = await db.cliente.findMany({
    where: { deletedAt: null, segmento: { not: null } },
    select: { segmento: true },
    distinct: ["segmento"],
    orderBy: { segmento: "asc" },
  });
  const segmentoOptions = segmentosCadastrados
    .map((c) => c.segmento!.trim())
    .filter((s) => s.length > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revisão D4Sign"
        description="Propostas de vínculo com contratos do D4Sign, geradas automaticamente pelo match de nomes. Nada é aplicado em clientes/contratos sem confirmação aqui."
      />

      <p className="text-sm text-muted-foreground">
        {ordenadas.length} {ordenadas.length === 1 ? "proposta pendente" : "propostas pendentes"}
      </p>

      <div className="space-y-3">
        {ordenadas.map((p) => (
          <RevisaoPropostaItem
            key={p.id}
            proposta={{
              id: p.id,
              clienteId: p.clienteId,
              clienteNome: p.cliente.nome,
              nomeDocumento: p.nomeDocumento,
              confianca: p.confianca,
              uuidDocumento: p.uuidDocumento,
            }}
            segmentoOptions={segmentoOptions}
          />
        ))}
        {ordenadas.length === 0 && (
          <p className="text-muted-foreground">Nenhuma proposta pendente no momento.</p>
        )}
      </div>
    </div>
  );
}
