// Tipos e cálculos puros da carteira (Dashboard) — sem nenhuma dependência de
// servidor (Prisma/pg), pra poder ser importado tanto pela busca de dados no
// servidor quanto pelo componente client que faz os cálculos em memória.
import type { TipoContrato, StatusContrato } from "@/generated/prisma/enums";

export const TIPO_CONTRATO_LABEL: Record<TipoContrato, string> = {
  MENSAL: "Mensal",
  TRIMESTRAL: "Trimestral",
  QUADRIMESTRAL: "Quadrimestral",
  SEMESTRAL: "Semestral",
  ANUAL: "Anual",
};

export const STATUS_CONTRATO_LABEL: Record<StatusContrato, string> = {
  ATIVO: "Ativo",
  PAUSADO: "Pausado",
  VENCIDO: "Vencido",
  ENCERRADO: "Encerrado",
  CHURN: "Churn",
};

/** Duração assumida (em meses) para contratos TCV — usada no Lifetime Médio Contratado. */
export const MESES_TCV: Partial<Record<TipoContrato, number>> = {
  TRIMESTRAL: 3,
  QUADRIMESTRAL: 4,
  SEMESTRAL: 6,
  ANUAL: 12,
};

export type ContratoRow = {
  contratoId: string;
  clienteId: string;
  cliente: string;
  franquia: string;
  profit: string;
  plano: string;
  tipoContrato: TipoContrato;
  status: StatusContrato;
  valorContrato: number;
  valorMensal: number;
  inicioContrato: Date;
  fimContrato: Date | null;
  dataSaida: Date | null;
  renovacaoAutomatica: boolean;
  ativo: boolean;
  vencido: boolean;
  pausado: boolean;
  churn: boolean;
  vencimentoDias: number | null;
  faixaVencimento: string;
};

export const MS_DIA = 1000 * 60 * 60 * 24;

export function calcularFaixa(vencimentoDias: number | null): string {
  if (vencimentoDias === null) return "Recorrente";
  if (vencimentoDias < 0) return "Vencido";
  if (vencimentoDias <= 30) return "Até 30 dias";
  if (vencimentoDias <= 60) return "31 a 60 dias";
  if (vencimentoDias <= 90) return "61 a 90 dias";
  return "Mais de 90 dias";
}

/** Timestamp (ms) em que a janela de vigência da linha termina, ou null se
 *  ainda estiver em aberto (contrato MENSAL sem fim definido, ainda ativo). */
export function fimEfetivoMs(row: ContratoRow): number | null {
  if (row.dataSaida) return row.dataSaida.getTime();
  if (row.fimContrato) return row.fimContrato.getTime();
  return null;
}

/** A linha (um contrato) estava vigente no instante `refEndMs`? Checagem
 *  puramente por janela de datas — não considera PAUSADO, igual ao dashboard
 *  de referência (limitação aceita: um cliente pausado no mês de referência
 *  ainda conta como "vigente" nessa checagem ponto-no-tempo). */
export function vigenteNoInstante(row: ContratoRow, refEndMs: number): boolean {
  const inicioMs = row.inicioContrato.getTime();
  if (inicioMs > refEndMs) return false;
  const fimMs = fimEfetivoMs(row);
  if (fimMs === null) return true;
  return fimMs > refEndMs;
}

/** A linha se sobrepõe ao mês de referência [start,end] — usado para "estava
 *  na carteira nesse mês" (mais permissivo que vigenteNoInstante: inclui quem
 *  entrou/saiu durante o próprio mês). */
export function sobrepoeMes(row: ContratoRow, refStartMs: number, refEndMs: number): boolean {
  const inicioMs = row.inicioContrato.getTime();
  if (inicioMs > refEndMs) return false;
  const fimMs = fimEfetivoMs(row);
  if (fimMs === null) return true;
  return fimMs >= refStartMs;
}

export function diffMeses(inicio: Date, fim: Date): number {
  const diffDias = (fim.getTime() - inicio.getTime()) / MS_DIA;
  return diffDias / 30.4375;
}
