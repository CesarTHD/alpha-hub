import type { StatusContrato, TipoContrato } from "@/generated/prisma/enums";
import type { AnalyticsContratoRow, FranquiaBase } from "@/lib/dashboard-analytics/types";
import { resolverCoordenadas } from "./municipios-lookup";

export type ClienteGeoPoint = {
  tipo: "cliente";
  id: string;
  nome: string;
  lat: number;
  lng: number;
  uf: string;
  cidade: string;
  status: StatusContrato;
  plano: string;
  tipoContrato: TipoContrato;
  franquiaId: string | null;
  franquia: string;
  valorMensal: number;
};

export type FranquiaGeoPoint = {
  tipo: "franquia";
  id: string;
  nome: string;
  lat: number;
  lng: number;
  uf: string;
  cidade: string;
};

export type GeoJoinResult<T> = {
  matched: T[];
  unmatchedCount: number;
  unmatchedSamples: string[];
};

/** Um ponto por cliente (snapshot: contrato mais recente), nunca inventando
 *  coordenada quando cidade/estado não batem com nenhum município do IBGE. */
export function buildClienteGeoPoints(snapshotRows: AnalyticsContratoRow[]): GeoJoinResult<ClienteGeoPoint> {
  const matched: ClienteGeoPoint[] = [];
  const unmatchedSamples: string[] = [];
  let unmatchedCount = 0;

  for (const row of snapshotRows) {
    const coords = resolverCoordenadas(row.clienteCidade, row.clienteEstado);
    if (!coords) {
      unmatchedCount++;
      if (unmatchedSamples.length < 20) unmatchedSamples.push(row.cliente);
      continue;
    }
    matched.push({
      tipo: "cliente",
      id: row.clienteId,
      nome: row.cliente,
      lat: coords.lat,
      lng: coords.lng,
      uf: row.clienteEstado ?? "",
      cidade: row.clienteCidade ?? "",
      status: row.status,
      plano: row.plano,
      tipoContrato: row.tipoContrato,
      franquiaId: row.franquiaId,
      franquia: row.franquia,
      valorMensal: row.valorMensal,
    });
  }

  return { matched, unmatchedCount, unmatchedSamples };
}

export function buildFranquiaGeoPoints(franquias: FranquiaBase[]): GeoJoinResult<FranquiaGeoPoint> {
  const matched: FranquiaGeoPoint[] = [];
  const unmatchedSamples: string[] = [];
  let unmatchedCount = 0;

  for (const f of franquias) {
    const coords = resolverCoordenadas(f.cidade, f.estado);
    if (!coords) {
      unmatchedCount++;
      if (unmatchedSamples.length < 20) unmatchedSamples.push(f.nome);
      continue;
    }
    matched.push({
      tipo: "franquia",
      id: f.id,
      nome: f.nome,
      lat: coords.lat,
      lng: coords.lng,
      uf: f.estado,
      cidade: f.cidade,
    });
  }

  return { matched, unmatchedCount, unmatchedSamples };
}
