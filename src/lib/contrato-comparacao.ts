import { formatCurrency, formatDate } from "@/lib/format";
import type { ContratoExtraido } from "@/lib/ai/contrato-extraction";

export type ContratoAtual = {
  plano: string;
  tipoContrato: string;
  valorContrato: string;
  valorMensal: string;
  inicioContrato: string;
  renovacaoAutomatica: boolean;
};

export type Inconsistencia = { campo: string; cadastrado: string; contrato: string };

const VALOR_MENSAL_DIVISOR: Record<string, number> = {
  MENSAL: 1,
  TRIMESTRAL: 3,
  QUADRIMESTRAL: 4,
  SEMESTRAL: 6,
  ANUAL: 12,
};

function valoresDiferem(a: number, b: number) {
  return Math.abs(a - b) > 0.01;
}

/** Compara o contrato extraído (D4Sign/PDF) com o contrato ativo já cadastrado, sem alterar nada — só alerta.
 * Usado tanto na edição manual de cliente quanto na tela de revisão de propostas D4Sign. */
export function compararContrato(extraido: ContratoExtraido, atual: ContratoAtual): Inconsistencia[] {
  const diffs: Inconsistencia[] = [];

  if (extraido.plano && extraido.plano.trim().toLowerCase() !== atual.plano.trim().toLowerCase()) {
    diffs.push({ campo: "Plano", cadastrado: atual.plano, contrato: extraido.plano });
  }
  if (extraido.tipoContrato && extraido.tipoContrato !== atual.tipoContrato) {
    diffs.push({ campo: "Tipo de contrato", cadastrado: atual.tipoContrato, contrato: extraido.tipoContrato });
  }
  if (extraido.valorContrato != null && valoresDiferem(extraido.valorContrato, Number(atual.valorContrato))) {
    diffs.push({
      campo: "Valor do contrato",
      cadastrado: formatCurrency(atual.valorContrato),
      contrato: formatCurrency(extraido.valorContrato),
    });
  }
  const divisor = VALOR_MENSAL_DIVISOR[extraido.tipoContrato ?? atual.tipoContrato];
  if (extraido.valorContrato != null && divisor) {
    const valorMensalExtraido = extraido.valorContrato / divisor;
    if (valoresDiferem(valorMensalExtraido, Number(atual.valorMensal))) {
      diffs.push({
        campo: "Valor mensal",
        cadastrado: formatCurrency(atual.valorMensal),
        contrato: formatCurrency(valorMensalExtraido),
      });
    }
  }
  if (extraido.inicioContrato && extraido.inicioContrato.slice(0, 10) !== atual.inicioContrato.slice(0, 10)) {
    diffs.push({
      campo: "Início do contrato",
      cadastrado: formatDate(atual.inicioContrato),
      contrato: formatDate(extraido.inicioContrato),
    });
  }
  if (extraido.renovacaoAutomatica != null && extraido.renovacaoAutomatica !== atual.renovacaoAutomatica) {
    diffs.push({
      campo: "Renovação automática",
      cadastrado: atual.renovacaoAutomatica ? "Sim" : "Não",
      contrato: extraido.renovacaoAutomatica ? "Sim" : "Não",
    });
  }

  return diffs;
}
