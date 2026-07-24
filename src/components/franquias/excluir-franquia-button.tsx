"use client";

import { ConfirmActionButton } from "@/components/confirm-action-button";
import { excluirFranquia } from "@/lib/actions/franquias";

export function ExcluirFranquiaButton({ id, nome }: { id: string; nome: string }) {
  return (
    <ConfirmActionButton
      title={`Excluir ${nome}?`}
      description="A franquia será marcada como excluída (soft delete). Só é possível excluir franquias sem clientes ativos."
      action={() => excluirFranquia(id)}
      successMessage="Franquia excluída."
    />
  );
}
