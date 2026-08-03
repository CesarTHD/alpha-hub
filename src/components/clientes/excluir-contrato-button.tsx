"use client";

import { ConfirmActionButton } from "@/components/confirm-action-button";
import { excluirContrato } from "@/lib/actions/lifecycle";

export function ExcluirContratoButton({
  clienteId,
  contratoId,
  plano,
}: {
  clienteId: string;
  contratoId: string;
  plano: string;
}) {
  return (
    <ConfirmActionButton
      title={`Excluir contrato "${plano}"?`}
      description="O contrato será marcado como excluído (soft delete) e some das listagens e do histórico. Essa ação é exclusiva do Administrador."
      action={() => excluirContrato(clienteId, contratoId)}
      successMessage="Contrato excluído."
      variant="ghost"
    />
  );
}
