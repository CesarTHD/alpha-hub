"use client";

import { ConfirmActionButton } from "@/components/confirm-action-button";
import { excluirUsuario } from "@/lib/actions/usuarios";

export function ExcluirUsuarioButton({ id, nome }: { id: string; nome: string }) {
  return (
    <ConfirmActionButton
      title={`Excluir ${nome}?`}
      description="O usuário será marcado como excluído (soft delete) e perderá acesso à plataforma imediatamente."
      tooltip="Excluir usuário"
      action={() => excluirUsuario(id)}
      successMessage="Usuário excluído."
    />
  );
}
