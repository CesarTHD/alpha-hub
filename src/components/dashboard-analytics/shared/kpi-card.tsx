import * as React from "react";
import { TrendingUp, TrendingDown, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Tile de KPI padrão do Dashboard Analítico: valor, delta vs período
 *  anterior (quando disponível) e indicação visual positiva/negativa.
 *  `invertido` inverte a semântica de cor (ex.: churn subindo é ruim). */
export function KpiCard({
  titulo,
  valor,
  deltaPct,
  invertido = false,
  icon,
  hint,
}: {
  titulo: string;
  valor: string;
  deltaPct?: number | null;
  invertido?: boolean;
  icon?: React.ReactNode;
  hint?: string;
}) {
  const positivo = deltaPct !== undefined && deltaPct !== null && (invertido ? deltaPct < 0 : deltaPct > 0);
  const negativo = deltaPct !== undefined && deltaPct !== null && (invertido ? deltaPct > 0 : deltaPct < 0);

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            {icon}
            {titulo}
            {hint && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 shrink-0 opacity-60" />
                </TooltipTrigger>
                <TooltipContent>{hint}</TooltipContent>
              </Tooltip>
            )}
          </span>
        </div>
        <span className="font-heading text-xl font-semibold">{valor}</span>
        {deltaPct !== undefined && deltaPct !== null && (
          <span
            className={cn(
              "flex items-center gap-1 text-xs font-medium",
              positivo && "text-green-600 dark:text-green-500",
              negativo && "text-destructive",
              !positivo && !negativo && "text-muted-foreground",
            )}
          >
            {positivo ? <TrendingUp className="h-3 w-3" /> : negativo ? <TrendingDown className="h-3 w-3" /> : null}
            {deltaPct > 0 ? "+" : ""}
            {deltaPct.toFixed(1)}% vs. período anterior
          </span>
        )}
      </CardContent>
    </Card>
  );
}
