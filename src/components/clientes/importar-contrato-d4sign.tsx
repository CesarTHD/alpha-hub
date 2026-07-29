"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { importarContratoD4Sign } from "@/lib/actions/importar-contrato-d4sign";
import type { ContratoExtraido } from "@/lib/ai/contrato-extraction";

export function ImportarContratoD4Sign({
  onImported,
}: {
  onImported: (data: ContratoExtraido) => void;
}) {
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleImport() {
    setError(null);
    const formData = new FormData();
    formData.set("documentoD4Sign", link);

    startTransition(async () => {
      const result = await importarContratoD4Sign(null, formData);
      if (result?.ok && result.data) {
        toast.success(result.message ?? "Contrato importado.");
        onImported(result.data);
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
        <CardTitle>Importar contrato D4Sign</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex-1 space-y-2">
          <Input
            placeholder="Link ou UUID do documento no D4Sign"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            disabled={pending}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <Button type="button" onClick={handleImport} disabled={pending || !link.trim()}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {pending ? "Importando..." : "Importar"}
        </Button>
      </CardContent>
    </Card>
  );
}
