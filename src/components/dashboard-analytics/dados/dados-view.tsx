"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buildDadosRows, type DadoRow } from "@/lib/dashboard-analytics/agregacoes/dados";
import { buildDadosCsv } from "@/lib/dashboard-analytics/export/dados-csv";
import { useAnalyticsFilters } from "../filters/analytics-filters-context";
import { ExportCsvButton } from "../shared/export-button";
import { DadosTable } from "./dados-table";
import { DadosRowDetailSheet } from "./dados-row-detail-sheet";

export function DadosView() {
  const { snapshotFiltrado, agora } = useAnalyticsFilters();
  const [busca, setBusca] = useState("");
  const [selecionada, setSelecionada] = useState<DadoRow | null>(null);

  const todasAsLinhas = useMemo(() => buildDadosRows(snapshotFiltrado, agora), [snapshotFiltrado, agora]);
  const linhas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return todasAsLinhas;
    return todasAsLinhas.filter((r) => r.cliente.toLowerCase().includes(q) || r.franquia.toLowerCase().includes(q));
  }, [todasAsLinhas, busca]);

  const csv = useMemo(() => buildDadosCsv(linhas), [linhas]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Dados ({linhas.length})</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar cliente ou franquia..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-8" />
              </div>
              <ExportCsvButton csv={csv} filename={`dashboard-analitico-dados-${new Date().toISOString().slice(0, 10)}.csv`} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DadosTable rows={linhas} onSelect={setSelecionada} />
        </CardContent>
      </Card>

      <DadosRowDetailSheet linha={selecionada} onOpenChange={(open) => !open && setSelecionada(null)} />
    </div>
  );
}
