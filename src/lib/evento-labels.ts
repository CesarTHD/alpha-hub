export const tipoEventoLabel: Record<string, string> = {
  CRIACAO_CLIENTE: "Criação de cliente",
  NOVO_CONTRATO: "Novo contrato",
  RENOVACAO: "Renovação",
  PAUSA: "Pausa",
  RETOMADA: "Retomada",
  CHURN: "Churn",
  ALTERACAO_PLANO: "Alteração de plano",
  ALTERACAO_VALOR: "Alteração de valor",
  TRANSFERENCIA_FRANQUIA: "Transferência de franquia",
  ALTERACAO_PROFIT: "Alteração de Profit",
  OBSERVACAO: "Observação",
};

export const tipoEventoBadgeVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  CRIACAO_CLIENTE: "secondary",
  NOVO_CONTRATO: "default",
  RENOVACAO: "default",
  PAUSA: "outline",
  RETOMADA: "default",
  CHURN: "destructive",
  ALTERACAO_PLANO: "secondary",
  ALTERACAO_VALOR: "secondary",
  TRANSFERENCIA_FRANQUIA: "secondary",
  ALTERACAO_PROFIT: "secondary",
  OBSERVACAO: "outline",
};

export const statusContratoLabel: Record<string, string> = {
  ATIVO: "Ativo",
  PAUSADO: "Pausado",
  ENCERRADO: "Encerrado",
  CHURN: "Churn",
};
