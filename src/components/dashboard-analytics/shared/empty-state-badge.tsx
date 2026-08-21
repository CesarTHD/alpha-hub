import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Selo padrão para qualquer métrica que não pode ser calculada com segurança
 *  a partir dos dados atuais — nunca estimamos, apenas documentamos a lacuna. */
export function DadoIndisponivel({ motivo }: { motivo: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          <AlertCircle className="h-3 w-3" />
          Dado indisponível
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{motivo}</TooltipContent>
    </Tooltip>
  );
}
