"use client";

import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
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
import { SubmitButton } from "@/components/submit-button";
import { registrarObservacao } from "@/lib/actions/lifecycle";
import { useServerAction } from "@/hooks/use-server-action";

export function ObservacaoDialog({ clienteId, contratoId }: { clienteId: string; contratoId?: string }) {
  const [open, setOpen] = useState(false);
  const { state, pending, submit } = useServerAction(registrarObservacao, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <MessageSquarePlus className="mr-1 h-4 w-4" /> Registrar observação
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar observação</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(new FormData(e.currentTarget));
          }}
          className="space-y-4"
        >
          <input type="hidden" name="clienteId" value={clienteId} />
          {contratoId && <input type="hidden" name="contratoId" value={contratoId} />}
          <div className="space-y-2">
            <Label htmlFor="observacao">Observação</Label>
            <Textarea id="observacao" name="observacao" required />
            {state?.fieldErrors?.observacao && (
              <p className="text-sm text-destructive">{state.fieldErrors.observacao[0]}</p>
            )}
          </div>
          <DialogFooter>
            <SubmitButton pending={pending}>Salvar observação</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
