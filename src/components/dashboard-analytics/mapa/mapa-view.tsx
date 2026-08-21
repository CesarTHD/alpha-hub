"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Maximize2, Minimize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardMultiSelect } from "@/components/dashboard/dashboard-multi-select";
import { cn } from "@/lib/utils";
import { buildClienteGeoPoints, buildFranquiaGeoPoints } from "@/lib/dashboard-analytics/mapa/geo-join";
import { useAnalyticsFilters } from "../filters/analytics-filters-context";
import { KpiCard } from "../shared/kpi-card";
import { MapLayerToggles, type Camadas } from "./map-layer-toggles";

const LeafletMap = dynamic(() => import("./leaflet-map.client"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Carregando mapa…</div>,
});

export function MapaView() {
  const { snapshotFiltrado, franquias, opts } = useAnalyticsFilters();
  const [camadas, setCamadas] = useState<Camadas>({ franquias: true, clientes: true, heatmap: false });
  const [franquiaFiltro, setFranquiaFiltro] = useState<string[]>([]);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!fullscreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fullscreen]);

  const snapshotParaMapa = useMemo(
    () => (franquiaFiltro.length === 0 ? snapshotFiltrado : snapshotFiltrado.filter((r) => franquiaFiltro.includes(r.franquia))),
    [snapshotFiltrado, franquiaFiltro],
  );

  const clientesGeo = useMemo(() => buildClienteGeoPoints(snapshotParaMapa), [snapshotParaMapa]);
  const franquiasGeo = useMemo(
    () => buildFranquiaGeoPoints(franquias.filter((f) => f.ativo && (franquiaFiltro.length === 0 || franquiaFiltro.includes(f.nome)))),
    [franquias, franquiaFiltro],
  );

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

      <Card className={cn(fullscreen && "fixed inset-0 z-50 flex flex-col rounded-none")}>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Mapa & Distribuição</CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-end gap-1">
                <DashboardMultiSelect label="Franquia" value={franquiaFiltro} onChange={setFranquiaFiltro} options={opts.franquia} />
                {franquiaFiltro.length > 0 && (
                  <Button variant="ghost" size="icon-sm" onClick={() => setFranquiaFiltro([])} title="Limpar filtro de franquia">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <MapLayerToggles camadas={camadas} onChange={setCamadas} />
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setFullscreen((f) => !f)}
                title={fullscreen ? "Sair da tela cheia" : "Expandir para tela cheia"}
              >
                {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className={cn(fullscreen ? "flex-1" : "h-140")}>
          <LeafletMap clientePoints={clientesGeo.matched} franquiaPoints={franquiasGeo.matched} camadas={camadas} fullscreen={fullscreen} />
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
