"use client";

import { ConfirmActionButton } from "@/components/confirm-action-button";
import { excluirProfit } from "@/lib/actions/profits";

export function ExcluirProfitButton({ id, nome }: { id: string; nome: string }) {
  return (
    <ConfirmActionButton
      title={`Excluir ${nome}?`}
      description="O Profit será marcado como excluído (soft delete). Só é possível excluir Profits que não respondem por franquias ativas."
      tooltip="Excluir Profit"
      action={() => excluirProfit(id)}
      successMessage="Profit excluído."
    />
  );
}
