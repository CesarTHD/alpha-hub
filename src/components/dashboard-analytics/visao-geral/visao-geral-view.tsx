"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { DollarSign, Users, Building2, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORICAL, FALLBACK, chartGridColor, chartTooltipItemStyle, chartTooltipLabelStyle, chartTooltipStyle } from "@/lib/chart-colors";
import { brl } from "@/lib/dashboard-analytics/agregacoes/shared";
import { computeVisaoGeral } from "@/lib/dashboard-analytics/agregacoes/visao-geral";
import { useAnalyticsFilters } from "../filters/analytics-filters-context";
import { KpiCard } from "../shared/kpi-card";

export function VisaoGeralView() {
  const { historyFiltrado, franquias, filtros, agora } = useAnalyticsFilters();
  const r = useMemo(() => computeVisaoGeral(historyFiltrado, franquias, filtros, agora), [historyFiltrado, franquias, filtros, agora]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <KpiCard titulo="MRR" valor={brl(r.kpis.mrr.atual)} deltaPct={r.kpis.mrr.anteriorPct} icon={<DollarSign className="h-3.5 w-3.5" />} />
        <KpiCard
          titulo="TCV Contratado (mês)"
          valor={brl(r.kpis.tcvContratadoNoMes.atual)}
          deltaPct={r.kpis.tcvContratadoNoMes.anteriorPct}
        />
        <KpiCard
          titulo="Clientes Ativos"
          valor={r.kpis.clientesAtivos.atual.toLocaleString("pt-BR")}
          deltaPct={r.kpis.clientesAtivos.anteriorPct}
          icon={<Users className="h-3.5 w-3.5" />}
        />
        <KpiCard titulo="Franquias Ativas" valor={r.kpis.franquiasAtivas.toLocaleString("pt-BR")} icon={<Building2 className="h-3.5 w-3.5" />} />
        <KpiCard titulo="Ticket Médio MRR" valor={brl(r.kpis.ticketMedioMrr.atual)} deltaPct={r.kpis.ticketMedioMrr.anteriorPct} />
        <KpiCard
          titulo="Churn Rate"
          valor={`${r.kpis.churnRate.atual.toFixed(1)}%`}
          deltaPct={r.kpis.churnRate.anteriorPct}
          invertido
          icon={<TrendingDown className="h-3.5 w-3.5" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saúde da Carteira</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {[
            ["Ativos", r.saude.ativos],
            ["Churn", r.saude.churn],
            ["Pausados", r.saude.pausados],
            ["Encerrados", r.saude.encerrados],
            ["Vencidos", r.saude.vencidos],
            ["Vencendo ≤30d", r.saude.vencendo30],
            ["Retenção", `${r.saude.retencaoPct?.toFixed(1)}%`],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="font-heading text-lg font-semibold">{value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolução do MRR</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={r.serieMrr}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                <XAxis dataKey="mes" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={(v) => brl(v)} width={80} />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  labelStyle={chartTooltipLabelStyle}
                  itemStyle={chartTooltipItemStyle}
                  formatter={(v) => brl(Number(v))}
                />
                <Line type="monotone" dataKey="mrr" name="MRR" stroke={CATEGORICAL[0]} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolução do TCV</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={r.serieTcv}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                <XAxis dataKey="mes" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={(v) => brl(v)} width={80} />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  labelStyle={chartTooltipLabelStyle}
                  itemStyle={chartTooltipItemStyle}
                  formatter={(v) => brl(Number(v))}
                />
                <Line type="monotone" dataKey="tcv" name="TCV" stroke={CATEGORICAL[1]} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* <Card>
          <CardHeader>
            <CardTitle className="text-base">Composição do MRR por Tipo de Contrato</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={r.composicaoMrrPorTipo} dataKey="mrr" nameKey="tipo" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {r.composicaoMrrPorTipo.map((_, i) => (
                    <Cell key={i} fill={FALLBACK[i % FALLBACK.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  labelStyle={chartTooltipLabelStyle}
                  itemStyle={chartTooltipItemStyle}
                  formatter={(v) => brl(Number(v))}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card> */}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Composição do MRR por Plano</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={r.composicaoMrrPorPlano} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} horizontal={false} />
                <XAxis type="number" fontSize={11} tickFormatter={(v) => brl(v)} />
                <YAxis type="category" dataKey="plano" fontSize={11} width={110} />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  labelStyle={chartTooltipLabelStyle}
                  itemStyle={chartTooltipItemStyle}
                  formatter={(v) => brl(Number(v))}
                />
                <Bar dataKey="mrr" name="MRR" fill={CATEGORICAL[0]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
