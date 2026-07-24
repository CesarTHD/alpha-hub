"use client";

import { useTransition } from "react";
import { Power, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setFranquiaAtiva } from "@/lib/actions/franquias";

export function FranquiaAtivaToggle({ id, ativo }: { id: string; ativo: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={pending}
      aria-label={ativo ? "Desativar franquia" : "Ativar franquia"}
      onClick={() => startTransition(() => setFranquiaAtiva(id, !ativo))}
    >
      {ativo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
    </Button>
  );
}
