"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORICAL, STATUS, chartGridColor, chartTooltipItemStyle, chartTooltipLabelStyle, chartTooltipStyle } from "@/lib/chart-colors";
import { brl } from "@/lib/dashboard-analytics/agregacoes/shared";
import { computeRetencaoChurn } from "@/lib/dashboard-analytics/agregacoes/retencao-churn";
import { useAnalyticsFilters } from "../filters/analytics-filters-context";
import { KpiCard } from "../shared/kpi-card";

export function RetencaoChurnView() {
  const { historyFiltrado, filtros, agora } = useAnalyticsFilters();
  const r = useMemo(() => computeRetencaoChurn(historyFiltrado, filtros, agora), [historyFiltrado, filtros, agora]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <KpiCard titulo="Churn Rate" valor={`${r.kpis.churnRatePct.toFixed(1)}%`} invertido />
        <KpiCard titulo="Clientes Churnados" valor={r.kpis.clientesChurnados.toLocaleString("pt-BR")} invertido />
        <KpiCard titulo="Retenção" valor={`${r.kpis.retencaoPct.toFixed(1)}%`} />
        <KpiCard titulo="MRR Perdido" valor={brl(r.kpis.mrrPerdido)} invertido />
        <KpiCard titulo="TCV Perdido" valor={brl(r.kpis.tcvPerdido)} invertido />
        <KpiCard
          titulo="Lifetime Churnados"
          valor={r.kpis.lifetimeMedioChurnadosMeses !== null ? `${r.kpis.lifetimeMedioChurnadosMeses.toFixed(1)} meses` : "—"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lifetime Médio: Carteira vs. Churnados</CardTitle>
        </CardHeader>
        <CardContent className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { grupo: "Carteira (vigente)", meses: r.kpis.lifetimeMedioCarteiraMeses ?? 0 },
                { grupo: "Churnados", meses: r.kpis.lifetimeMedioChurnadosMeses ?? 0 },
              ]}
              layout="vertical"
              margin={{ left: 32 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} horizontal={false} />
              <XAxis type="number" fontSize={11} unit=" meses" />
              <YAxis type="category" dataKey="grupo" fontSize={12} width={140} />
              <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} />
              <Bar dataKey="meses" name="Meses" radius={[0, 4, 4, 0]} fill={CATEGORICAL[0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Churn Mensal</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={r.churnMensal}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                <XAxis dataKey="mes" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} />
                <Bar dataKey="churn" name="Clientes Churn" fill={STATUS.critical} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Churn por Plano</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={r.churnPorPlano} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} horizontal={false} />
                <XAxis type="number" fontSize={11} />
                <YAxis type="category" dataKey="plano" fontSize={11} width={110} />
                <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} />
                <Bar dataKey="clientesChurn" name="Clientes Churn" fill={STATUS.critical} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Churn por Franquia</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={r.churnPorFranquia} layout="vertical" margin={{ left: 32 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} horizontal={false} />
                <XAxis type="number" fontSize={11} />
                <YAxis type="category" dataKey="franquia" fontSize={11} width={140} />
                <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} />
                <Bar dataKey="clientesChurn" name="Clientes Churn" fill={STATUS.critical} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Churn por Faixa de Lifetime</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={r.churnPorFaixaLifetime}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                <XAxis dataKey="faixa" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} />
                <Bar dataKey="clientesChurn" name="Clientes Churn" fill={STATUS.serious} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
