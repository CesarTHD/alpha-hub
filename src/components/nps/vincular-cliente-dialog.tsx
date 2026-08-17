"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  buscarClientesParaVinculo,
  vincularClienteNps,
  type ClienteParaVinculo,
} from "@/lib/actions/nps";

export function VincularClienteDialog({
  respostaId,
  clienteAtual,
}: {
  respostaId: string;
  clienteAtual: { id: string; nome: string } | null;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<ClienteParaVinculo[]>([]);
  const [selecionado, setSelecionado] = useState<ClienteParaVinculo | null>(null);
  const [buscou, setBuscou] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleBuscar() {
    startTransition(async () => {
      setResultados(await buscarClientesParaVinculo(query));
      setBuscou(true);
    });
  }

  function handleConfirmar(clienteId: string | null) {
    startTransition(async () => {
      const result = await vincularClienteNps(respostaId, clienteId);
      if (result.ok) {
        toast.success(result.message ?? "Feito.");
        setOpen(false);
        setSelecionado(null);
        setResultados([]);
        setQuery("");
        setBuscou(false);
      } else {
        toast.error(result.message ?? "Erro ao vincular.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={clienteAtual ? "outline" : "secondary"} size="sm">
          {clienteAtual ? "Alterar vínculo" : "Vincular cliente"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vincular resposta a um cliente</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {clienteAtual && (
            <p className="text-sm text-muted-foreground">
              Atualmente vinculado a{" "}
              <span className="font-medium text-foreground">{clienteAtual.nome}</span>.
            </p>
          )}

          <div className="flex gap-2">
            <Input
              placeholder="Buscar por nome ou documento"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleBuscar();
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleBuscar}
              disabled={pending || query.trim().length < 2}
            >
              Buscar
            </Button>
          </div>

          <div className="max-h-64 space-y-1 overflow-y-auto">
            {resultados.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelecionado(c)}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                  selecionado?.id === c.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-muted"
                }`}
              >
                <p className="font-medium">{c.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {c.documento} · {c.franquiaAtualNome ?? "sem franquia atual"}
                </p>
              </button>
            ))}
            {buscou && resultados.length === 0 && !pending && (
              <p className="text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {clienteAtual && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleConfirmar(null)}
              disabled={pending}
            >
              Desvincular
            </Button>
          )}
          <Button
            type="button"
            onClick={() => selecionado && handleConfirmar(selecionado.id)}
            disabled={pending || !selecionado}
          >
            Confirmar vínculo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
