"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportarContrato } from "./importar-contrato";
import { NovoClienteForm } from "./novo-cliente-form";
import { importarContratoD4Sign } from "@/lib/actions/importar-contrato-d4sign";
import { importarContratoPdf } from "@/lib/actions/importar-contrato-pdf";
import type { ContratoExtraido } from "@/lib/contrato-extracao";

type Franquia = { id: string; nome: string; cidade: string; estado: string };

export function NovoClienteContainer({ franquias }: { franquias: Franquia[] }) {
  const [importedData, setImportedData] = useState<ContratoExtraido | null>(null);
  const [linkContratoD4Sign, setLinkContratoD4Sign] = useState<string | null>(null);
  const [importCount, setImportCount] = useState(0);

  function handleImported(data: ContratoExtraido, link: string | null = null) {
    setImportedData(data);
    if (link) setLinkContratoD4Sign(link);
    setImportCount((c) => c + 1);
  }

  const infoAdicional = [
    importedData?.formaPagamento && `forma de pagamento: ${importedData.formaPagamento}`,
    importedData?.duracaoMeses && `duração: ${importedData.duracaoMeses} meses`,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Importar contrato</CardTitle>
        </CardHeader>
        <CardContent>
          <ImportarContrato
            onImported={handleImported}
            importarPorLink={importarContratoD4Sign}
            importarPorPdf={importarContratoPdf}
          />
        </CardContent>
      </Card>
      {infoAdicional.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Identificado no contrato (não preenchido automaticamente): {infoAdicional.join(" · ")}
        </p>
      )}
      <NovoClienteForm
        key={importCount}
        franquias={franquias}
        initialData={importedData}
        linkContratoD4Sign={linkContratoD4Sign}
      />
    </div>
  );
}
