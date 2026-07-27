import { getDashboardData } from "@/lib/dashboard";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { RankingList } from "@/components/dashboard/ranking-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { Users, DollarSign, TrendingDown, Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard executivo" description="Visão em tempo real da carteira da Alpha." />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Carteira</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Clientes ativos"
            value={String(data.carteira.clientesAtivos.total)}
            hint={`${data.carteira.clientesAtivos.mrr} MRR / ${data.carteira.clientesAtivos.tcv} TCV`}
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
          />
          <StatCard
            label="Clientes pausados"
            value={String(data.carteira.clientesPausados.total)}
            hint={`${data.carteira.clientesPausados.mrr} MRR / ${data.carteira.clientesPausados.tcv} TCV`}
          />
          <StatCard
            label="Clientes churnados"
            value={String(data.carteira.clientesChurn.total)}
            hint={`${data.carteira.clientesChurn.mrr} MRR / ${data.carteira.clientesChurn.tcv} TCV`}
            icon={<TrendingDown className="h-4 w-4 text-muted-foreground" />}
          />
          <StatCard
            label="Novos clientes (mês)"
            value={String(data.carteira.novosClientesMes.total)}
            hint={`${data.carteira.novosClientesMes.mrr} MRR / ${data.carteira.novosClientesMes.tcv} TCV`}
          />
          <StatCard
            label="Renovados (mês)"
            value={String(data.carteira.clientesRenovadosMes.total)}
            hint={`${data.carteira.clientesRenovadosMes.mrr} MRR / ${data.carteira.clientesRenovadosMes.tcv} TCV`}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Financeiro</h2>
        <div className="space-y-4">
          <div>
            <h3 className="mb-2 text-xs font-medium text-muted-foreground">MRR (contrato mensal)</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard
                label="MRR total"
                value={formatCurrency(data.financeiro.mrr.total)}
                hint={`${data.financeiro.mrr.clientes} cliente(s) MRR`}
                icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
              />
              <StatCard label="Ticket médio (MRR)" value={formatCurrency(data.financeiro.mrr.ticketMedio)} />
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-medium text-muted-foreground">TCV (trimestral, quadrimestral, semestral, anual)</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard
                label="Valor total contratado (TCV)"
                value={formatCurrency(data.financeiro.tcv.valorTotalContratado)}
                hint={`${data.financeiro.tcv.clientes} cliente(s) TCV`}
              />
              <StatCard label="Ticket médio (TCV)" value={formatCurrency(data.financeiro.tcv.ticketMedio)} />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Retenção</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Taxa de churn" value={`${data.retencao.taxaChurn.toFixed(1)}%`} hint="sobre o total histórico de clientes" />
          <StatCard label="Taxa de renovação" value={`${data.retencao.taxaRenovacao.toFixed(1)}%`} hint="clientes com ao menos 1 renovação" />
          <StatCard
            label="Tempo médio de permanência"
            value={`${data.retencao.tempoMedioPermanenciaMeses.toFixed(1)} meses`}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Operação</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" /> Ranking de franquias (MRR)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RankingList items={data.operacao.rankingFranquias} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" /> Ranking de Profits (MRR)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RankingList
                items={data.operacao.rankingProfits.map((p, idx) => ({ id: String(idx), ...p }))}
              />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
