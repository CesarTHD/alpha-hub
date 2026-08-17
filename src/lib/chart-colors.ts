// Paleta de gráficos do Dashboard — cores funcionais/validadas (dataviz skill),
// sem compromisso com a identidade visual final da Alpha ainda.

export function withAlpha(hex: string, alphaPercent: number): string {
  const alpha = Math.round((alphaPercent / 100) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${alpha}`;
}

export const CATEGORICAL: string[] = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#4a3aa7", // violet
  "#e34948", // red
];

export const PRIMARY = CATEGORICAL[0];

export const STATUS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
  neutral: "#898781",
} as const;

export const STATUS_COLORS: Record<string, string> = {
  Ativo: STATUS.good,
  Pausado: STATUS.warning,
  Vencido: STATUS.serious,
  Encerrado: STATUS.neutral,
  Churn: STATUS.critical,
};

export const FAIXA_COLORS: Record<string, string> = {
  Vencido: STATUS.critical,
  "Até 30 dias": STATUS.serious,
  "31 a 60 dias": STATUS.warning,
  "61 a 90 dias": CATEGORICAL[2],
  "Mais de 90 dias": STATUS.good,
  Recorrente: CATEGORICAL[0],
};

export const FALLBACK: string[] = CATEGORICAL;

export const chartTooltipStyle = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--popover-foreground)",
  fontSize: 12,
} as const;

export const chartTooltipLabelStyle = {
  color: "var(--foreground)",
  fontWeight: 600,
  marginBottom: 4,
} as const;

export const chartTooltipItemStyle = {
  color: "var(--popover-foreground)",
} as const;

export const chartGridColor = "var(--border)";
