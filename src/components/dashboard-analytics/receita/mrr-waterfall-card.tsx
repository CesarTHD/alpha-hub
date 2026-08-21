"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STATUS, chartGridColor, chartTooltipItemStyle, chartTooltipLabelStyle, chartTooltipStyle } from "@/lib/chart-colors";
import { brl } from "@/lib/dashboard-analytics/agregacoes/shared";
import type { ReceitaResult } from "@/lib/dashboard-analytics/agregacoes/receita";
import { DadoIndisponivel } from "../shared/empty-state-badge";

type Barra = { name: string; base: number; valor: number; tipo: "total" | "positivo" | "negativo" };

function buildBarras(w: ReceitaResult["waterfall"]): Barra[] {
  const barras: Barra[] = [{ name: "MRR Inicial", base: 0, valor: w.mrrInicial, tipo: "total" }];
  let running = w.mrrInicial;

  barras.push({ name: "Novos clientes", base: running, valor: w.novo, tipo: "positivo" });
  running += w.novo;

  if (w.outrasVariacoes >= 0) {
    barras.push({ name: "Outras variações", base: running, valor: w.outrasVariacoes, tipo: "positivo" });
  } else {
    barras.push({ name: "Outras variações", base: running + w.outrasVariacoes, valor: -w.outrasVariacoes, tipo: "negativo" });
  }
  running += w.outrasVariacoes;

  barras.push({ name: "Churn", base: running - w.churn, valor: w.churn, tipo: "negativo" });
  running -= w.churn;

  barras.push({ name: "MRR Final", base: 0, valor: w.mrrFinal, tipo: "total" });
  return barras;
}

const COR: Record<Barra["tipo"], string> = {
  total: "#898781",
  positivo: STATUS.good,
  negativo: STATUS.critical,
};

export function MrrWaterfallCard({ waterfall }: { waterfall: ReceitaResult["waterfall"] }) {
  const barras = buildBarras(waterfall);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Waterfall de MRR (parcial)</CardTitle>
          <DadoIndisponivel motivo="Upgrade, Downgrade e Expansão não têm delta de valor armazenado em nenhum lugar do banco (Evento.ALTERACAO_VALOR só guarda texto livre). O efeito líquido dessas mudanças aparece agregado em 'Outras variações', sem poder ser decomposto por categoria." />
        </div>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barras}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
            <XAxis dataKey="name" fontSize={11} interval={0} angle={-15} textAnchor="end" height={60} />
            <YAxis fontSize={11} tickFormatter={(v) => brl(v)} width={80} />
            <Tooltip
              contentStyle={chartTooltipStyle}
              labelStyle={chartTooltipLabelStyle}
              itemStyle={chartTooltipItemStyle}
              formatter={(v, name) => (name === "valor" ? brl(Number(v)) : "")}
            />
            <Bar dataKey="base" stackId="a" fill="transparent" isAnimationActive={false} />
            <Bar dataKey="valor" stackId="a" radius={[4, 4, 0, 0]}>
              {barras.map((b, i) => (
                <Cell key={i} fill={COR[b.tipo]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
