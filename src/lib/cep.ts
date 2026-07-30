type ViaCepResponse = {
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

/** Consulta determinística de cidade/UF por CEP (ViaCEP) — usada no lugar de deixar a IA "adivinhar"
 * a cidade a partir do CEP, o que se mostrou inconsistente entre execuções (ver contrato-extraction.ts). */
export async function buscarCidadeEstadoPorCep(cep: string): Promise<{ cidade: string; estado: string } | null> {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!response.ok) return null;

    const data: ViaCepResponse = await response.json();
    if (data.erro || !data.localidade || !data.uf) return null;

    return { cidade: data.localidade, estado: data.uf };
  } catch {
    return null;
  }
}
