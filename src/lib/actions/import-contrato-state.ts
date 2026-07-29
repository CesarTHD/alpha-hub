import type { ContratoExtraido } from "@/lib/ai/contrato-extraction";

export type ImportContratoState = {
  ok: boolean;
  message?: string;
  data?: ContratoExtraido;
} | null;
