"use client";

import { useState, useTransition } from "react";
import { Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
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
import { importarDadosClienteD4Sign } from "@/lib/actions/importar-contrato-d4sign";
import { useServerAction } from "@/hooks/use-server-action";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ContratoExtraido } from "@/lib/ai/contrato-extraction";

type Cliente = {
  id: string;
  nome: string;
  documento: string;
  email: string | null;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  segmento: string | null;
  observacoes: string | null;
};

type ContratoAtual = {
  plano: string;
  tipoContrato: string;
  valorContrato: string;
  valorMensal: string;
  inicioContrato: string;
  renovacaoAutomatica: boolean;
};

type Inconsistencia = { campo: string; cadastrado: string; contrato: string };

const VALOR_MENSAL_DIVISOR: Record<string, number> = {
  MENSAL: 1,
  TRIMESTRAL: 3,
  QUADRIMESTRAL: 4,
  SEMESTRAL: 6,
  ANUAL: 12,
};

function valoresDiferem(a: number, b: number) {
  return Math.abs(a - b) > 0.01;
}

/** Compara o contrato extraído do D4Sign com o contrato ativo já cadastrado, sem alterar nada — só alerta. */
function compararContrato(extraido: ContratoExtraido, atual: ContratoAtual): Inconsistencia[] {
  const diffs: Inconsistencia[] = [];

  if (extraido.plano && extraido.plano.trim().toLowerCase() !== atual.plano.trim().toLowerCase()) {
    diffs.push({ campo: "Plano", cadastrado: atual.plano, contrato: extraido.plano });
  }
  if (extraido.tipoContrato && extraido.tipoContrato !== atual.tipoContrato) {
    diffs.push({ campo: "Tipo de contrato", cadastrado: atual.tipoContrato, contrato: extraido.tipoContrato });
  }
  if (extraido.valorContrato != null && valoresDiferem(extraido.valorContrato, Number(atual.valorContrato))) {
    diffs.push({
      campo: "Valor do contrato",
      cadastrado: formatCurrency(atual.valorContrato),
      contrato: formatCurrency(extraido.valorContrato),
    });
  }
  const divisor = VALOR_MENSAL_DIVISOR[extraido.tipoContrato ?? atual.tipoContrato];
  if (extraido.valorContrato != null && divisor) {
    const valorMensalExtraido = extraido.valorContrato / divisor;
    if (valoresDiferem(valorMensalExtraido, Number(atual.valorMensal))) {
      diffs.push({
        campo: "Valor mensal",
        cadastrado: formatCurrency(atual.valorMensal),
        contrato: formatCurrency(valorMensalExtraido),
      });
    }
  }
  if (extraido.inicioContrato && extraido.inicioContrato.slice(0, 10) !== atual.inicioContrato.slice(0, 10)) {
    diffs.push({
      campo: "Início do contrato",
      cadastrado: formatDate(atual.inicioContrato),
      contrato: formatDate(extraido.inicioContrato),
    });
  }
  if (extraido.renovacaoAutomatica != null && extraido.renovacaoAutomatica !== atual.renovacaoAutomatica) {
    diffs.push({
      campo: "Renovação automática",
      cadastrado: atual.renovacaoAutomatica ? "Sim" : "Não",
      contrato: extraido.renovacaoAutomatica ? "Sim" : "Não",
    });
  }

  return diffs;
}

export function EditarClienteDialog({
  cliente,
  contratoAtual,
}: {
  cliente: Cliente;
  contratoAtual?: ContratoAtual;
}) {
  const [open, setOpen] = useState(false);
  const action = updateClienteDados.bind(null, cliente.id);
  const { state, pending, submit } = useServerAction(action, () => setOpen(false));

  const [documento, setDocumento] = useState(cliente.documento);
  const [email, setEmail] = useState(cliente.email ?? "");
  const [telefone, setTelefone] = useState(cliente.telefone ?? "");
  const [cidade, setCidade] = useState(cliente.cidade ?? "");
  const [estado, setEstado] = useState(cliente.estado ?? "");

  const [d4signLink, setD4signLink] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [inconsistencias, setInconsistencias] = useState<Inconsistencia[]>([]);
  const [importing, startImportTransition] = useTransition();

  function handleImportarD4Sign() {
    setImportError(null);
    setInconsistencias([]);
    const formData = new FormData();
    formData.set("documentoD4Sign", d4signLink);

    startImportTransition(async () => {
      const result = await importarDadosClienteD4Sign(cliente.id, null, formData);
      if (result?.ok && result.data) {
        const { documento: doc, email: e, telefone: t, cidade: c, estado: uf } = result.data;
        if (doc) setDocumento(doc);
        if (e) setEmail(e);
        if (t) setTelefone(t);
        if (c) setCidade(c);
        if (uf) setEstado(uf.slice(0, 2).toUpperCase());
        if (contratoAtual) {
          setInconsistencias(compararContrato(result.data, contratoAtual));
        }
        toast.success(result.message ?? "Dados importados do D4Sign.");
        setD4signLink("");
      } else {
        const msg = result?.message ?? "Não foi possível importar os dados.";
        setImportError(msg);
        toast.error(msg);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Editar dados do cliente">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar dados do cliente</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(new FormData(e.currentTarget));
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-0.5 py-1">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome / Razão social</Label>
              <Input id="nome" name="nome" defaultValue={cliente.nome} required />
              {state?.fieldErrors?.nome && (
                <p className="text-sm text-destructive">{state.fieldErrors.nome[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="documento">CPF/CNPJ</Label>
              <Input
                id="documento"
                name="documento"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                required
              />
              {state?.fieldErrors?.documento && (
                <p className="text-sm text-destructive">{state.fieldErrors.documento[0]}</p>
              )}
            </div>

            <div className="space-y-2 rounded-lg bg-muted/40 p-3">
              <Label htmlFor="d4signLink">Importar do D4Sign </Label>
              <div className="flex gap-2">
                <Input
                  id="d4signLink"
                  placeholder="Link ou UUID do documento no D4Sign"
                  value={d4signLink}
                  onChange={(e) => setD4signLink(e.target.value)}
                  disabled={importing}
                  className="bg-background"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleImportarD4Sign}
                  disabled={importing || !d4signLink.trim()}
                >
                  {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {importing ? "Importando..." : "Importar"}
                </Button>
              </div>
              {importError && <p className="text-sm text-destructive">{importError}</p>}
              <p className="text-xs text-muted-foreground">
                Preenche CPF/CNPJ, e-mail, telefone, cidade e estado a partir do contrato assinado.
              </p>
              {inconsistencias.length > 0 && (
                <div className="space-y-1 rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-sm">
                  <p className="font-medium text-destructive">
                    Dados do contrato assinado divergem do que está cadastrado na plataforma:
                  </p>
                  <ul className="list-disc space-y-0.5 pl-4">
                    {inconsistencias.map((i) => (
                      <li key={i.campo}>
                        <span className="font-medium">{i.campo}:</span> cadastrado{" "}
                        <strong>{i.cadastrado}</strong>, no contrato assinado <strong>{i.contrato}</strong>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground">
                    Isso não altera o contrato automaticamente — revise e corrija pelas ações de contrato, se necessário.
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" name="telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input id="cidade" name="cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Input
                  id="estado"
                  name="estado"
                  maxLength={2}
                  placeholder="UF"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                />
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
          </div>
          <DialogFooter>
            <SubmitButton pending={pending}>Salvar alterações</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
