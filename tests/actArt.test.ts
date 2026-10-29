import { describe, expect, it } from 'vitest';
import { ACT_ART, buildActArt } from '../src/art/actArt';
import { NOTE, PAGE, buildNote, buildParchment } from '../src/art/letterArt';
import { PAL } from '../src/art/palette';
import type { PixelCanvas } from '../src/art/PixelCanvas';
import { ACTS } from '../src/level/acts';
import { LETTERS } from '../src/level/letters';

const color = (pc: PixelCanvas, x: number, y: number) => {
  const i = (y * pc.width + x) * 4;
  return (pc.data[i] << 16) | (pc.data[i + 1] << 8) | pc.data[i + 2];
};
const alpha = (pc: PixelCanvas, x: number, y: number) => pc.data[(y * pc.width + x) * 4 + 3];

describe('arte dos atos', () => {
  it.each(ACTS)('$id: tamanho certo, moldura nos cantos e imagem no meio', (act) => {
    const pc = buildActArt(act.id);
    expect([pc.width, pc.height]).toEqual([ACT_ART.w, ACT_ART.h]);
    expect(color(pc, 0, 0)).toBe(PAL.acts.frame);
    expect(color(pc, ACT_ART.w - 1, ACT_ART.h - 1)).toBe(PAL.acts.frame);
    expect(alpha(pc, ACT_ART.w / 2, Math.floor(ACT_ART.h / 2))).toBe(255);
    expect(color(pc, ACT_ART.w / 2, Math.floor(ACT_ART.h / 2))).not.toBe(PAL.acts.frame);
  });
});

describe('arte das cartas', () => {
  it('a folhinha encosta na superfície (última linha pintada)', () => {
    const pc = buildNote();
    expect([pc.width, pc.height]).toEqual([NOTE.w, NOTE.h]);
    const bottom = Array.from({ length: NOTE.w }, (_, x) => alpha(pc, x, NOTE.h - 1));
    expect(bottom.some((a) => a > 0)).toBe(true);
  });

  it.each(LETTERS)('página de "$id": papel na área do texto e patas na base', (l) => {
    const pc = buildParchment(l.paper);
    const t = PAGE.text;
    // Toda a área do texto é papel (nada de pata ou rasgo por cima das letras).
    for (let y = t.y; y < t.y + t.h; y += 3) {
      for (let x = t.x; x < t.x + t.w; x += 3) expect(alpha(pc, x, y)).toBe(255);
    }
    // Patas saindo da borda de baixo nos dois lados.
    expect(alpha(pc, 4, PAGE.h - 1)).toBe(255);
    expect(alpha(pc, PAGE.w - 5, PAGE.h - 1)).toBe(255);
  });
});
