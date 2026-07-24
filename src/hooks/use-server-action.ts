"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { ActionState } from "@/lib/actions/action-state";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Runs a `"use server"` action from a client component without `useActionState`.
 * Calling the action inside the transition's callback (an event handler, not an
 * effect or render) is what lets us synchronously close dialogs/toast right when
 * the result comes back — `react-hooks/set-state-in-effect` and `react-hooks/refs`
 * both forbid doing that from a `useEffect`.
 */
export function useServerAction(action: Action, onSuccess?: () => void) {
  const [state, setState] = useState<ActionState>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await action(null, formData);
      setState(result);
      if (result?.ok) {
        toast.success(result.message ?? "Feito.");
        onSuccess?.();
      } else if (result?.message) {
        toast.error(result.message);
      }
    });
  }

  return { state, pending, submit };
}
