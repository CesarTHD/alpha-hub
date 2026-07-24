"use client";

import { useState } from "react";
import { FileEdit } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import { alterarPlano } from "@/lib/actions/lifecycle";
import { useServerAction } from "@/hooks/use-server-action";

export function AlterarPlanoDialog({
  clienteId,
  contratoId,
  planoAtual,
}: {
  clienteId: string;
  contratoId: string;
  planoAtual: string;
}) {
  const [open, setOpen] = useState(false);
  const { state, pending, submit } = useServerAction(alterarPlano, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <FileEdit className="mr-1 h-4 w-4" /> Alterar plano
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar plano — atual: {planoAtual}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(new FormData(e.currentTarget));
          }}
          className="space-y-4"
        >
          <input type="hidden" name="clienteId" value={clienteId} />
          <input type="hidden" name="contratoId" value={contratoId} />
          <div className="space-y-2">
            <Label htmlFor="novoPlano">Novo plano</Label>
            <Input id="novoPlano" name="novoPlano" required />
            {state?.fieldErrors?.novoPlano && (
              <p className="text-sm text-destructive">{state.fieldErrors.novoPlano[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="observacao">Observação (opcional)</Label>
            <Textarea id="observacao" name="observacao" />
          </div>
          <DialogFooter>
            <SubmitButton pending={pending}>Confirmar alteração</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
