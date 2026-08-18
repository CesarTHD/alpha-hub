"use client";

import { useState } from "react";
import { Ban } from "lucide-react";
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
import { registrarEncerramento } from "@/lib/actions/lifecycle";
import { useServerAction } from "@/hooks/use-server-action";
import { toDateInputValue } from "@/lib/format";

export function EncerramentoDialog({ clienteId, contratoId }: { clienteId: string; contratoId: string }) {
  const [open, setOpen] = useState(false);
  const { state, pending, submit } = useServerAction(registrarEncerramento, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Ban className="mr-1 h-4 w-4" /> Encerrar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Encerrar contrato</DialogTitle>
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
          <p className="text-sm text-muted-foreground">
            Marca o contrato como encerrado. O cliente ainda pode renovar depois, se necessário.
          </p>
          <div className="space-y-2">
            <Label htmlFor="dataFim">Data de encerramento</Label>
            <Input
              id="dataFim"
              name="dataFim"
              type="date"
              defaultValue={toDateInputValue(new Date())}
              required
            />
            {state?.fieldErrors?.dataFim && (
              <p className="text-sm text-destructive">{state.fieldErrors.dataFim[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo (opcional)</Label>
            <Textarea id="motivo" name="motivo" placeholder="Motivo do encerramento" />
          </div>
          <DialogFooter>
            <SubmitButton pending={pending}>Confirmar encerramento</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
