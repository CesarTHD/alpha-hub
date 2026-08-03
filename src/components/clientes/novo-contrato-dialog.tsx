"use client";

import { useState } from "react";
import { PlusCircle } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";
import { criarNovoContrato } from "@/lib/actions/lifecycle";
import { useServerAction } from "@/hooks/use-server-action";

export function NovoContratoDialog({ clienteId }: { clienteId: string }) {
  const [open, setOpen] = useState(false);
  const { state, pending, submit } = useServerAction(criarNovoContrato, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PlusCircle className="mr-1 h-4 w-4" /> Novo contrato
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo contrato</DialogTitle>
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
            <Label htmlFor="novoContratoPlano">Plano</Label>
            <Input id="novoContratoPlano" name="plano" required />
            {state?.fieldErrors?.plano && (
              <p className="text-sm text-destructive">{state.fieldErrors.plano[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="novoContratoTipo">Tipo de contrato</Label>
            <Select name="tipoContrato" defaultValue="MENSAL">
              <SelectTrigger id="novoContratoTipo" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MENSAL">Mensal</SelectItem>
                <SelectItem value="TRIMESTRAL">Trimestral</SelectItem>
                <SelectItem value="QUADRIMESTRAL">Quadrimestral</SelectItem>
                <SelectItem value="SEMESTRAL">Semestral</SelectItem>
                <SelectItem value="ANUAL">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="novoContratoValorContrato">Valor total</Label>
              <Input id="novoContratoValorContrato" name="valorContrato" type="number" step="0.01" required />
              {state?.fieldErrors?.valorContrato && (
                <p className="text-sm text-destructive">{state.fieldErrors.valorContrato[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="novoContratoValorMensal">Valor mensal</Label>
              <Input id="novoContratoValorMensal" name="valorMensal" type="number" step="0.01" required />
              {state?.fieldErrors?.valorMensal && (
                <p className="text-sm text-destructive">{state.fieldErrors.valorMensal[0]}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="novoContratoInicio">Início do contrato</Label>
            <Input id="novoContratoInicio" name="inicioContrato" type="date" required />
            {state?.fieldErrors?.inicioContrato && (
              <p className="text-sm text-destructive">{state.fieldErrors.inicioContrato[0]}</p>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="renovacaoAutomatica" className="h-4 w-4" />
            Renovação automática
          </label>
          <DialogFooter>
            <SubmitButton pending={pending}>Criar contrato</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
