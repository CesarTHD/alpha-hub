"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { normalizeD4SignLink } from "@/lib/d4sign/link";
import type { ContratoExtraido } from "@/lib/ai/contrato-extraction";
import type { ImportContratoState } from "@/lib/actions/import-contrato-state";

type ImportAction = (prev: ImportContratoState, formData: FormData) => Promise<ImportContratoState>;

/**
 * Componente único de importação de contrato — por link/UUID do D4Sign ou por
 * upload de PDF — usado tanto no cadastro de novo cliente quanto na edição de
 * dados cadastrais. Cada tela passa suas próprias actions (a permissão e o
 * escopo de acesso diferem entre criar e editar).
 */
export function ImportarContrato({
  onImported,
  importarPorLink,
  importarPorPdf,
  linkValue,
  onLinkChange,
  linkFieldName,
}: {
  onImported: (data: ContratoExtraido, linkContratoD4Sign: string | null) => void;
  importarPorLink: ImportAction;
  importarPorPdf: ImportAction;
  /** Controla o input de link/UUID de fora — use quando esse mesmo valor também for salvo no formulário. */
  linkValue?: string;
  onLinkChange?: (value: string) => void;
  /** `name` do input de link, para submetê-lo junto com o formulário (quando controlado de fora). */
  linkFieldName?: string;
}) {
  const [linkInterno, setLinkInterno] = useState("");
  const link = linkValue ?? linkInterno;
  const setLink = onLinkChange ?? setLinkInterno;
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkPending, startLinkTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfPending, startPdfTransition] = useTransition();

  function handleImportarLink() {
    setLinkError(null);
    const formData = new FormData();
    formData.set("documentoD4Sign", link);

    startLinkTransition(async () => {
      const result = await importarPorLink(null, formData);
      if (result?.ok && result.data) {
        toast.success(result.message ?? "Contrato importado.");
        onImported(result.data, normalizeD4SignLink(link));
      } else {
        const msg = result?.message ?? "Não foi possível importar o contrato.";
        setLinkError(msg);
        toast.error(msg);
      }
    });
  }

  function handleImportarPdf() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setPdfError(null);
    const formData = new FormData();
    formData.set("arquivoContrato", file);

    startPdfTransition(async () => {
      const result = await importarPorPdf(null, formData);
      if (result?.ok && result.data) {
        toast.success(result.message ?? "Contrato importado.");
        onImported(result.data, null);
        setFileName(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        const msg = result?.message ?? "Não foi possível importar o contrato.";
        setPdfError(msg);
        toast.error(msg);
      }
    });
  }

  return (
    <Tabs defaultValue="link">
      <TabsList>
        <TabsTrigger value="link">Link ou UUID (D4Sign)</TabsTrigger>
        <TabsTrigger value="pdf">Upload de PDF</TabsTrigger>
      </TabsList>
      <TabsContent value="link" className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-start">
        <div className="flex-1 space-y-2">
          <Input
            name={linkFieldName}
            placeholder="Link ou UUID do documento no D4Sign"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            disabled={linkPending}
          />
          {linkError && <p className="text-sm text-destructive">{linkError}</p>}
        </div>
        <Button type="button" onClick={handleImportarLink} disabled={linkPending || !link.trim()}>
          {linkPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {linkPending ? "Importando..." : "Importar"}
        </Button>
      </TabsContent>
      <TabsContent value="pdf" className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-start">
        <div className="flex-1 space-y-2">
          <Input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            disabled={pdfPending}
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
          {pdfError && <p className="text-sm text-destructive">{pdfError}</p>}
        </div>
        <Button type="button" onClick={handleImportarPdf} disabled={pdfPending || !fileName}>
          {pdfPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {pdfPending ? "Importando..." : "Importar"}
        </Button>
      </TabsContent>
    </Tabs>
  );
}
