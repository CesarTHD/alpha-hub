"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORICAL, FALLBACK, chartGridColor, chartTooltipItemStyle, chartTooltipLabelStyle, chartTooltipStyle } from "@/lib/chart-colors";
import { brl } from "@/lib/dashboard-analytics/agregacoes/shared";
import { computeReceita } from "@/lib/dashboard-analytics/agregacoes/receita";
import { useAnalyticsFilters } from "../filters/analytics-filters-context";
import { KpiCard } from "../shared/kpi-card";
import { DadoIndisponivel } from "../shared/empty-state-badge";
import { MrrWaterfallCard } from "./mrr-waterfall-card";

export function ReceitaView() {
  const { historyFiltrado, franquias, filtros, agora } = useAnalyticsFilters();
  const franquiasAtivasCount = useMemo(
    () => franquias.filter((f) => f.ativo && (filtros.franquia.length === 0 || filtros.franquia.includes(f.nome))).length,
    [franquias, filtros.franquia],
  );
  const r = useMemo(
    () => computeReceita(historyFiltrado, franquiasAtivasCount, filtros, agora),
    [historyFiltrado, franquiasAtivasCount, filtros, agora],
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <KpiCard titulo="MRR" valor={brl(r.kpis.mrr)} deltaPct={r.kpis.mrrAnteriorPct} />
        <KpiCard titulo="TCV Contratado (mês)" valor={brl(r.kpis.tcvContratadoNoMes)} />
        <KpiCard titulo="ARR (aproximado)" valor={brl(r.kpis.arrAproximado)} hint="MRR × 12 — aproximação simples; não há uma definição única de ARR compatível com contratos TCV de prazos distintos (trimestral/semestral/anual) na base." />
        <KpiCard titulo="Ticket Médio MRR" valor={brl(r.kpis.ticketMedioMrr)} />
        <KpiCard titulo="Crescimento do MRR" valor={`${r.kpis.crescimentoMrrPct?.toFixed(1) ?? "—"}%`} deltaPct={r.kpis.crescimentoMrrPct} />
        <KpiCard titulo="Receita Nova (MRR)" valor={brl(r.kpis.receitaNovaMrr)} />
        <KpiCard titulo="Receita Nova (TCV)" valor={brl(r.kpis.receitaNovaTcv)} />
        <KpiCard titulo="Receita de Renovação (MRR)" valor={brl(r.kpis.receitaRenovacaoMrr)} />
        <KpiCard titulo="Receita de Renovação (TCV)" valor={brl(r.kpis.receitaRenovacaoTcv)} />
        <KpiCard titulo="Receita Perdida (MRR)" valor={brl(r.kpis.receitaPerdidaMrr)} invertido deltaPct={null} />
        <KpiCard titulo="MRR Médio por Franquia" valor={brl(r.kpis.mrrMedioPorFranquia)} />
        {/* <div className="flex items-center">
          <DadoIndisponivel motivo="Receita expandida (upsell/expansão) não tem delta de valor armazenado no banco — ver detalhe no card do Waterfall de MRR abaixo." />
        </div> */}
      </div>

      {/* <MrrWaterfallCard waterfall={r.waterfall} /> */}

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
                <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} formatter={(v) => brl(Number(v))} />
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
                <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} formatter={(v) => brl(Number(v))} />
                <Line type="monotone" dataKey="tcv" name="TCV" stroke={CATEGORICAL[1]} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* <Card>
          <CardHeader>
            <CardTitle className="text-base">MRR por Tipo de Contrato</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={r.composicaoPorTipo} dataKey="mrr" nameKey="tipo" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {r.composicaoPorTipo.map((_, i) => (
                    <Cell key={i} fill={FALLBACK[i % FALLBACK.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} formatter={(v) => brl(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card> */}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">MRR por Plano</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={r.composicaoPorPlano} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} horizontal={false} />
                <XAxis type="number" fontSize={11} tickFormatter={(v) => brl(v)} />
                <YAxis type="category" dataKey="plano" fontSize={11} width={110} />
                <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} formatter={(v) => brl(Number(v))} />
                <Bar dataKey="mrr" name="MRR" fill={CATEGORICAL[0]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">MRR por Franquia (top 15)</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={r.composicaoPorFranquia} layout="vertical" margin={{ left: 32 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} horizontal={false} />
                <XAxis type="number" fontSize={11} tickFormatter={(v) => brl(v)} />
                <YAxis type="category" dataKey="franquia" fontSize={11} width={140} />
                <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} formatter={(v) => brl(Number(v))} />
                <Bar dataKey="mrr" name="MRR" fill={CATEGORICAL[0]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
