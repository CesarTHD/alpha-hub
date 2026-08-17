import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { canAccessNpsScreen } from "@/lib/rbac";
import { calcularHealthScoreBreakdown } from "@/lib/nps/health-score";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { VincularClienteDialog } from "@/components/nps/vincular-cliente-dialog";
import { RespostaDetalheDialog } from "@/components/nps/resposta-detalhe-dialog";

export const dynamic = "force-dynamic";

function Metrica({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-lg border p-4 text-center">
      <p className="text-2xl font-semibold">{value ?? "—"}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default async function NpsRespostasPage({
  params,
}: {
  params: Promise<{ franquiaId: string }>;
}) {
  const usuario = await getCurrentUser();
  if (!canAccessNpsScreen(usuario)) redirect("/");

  const { franquiaId } = await params;
  const franquia = await db.franquia.findFirst({
    where: { id: franquiaId, deletedAt: null },
    select: { id: true, nome: true },
  });
  if (!franquia) notFound();

  const respostas = await db.npsResposta.findMany({
    where: { franquiaId: franquia.id },
    orderBy: { createdAt: "desc" },
    include: { cliente: { select: { id: true, nome: true } } },
  });

  const breakdown = calcularHealthScoreBreakdown(respostas);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`NPS — ${franquia.nome}`}
        description="Respostas recebidas e vínculo com clientes cadastrados."
      />

      <Card>
        <CardContent className="grid grid-cols-2 gap-3 pt-6 sm:grid-cols-5">
          <Metrica label="HealthScore" value={breakdown?.geral ?? null} />
          <Metrica label="NPS" value={breakdown?.nps ?? null} />
          <Metrica label="CSAT" value={breakdown?.csat ?? null} />
          <Metrica label="CEV" value={breakdown?.cev ?? null} />
          <Metrica label="CES" value={breakdown?.ces ?? null} />
        </CardContent>
      </Card>

      <div className="space-y-3">
        {respostas.map((r) => (
          <Card key={r.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
              <div>
                <p className="font-medium">{r.nomeEmpresa}</p>
                <p className="text-sm text-muted-foreground">
                  {r.whatsapp} · {r.createdAt.toLocaleDateString("pt-BR")}
                </p>
                <p className="mt-1 text-sm">
                  {r.cliente ? (
                    <>
                      Vinculado a{" "}
                      <RespostaDetalheDialog clienteNome={r.cliente.nome} resposta={r} />
                    </>
                  ) : (
                    <span className="text-muted-foreground">Não vinculado</span>
                  )}
                </p>
              </div>
              <VincularClienteDialog
                respostaId={r.id}
                clienteAtual={r.cliente ? { id: r.cliente.id, nome: r.cliente.nome } : null}
              />
            </CardContent>
          </Card>
        ))}
        {respostas.length === 0 && (
          <p className="py-10 text-center text-muted-foreground">
            Nenhuma resposta recebida para esta franquia ainda.
          </p>
        )}
      </div>
    </div>
  );
}
