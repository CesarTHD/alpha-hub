import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { canReviewD4Sign } from "@/lib/rbac";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MultiSelectFilter } from "@/components/filters/multi-select-filter";
import { clientesWhere, toArray } from "@/lib/clientes-filtros";
import { RevisaoPropostaItem } from "@/components/d4sign/revisao-proposta-item";

export const dynamic = "force-dynamic";

export default async function D4SignRevisaoPage({
  searchParams,
}: {
  searchParams: Promise<{ franquia?: string | string[]; profit?: string | string[] }>;
}) {
  const usuario = await getCurrentUser();
  if (!canReviewD4Sign(usuario)) redirect("/");

  const { franquia: franquiaParam, profit: profitParam } = await searchParams;
  const franquia = toArray(franquiaParam);
  const profit = toArray(profitParam);

  const franquias = await db.franquia.findMany({
    where: { deletedAt: null },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });
  const FRANQUIA_OPTIONS = franquias.map((f) => ({ value: f.id, label: f.nome }));

  const profits = await db.profit.findMany({
    where: { deletedAt: null },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });
  const PROFIT_OPTIONS = profits.map((p) => ({ value: p.id, label: p.nome }));

  const clienteWhere =
    franquia.length > 0 || profit.length > 0
      ? clientesWhere(usuario, { nome: "", status: [], tipo: [], franquia, profit, cidade: [], estado: [], semD4Sign: false })
      : undefined;

  const propostas = await db.propostaD4Sign.findMany({
    where: { status: "PENDENTE", ...(clienteWhere ? { cliente: clienteWhere } : {}) },
    include: {
      cliente: {
        select: {
          nome: true,
          carteiraHistorico: {
            where: { ativo: true },
            take: 1,
            include: {
              franquia: { include: { historicoProfit: { where: { ativo: true }, include: { profit: true } } } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Confiança ALTA primeiro (mais provável de já estar certo, mais rápido de revisar), BAIXA por
  // último (veio do fallback fuzzy do match por nome — merece mais atenção na revisão).
  const ORDEM_CONFIANCA: Record<string, number> = { ALTA: 0, MEDIA: 1, BAIXA: 2 };
  const ordenadas = [...propostas].sort(
    (a, b) => (ORDEM_CONFIANCA[a.confianca] ?? 1) - (ORDEM_CONFIANCA[b.confianca] ?? 1),
  );

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

      <Card>
        <CardContent className="pt-6">
          <form key={`${franquia.join(",")}|${profit.join(",")}`} className="flex flex-wrap items-end gap-3">
            <div className="space-y-1 space-x-2">
              <label className="text-xs text-muted-foreground">Franquia</label>
              <MultiSelectFilter
                name="franquia"
                options={FRANQUIA_OPTIONS}
                defaultValues={franquia}
                placeholder="Todas"
              />
            </div>
            <div className="space-y-1 space-x-2">
              <label className="text-xs text-muted-foreground">Profit</label>
              <MultiSelectFilter
                name="profit"
                options={PROFIT_OPTIONS}
                defaultValues={profit}
                placeholder="Todos"
              />
            </div>
            <Button type="submit" variant="secondary">
              Filtrar
            </Button>
            {(franquia.length > 0 || profit.length > 0) && (
              <Button asChild variant="ghost">
                <Link href="/d4sign-revisao">Limpar</Link>
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

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
              franquiaNome: p.cliente.carteiraHistorico[0]?.franquia.nome ?? null,
              profitNome: p.cliente.carteiraHistorico[0]?.franquia.historicoProfit[0]?.profit.nome ?? null,
            }}
            segmentoOptions={segmentoOptions}
          />
        ))}
        {ordenadas.length === 0 && (
          <p className="text-muted-foreground">
            {franquia.length > 0 || profit.length > 0
              ? "Nenhuma proposta pendente para esse filtro."
              : "Nenhuma proposta pendente no momento."}
          </p>
        )}
      </div>
    </div>
  );
}
