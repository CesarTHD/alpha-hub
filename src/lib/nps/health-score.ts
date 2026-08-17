export type RespostaScores = {
  nps: number;
  csatAtendimento: number;
  csatResultado: number;
  csatEntregas: number;
  cevSeguranca: number;
  cevValorizacao: number;
  cesFacilidade: number;
};

export type HealthScoreBreakdown = {
  geral: number;
  nps: number;
  csat: number;
  cev: number;
  ces: number;
  totalRespostas: number;
};

/** Calcula os sub-scores de cada resposta mantendo a escala 1-10. */
function subScores(r: RespostaScores) {
  return {
    nps: r.nps,
    csat: (r.csatAtendimento + r.csatResultado + r.csatEntregas) / 3,
    cev: (r.cevSeguranca + r.cevValorizacao) / 2,
    ces: r.cesFacilidade,
  };
}

function media(valores: number[]) {
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

/**
 * HealthScore geral da franquia:
 * média das 4 dimensões (NPS/CSAT/CEV/CES),
 * mantendo a escala de 1-10.
 *
 * O resultado é arredondado:
 * < 0.5 para baixo
 * >= 0.5 para cima
 */
export function calcularHealthScore(
  respostas: RespostaScores[]
): number | null {
  if (respostas.length === 0) return null;

  const porResposta = respostas.map((r) => {
    const s = subScores(r);
    return (s.nps + s.csat + s.cev + s.ces) / 4;
  });

  return Math.round(media(porResposta));
}

/**
 * Mesmo cálculo, mas devolvendo o breakdown por dimensão.
 */
export function calcularHealthScoreBreakdown(
  respostas: RespostaScores[]
): HealthScoreBreakdown | null {
  if (respostas.length === 0) return null;

  const porResposta = respostas.map(subScores);

  const nps = media(porResposta.map((s) => s.nps));
  const csat = media(porResposta.map((s) => s.csat));
  const cev = media(porResposta.map((s) => s.cev));
  const ces = media(porResposta.map((s) => s.ces));

  return {
    geral: Math.round((nps + csat + cev + ces) / 4),
    nps: Math.round(nps),
    csat: Math.round(csat),
    cev: Math.round(cev),
    ces: Math.round(ces),
    totalRespostas: respostas.length,
  };
}