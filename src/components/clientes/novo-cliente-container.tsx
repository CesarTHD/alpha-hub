"use client";

import { useState } from "react";
import { ImportarContratoD4Sign } from "./importar-contrato-d4sign";
import { NovoClienteForm } from "./novo-cliente-form";
import type { ContratoExtraido } from "@/lib/ai/contrato-extraction";

type Franquia = { id: string; nome: string; cidade: string; estado: string };

export function NovoClienteContainer({ franquias }: { franquias: Franquia[] }) {
  const [importedData, setImportedData] = useState<ContratoExtraido | null>(null);
  const [importCount, setImportCount] = useState(0);

  const infoAdicional = [
    importedData?.formaPagamento && `forma de pagamento: ${importedData.formaPagamento}`,
    importedData?.duracaoMeses && `duração: ${importedData.duracaoMeses} meses`,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <ImportarContratoD4Sign
        onImported={(data) => {
          setImportedData(data);
          setImportCount((c) => c + 1);
        }}
      />
      {infoAdicional.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Identificado no contrato (não preenchido automaticamente): {infoAdicional.join(" · ")}
        </p>
      )}
      <NovoClienteForm key={importCount} franquias={franquias} initialData={importedData} />
    </div>
  );
}
