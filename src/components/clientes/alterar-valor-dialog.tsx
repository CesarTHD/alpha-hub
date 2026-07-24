"use client";

import { useState } from "react";
import { DollarSign } from "lucide-react";
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
import { alterarValor } from "@/lib/actions/lifecycle";
import { formatCurrency } from "@/lib/format";
import { useServerAction } from "@/hooks/use-server-action";

export function AlterarValorDialog({
  clienteId,
  contratoId,
  valorAtual,
}: {
  clienteId: string;
  contratoId: string;
  valorAtual: string;
}) {
  const [open, setOpen] = useState(false);
  const { state, pending, submit } = useServerAction(alterarValor, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <DollarSign className="mr-1 h-4 w-4" /> Alterar valor
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar valor mensal — atual: {formatCurrency(valorAtual)}</DialogTitle>
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
            <Label htmlFor="novoValorMensal">Novo valor mensal</Label>
            <Input id="novoValorMensal" name="novoValorMensal" type="number" step="0.01" required />
            {state?.fieldErrors?.novoValorMensal && (
              <p className="text-sm text-destructive">{state.fieldErrors.novoValorMensal[0]}</p>
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
