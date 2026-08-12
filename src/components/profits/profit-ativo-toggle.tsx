"use client";

import { useTransition } from "react";
import { Power, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { setProfitAtivo } from "@/lib/actions/profits";

export function ProfitAtivoToggle({ id, ativo }: { id: string; ativo: boolean }) {
  const [pending, startTransition] = useTransition();
  const label = ativo ? "Desativar Profit" : "Ativar Profit";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={pending}
          aria-label={label}
          onClick={() => startTransition(() => setProfitAtivo(id, !ativo))}
        >
          {ativo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
