const PESOS_D1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_D2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

function digitoVerificador(numeros: string, pesos: number[]): number {
  const soma = numeros
    .split("")
    .reduce((acc, digito, i) => acc + Number(digito) * pesos[i], 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export type DocumentoNormalizado = {
  documento: string;
  completadoAutomaticamente: boolean;
};

/**
 * A IA de extração às vezes devolve só a raiz do CNPJ (8 dígitos), sem
 * filial nem dígitos verificadores — faltam 6 dígitos ("0001XX"). Quando
 * isso acontece, completa assumindo filial "0001" (matriz, o caso comum) e
 * calcula os 2 dígitos verificadores pelo algoritmo oficial da Receita —
 * não é um chute do dígito em si (é calculado), mas a filial "0001" é uma
 * suposição, então o resultado vem marcado como `completadoAutomaticamente`
 * pra quem revisar saber que precisa conferir contra o documento original.
 *
 * CPF (11 dígitos) e CNPJ já completo (14 dígitos) passam direto, sem alteração.
 */
export function normalizarDocumento(documentoBruto: string): DocumentoNormalizado {
  const digitos = documentoBruto.replace(/\D/g, "");
  if (digitos.length !== 8) {
    return { documento: digitos, completadoAutomaticamente: false };
  }

  const base = `${digitos}0001`;
  const d1 = digitoVerificador(base, PESOS_D1);
  const d2 = digitoVerificador(`${base}${d1}`, PESOS_D2);
  return { documento: `${base}${d1}${d2}`, completadoAutomaticamente: true };
}
