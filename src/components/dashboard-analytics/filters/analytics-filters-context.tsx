"use client";

import * as React from "react";
import { createContext, useContext, useMemo, useState } from "react";
import { STATUS_CONTRATO_LABEL, TIPO_CONTRATO_LABEL } from "@/lib/carteira-calculos";
import type { AnalyticsContratoRow, AnalyticsDataset, AnalyticsFiltros } from "@/lib/dashboard-analytics/types";
import { FILTROS_VAZIOS } from "@/lib/dashboard-analytics/types";
import { filtrarSnapshot, historicoDosClientes, snapshotPorCliente } from "@/lib/dashboard-analytics/agregacoes/shared";

const FAIXA_ORDEM = ["Vencido", "Até 30 dias", "31 a 60 dias", "61 a 90 dias", "Mais de 90 dias", "Recorrente", "Este mês"];

type AnalyticsFiltersValue = {
  filtros: AnalyticsFiltros;
  setFiltro: <K extends keyof AnalyticsFiltros>(chave: K, valor: AnalyticsFiltros[K]) => void;
  limparFiltros: () => void;
  opts: {
    profit: string[];
    franquia: string[];
    status: string[];
    tipo: string[];
    faixa: string[];
    plano: string[];
    uf: string[];
    cidade: string[];
  };
  agora: number;
  rows: AnalyticsContratoRow[];
  franquias: AnalyticsDataset["franquias"];
  snapshotFiltrado: AnalyticsContratoRow[];
  historyFiltrado: AnalyticsContratoRow[];
};

const AnalyticsFiltersContext = createContext<AnalyticsFiltersValue | null>(null);

export function AnalyticsFiltersProvider({ dataset, children }: { dataset: AnalyticsDataset; children: React.ReactNode }) {
  const [filtros, setFiltros] = useState<AnalyticsFiltros>(FILTROS_VAZIOS);
  const [agora] = useState(() => Date.now());

  const setFiltro = <K extends keyof AnalyticsFiltros>(chave: K, valor: AnalyticsFiltros[K]) =>
    setFiltros((prev) => ({ ...prev, [chave]: valor }));
  const limparFiltros = () => setFiltros(FILTROS_VAZIOS);

  const snapshotRows = useMemo(() => snapshotPorCliente(dataset.rows), [dataset.rows]);

  const opts = useMemo(() => {
    const uniq = (sel: (d: AnalyticsContratoRow) => string | null) =>
      Array.from(new Set(snapshotRows.map(sel).filter((v): v is string => !!v && v !== "—"))).sort();
    return {
      profit: uniq((d) => d.profit),
      franquia: uniq((d) => d.franquia),
      status: Object.values(STATUS_CONTRATO_LABEL),
      tipo: Object.values(TIPO_CONTRATO_LABEL),
      faixa: FAIXA_ORDEM,
      plano: uniq((d) => d.plano),
      uf: uniq((d) => d.clienteEstado),
      cidade: uniq((d) => d.clienteCidade),
    };
  }, [snapshotRows]);

  const snapshotFiltrado = useMemo(() => filtrarSnapshot(snapshotRows, filtros), [snapshotRows, filtros]);
  const historyFiltrado = useMemo(
    () => historicoDosClientes(dataset.rows, snapshotFiltrado),
    [dataset.rows, snapshotFiltrado],
  );

  const value: AnalyticsFiltersValue = {
    filtros,
    setFiltro,
    limparFiltros,
    opts,
    agora,
    rows: dataset.rows,
    franquias: dataset.franquias,
    snapshotFiltrado,
    historyFiltrado,
  };

  return <AnalyticsFiltersContext.Provider value={value}>{children}</AnalyticsFiltersContext.Provider>;
}

export function useAnalyticsFilters(): AnalyticsFiltersValue {
  const ctx = useContext(AnalyticsFiltersContext);
  if (!ctx) throw new Error("useAnalyticsFilters deve ser usado dentro de <AnalyticsFiltersProvider>");
  return ctx;
}
