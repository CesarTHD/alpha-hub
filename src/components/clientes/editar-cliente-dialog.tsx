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
import { importarDadosClienteD4Sign } from "@/lib/actions/importar-contrato-d4sign";
import { importarDadosClientePdf } from "@/lib/actions/importar-contrato-pdf";
import { ImportarContrato } from "./importar-contrato";
import { useServerAction } from "@/hooks/use-server-action";
import type { ContratoExtraido } from "@/lib/ai/contrato-extraction";
import { normalizeD4SignLink } from "@/lib/d4sign/link";
import { compararContrato, type ContratoAtual, type Inconsistencia } from "@/lib/contrato-comparacao";

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
  linkContratoD4Sign: string | null;
};

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
  const [linkContratoD4Sign, setLinkContratoD4Sign] = useState(cliente.linkContratoD4Sign ?? "");
  const [inconsistencias, setInconsistencias] = useState<Inconsistencia[]>([]);

  const importarPorLink = importarDadosClienteD4Sign.bind(null, cliente.id);
  const importarPorPdf = importarDadosClientePdf.bind(null, cliente.id);

  function handleContratoImportado(data: ContratoExtraido, link: string | null) {
    const { documento: doc, email: e, telefone: t, cidade: c, estado: uf } = data;
    if (doc) setDocumento(doc);
    if (e) setEmail(e);
    if (t) setTelefone(t);
    if (c) setCidade(c);
    if (uf) setEstado(uf.slice(0, 2).toUpperCase());
    if (link) {
      const linkNormalizado = normalizeD4SignLink(link);
      if (linkNormalizado) setLinkContratoD4Sign(linkNormalizado);
    }
    if (contratoAtual) {
      setInconsistencias(compararContrato(data, contratoAtual));
    }
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
              <Label>Importar contrato (opcional)</Label>
              {/* Input hidden sempre montado: a aba "link" do ImportarContrato desmonta
                  quando a aba "pdf" está ativa (Radix Tabs), então sem isso o valor
                  não seria enviado no submit se o usuário trocasse de aba antes de salvar. */}
              <input type="hidden" name="linkContratoD4Sign" value={linkContratoD4Sign} readOnly />
              <ImportarContrato
                onImported={handleContratoImportado}
                importarPorLink={importarPorLink}
                importarPorPdf={importarPorPdf}
                linkValue={linkContratoD4Sign}
                onLinkChange={setLinkContratoD4Sign}
              />
              {state?.fieldErrors?.linkContratoD4Sign && (
                <p className="text-sm text-destructive">{state.fieldErrors.linkContratoD4Sign[0]}</p>
              )}
              <p className="text-xs text-muted-foreground">
                O link/UUID fica salvo no cadastro. Importar (por link ou PDF) também preenche CPF/CNPJ,
                e-mail, telefone, cidade e estado a partir do contrato assinado.
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
