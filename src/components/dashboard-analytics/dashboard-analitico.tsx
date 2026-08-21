"use client";

import { useState } from "react";
import { BarChart3, DollarSign, Users, RefreshCw, FileText, Building2, Map as MapIcon, LineChart as LineChartIcon, Search, Target } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AnalyticsDataset } from "@/lib/dashboard-analytics/types";
import { AnalyticsFiltersProvider } from "./filters/analytics-filters-context";
import { AnalyticsFilterBar } from "./filters/filter-bar";
import { VisaoGeralView } from "./visao-geral/visao-geral-view";
import { ReceitaView } from "./receita/receita-view";
import { ClientesView } from "./clientes/clientes-view";
import { RetencaoChurnView } from "./retencao-churn/retencao-churn-view";
import { ContratosView } from "./contratos/contratos-view";
import { FranquiasView } from "./franquias/franquias-view";
import { OportunidadesView } from "./oportunidades/oportunidades-view";
import { MapaView } from "./mapa/mapa-view";
import { PerformanceView } from "./performance/performance-view";
import { DadosView } from "./dados/dados-view";

const ABAS = [
  { value: "visao-geral", label: "Visão Geral", icon: BarChart3 },
  { value: "receita", label: "Receita & Financeiro", icon: DollarSign },
  { value: "clientes", label: "Clientes", icon: Users },
  { value: "retencao-churn", label: "Retenção & Churn", icon: RefreshCw },
  { value: "contratos", label: "Contratos", icon: FileText },
  { value: "oportunidades", label: "Oportunidades", icon: Target },
  { value: "franquias", label: "Franquias", icon: Building2 },
  { value: "mapa", label: "Mapa & Distribuição", icon: MapIcon },
  { value: "performance", label: "Performance", icon: LineChartIcon },
  { value: "dados", label: "Dados", icon: Search },
] as const;

export function DashboardAnalitico({ dataset, podeRenovar = false }: { dataset: AnalyticsDataset; podeRenovar?: boolean }) {
  const [aba, setAba] = useState<(typeof ABAS)[number]["value"]>("visao-geral");

  return (
    <AnalyticsFiltersProvider dataset={dataset}>
      <div className="space-y-4">
        <AnalyticsFilterBar />
        <Tabs value={aba} onValueChange={(v) => setAba(v as typeof aba)}>
          <TabsList variant="line" className="h-auto flex-wrap justify-start gap-1 border-b">
            {ABAS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="gap-1.5">
                <Icon className="h-4 w-4" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Cada aba só monta seu conteúdo quando ativa — evita carregar o
              mapa (leaflet + municípios.json) e recalcular todas as
              agregações antes do usuário sequer abrir a aba. */}
          <TabsContent value="visao-geral" className="pt-4">
            {aba === "visao-geral" && <VisaoGeralView />}
          </TabsContent>
          <TabsContent value="receita" className="pt-4">
            {aba === "receita" && <ReceitaView />}
          </TabsContent>
          <TabsContent value="clientes" className="pt-4">
            {aba === "clientes" && <ClientesView />}
          </TabsContent>
          <TabsContent value="retencao-churn" className="pt-4">
            {aba === "retencao-churn" && <RetencaoChurnView />}
          </TabsContent>
          <TabsContent value="contratos" className="pt-4">
            {aba === "contratos" && <ContratosView />}
          </TabsContent>
          <TabsContent value="oportunidades" className="pt-4">
            {aba === "oportunidades" && <OportunidadesView podeRenovar={podeRenovar} />}
          </TabsContent>
          <TabsContent value="franquias" className="pt-4">
            {aba === "franquias" && <FranquiasView />}
          </TabsContent>
          <TabsContent value="mapa" className="pt-4">
            {aba === "mapa" && <MapaView />}
          </TabsContent>
          <TabsContent value="performance" className="pt-4">
            {aba === "performance" && <PerformanceView />}
          </TabsContent>
          <TabsContent value="dados" className="pt-4">
            {aba === "dados" && <DadosView />}
          </TabsContent>
        </Tabs>
      </div>
    </AnalyticsFiltersProvider>
  );
}
