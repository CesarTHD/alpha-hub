"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function ConfirmActionButton({
  title,
  description,
  action,
  icon,
  label,
  tooltip,
  variant = "ghost",
  successMessage = "Feito.",
}: {
  title: string;
  description: string;
  action: () => Promise<{ ok: boolean; message?: string } | void>;
  icon?: React.ReactNode;
  label?: string;
  tooltip?: string;
  variant?: "ghost" | "destructive" | "outline";
  successMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await action();
      if (result && "ok" in result && !result.ok) {
        toast.error(result.message ?? "Não foi possível concluir a ação.");
      } else {
        toast.success((result && "message" in result && result.message) || successMessage);
      }
      setOpen(false);
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {label ? (
        <AlertDialogTrigger asChild>
          <Button variant={variant} size="sm" aria-label={title}>
            {icon ?? <Trash2 className="h-4 w-4" />}
            {label}
          </Button>
        </AlertDialogTrigger>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertDialogTrigger asChild>
              <Button variant={variant} size="icon" aria-label={title}>
                {icon ?? <Trash2 className="h-4 w-4" />}
              </Button>
            </AlertDialogTrigger>
          </TooltipTrigger>
          <TooltipContent>{tooltip ?? title}</TooltipContent>
        </Tooltip>
      )}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={handleConfirm}>
            {pending ? "Aguarde..." : "Confirmar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
