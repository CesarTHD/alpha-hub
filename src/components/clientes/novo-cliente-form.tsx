"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { createClienteComContrato } from "@/lib/actions/clientes";
import { initialActionState } from "@/lib/actions/action-state";

type Franquia = { id: string; nome: string; cidade: string; estado: string };

export function NovoClienteForm({ franquias }: { franquias: Franquia[] }) {
  const [state, formAction] = useActionState(createClienteComContrato, initialActionState);

  useEffect(() => {
    if (state && !state.ok && state.message) {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Dados do cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome / Razão social</Label>
            <Input id="nome" name="nome" required />
            {state?.fieldErrors?.nome && (
              <p className="text-sm text-destructive">{state.fieldErrors.nome[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="documento">CPF/CNPJ</Label>
            <Input id="documento" name="documento" required />
            {state?.fieldErrors?.documento && (
              <p className="text-sm text-destructive">{state.fieldErrors.documento[0]}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" name="telefone" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="segmento">Segmento</Label>
            <Input id="segmento" name="segmento" placeholder="Ex.: Alimentação, Varejo..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="franquiaId">Franquia</Label>
            <Select name="franquiaId" required>
              <SelectTrigger id="franquiaId" className="w-full">
                <SelectValue placeholder="Selecione a franquia" />
              </SelectTrigger>
              <SelectContent>
                {franquias.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nome} ({f.cidade}/{f.estado})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {state?.fieldErrors?.franquiaId && (
              <p className="text-sm text-destructive">{state.fieldErrors.franquiaId[0]}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Primeiro contrato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="plano">Plano</Label>
            <Input id="plano" name="plano" required />
            {state?.fieldErrors?.plano && (
              <p className="text-sm text-destructive">{state.fieldErrors.plano[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tipoContrato">Tipo de contrato</Label>
            <Select name="tipoContrato" defaultValue="MENSAL">
              <SelectTrigger id="tipoContrato" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MENSAL">Mensal</SelectItem>
                <SelectItem value="TRIMESTRAL">Trimestral</SelectItem>
                <SelectItem value="SEMESTRAL">Semestral</SelectItem>
                <SelectItem value="ANUAL">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valorContrato">Valor total do contrato</Label>
              <Input id="valorContrato" name="valorContrato" type="number" step="0.01" required />
              {state?.fieldErrors?.valorContrato && (
                <p className="text-sm text-destructive">{state.fieldErrors.valorContrato[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="valorMensal">Valor mensal (MRR)</Label>
              <Input id="valorMensal" name="valorMensal" type="number" step="0.01" required />
              {state?.fieldErrors?.valorMensal && (
                <p className="text-sm text-destructive">{state.fieldErrors.valorMensal[0]}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="inicioContrato">Início do contrato</Label>
            <Input id="inicioContrato" name="inicioContrato" type="date" required />
            {state?.fieldErrors?.inicioContrato && (
              <p className="text-sm text-destructive">{state.fieldErrors.inicioContrato[0]}</p>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="renovacaoAutomatica" className="h-4 w-4" />
            Renovação automática
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <SubmitButton pendingLabel="Criando...">Criar cliente e contrato</SubmitButton>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
