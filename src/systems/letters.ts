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

/** As cartas obrigatórias (não extras) já foram todas lidas? Elas abrem o buraco do telhado. */
export function requiredLettersRead(letters: Letter[], log: LetterLog): boolean {
  return letters.every((l) => l.extra || log.has(l.id));
}

/**
 * Divide o texto de uma carta em páginas que cabem no papel. Cada página tem até `pageChars` caracteres,
 * contando `paragraphCost` por parágrafo (o espaço entre eles) e `headingCost` na primeira (o cabeçalho).
 * Quebra entre parágrafos; um parágrafo que não cabe sozinho é quebrado entre frases. Devolve, por página,
 * os parágrafos dela.
 */
export function paginateLetter(text: string, pageChars: number, paragraphCost: number, headingCost: number): string[][] {
  const pieces: string[] = [];
  for (const para of text.split('\n\n')) {
    if (para.length + paragraphCost <= pageChars - headingCost) {
      pieces.push(para);
      continue;
    }
    // Parágrafo grande demais: quebra entre frases, juntando as que cabem.
    let chunk = '';
    for (const sentence of para.match(/[^.!?]+[.!?]+["']?\s*|[^.!?]+$/g) ?? [para]) {
      if (chunk && chunk.length + sentence.length + paragraphCost > pageChars - headingCost) {
        pieces.push(chunk.trim());
        chunk = '';
      }
      chunk += sentence;
    }
    if (chunk.trim()) pieces.push(chunk.trim());
  }

  const pages: string[][] = [[]];
  let used = headingCost;
  for (const piece of pieces) {
    const cost = piece.length + paragraphCost;
    if (pages[pages.length - 1].length > 0 && used + cost > pageChars) {
      pages.push([]);
      used = 0;
    }
    pages[pages.length - 1].push(piece);
    used += cost;
  }
  return pages;
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
