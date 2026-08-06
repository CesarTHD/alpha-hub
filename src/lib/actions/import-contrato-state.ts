import type { ContratoExtraido } from "@/lib/contrato-extracao";

export type ImportContratoState = {
  ok: boolean;
  message?: string;
  data?: ContratoExtraido;
} | null;
