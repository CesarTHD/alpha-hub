"use client";

import { useState } from "react";
import { ImportarContratoD4Sign } from "./importar-contrato-d4sign";
import { ImportarContratoPdf } from "./importar-contrato-pdf";
import { NovoClienteForm } from "./novo-cliente-form";
import type { ContratoExtraido } from "@/lib/ai/contrato-extraction";

type Franquia = { id: string; nome: string; cidade: string; estado: string };

export function NovoClienteContainer({ franquias }: { franquias: Franquia[] }) {
  const [importedData, setImportedData] = useState<ContratoExtraido | null>(null);
  const [importCount, setImportCount] = useState(0);

  function handleImported(data: ContratoExtraido) {
    setImportedData(data);
    setImportCount((c) => c + 1);
  }

  const infoAdicional = [
    importedData?.formaPagamento && `forma de pagamento: ${importedData.formaPagamento}`,
    importedData?.duracaoMeses && `duração: ${importedData.duracaoMeses} meses`,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <ImportarContratoD4Sign onImported={handleImported} />
        <ImportarContratoPdf onImported={handleImported} />
      </div>
      {infoAdicional.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Identificado no contrato (não preenchido automaticamente): {infoAdicional.join(" · ")}
        </p>
      )}
      <NovoClienteForm key={importCount} franquias={franquias} initialData={importedData} />
    </div>
  );
}
