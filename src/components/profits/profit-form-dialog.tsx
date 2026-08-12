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
import { createProfit, updateProfit } from "@/lib/actions/profits";
import { useServerAction } from "@/hooks/use-server-action";

type Profit = { id: string; nome: string; email: string; telefone: string | null };

export function ProfitFormDialog({ profit }: { profit?: Profit }) {
  const [open, setOpen] = useState(false);
  const action = profit ? updateProfit.bind(null, profit.id) : createProfit;
  const { state, pending, submit } = useServerAction(action, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {profit ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Editar Profit">
                <Pencil className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>Editar Profit</TooltipContent>
        </Tooltip>
      ) : (
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-1 h-4 w-4" /> Novo Profit
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{profit ? "Editar Profit" : "Novo Profit"}</DialogTitle>
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
            <Input id="nome" name="nome" defaultValue={profit?.nome} required />
            {state?.fieldErrors?.nome && (
              <p className="text-sm text-destructive">{state.fieldErrors.nome[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" defaultValue={profit?.email} required />
            {state?.fieldErrors?.email && (
              <p className="text-sm text-destructive">{state.fieldErrors.email[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input id="telefone" name="telefone" defaultValue={profit?.telefone ?? ""} />
          </div>
          <DialogFooter>
            <SubmitButton pending={pending}>{profit ? "Salvar alterações" : "Criar Profit"}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
