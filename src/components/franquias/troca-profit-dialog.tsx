"use client";

import { useState } from "react";
import { UserCog } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SubmitButton } from "@/components/submit-button";
import { trocarProfitResponsavel } from "@/lib/actions/franquia-profit";
import { useServerAction } from "@/hooks/use-server-action";

type Profit = { id: string; nome: string };

export function TrocaProfitDialog({
  franquiaId,
  franquiaNome,
  profitAtualId,
  profits,
}: {
  franquiaId: string;
  franquiaNome: string;
  profitAtualId?: string;
  profits: Profit[];
}) {
  const [open, setOpen] = useState(false);
  const { state, pending, submit } = useServerAction(trocarProfitResponsavel, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Trocar Profit responsável">
              <UserCog className="h-4 w-4" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Trocar Profit responsável</TooltipContent>
      </Tooltip>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Trocar Profit responsável — {franquiaNome}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(new FormData(e.currentTarget));
          }}
          className="space-y-4"
        >
          <input type="hidden" name="franquiaId" value={franquiaId} />
          <div className="space-y-2">
            <Label htmlFor="profitId">Novo Profit responsável</Label>
            <Select name="profitId" defaultValue={profitAtualId}>
              <SelectTrigger id="profitId" className="w-full">
                <SelectValue placeholder="Selecione um Profit" />
              </SelectTrigger>
              <SelectContent>
                {profits.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {state?.fieldErrors?.profitId && (
              <p className="text-sm text-destructive">{state.fieldErrors.profitId[0]}</p>
            )}
          </div>
          <DialogFooter>
            <SubmitButton pending={pending}>Confirmar troca</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
