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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SubmitButton } from "@/components/submit-button";
import { createFranquia, updateFranquia } from "@/lib/actions/franquias";
import { useServerAction } from "@/hooks/use-server-action";

type Franquia = {
  id: string;
  nome: string;
  cidade: string;
  estado: string;
  telefone?: string | null;
  email?: string | null;
  cnpj?: string | null;
};

export function FranquiaFormDialog({ franquia }: { franquia?: Franquia }) {
  const [open, setOpen] = useState(false);
  const action = franquia ? updateFranquia.bind(null, franquia.id) : createFranquia;
  const { state, pending, submit } = useServerAction(action, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {franquia ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Editar franquia">
                <Pencil className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>Editar franquia</TooltipContent>
        </Tooltip>
      ) : (
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-1 h-4 w-4" /> Nova franquia
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{franquia ? "Editar franquia" : "Nova franquia"}</DialogTitle>
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
            <Input id="nome" name="nome" defaultValue={franquia?.nome} required />
            {state?.fieldErrors?.nome && (
              <p className="text-sm text-destructive">{state.fieldErrors.nome[0]}</p>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input id="cidade" name="cidade" defaultValue={franquia?.cidade} required />
              {state?.fieldErrors?.cidade && (
                <p className="text-sm text-destructive">{state.fieldErrors.cidade[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="estado">UF</Label>
              <Input
                id="estado"
                name="estado"
                maxLength={2}
                defaultValue={franquia?.estado}
                required
              />
              {state?.fieldErrors?.estado && (
                <p className="text-sm text-destructive">{state.fieldErrors.estado[0]}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" name="telefone" defaultValue={franquia?.telefone ?? undefined} />
              {state?.fieldErrors?.telefone && (
                <p className="text-sm text-destructive">{state.fieldErrors.telefone[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input id="cnpj" name="cnpj" defaultValue={franquia?.cnpj ?? undefined} />
              {state?.fieldErrors?.cnpj && (
                <p className="text-sm text-destructive">{state.fieldErrors.cnpj[0]}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" defaultValue={franquia?.email ?? undefined} />
            {state?.fieldErrors?.email && (
              <p className="text-sm text-destructive">{state.fieldErrors.email[0]}</p>
            )}
          </div>
          <DialogFooter>
            <SubmitButton pending={pending}>
              {franquia ? "Salvar alterações" : "Criar franquia"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
