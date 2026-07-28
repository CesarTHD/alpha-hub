"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";
import { createUsuario, updateUsuario } from "@/lib/actions/usuarios";
import { useServerAction } from "@/hooks/use-server-action";
import type { Role } from "@/generated/prisma/client";

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Admin",
  CEO: "CEO",
  DIRETOR: "Diretor",
  PROFIT: "Profit",
  FRANQUEADO: "Franqueado",
  OPERACIONAL: "Operacional",
};

const ROLES_COM_FRANQUIA: Role[] = ["FRANQUEADO", "OPERACIONAL"];

type Usuario = {
  id: string;
  nome: string;
  email: string;
  role: Role;
  franquiaId: string | null;
};

type Franquia = { id: string; nome: string };

export function UsuarioFormDialog({
  usuario,
  franquias,
}: {
  usuario?: Usuario;
  franquias: Franquia[];
}) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>(usuario?.role ?? "OPERACIONAL");
  const action = usuario ? updateUsuario.bind(null, usuario.id) : createUsuario;
  const { state, pending, submit } = useServerAction(action, () => setOpen(false));

  const precisaFranquia = ROLES_COM_FRANQUIA.includes(role);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {usuario ? (
          <Button variant="ghost" size="icon" aria-label="Editar usuário">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="mr-1 h-4 w-4" /> Novo usuário
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{usuario ? "Editar usuário" : "Novo usuário"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(new FormData(e.currentTarget));
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" name="nome" defaultValue={usuario?.nome} required />
            {state?.fieldErrors?.nome && (
              <p className="text-sm text-destructive">{state.fieldErrors.nome[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail (conta Google)</Label>
            <Input id="email" name="email" type="email" defaultValue={usuario?.email} required />
            {state?.fieldErrors?.email && (
              <p className="text-sm text-destructive">{state.fieldErrors.email[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Papel</Label>
            <Select name="role" defaultValue={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger id="role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {precisaFranquia && (
            <div className="space-y-2">
              <Label htmlFor="franquiaId">Franquia</Label>
              <Select name="franquiaId" defaultValue={usuario?.franquiaId ?? undefined}>
                <SelectTrigger id="franquiaId" className="w-full">
                  <SelectValue placeholder="Selecione a franquia" />
                </SelectTrigger>
                <SelectContent>
                  {franquias.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state?.fieldErrors?.franquiaId && (
                <p className="text-sm text-destructive">{state.fieldErrors.franquiaId[0]}</p>
              )}
            </div>
          )}
          <DialogFooter>
            <SubmitButton pending={pending}>
              {usuario ? "Salvar alterações" : "Criar usuário"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
