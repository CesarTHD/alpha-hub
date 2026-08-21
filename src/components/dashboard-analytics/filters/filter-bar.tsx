"use client";

import { DashboardMultiSelect } from "@/components/dashboard/dashboard-multi-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useAnalyticsFilters } from "./analytics-filters-context";

export function AnalyticsFilterBar() {
  const { filtros, setFiltro, limparFiltros, opts } = useAnalyticsFilters();

  return (
    <Card size="sm">
      <CardContent className="flex flex-wrap items-end gap-3">
        <DashboardMultiSelect label="Profit" value={filtros.profit} onChange={(v) => setFiltro("profit", v)} options={opts.profit} />
        <DashboardMultiSelect label="Franquia" value={filtros.franquia} onChange={(v) => setFiltro("franquia", v)} options={opts.franquia} />
        <DashboardMultiSelect label="Status" value={filtros.status} onChange={(v) => setFiltro("status", v)} options={opts.status} />
        <DashboardMultiSelect label="Tipo de Contrato" value={filtros.tipo} onChange={(v) => setFiltro("tipo", v)} options={opts.tipo} />
        <DashboardMultiSelect
          label="Vencimento"
          value={filtros.faixaVencimento}
          onChange={(v) => setFiltro("faixaVencimento", v)}
          options={opts.faixa}
        />
        <DashboardMultiSelect label="Plano" value={filtros.plano} onChange={(v) => setFiltro("plano", v)} options={opts.plano} />
        <DashboardMultiSelect label="UF" value={filtros.uf} onChange={(v) => setFiltro("uf", v)} options={opts.uf} />
        <DashboardMultiSelect label="Cidade" value={filtros.cidade} onChange={(v) => setFiltro("cidade", v)} options={opts.cidade} />
        <div className="flex min-w-[170px] flex-col gap-1">
          <Label className="text-xs font-medium text-muted-foreground">Mês/Ano de Referência</Label>
          <input
            type="month"
            value={filtros.mesRef}
            onChange={(e) => setFiltro("mesRef", e.target.value)}
            className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={limparFiltros}>
          Limpar filtros
        </Button>
      </CardContent>
    </Card>
  );
}
