// Cartas no cenário: onde fica cada folha, qual está perto da aranha e quais já foram lidas. Lógica pura.
// Spec: docs/features/letters.md
import type { Letter } from '../level/letters';
import type { Vec2 } from '../physics/surfaces';

/** Altura da folha dobrada (px): o centro dela fica a metade disso acima da superfície. */
export const NOTE_HEIGHT = 12;

/** Pé da folha (meio da base, em cima da superfície) em px do mundo. */
export function letterBase(letter: Letter, tile: number): Vec2 {
  return { x: (letter.tx + 0.5) * tile, y: (letter.ty + 1) * tile };
}

/** Centro da folha em px do mundo. */
export function letterCenter(letter: Letter, tile: number): Vec2 {
  const b = letterBase(letter, tile);
  return { x: b.x, y: b.y - NOTE_HEIGHT / 2 };
}

/** A carta mais perto de `pos`, se estiver a até `radius` px; senão null. */
export function nearbyLetter(letters: Letter[], pos: Vec2, tile: number, radius: number): Letter | null {
  let best: Letter | null = null;
  let bestD = radius;
  for (const l of letters) {
    const c = letterCenter(l, tile);
    const d = Math.hypot(c.x - pos.x, c.y - pos.y);
    if (d <= bestD) {
      best = l;
      bestD = d;
    }
  }
  return best;
}

/** Cartas lidas na jogada atual do ato. */
export class LetterLog {
  private readonly read = new Set<string>();

  markRead(id: string): void {
    this.read.add(id);
  }

  has(id: string): boolean {
    return this.read.has(id);
  }

  get ids(): string[] {
    return [...this.read];
  }

  /** Quantas das cartas `ofIds` foram lidas. */
  count(ofIds: string[]): number {
    return ofIds.filter((id) => this.read.has(id)).length;
  }

  clear(): void {
    this.read.clear();
  }
}
