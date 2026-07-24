export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
} | null;

export const initialActionState: ActionState = null;
