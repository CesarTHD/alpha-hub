"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RenovacaoDialog } from "@/components/clientes/renovacao-dialog";
import { CATEGORICAL, STATUS, chartGridColor, chartTooltipItemStyle, chartTooltipLabelStyle, chartTooltipStyle } from "@/lib/chart-colors";
import { brl } from "@/lib/dashboard-analytics/agregacoes/shared";
import { computeOportunidades } from "@/lib/dashboard-analytics/agregacoes/oportunidades";
import { useAnalyticsFilters } from "../filters/analytics-filters-context";
import { KpiCard } from "../shared/kpi-card";

export function OportunidadesView({ podeRenovar }: { podeRenovar: boolean }) {
  const { historyFiltrado, filtros, agora } = useAnalyticsFilters();
  const r = useMemo(() => computeOportunidades(historyFiltrado, filtros, agora), [historyFiltrado, filtros, agora]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          titulo="TCV Mapeado (mês)"
          valor={brl(r.kpis.tcvMapeado)}
          hint="Contratos não-mensais que vencem no mês de referência e ainda não têm renovação registrada."
        />
        <KpiCard
          titulo="TCV Realizado (mês)"
          valor={brl(r.kpis.tcvRealizado)}
          hint="Contratos não-mensais que venciam no mês de referência e já foram renovados."
        />
        <KpiCard
          titulo="Taxa de Conversão"
          valor={r.kpis.taxaConversaoPct !== null ? `${r.kpis.taxaConversaoPct.toFixed(1)}%` : "—"}
        />
        <KpiCard titulo="MRR Ativo" valor={brl(r.kpis.mrrAtivo)} hint="Base total de contratos Mensais Ativos — carteira recorrente a proteger/expandir." />
        <KpiCard titulo="Ticket Médio MRR" valor={brl(r.kpis.ticketMedioMrr)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">TCV por Franquia — Mapeado vs. Realizado</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={r.porFranquia} layout="vertical" margin={{ left: 32 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} horizontal={false} />
                <XAxis type="number" fontSize={11} tickFormatter={(v) => brl(v)} />
                <YAxis type="category" dataKey="franquia" fontSize={11} width={140} />
                <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} formatter={(v) => brl(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="mapeado" name="Mapeado" fill={CATEGORICAL[3]} radius={[0, 4, 4, 0]} />
                <Bar dataKey="realizado" name="Realizado" fill={STATUS.good} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">TCV por Profit — Mapeado vs. Realizado</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={r.porProfit} layout="vertical" margin={{ left: 32 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} horizontal={false} />
                <XAxis type="number" fontSize={11} tickFormatter={(v) => brl(v)} />
                <YAxis type="category" dataKey="profit" fontSize={11} width={120} />
                <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} formatter={(v) => brl(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="mapeado" name="Mapeado" fill={CATEGORICAL[3]} radius={[0, 4, 4, 0]} />
                <Bar dataKey="realizado" name="Realizado" fill={STATUS.good} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolução — TCV Mapeado vs. Realizado</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={r.evolucaoMensal}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                <XAxis dataKey="mes" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={(v) => brl(v)} width={80} />
                <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} itemStyle={chartTooltipItemStyle} formatter={(v) => brl(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="mapeado" name="Mapeado" stroke={CATEGORICAL[3]} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="realizado" name="Realizado" stroke={STATUS.good} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">MRR Ativo por Franquia</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={r.mrrPorFranquia} layout="vertical" margin={{ left: 32 }}>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Oportunidades do Mês ({r.itens.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vencimento</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Franquia</TableHead>
                <TableHead>Profit</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {r.itens.map((i) => (
                <TableRow key={i.contratoId}>
                  <TableCell>{i.fimContrato.toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="font-medium">
                    {podeRenovar && i.status === "mapeado" ? (
                      <RenovacaoDialog
                        clienteId={i.clienteId}
                        contrato={{
                          id: i.contratoId,
                          plano: i.plano,
                          tipoContrato: i.tipoContratoRaw,
                          valorContrato: String(i.valor),
                          valorMensal: String(i.valorMensal),
                          renovacaoAutomatica: i.renovacaoAutomatica,
                        }}
                        trigger={
                          <button type="button" className="text-primary underline-offset-4 hover:underline">
                            {i.cliente}
                          </button>
                        }
                      />
                    ) : (
                      i.cliente
                    )}
                  </TableCell>
                  <TableCell>{i.franquia}</TableCell>
                  <TableCell>{i.profit}</TableCell>
                  <TableCell>{i.tipoContrato}</TableCell>
                  <TableCell>
                    {i.status === "realizado" ? (
                      <Badge variant="outline" className="bg-green-600/10 text-green-700 dark:bg-green-500/10 dark:text-green-400">
                        Realizado
                      </Badge>
                    ) : (
                      <Badge variant="outline">Mapeado</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{brl(i.status === "realizado" ? i.valorRealizado ?? 0 : i.valor)}</TableCell>
                </TableRow>
              ))}
              {r.itens.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                    Nenhuma oportunidade de TCV vencendo no mês de referência.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
