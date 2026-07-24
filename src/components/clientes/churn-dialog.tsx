"use client";

import { useState } from "react";
import { UserX } from "lucide-react";
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
import { registrarChurn } from "@/lib/actions/lifecycle";
import { useServerAction } from "@/hooks/use-server-action";

export function ChurnDialog({ clienteId, contratoId }: { clienteId: string; contratoId: string }) {
  const [open, setOpen] = useState(false);
  const { state, pending, submit } = useServerAction(registrarChurn, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive">
          <UserX className="mr-1 h-4 w-4" /> Registrar churn
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar churn</DialogTitle>
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
            <Label htmlFor="dataSaida">Data de saída</Label>
            <Input id="dataSaida" name="dataSaida" type="date" required />
            {state?.fieldErrors?.dataSaida && (
              <p className="text-sm text-destructive">{state.fieldErrors.dataSaida[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo</Label>
            <Textarea id="motivo" name="motivo" placeholder="Motivo do cancelamento" />
          </div>
          <DialogFooter>
            <SubmitButton variant="destructive" pending={pending}>
              Confirmar churn
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
