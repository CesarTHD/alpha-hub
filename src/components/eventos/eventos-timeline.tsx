import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { tipoEventoLabel, tipoEventoBadgeVariant } from "@/lib/evento-labels";

type EventoItem = {
  id: string;
  tipoEvento: string;
  dataEvento: Date;
  motivo: string | null;
  observacao: string | null;
  usuarioResponsavel: { nome: string };
  contrato?: { plano: string } | null;
};

export function EventosTimeline({ eventos }: { eventos: EventoItem[] }) {
  if (eventos.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Nenhum evento registrado ainda.</p>;
  }

  return (
    <ol className="space-y-4">
      {eventos.map((e) => (
        <li key={e.id} className="flex gap-3 border-l-2 border-border pl-4">
          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={tipoEventoBadgeVariant[e.tipoEvento] ?? "secondary"}>
                {tipoEventoLabel[e.tipoEvento] ?? e.tipoEvento}
              </Badge>
              <span className="text-xs text-muted-foreground">{formatDateTime(e.dataEvento)}</span>
              {e.contrato && (
                <span className="text-xs text-muted-foreground">· contrato: {e.contrato.plano}</span>
              )}
            </div>
            {e.motivo && <p className="text-sm">{e.motivo}</p>}
            {e.observacao && <p className="text-sm text-muted-foreground">{e.observacao}</p>}
            <p className="text-xs text-muted-foreground">por {e.usuarioResponsavel.nome}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
