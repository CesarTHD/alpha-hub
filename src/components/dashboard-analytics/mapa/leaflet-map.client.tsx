"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import Supercluster from "supercluster";
import { STATUS } from "@/lib/chart-colors";
import { brl } from "@/lib/dashboard-analytics/agregacoes/shared";
import type { ClienteGeoPoint, FranquiaGeoPoint } from "@/lib/dashboard-analytics/mapa/geo-join";

const BRASIL_CENTRO: [number, number] = [-14.235, -51.9253];
const AMARELO_FRANQUIA = "#eda100";
const PRETO_CLIENTE = "#1f1f1f";

type ClienteFeature = { type: "Feature"; properties: { ponto: ClienteGeoPoint }; geometry: { type: "Point"; coordinates: [number, number] } };

function ClienteClusterLayer({ pontos }: { pontos: ClienteGeoPoint[] }) {
  const map = useMap();
  const [bounds, setBounds] = useState(() => map.getBounds());
  const [zoom, setZoom] = useState(() => map.getZoom());

  useMapEvents({
    moveend: () => {
      setBounds(map.getBounds());
      setZoom(map.getZoom());
    },
  });

  const index = useMemo(() => {
    const sc = new Supercluster<{ ponto: ClienteGeoPoint }>({ radius: 60, maxZoom: 16 });
    const features: ClienteFeature[] = pontos.map((p) => ({
      type: "Feature",
      properties: { ponto: p },
      geometry: { type: "Point", coordinates: [p.lng, p.lat] },
    }));
    sc.load(features);
    return sc;
  }, [pontos]);

  const clusters = useMemo(() => {
    const bbox: [number, number, number, number] = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
    return index.getClusters(bbox, Math.round(zoom));
  }, [index, bounds, zoom]);

  return (
    <>
      {clusters.map((c) => {
        const [lng, lat] = c.geometry.coordinates;
        const isCluster = "cluster" in c.properties && c.properties.cluster === true;
        if (isCluster) {
          const count = (c.properties as { point_count: number }).point_count;
          const raio = 10 + Math.min(18, Math.log2(count) * 4);
          return (
            <CircleMarker
              key={`cluster-${c.id}`}
              center={[lat, lng]}
              radius={raio}
              pathOptions={{ color: PRETO_CLIENTE, fillColor: PRETO_CLIENTE, fillOpacity: 0.75, weight: 1 }}
              eventHandlers={{
                click: () => {
                  const expansionZoom = Math.min(index.getClusterExpansionZoom(c.id as number), 18);
                  map.setView([lat, lng], expansionZoom);
                },
              }}
            >
              <Popup>{count} clientes nesta região</Popup>
            </CircleMarker>
          );
        }
        const ponto = c.properties.ponto;
        return (
          <CircleMarker key={ponto.id} center={[lat, lng]} radius={5} pathOptions={{ color: PRETO_CLIENTE, fillColor: PRETO_CLIENTE, fillOpacity: 0.85, weight: 1 }}>
            <Popup>
              <strong>{ponto.nome}</strong>
              <br />
              {ponto.cidade}/{ponto.uf}
              <br />
              Franquia: {ponto.franquia}
              <br />
              {ponto.tipoContrato === "MENSAL" ? `MRR: ${brl(ponto.valorMensal)}` : "Contrato TCV"}
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}

/** Aproximação de heatmap sem depender de leaflet.heat (não instalado):
 *  círculos grandes, semitransparentes e sem borda — a sobreposição em áreas
 *  de maior densidade produz visualmente o mesmo efeito de concentração. */
function HeatmapLayer({ pontos }: { pontos: ClienteGeoPoint[] }) {
  return (
    <>
      {pontos.map((p) => (
        <CircleMarker
          key={`heat-${p.id}`}
          center={[p.lat, p.lng]}
          radius={22}
          pathOptions={{ stroke: false, fillColor: STATUS.critical, fillOpacity: 0.06 }}
          interactive={false}
        />
      ))}
    </>
  );
}

function FranquiasLayer({ pontos }: { pontos: FranquiaGeoPoint[] }) {
  return (
    <>
      {pontos.map((f) => (
        <CircleMarker key={f.id} center={[f.lat, f.lng]} radius={8} pathOptions={{ color: "#8a6d00", fillColor: AMARELO_FRANQUIA, fillOpacity: 0.95, weight: 1.5 }}>
          <Popup>
            <strong>{f.nome}</strong>
            <br />
            {f.cidade}/{f.uf}
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}

function FitBounds({ pontos }: { pontos: Array<{ lat: number; lng: number }> }) {
  const map = useMap();
  useEffect(() => {
    if (pontos.length === 0) return;
    const bounds = pontos.map((p) => [p.lat, p.lng] as [number, number]);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/** Leaflet só reajusta o tamanho dos tiles em resize da *janela* — quando o
 *  container muda de tamanho por CSS (ex.: entrar em tela cheia), é preciso
 *  chamar invalidateSize() manualmente. */
function InvalidateOnChange({ trigger }: { trigger: unknown }) {
  const map = useMap();
  useEffect(() => {
    const id = window.setTimeout(() => map.invalidateSize(), 50);
    return () => window.clearTimeout(id);
  }, [trigger, map]);
  return null;
}

export default function LeafletMap({
  clientePoints,
  franquiaPoints,
  camadas,
  fullscreen,
}: {
  clientePoints: ClienteGeoPoint[];
  franquiaPoints: FranquiaGeoPoint[];
  camadas: { franquias: boolean; clientes: boolean; heatmap: boolean };
  fullscreen: boolean;
}) {
  const todosOsPontos = useMemo(() => [...clientePoints, ...franquiaPoints], [clientePoints, franquiaPoints]);

  return (
    <MapContainer center={BRASIL_CENTRO} zoom={4} scrollWheelZoom style={{ height: "100%", width: "100%", borderRadius: "var(--radius-lg)" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds pontos={todosOsPontos} />
      <InvalidateOnChange trigger={fullscreen} />
      {camadas.heatmap && <HeatmapLayer pontos={clientePoints} />}
      {camadas.clientes && <ClienteClusterLayer pontos={clientePoints} />}
      {camadas.franquias && <FranquiasLayer pontos={franquiaPoints} />}
    </MapContainer>
  );
}
