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

/** Normaliza cada bloco de perguntas (escala 0-10) para 0-100. */
function subScores(r: RespostaScores) {
  return {
    nps: r.nps * 10,
    csat: ((r.csatAtendimento + r.csatResultado + r.csatEntregas) / 3) * 10,
    cev: ((r.cevSeguranca + r.cevValorizacao) / 2) * 10,
    ces: r.cesFacilidade * 10,
  };
}

function media(valores: number[]) {
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

/** HealthScore geral da franquia: média das 4 dimensões (NPS/CSAT/CEV/CES),
 *  cada uma já normalizada para 0-100 — dá peso igual a cada dimensão,
 *  independente de quantas perguntas cada uma tem. */
export function calcularHealthScore(respostas: RespostaScores[]): number | null {
  if (respostas.length === 0) return null;
  const porResposta = respostas.map((r) => {
    const s = subScores(r);
    return (s.nps + s.csat + s.cev + s.ces) / 4;
  });
  return Math.round(media(porResposta));
}

/** Mesmo cálculo, mas devolvendo o breakdown por dimensão (pra tela de detalhe). */
export function calcularHealthScoreBreakdown(respostas: RespostaScores[]): HealthScoreBreakdown | null {
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
