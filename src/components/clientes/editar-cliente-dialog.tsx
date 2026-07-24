"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
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
import { updateClienteDados } from "@/lib/actions/clientes";
import { useServerAction } from "@/hooks/use-server-action";

type Cliente = {
  id: string;
  nome: string;
  documento: string;
  email: string | null;
  telefone: string | null;
  segmento: string | null;
  observacoes: string | null;
};

export function EditarClienteDialog({ cliente }: { cliente: Cliente }) {
  const [open, setOpen] = useState(false);
  const action = updateClienteDados.bind(null, cliente.id);
  const { state, pending, submit } = useServerAction(action, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Editar dados do cliente">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar dados do cliente</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(new FormData(e.currentTarget));
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="nome">Nome / Razão social</Label>
            <Input id="nome" name="nome" defaultValue={cliente.nome} required />
            {state?.fieldErrors?.nome && (
              <p className="text-sm text-destructive">{state.fieldErrors.nome[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="documento">CPF/CNPJ</Label>
            <Input id="documento" name="documento" defaultValue={cliente.documento} required />
            {state?.fieldErrors?.documento && (
              <p className="text-sm text-destructive">{state.fieldErrors.documento[0]}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" defaultValue={cliente.email ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" name="telefone" defaultValue={cliente.telefone ?? ""} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="segmento">Segmento</Label>
            <Input id="segmento" name="segmento" defaultValue={cliente.segmento ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea id="observacoes" name="observacoes" defaultValue={cliente.observacoes ?? ""} />
          </div>
          <DialogFooter>
            <SubmitButton pending={pending}>Salvar alterações</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
