"use client";

import { useTransition } from "react";
import { Power, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setProfitAtivo } from "@/lib/actions/profits";

export function ProfitAtivoToggle({ id, ativo }: { id: string; ativo: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={pending}
      aria-label={ativo ? "Desativar Profit" : "Ativar Profit"}
      onClick={() => startTransition(() => setProfitAtivo(id, !ativo))}
    >
      {ativo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
    </Button>
  );
}
