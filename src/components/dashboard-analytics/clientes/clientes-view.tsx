"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORICAL, STATUS, chartGridColor, chartTooltipItemStyle, chartTooltipLabelStyle, chartTooltipStyle } from "@/lib/chart-colors";
import { brl } from "@/lib/dashboard-analytics/agregacoes/shared";
import { computeClientes } from "@/lib/dashboard-analytics/agregacoes/clientes";
import { useAnalyticsFilters } from "../filters/analytics-filters-context";
import { KpiCard } from "../shared/kpi-card";

export function ClientesView() {
  const { historyFiltrado, filtros, agora } = useAnalyticsFilters();
  const r = useMemo(() => computeClientes(historyFiltrado, filtros, agora), [historyFiltrado, filtros, agora]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        <KpiCard titulo="Clientes Ativos" valor={r.kpis.clientesAtivos.toLocaleString("pt-BR")} />
        <KpiCard titulo="Novos Clientes" valor={r.kpis.novosClientes.toLocaleString("pt-BR")} />
        <KpiCard titulo="Renovações" valor={r.kpis.renovacoes.toLocaleString("pt-BR")} />
        <KpiCard titulo="Pausados" valor={r.kpis.pausados.toLocaleString("pt-BR")} />
        <KpiCard titulo="Encerrados" valor={r.kpis.encerrados.toLocaleString("pt-BR")} invertido />
        <KpiCard titulo="Churn" valor={r.kpis.churn.toLocaleString("pt-BR")} invertido />
        <KpiCard titulo="Ticket Médio" valor={brl(r.kpis.ticketMedio)} />
        <KpiCard titulo="Lifetime Médio" valor={r.kpis.lifetimeMedioMeses !== null ? `${r.kpis.lifetimeMedioMeses.toFixed(1)} meses` : "—"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolução da Carteira</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={r.serieEvolucaoCarteira}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                <XAxis dataKey="mes" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} />
                <Line type="monotone" dataKey="ativos" name="Clientes Ativos" stroke={CATEGORICAL[0]} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Novos x Encerrados</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={r.serieNovosXEncerrados}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                <XAxis dataKey="mes" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="novos" name="Novos" fill={STATUS.good} radius={[4, 4, 0, 0]} />
                <Bar dataKey="encerrados" name="Encerrados" fill={STATUS.critical} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Plano</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={r.distribuicaoPorPlano} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} horizontal={false} />
                <XAxis type="number" fontSize={11} />
                <YAxis type="category" dataKey="plano" fontSize={11} width={110} />
                <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} />
                <Bar dataKey="clientes" name="Clientes" fill={CATEGORICAL[0]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição de Lifetime</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={r.distribuicaoLifetime}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                <XAxis dataKey="faixa" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} />
                <Bar dataKey="clientes" name="Clientes" fill={CATEGORICAL[2]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
