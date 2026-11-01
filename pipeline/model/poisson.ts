/** Probabilidade de exatamente k eventos numa Poisson de média λ. */
export function poissonPmf(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let logP = -lambda + k * Math.log(lambda);
  for (let i = 2; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}

/** P(X = 0) — ex.: probabilidade de clean sheet quando λ = golos esperados do adversário. */
export function pZero(lambda: number): number {
  return Math.exp(-Math.max(0, lambda));
}

/**
 * E[floor(X / k)] para X ~ Poisson(λ). Usado para "1 ponto por cada 3 recuperações/defesas"
 * e "-1 por cada 2 golos sofridos".
 */
export function expectedFloorDiv(lambda: number, k: number): number {
  if (lambda <= 0) return 0;
  const max = Math.ceil(lambda + 10 * Math.sqrt(lambda) + 20);
  let e = 0;
  let p = Math.exp(-lambda);
  for (let x = 0; x <= max; x++) {
    if (x > 0) p *= lambda / x;
    e += Math.floor(x / k) * p;
  }
  return e;
}
