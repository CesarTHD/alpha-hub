"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import type { ComponentProps } from "react";

/**
 * `pending` is optional: when the form uses a real `useActionState` action prop,
 * `useFormStatus` reports pending automatically. When the caller drives submission
 * itself (see `useServerAction`), pass `pending` explicitly instead.
 */
export function SubmitButton({
  children,
  pendingLabel = "Salvando...",
  pending: pendingProp,
  ...props
}: ComponentProps<typeof Button> & { pendingLabel?: string; pending?: boolean }) {
  const { pending: formPending } = useFormStatus();
  const pending = pendingProp ?? formPending;

  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
