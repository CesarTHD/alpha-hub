"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FALLBACK, chartGridColor, chartTooltipItemStyle, chartTooltipLabelStyle, chartTooltipStyle } from "@/lib/chart-colors";
import {
  AGRUPAMENTO_LABEL,
  INDICADOR_LABEL,
  PERIODO_MESES,
  getPerformanceSeries,
  type Agrupamento,
  type Indicador,
  type Periodo,
} from "@/lib/dashboard-analytics/agregacoes/performance";
import { useAnalyticsFilters } from "../filters/analytics-filters-context";

function SeletorPeriodo<T extends string>({
  label,
  value,
  onChange,
  opcoes,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  opcoes: Array<{ value: T; label: string }>;
}) {
  return (
    <div className="flex min-w-[170px] flex-col gap-1">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={(v) => onChange(v as T)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {opcoes.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function PerformanceView() {
  const { historyFiltrado, agora } = useAnalyticsFilters();
  const [indicador, setIndicador] = useState<Indicador>("mrr");
  const [periodo, setPeriodo] = useState<Periodo>("6m");
  const [agrupamento, setAgrupamento] = useState<Agrupamento>("mes");

  const { data, grupos } = useMemo(
    () => getPerformanceSeries(historyFiltrado, { indicador, periodo, agrupamento }, agora),
    [historyFiltrado, indicador, periodo, agrupamento, agora],
  );

  return (
    <div className="space-y-6">
      <Card size="sm">
        <CardContent className="flex flex-wrap items-end gap-3">
          <SeletorPeriodo
            label="Indicador"
            value={indicador}
            onChange={setIndicador}
            opcoes={Object.entries(INDICADOR_LABEL).map(([value, label]) => ({ value: value as Indicador, label }))}
          />
          <SeletorPeriodo
            label="Período"
            value={periodo}
            onChange={setPeriodo}
            opcoes={Object.keys(PERIODO_MESES).map((value) => ({ value: value as Periodo, label: `${PERIODO_MESES[value as Periodo]} meses` }))}
          />
          <SeletorPeriodo
            label="Agrupamento"
            value={agrupamento}
            onChange={setAgrupamento}
            opcoes={Object.entries(AGRUPAMENTO_LABEL).map(([value, label]) => ({ value: value as Agrupamento, label }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {INDICADOR_LABEL[indicador]} — {AGRUPAMENTO_LABEL[agrupamento]}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
              <XAxis dataKey="bucket" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} />
              {grupos.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {grupos.map((grupo, i) => (
                <Line key={grupo} type="monotone" dataKey={grupo} name={grupo} stroke={FALLBACK[i % FALLBACK.length]} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
