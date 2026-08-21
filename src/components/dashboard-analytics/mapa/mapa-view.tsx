"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildClienteGeoPoints, buildFranquiaGeoPoints } from "@/lib/dashboard-analytics/mapa/geo-join";
import { useAnalyticsFilters } from "../filters/analytics-filters-context";
import { KpiCard } from "../shared/kpi-card";
import { MapLayerToggles, type Camadas } from "./map-layer-toggles";

const LeafletMap = dynamic(() => import("./leaflet-map.client"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Carregando mapa…</div>,
});

export function MapaView() {
  const { snapshotFiltrado, franquias } = useAnalyticsFilters();
  const [camadas, setCamadas] = useState<Camadas>({ franquias: true, clientes: true, heatmap: false });

  const clientesGeo = useMemo(() => buildClienteGeoPoints(snapshotFiltrado), [snapshotFiltrado]);
  const franquiasGeo = useMemo(() => buildFranquiaGeoPoints(franquias.filter((f) => f.ativo)), [franquias]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard titulo="Clientes no Mapa" valor={clientesGeo.matched.length.toLocaleString("pt-BR")} />
        <KpiCard titulo="Franquias no Mapa" valor={franquiasGeo.matched.length.toLocaleString("pt-BR")} />
        <KpiCard titulo="Sem Localização (Clientes)" valor={clientesGeo.unmatchedCount.toLocaleString("pt-BR")} invertido />
        <KpiCard titulo="Sem Localização (Franquias)" valor={franquiasGeo.unmatchedCount.toLocaleString("pt-BR")} invertido />
      </div>

      {(clientesGeo.unmatchedCount > 0 || franquiasGeo.unmatchedCount > 0) && (
        <div className="flex items-start gap-2 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Cidade/UF sem correspondência exata na base de municípios do IBGE não são posicionados no mapa (nenhuma coordenada é estimada). Exemplos:{" "}
            {[...clientesGeo.unmatchedSamples, ...franquiasGeo.unmatchedSamples].slice(0, 8).join(", ") || "—"}.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Mapa & Distribuição</CardTitle>
            <MapLayerToggles camadas={camadas} onChange={setCamadas} />
          </div>
        </CardHeader>
        <CardContent className="h-[560px]">
          <LeafletMap clientePoints={clientesGeo.matched} franquiaPoints={franquiasGeo.matched} camadas={camadas} />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Coordenadas aproximadas (centróide do município do IBGE), não endereço exato. Camada de &quot;oportunidade geográfica&quot; (regiões com
        concentração de clientes e pouca presença de franquias) não foi implementada nesta versão — depende de uma definição de negócio para
        distância/raio de cobertura por franquia, que ainda não existe no sistema.
      </p>
    </div>
  );
}
