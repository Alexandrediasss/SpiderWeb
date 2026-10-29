// Andar num menu vertical dando a volta e pulando os itens apagados. Lógica pura.
// Spec: docs/features/title-screen.md

/** Próximo item a partir de `current` na direção `delta` (-1 ou 1), pulando os apagados. Sem nenhum aceso, fica onde está. */
export function stepMenu(enabled: boolean[], current: number, delta: number): number {
  const n = enabled.length;
  if (n === 0 || delta === 0) return current;
  for (let k = 1; k <= n; k++) {
    const i = (((current + delta * k) % n) + n) % n;
    if (enabled[i]) return i;
  }
  return current;
}
