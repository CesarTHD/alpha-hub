import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { brl } from "@/lib/dashboard-analytics/agregacoes/shared";
import type { DadoRow } from "@/lib/dashboard-analytics/agregacoes/dados";

const dataStr = (d: Date | null) => (d ? d.toLocaleDateString("pt-BR") : "—");

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border p-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{valor}</span>
    </div>
  );
}

export function DadosRowDetailSheet({ linha, onOpenChange }: { linha: DadoRow | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={linha !== null} onOpenChange={onOpenChange}>
      <SheetContent>
        {linha && (
          <>
            <SheetHeader>
              <SheetTitle>{linha.cliente}</SheetTitle>
              <SheetDescription>Detalhe do contrato</SheetDescription>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-2 px-4 pb-4">
              <Campo label="Franquia" valor={linha.franquia} />
              <Campo label="Cidade/UF" valor={`${linha.cidade}/${linha.uf}`} />
              <Campo label="Plano" valor={linha.plano} />
              <Campo label="Status" valor={linha.status} />
              <Campo label="Tipo de Contrato" valor={linha.tipoContrato} />
              <Campo label="MRR" valor={brl(linha.mrr)} />
              <Campo label="TCV" valor={brl(linha.tcv)} />
              <Campo label="Lifetime" valor={`${linha.lifetimeMeses.toFixed(1)} meses`} />
              <Campo label="Início" valor={dataStr(linha.inicio)} />
              <Campo label="Vencimento" valor={dataStr(linha.vencimento)} />
              <Campo label="Data de Saída" valor={dataStr(linha.dataSaida)} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
