"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  analisarPropostaD4Sign,
  aplicarPropostaD4Sign,
  rejeitarPropostaD4Sign,
  type AnaliseProposta,
} from "@/lib/actions/d4sign-revisao";

type Proposta = {
  id: string;
  clienteId: string;
  clienteNome: string;
  nomeDocumento: string;
  confianca: string;
};

export function RevisaoPropostaItem({ proposta }: { proposta: Proposta }) {
  const [analise, setAnalise] = useState<AnaliseProposta | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [resolvido, setResolvido] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleAnalisar() {
    setErro(null);
    startTransition(async () => {
      const result = await analisarPropostaD4Sign(proposta.id);
      if (result.ok) setAnalise(result.data);
      else setErro(result.message);
    });
  }

  function handleAplicar() {
    if (!analise) return;
    startTransition(async () => {
      const result = await aplicarPropostaD4Sign(proposta.id, analise.extraido);
      if (result.ok) {
        toast.success(result.message ?? "Dados aplicados.");
        setResolvido(true);
      } else {
        toast.error(result.message ?? "Erro ao aplicar.");
      }
    });
  }

  function handleRejeitar() {
    startTransition(async () => {
      const result = await rejeitarPropostaD4Sign(proposta.id);
      if (result.ok) {
        toast.success(result.message ?? "Proposta rejeitada.");
        setResolvido(true);
      } else {
        toast.error(result.message ?? "Erro ao rejeitar.");
      }
    });
  }

  if (resolvido) return null;

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href={`/clientes/${proposta.clienteId}`} className="font-medium hover:underline" target="_blank">
            {proposta.clienteNome}
          </Link>
          <p className="text-sm text-muted-foreground">Candidato no D4Sign: {proposta.nomeDocumento}</p>
        </div>
        <Badge variant={proposta.confianca === "ALTA" ? "default" : "outline"}>
          Confiança {proposta.confianca === "ALTA" ? "alta" : "média"}
        </Badge>
      </div>

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      {!analise && (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={handleAnalisar} disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {pending ? "Buscando..." : "Buscar e comparar dados"}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleRejeitar} disabled={pending}>
            Rejeitar sem analisar
          </Button>
        </div>
      )}

      {analise && (
        <div className="space-y-3">
          {analise.diffCadastral.length === 0 && analise.diffContrato.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma divergência encontrada — os dados extraídos já batem com o cadastro.
            </p>
          )}

          {analise.diffCadastral.length > 0 && (
            <div className="space-y-1 text-sm">
              <p className="font-medium">Dados cadastrais propostos:</p>
              <ul className="list-disc space-y-0.5 pl-4">
                {analise.diffCadastral.map((d) => (
                  <li key={d.campo}>
                    <span className="font-medium">{d.campo}:</span> atual <strong>{d.cadastrado}</strong> → proposto{" "}
                    <strong>{d.contrato}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analise.diffContrato.length > 0 && (
            <div className="space-y-1 rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-sm">
              <p className="font-medium text-destructive">Divergências de contrato (não aplicado por aqui):</p>
              <ul className="list-disc space-y-0.5 pl-4">
                {analise.diffContrato.map((d) => (
                  <li key={d.campo}>
                    <span className="font-medium">{d.campo}:</span> cadastrado <strong>{d.cadastrado}</strong>, no
                    contrato <strong>{d.contrato}</strong>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                Corrija pelas ações de contrato na página do cliente (Alterar plano/valor), se necessário.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button size="sm" onClick={handleAplicar} disabled={pending}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {pending ? "Aplicando..." : "Aplicar dados cadastrais"}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleRejeitar} disabled={pending}>
              Rejeitar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
