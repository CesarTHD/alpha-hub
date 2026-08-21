// Tipos do Dashboard Analítico — camada totalmente separada do dashboard
// atual (src/lib/carteira-calculos.ts). Reaproveita o tipo/funções puras de lá
// (ContratoRow, vigenteNoInstante, fimEfetivoMs, diffMeses, PORTFOLIO_STATUSES)
// só por importação, nunca por edição.
import type { ContratoRow } from "@/lib/carteira-calculos";

/** Uma linha de contrato com os campos geográficos extras que o dashboard
 *  atual não precisa (cidade/estado do cliente e da franquia atual, e os ids
 *  necessários para agrupar por franquia/profit sem depender do nome). */
export type AnalyticsContratoRow = ContratoRow & {
  franquiaId: string | null;
  profitId: string | null;
  clienteCidade: string | null;
  clienteEstado: string | null;
  franquiaCidade: string | null;
  franquiaEstado: string | null;
};

export type FranquiaBase = {
  id: string;
  nome: string;
  cidade: string;
  estado: string;
  ativo: boolean;
};

export type AnalyticsDataset = {
  rows: AnalyticsContratoRow[];
  franquias: FranquiaBase[];
};

export type AnalyticsFiltros = {
  profit: string[];
  franquia: string[];
  status: string[];
  tipo: string[];
  faixaVencimento: string[];
  plano: string[];
  uf: string[];
  cidade: string[];
  /** Mês/ano de referência (YYYY-MM) — mesmo conceito do dashboard atual: em
   *  branco, o "instante" de referência é agora. */
  mesRef: string;
};

export const FILTROS_VAZIOS: AnalyticsFiltros = {
  profit: [],
  franquia: [],
  status: [],
  tipo: [],
  faixaVencimento: [],
  plano: [],
  uf: [],
  cidade: [],
  mesRef: "",
};
