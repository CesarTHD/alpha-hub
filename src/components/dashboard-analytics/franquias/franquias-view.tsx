"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { brl } from "@/lib/dashboard-analytics/agregacoes/shared";
import { computeFranquias, type FranquiaMetrica } from "@/lib/dashboard-analytics/agregacoes/franquias";
import { useAnalyticsFilters } from "../filters/analytics-filters-context";
import { KpiCard } from "../shared/kpi-card";
import { PerformanceScatterMatrix } from "./performance-scatter-matrix";

type SortKey = keyof Pick<
  FranquiaMetrica,
  "nome" | "clientes" | "mrr" | "tcvContratadoNoMes" | "ticketMedio" | "churnRatePct" | "retencaoPct" | "lifetimeMedioMeses" | "crescimentoMrrPct"
>;

const COLUNAS: Array<{ key: SortKey; label: string }> = [
  { key: "nome", label: "Franquia" },
  { key: "clientes", label: "Clientes" },
  { key: "mrr", label: "MRR" },
  { key: "tcvContratadoNoMes", label: "TCV (mês)" },
  { key: "ticketMedio", label: "Ticket Médio" },
  { key: "churnRatePct", label: "Churn" },
  { key: "retencaoPct", label: "Retenção" },
  { key: "lifetimeMedioMeses", label: "Lifetime" },
  { key: "crescimentoMrrPct", label: "Crescimento MRR" },
];

export function FranquiasView() {
  const { historyFiltrado, franquias, filtros, agora } = useAnalyticsFilters();
  const linhas = useMemo(() => computeFranquias(historyFiltrado, franquias, filtros, agora), [historyFiltrado, franquias, filtros, agora]);

  const [busca, setBusca] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("mrr");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selecionada, setSelecionada] = useState<FranquiaMetrica | null>(null);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  const linhasVisiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const filtradas = q ? linhas.filter((f) => f.nome.toLowerCase().includes(q)) : linhas;
    return [...filtradas].sort((a, b) => {
      const va = a[sortKey] ?? 0;
      const vb = b[sortKey] ?? 0;
      const cmp = typeof va === "string" ? va.localeCompare(String(vb)) : Number(va) - Number(vb);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [linhas, busca, sortKey, sortDir]);

  const totalMrr = linhas.reduce((s, f) => s + f.mrr, 0);
  const mediaChurn = linhas.length > 0 ? linhas.reduce((s, f) => s + f.churnRatePct, 0) / linhas.length : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCard titulo="Franquias" valor={linhas.length.toLocaleString("pt-BR")} />
        <KpiCard titulo="MRR Total" valor={brl(totalMrr)} />
        <KpiCard titulo="Churn Médio" valor={`${mediaChurn.toFixed(1)}%`} invertido />
      </div>

      <PerformanceScatterMatrix franquias={linhas} />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Franquias ({linhasVisiveis.length})</CardTitle>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar franquia..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {COLUNAS.map((c) => (
                  <TableHead key={c.key}>
                    <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort(c.key)}>
                      {c.label}
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    </button>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhasVisiveis.map((f) => (
                <TableRow key={f.id} className="cursor-pointer" onClick={() => setSelecionada(f)}>
                  <TableCell className="font-medium">{f.nome}</TableCell>
                  <TableCell>{f.clientes}</TableCell>
                  <TableCell>{brl(f.mrr)}</TableCell>
                  <TableCell>{brl(f.tcvContratadoNoMes)}</TableCell>
                  <TableCell>{brl(f.ticketMedio)}</TableCell>
                  <TableCell>{f.churnRatePct.toFixed(1)}%</TableCell>
                  <TableCell>{f.retencaoPct.toFixed(1)}%</TableCell>
                  <TableCell>{f.lifetimeMedioMeses !== null ? `${f.lifetimeMedioMeses.toFixed(1)}m` : "—"}</TableCell>
                  <TableCell>{f.crescimentoMrrPct !== null ? `${f.crescimentoMrrPct.toFixed(1)}%` : "—"}</TableCell>
                </TableRow>
              ))}
              {linhasVisiveis.length === 0 && (
                <TableRow>
                  <TableCell colSpan={COLUNAS.length} className="py-6 text-center text-muted-foreground">
                    Nenhuma franquia encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={selecionada !== null} onOpenChange={(open) => !open && setSelecionada(null)}>
        <SheetContent>
          {selecionada && (
            <>
              <SheetHeader>
                <SheetTitle>{selecionada.nome}</SheetTitle>
                <SheetDescription>Detalhamento da franquia</SheetDescription>
              </SheetHeader>
              <div className="grid grid-cols-2 gap-3 px-4 pb-4">
                <KpiCard titulo="Clientes" valor={selecionada.clientes.toLocaleString("pt-BR")} />
                <KpiCard titulo="MRR" valor={brl(selecionada.mrr)} />
                <KpiCard titulo="TCV (mês)" valor={brl(selecionada.tcvContratadoNoMes)} />
                <KpiCard titulo="Ticket Médio" valor={brl(selecionada.ticketMedio)} />
                <KpiCard titulo="Churn" valor={`${selecionada.churnRatePct.toFixed(1)}%`} invertido />
                <KpiCard titulo="Retenção" valor={`${selecionada.retencaoPct.toFixed(1)}%`} />
                <KpiCard
                  titulo="Lifetime Médio"
                  valor={selecionada.lifetimeMedioMeses !== null ? `${selecionada.lifetimeMedioMeses.toFixed(1)} meses` : "—"}
                />
                <KpiCard
                  titulo="Crescimento MRR"
                  valor={selecionada.crescimentoMrrPct !== null ? `${selecionada.crescimentoMrrPct.toFixed(1)}%` : "—"}
                  deltaPct={selecionada.crescimentoMrrPct}
                />
                <KpiCard titulo="Vencendo ≤30d" valor={selecionada.contratosVencendo30.toLocaleString("pt-BR")} />
                <KpiCard titulo="Vencidos" valor={selecionada.contratosVencidos.toLocaleString("pt-BR")} invertido />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
