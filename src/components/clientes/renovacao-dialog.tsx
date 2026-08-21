"use client";

import { useState, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";
import { registrarRenovacao } from "@/lib/actions/lifecycle";
import { useServerAction } from "@/hooks/use-server-action";

type Contrato = {
  id: string;
  plano: string;
  tipoContrato: string;
  valorContrato: string;
  valorMensal: string;
  renovacaoAutomatica: boolean;
};

export function RenovacaoDialog({
  clienteId,
  contrato,
  trigger,
}: {
  clienteId: string;
  contrato: Contrato;
  /** Trigger customizado (ex.: nome do cliente numa tabela) — por padrão,
   *  o botão "Registrar renovação" usado na página de detalhe do cliente. */
  trigger?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { pending, submit } = useServerAction(registrarRenovacao, () => setOpen(false));
  const [valorContrato, setValorContrato] = useState(contrato.valorContrato);
  const [tipoContrato, setTipoContrato] = useState(contrato.tipoContrato);

  const valor = parseFloat(valorContrato);
  const valorMensal = !isNaN(valor)
    ? ({
        MENSAL: valor,
        TRIMESTRAL: valor / 3,
        QUADRIMESTRAL: valor / 4,
        SEMESTRAL: valor / 6,
        ANUAL: valor / 12,
      }[tipoContrato] ?? 0)
    : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <RefreshCw className="mr-1 h-4 w-4" /> Registrar renovação
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar renovação</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(new FormData(e.currentTarget));
          }}
          className="space-y-4"
        >
          <input type="hidden" name="clienteId" value={clienteId} />
          <input type="hidden" name="contratoAnteriorId" value={contrato.id} />
          <div className="space-y-2">
            <Label htmlFor="plano">Plano</Label>
            <Input id="plano" name="plano" defaultValue={contrato.plano} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tipoContrato">Tipo de contrato</Label>
            <Select name="tipoContrato" defaultValue={tipoContrato} onValueChange={setTipoContrato}>
              <SelectTrigger id="tipoContrato" className="w-full">
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
              <Label htmlFor="valorContrato">Valor total</Label>
              <Input
                id="valorContrato"
                name="valorContrato"
                type="number"
                step="0.01"
                value={valorContrato}
                onChange={(e) => setValorContrato(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valorMensal">Valor mensal</Label>
              <Input
                id="valorMensal"
                name="valorMensal"
                type="number"
                step="0.01"
                value={valorMensal}
                readOnly
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="inicioContrato">Início da renovação</Label>
            <Input id="inicioContrato" name="inicioContrato" type="date" required />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="renovacaoAutomatica"
              defaultChecked={contrato.renovacaoAutomatica}
              className="h-4 w-4"
            />
            Renovação automática
          </label>
          <div className="space-y-2">
            <Label htmlFor="observacao">Observação (opcional)</Label>
            <Textarea id="observacao" name="observacao" />
          </div>
          <DialogFooter>
            <SubmitButton pending={pending}>Confirmar renovação</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
