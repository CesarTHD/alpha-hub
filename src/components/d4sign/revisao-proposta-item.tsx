"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { normalizarDocumento } from "@/lib/cnpj";
import { buildD4SignViewLink, extractD4SignUuid } from "@/lib/d4sign/link";
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
  uuidDocumento: string;
};

type CamposForm = {
  documento: string;
  email: string;
  telefone: string;
  cidade: string;
  estado: string;
  segmento: string;
};

const SEGMENTO_OUTRO = "__outro__";

export function RevisaoPropostaItem({
  proposta,
  segmentoOptions,
}: {
  proposta: Proposta;
  segmentoOptions: string[];
}) {
  const [linkDocumento, setLinkDocumento] = useState(buildD4SignViewLink(proposta.uuidDocumento));
  const [analise, setAnalise] = useState<AnaliseProposta | null>(null);
  const [campos, setCampos] = useState<CamposForm | null>(null);
  const [segmentoOutro, setSegmentoOutro] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resolvido, setResolvido] = useState(false);
  const [pending, startTransition] = useTransition();

  const uuidValido = extractD4SignUuid(linkDocumento);

  function handleAnalisar() {
    setErro(null);
    startTransition(async () => {
      const result = await analisarPropostaD4Sign(proposta.id, linkDocumento);
      if (result.ok) {
        const { extraido, atual } = result.data;
        const segmentoAtual = atual.segmento ?? "";
        setAnalise(result.data);
        setCampos({
          documento: extraido.documento ? normalizarDocumento(extraido.documento).documento : atual.documento,
          email: extraido.email ?? atual.email ?? "",
          telefone: extraido.telefone ?? atual.telefone ?? "",
          cidade: extraido.cidade ?? atual.cidade ?? "",
          estado: (extraido.estado ? extraido.estado.slice(0, 2).toUpperCase() : atual.estado) ?? "",
          segmento: segmentoAtual,
        });
        setSegmentoOutro(segmentoAtual !== "" && !segmentoOptions.includes(segmentoAtual));
      } else {
        setAnalise(null);
        setCampos(null);
        setErro(result.message);
      }
    });
  }

  function handleAplicar() {
    if (!campos || !analise) return;
    startTransition(async () => {
      const result = await aplicarPropostaD4Sign(proposta.id, analise.uuidDocumento, campos);
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
          <p className="text-sm text-muted-foreground">Candidato original (match automático): {proposta.nomeDocumento}</p>
        </div>
        <Badge variant={proposta.confianca === "ALTA" ? "default" : "outline"}>
          Confiança {proposta.confianca === "ALTA" ? "alta" : "média"}
        </Badge>
      </div>

      <div className="space-y-1">
        <Label htmlFor={`link-${proposta.id}`}>Link ou UUID do documento no D4Sign</Label>
        <div className="flex gap-2">
          <Input
            id={`link-${proposta.id}`}
            value={linkDocumento}
            onChange={(e) => setLinkDocumento(e.target.value)}
            disabled={pending}
          />
          {uuidValido && (
            <Button asChild variant="outline" size="sm">
              <a href={buildD4SignViewLink(uuidValido)} target="_blank" rel="noopener noreferrer">
                Ver
              </a>
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Errou o candidato? Cole aqui o link/UUID certo e busque de novo antes de aplicar.
        </p>
      </div>

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={handleAnalisar} disabled={pending || !uuidValido}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {pending ? "Buscando..." : campos ? "Buscar novamente" : "Buscar e comparar dados"}
        </Button>
        {!campos && (
          <Button size="sm" variant="ghost" onClick={handleRejeitar} disabled={pending}>
            Rejeitar sem analisar
          </Button>
        )}
      </div>

      {campos && analise && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Dados vindos do contrato assinado — revise e ajuste o que precisar antes de aplicar.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor={`documento-${proposta.id}`}>CPF/CNPJ</Label>
              <Input
                id={`documento-${proposta.id}`}
                value={campos.documento}
                onChange={(e) => setCampos({ ...campos, documento: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`email-${proposta.id}`}>E-mail</Label>
              <Input
                id={`email-${proposta.id}`}
                type="email"
                value={campos.email}
                onChange={(e) => setCampos({ ...campos, email: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`telefone-${proposta.id}`}>Telefone</Label>
              <Input
                id={`telefone-${proposta.id}`}
                value={campos.telefone}
                onChange={(e) => setCampos({ ...campos, telefone: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`segmento-${proposta.id}`}>Segmento</Label>
              <Select
                value={segmentoOutro ? SEGMENTO_OUTRO : campos.segmento || undefined}
                onValueChange={(valor) => {
                  if (valor === SEGMENTO_OUTRO) {
                    setSegmentoOutro(true);
                    setCampos({ ...campos, segmento: "" });
                  } else {
                    setSegmentoOutro(false);
                    setCampos({ ...campos, segmento: valor });
                  }
                }}
              >
                <SelectTrigger id={`segmento-${proposta.id}`} className="w-full">
                  <SelectValue placeholder="Selecione o segmento" />
                </SelectTrigger>
                <SelectContent>
                  {segmentoOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                  <SelectItem value={SEGMENTO_OUTRO}>Outro...</SelectItem>
                </SelectContent>
              </Select>
              {segmentoOutro && (
                <Input
                  placeholder="Digite o segmento"
                  value={campos.segmento}
                  onChange={(e) => setCampos({ ...campos, segmento: e.target.value })}
                  className="mt-1"
                />
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor={`cidade-${proposta.id}`}>Cidade</Label>
              <Input
                id={`cidade-${proposta.id}`}
                value={campos.cidade}
                onChange={(e) => setCampos({ ...campos, cidade: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`estado-${proposta.id}`}>Estado</Label>
              <Input
                id={`estado-${proposta.id}`}
                maxLength={2}
                placeholder="UF"
                value={campos.estado}
                onChange={(e) => setCampos({ ...campos, estado: e.target.value })}
              />
            </div>
          </div>

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
            <Button size="sm" onClick={handleAplicar} disabled={pending || !campos.documento.trim()}>
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
