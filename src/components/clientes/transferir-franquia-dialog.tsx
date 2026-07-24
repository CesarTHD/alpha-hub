"use client";

import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";
import { transferirFranquia } from "@/lib/actions/lifecycle";
import { useServerAction } from "@/hooks/use-server-action";

type Franquia = { id: string; nome: string; cidade: string; estado: string };

export function TransferirFranquiaDialog({
  clienteId,
  franquiaAtualId,
  franquias,
}: {
  clienteId: string;
  franquiaAtualId?: string;
  franquias: Franquia[];
}) {
  const [open, setOpen] = useState(false);
  const { state, pending, submit } = useServerAction(transferirFranquia, () => setOpen(false));

  const opcoes = franquias.filter((f) => f.id !== franquiaAtualId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ArrowLeftRight className="mr-1 h-4 w-4" /> Transferir franquia
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transferir cliente de franquia</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(new FormData(e.currentTarget));
          }}
          className="space-y-4"
        >
          <input type="hidden" name="clienteId" value={clienteId} />
          <div className="space-y-2">
            <Label htmlFor="novaFranquiaId">Nova franquia</Label>
            <Select name="novaFranquiaId">
              <SelectTrigger id="novaFranquiaId" className="w-full">
                <SelectValue placeholder="Selecione a franquia de destino" />
              </SelectTrigger>
              <SelectContent>
                {opcoes.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nome} ({f.cidade}/{f.estado})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {state?.fieldErrors?.novaFranquiaId && (
              <p className="text-sm text-destructive">{state.fieldErrors.novaFranquiaId[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="observacao">Observação (opcional)</Label>
            <Textarea id="observacao" name="observacao" />
          </div>
          <DialogFooter>
            <SubmitButton pending={pending}>Confirmar transferência</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
