import { describe, expect, it } from 'vitest';
import { PixelCanvas } from '../src/art/PixelCanvas';
import { drawGoo, drawWeb } from '../src/art/transitionArt';

/** Fração dos pixels opacos e se todos são pretos. */
function coverage(pc: PixelCanvas): { opaque: number; allBlack: boolean } {
  let opaque = 0;
  let allBlack = true;
  for (let i = 0; i < pc.width * pc.height; i++) {
    const a = pc.data[i * 4 + 3];
    if (a === 255) opaque++;
    if (pc.data[i * 4] || pc.data[i * 4 + 1] || pc.data[i * 4 + 2]) allBlack = false;
  }
  return { opaque: opaque / (pc.width * pc.height), allBlack };
}

describe.each([
  ['gosma', drawGoo],
  ['teia', drawWeb],
] as const)('transição: %s', (_name, draw) => {
  it('começa quase vazia e termina com a tela inteira preta', () => {
    const pc = new PixelCanvas(160, 90);
    draw(pc, 0, 7);
    expect(coverage(pc).opaque).toBeLessThan(0.05);
    draw(pc, 1, 7);
    expect(coverage(pc)).toEqual({ opaque: 1, allBlack: true });
  });

  it('no meio já cobre boa parte da tela e funciona em outras proporções', () => {
    const pc = new PixelCanvas(160, 120);
    draw(pc, 0.6, 3);
    expect(coverage(pc).opaque).toBeGreaterThan(0.5);
  });
});

it('a gosma cobre a tela toda antes de começar a apagar', () => {
  const pc = new PixelCanvas(160, 90);
  drawGoo(pc, 0.7, 11);
  expect(coverage(pc).opaque).toBe(1);
});
