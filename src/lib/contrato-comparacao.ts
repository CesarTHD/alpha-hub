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

export type ClienteCadastro = {
  documento: string;
  email: string | null;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
};

/** Compara os dados cadastrais extraídos com o que já está no cadastro do cliente.
 * Só lista campos onde a extração trouxe algo E é diferente do que já existe. */
export function compararCadastro(extraido: ContratoExtraido, atual: ClienteCadastro): Inconsistencia[] {
  const diffs: Inconsistencia[] = [];

  if (extraido.documento) {
    const docExtraido = extraido.documento.replace(/\D/g, "");
    if (docExtraido && docExtraido !== atual.documento) {
      diffs.push({ campo: "CPF/CNPJ", cadastrado: atual.documento, contrato: docExtraido });
    }
  }
  if (extraido.email && extraido.email !== atual.email) {
    diffs.push({ campo: "E-mail", cadastrado: atual.email ?? "—", contrato: extraido.email });
  }
  if (extraido.telefone && extraido.telefone !== atual.telefone) {
    diffs.push({ campo: "Telefone", cadastrado: atual.telefone ?? "—", contrato: extraido.telefone });
  }
  if (extraido.cidade && extraido.cidade !== atual.cidade) {
    diffs.push({ campo: "Cidade", cadastrado: atual.cidade ?? "—", contrato: extraido.cidade });
  }
  if (extraido.estado) {
    const ufExtraida = extraido.estado.slice(0, 2).toUpperCase();
    if (ufExtraida !== atual.estado) {
      diffs.push({ campo: "Estado", cadastrado: atual.estado ?? "—", contrato: ufExtraida });
    }
  }

  return diffs;
}
