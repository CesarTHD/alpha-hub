"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { importarContratoPdf } from "@/lib/actions/importar-contrato-pdf";
import type { ContratoExtraido } from "@/lib/ai/contrato-extraction";

export function ImportarContratoPdf({
  onImported,
}: {
  onImported: (data: ContratoExtraido) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleImport() {
    const file = inputRef.current?.files?.[0];
    if (!file) return;

    setError(null);
    const formData = new FormData();
    formData.set("arquivoContrato", file);

    startTransition(async () => {
      const result = await importarContratoPdf(null, formData);
      if (result?.ok && result.data) {
        toast.success(result.message ?? "Contrato importado.");
        onImported(result.data);
        setFileName(null);
        if (inputRef.current) inputRef.current.value = "";
      } else {
        const msg = result?.message ?? "Não foi possível importar o contrato.";
        setError(msg);
        toast.error(msg);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importar contrato (upload de PDF)</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex-1 space-y-2">
          <Input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            disabled={pending}
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <Button type="button" onClick={handleImport} disabled={pending || !fileName}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {pending ? "Importando..." : "Importar"}
        </Button>
      </CardContent>
    </Card>
  );
}
