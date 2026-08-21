import municipiosRaw from "./municipios.json";

type Municipio = { uf: string; cidade: string; lat: number; lng: number };

const municipios = municipiosRaw as Municipio[];

const ESTADO_POR_NOME: Record<string, string> = {
  acre: "AC",
  alagoas: "AL",
  amapa: "AP",
  amazonas: "AM",
  bahia: "BA",
  ceara: "CE",
  "distrito federal": "DF",
  "espirito santo": "ES",
  goias: "GO",
  maranhao: "MA",
  "mato grosso": "MT",
  "mato grosso do sul": "MS",
  "minas gerais": "MG",
  para: "PA",
  paraiba: "PB",
  parana: "PR",
  pernambuco: "PE",
  piaui: "PI",
  "rio de janeiro": "RJ",
  "rio grande do norte": "RN",
  "rio grande do sul": "RS",
  rondonia: "RO",
  roraima: "RR",
  "santa catarina": "SC",
  "sao paulo": "SP",
  sergipe: "SE",
  tocantins: "TO",
};

/** lowercase, sem acento, trim, espaços colapsados — usada tanto para
 *  normalizar o dataset estático quanto o texto livre vindo do banco. */
export function normalizarTexto(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/** Aceita tanto a sigla ("SP") quanto o nome por extenso ("São Paulo"). */
export function normalizarUf(valor: string): string {
  const limpo = normalizarTexto(valor);
  if (limpo.length === 2) return limpo.toUpperCase();
  return ESTADO_POR_NOME[limpo] ?? limpo.toUpperCase();
}

function chave(uf: string, cidade: string): string {
  return `${normalizarUf(uf)}|${normalizarTexto(cidade)}`;
}

const lookup = new Map<string, { lat: number; lng: number }>();
for (const m of municipios) {
  lookup.set(chave(m.uf, m.cidade), { lat: m.lat, lng: m.lng });
}

/** Resolve cidade+UF (texto livre) para o centróide do município do IBGE.
 *  Retorna `null` quando não há correspondência — nunca estima/aproxima uma
 *  coordenada para um par cidade/UF não reconhecido. */
export function resolverCoordenadas(cidade: string | null, uf: string | null): { lat: number; lng: number } | null {
  if (!cidade || !uf) return null;
  return lookup.get(chave(uf, cidade)) ?? null;
}

export const TOTAL_MUNICIPIOS = municipios.length;
