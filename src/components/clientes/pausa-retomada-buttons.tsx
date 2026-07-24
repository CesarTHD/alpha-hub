"use client";

import { useState } from "react";
import { Pause, Play } from "lucide-react";
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
import { registrarPausa, registrarRetomada } from "@/lib/actions/lifecycle";
import { useServerAction } from "@/hooks/use-server-action";

export function PausaButton({ clienteId, contratoId }: { clienteId: string; contratoId: string }) {
  const [open, setOpen] = useState(false);
  const { pending, submit } = useServerAction(registrarPausa, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Pause className="mr-1 h-4 w-4" /> Pausar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pausar contrato</DialogTitle>
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
            <Label htmlFor="motivo">Motivo (opcional)</Label>
            <Textarea id="motivo" name="motivo" />
          </div>
          <DialogFooter>
            <SubmitButton pending={pending}>Confirmar pausa</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RetomadaButton({ clienteId, contratoId }: { clienteId: string; contratoId: string }) {
  const { pending, submit } = useServerAction(registrarRetomada);

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => {
        const formData = new FormData();
        formData.set("clienteId", clienteId);
        formData.set("contratoId", contratoId);
        submit(formData);
      }}
    >
      <Play className="mr-1 h-4 w-4" /> Retomar
    </Button>
  );
}
