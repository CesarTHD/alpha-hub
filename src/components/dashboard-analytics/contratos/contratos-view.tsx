"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORICAL, STATUS, chartGridColor, chartTooltipItemStyle, chartTooltipLabelStyle, chartTooltipStyle } from "@/lib/chart-colors";
import { brl } from "@/lib/dashboard-analytics/agregacoes/shared";
import { computeContratos } from "@/lib/dashboard-analytics/agregacoes/contratos";
import { useAnalyticsFilters } from "../filters/analytics-filters-context";
import { KpiCard } from "../shared/kpi-card";

export function ContratosView() {
  const { historyFiltrado, filtros, agora } = useAnalyticsFilters();
  const r = useMemo(() => computeContratos(historyFiltrado, filtros, agora), [historyFiltrado, filtros, agora]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        <KpiCard titulo="Contratos Ativos" valor={r.kpis.ativos.toLocaleString("pt-BR")} />
        <KpiCard titulo="Contratos Pausados" valor={r.kpis.pausados.toLocaleString("pt-BR")} />
        <KpiCard titulo="Vencidos" valor={r.kpis.vencidos.toLocaleString("pt-BR")} invertido />
        <KpiCard titulo="Vencendo em 7d" valor={r.kpis.vencendo7.toLocaleString("pt-BR")} invertido />
        <KpiCard titulo="Vencendo em 30d" valor={r.kpis.vencendo30.toLocaleString("pt-BR")} invertido />
        <KpiCard titulo="Vencendo em 60d" valor={r.kpis.vencendo60.toLocaleString("pt-BR")} />
        <KpiCard titulo="Renovados" valor={r.kpis.renovados.toLocaleString("pt-BR")} />
        <KpiCard
          titulo="Taxa de Renovação"
          valor={r.kpis.taxaRenovacaoPct !== null ? `${r.kpis.taxaRenovacaoPct.toFixed(1)}%` : "—"}
        />
        <KpiCard titulo="TCV em Risco" valor={brl(r.kpis.tcvEmRisco)} invertido />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vencimentos por Mês</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={r.vencimentosPorMes}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                <XAxis dataKey="mes" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} />
                <Bar dataKey="quantidade" name="Contratos" fill={CATEGORICAL[0]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">TCV em Risco por Mês de Vencimento</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={r.vencimentosPorMes}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                <XAxis dataKey="mes" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={(v) => brl(v)} width={80} />
                <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} formatter={(v) => brl(Number(v))} />
                <Bar dataKey="tcv" name="TCV" fill={STATUS.serious} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Renovação: Renovados x Não Renovados por Mês</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={r.renovacaoPorMes}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                <XAxis dataKey="mes" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="renovados" name="Renovados" fill={STATUS.good} radius={[4, 4, 0, 0]} />
                <Bar dataKey="naoRenovados" name="Não Renovados (Encerrados)" fill={STATUS.critical} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
