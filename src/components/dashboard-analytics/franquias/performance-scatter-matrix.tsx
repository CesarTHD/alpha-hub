"use client";

import { CartesianGrid, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STATUS, chartGridColor, chartTooltipItemStyle, chartTooltipLabelStyle, chartTooltipStyle } from "@/lib/chart-colors";
import { brl } from "@/lib/dashboard-analytics/agregacoes/shared";
import type { FranquiaMetrica } from "@/lib/dashboard-analytics/agregacoes/franquias";

function mediana(valores: number[]): number {
  if (valores.length === 0) return 0;
  const ordenado = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenado.length / 2);
  return ordenado.length % 2 === 0 ? (ordenado[meio - 1] + ordenado[meio]) / 2 : ordenado[meio];
}

function corQuadrante(mrr: number, churn: number, medMrr: number, medChurn: number): string {
  if (mrr >= medMrr && churn < medChurn) return STATUS.good; // alto MRR, baixo churn
  if (mrr >= medMrr && churn >= medChurn) return STATUS.warning; // alto MRR, alto churn
  if (mrr < medMrr && churn < medChurn) return "#2a78d6"; // baixo MRR, baixo churn (oportunidade)
  return STATUS.critical; // baixo MRR, alto churn
}

export function PerformanceScatterMatrix({ franquias }: { franquias: FranquiaMetrica[] }) {
  const medMrr = mediana(franquias.map((f) => f.mrr));
  const medChurn = mediana(franquias.map((f) => f.churnRatePct));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Matriz de Performance das Franquias (MRR × Churn)</CardTitle>
      </CardHeader>
      <CardContent className="h-96 space-y-2">
        <ResponsiveContainer width="100%" height="85%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
            <XAxis type="number" dataKey="mrr" name="MRR" tickFormatter={(v) => brl(v)} fontSize={11} />
            <YAxis type="number" dataKey="churnRatePct" name="Churn" unit="%" fontSize={11} />
            <ZAxis range={[80, 80]} />
            <ReferenceLine x={medMrr} stroke={chartGridColor} strokeDasharray="4 4" />
            <ReferenceLine y={medChurn} stroke={chartGridColor} strokeDasharray="4 4" />
            <Tooltip
              contentStyle={chartTooltipStyle}
              labelStyle={chartTooltipLabelStyle}
              itemStyle={chartTooltipItemStyle}
              cursor={{ strokeDasharray: "3 3" }}
              formatter={(v, name) => (name === "MRR" ? brl(Number(v)) : `${Number(v).toFixed(1)}%`)}
              labelFormatter={() => ""}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const f = payload[0].payload as FranquiaMetrica;
                return (
                  <div style={chartTooltipStyle} className="px-2 py-1.5">
                    <p style={chartTooltipLabelStyle}>{f.nome}</p>
                    <p style={chartTooltipItemStyle}>MRR: {brl(f.mrr)}</p>
                    <p style={chartTooltipItemStyle}>Churn: {f.churnRatePct.toFixed(1)}%</p>
                  </div>
                );
              }}
            />
            <Scatter
              data={franquias}
              fill={STATUS.neutral}
              shape={(props: unknown) => {
                const p = props as { cx: number; cy: number; payload: FranquiaMetrica };
                return <circle cx={p.cx} cy={p.cy} r={6} fill={corQuadrante(p.payload.mrr, p.payload.churnRatePct, medMrr, medChurn)} />;
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: STATUS.good }} /> Alto MRR + baixo churn — excelente
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: STATUS.warning }} /> Alto MRR + alto churn — atenção
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: "#2a78d6" }} /> Baixo MRR + baixo churn — oportunidade
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: STATUS.critical }} /> Baixo MRR + alto churn — crítica
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
