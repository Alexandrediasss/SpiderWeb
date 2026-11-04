import { describe, expect, it } from 'vitest';
import {
  BEAM,
  HOUSE,
  MARK,
  OUTSIDE,
  SHAFT,
  SILL,
  buildHouseFront,
  buildMark,
  buildMoonBeam,
  buildOutsideBack,
  buildOutsideFront,
  buildShaftBack,
  buildShaftMouth,
  buildShaftWalls,
  buildSillBack,
  buildSillFront,
} from '../src/art/act3CutArt';
import { PAL } from '../src/art/palette';
import type { PixelCanvas } from '../src/art/PixelCanvas';
import { WINDOW_CUT } from '../src/config';
import { Horde } from '../src/systems/horde';

const alpha = (pc: PixelCanvas, x: number, y: number) => pc.data[(y * pc.width + x) * 4 + 3];
const color = (pc: PixelCanvas, x: number, y: number) => {
  const i = (y * pc.width + x) * 4;
  return (pc.data[i] << 16) | (pc.data[i + 1] << 8) | pc.data[i + 2];
};

describe('palco da chaminé', () => {
  it('as paredes ficam dos lados e o vão é transparente (a parede de trás aparece)', () => {
    const pc = buildShaftWalls();
    expect([pc.width, pc.height]).toEqual([SHAFT.w, SHAFT.tileH]);
    expect(alpha(pc, 0, 0)).toBe(255);
    expect(alpha(pc, SHAFT.wallL - 1, 10)).toBe(255);
    expect(alpha(pc, SHAFT.wallL, 10)).toBe(0);
    expect(alpha(pc, SHAFT.wallR - 1, 10)).toBe(0);
    expect(alpha(pc, SHAFT.wallR, 10)).toBe(255);
    expect(alpha(buildShaftBack(), SHAFT.w / 2, 10)).toBe(255);
  });

  it('os tijolos emendam ao repetir (a altura é um número par de fileiras)', () => {
    expect(SHAFT.tileH % 16).toBe(0);
  });

  it('a boca tem o céu em cima e a borda de tijolos nos lados', () => {
    const pc = buildShaftMouth();
    expect(pc.height).toBe(SHAFT.mouthH);
    expect(alpha(pc, SHAFT.w / 2, 0)).toBe(255);
    expect(color(pc, 0, SHAFT.mouthH - 8)).toBe(PAL.brick.light);
  });
});

describe('o sótão', () => {
  it('o feixe de lua desce do furo no telhado até o pé dele', () => {
    const pc = buildMoonBeam();
    expect([pc.width, pc.height]).toEqual([BEAM.w, BEAM.h]);
    expect(alpha(pc, BEAM.apexX, 0)).toBe(255);
    expect(alpha(pc, 0, 0)).toBe(0);
  });

  it.each(['!', '?'] as const)('marca %s: cabe no quadro e tem a cor clara', (kind) => {
    const pc = buildMark(kind);
    expect([pc.width, pc.height]).toEqual([MARK.w, MARK.h]);
    expect(color(pc, 2, 8)).toBe(PAL.act3Cut.mark);
  });
});

describe('a janela de perto', () => {
  it('por dentro: o parapeito vai até a borda da direita, por onde a Mary chega', () => {
    const pc = buildSillBack();
    expect([pc.width, pc.height]).toEqual([SILL.w, SILL.h]);
    expect(alpha(pc, SILL.w - 1, SILL.sillY)).toBe(255);
    expect(SILL.y + SILL.gh).toBe(SILL.sillY);
  });

  it.each([
    ['por dentro', buildSillFront, SILL],
    ['por fora', buildOutsideFront, OUTSIDE],
  ] as const)('%s: o meio do vão fica livre de cacos (a Mary passa por ali)', (_n, build, w) => {
    const pc = build();
    const cx = w.x + w.gw / 2;
    for (let x = cx - 11; x <= cx + 11; x++) {
      for (let y = w.sillY - 16; y < w.sillY; y++) expect(alpha(pc, x, y), `${x},${y}`).toBe(0);
    }
  });

  it('por fora: o parapeito fica embaixo do vão', () => {
    const pc = buildOutsideBack();
    expect([pc.width, pc.height]).toEqual([OUTSIDE.w, OUTSIDE.h]);
    expect(OUTSIDE.y + OUTSIDE.gh).toBe(OUTSIDE.sillY);
    expect(alpha(pc, OUTSIDE.x, OUTSIDE.sillY)).toBe(255);
  });
});

describe('a casa inteira', () => {
  const pc = buildHouseFront();

  it('o céu é transparente (o raio passa atrás da casa) e o chão é opaco', () => {
    expect([pc.width, pc.height]).toEqual([HOUSE.w, HOUSE.h]);
    expect(alpha(pc, HOUSE.w / 2, 0)).toBe(0);
    expect(alpha(pc, HOUSE.w / 2, HOUSE.h - 1)).toBe(255);
  });

  it('nenhuma janela acesa: a cor quente das janelas da rua não aparece', () => {
    for (let y = 0; y < HOUSE.base; y++) {
      for (let x = 0; x < HOUSE.w; x++) {
        expect(color(pc, x, y)).not.toBe(PAL.street.windowLit);
        expect(color(pc, x, y)).not.toBe(PAL.street.windowLitDark);
      }
    }
  });

  it('a janela quebrada fica acima do chão (a Mary desce pelo fio) e os doentes andam à frente da casa', () => {
    expect(HOUSE.win.y + HOUSE.win.h).toBeLessThan(HOUSE.base);
    expect(HOUSE.lawnRow).toBeGreaterThan(HOUSE.base);
    expect(HOUSE.walkRow).toBeGreaterThan(HOUSE.lawnRow);
    expect(new Horde(WINDOW_CUT.horde, HOUSE.w, 1, 1).zombies.length).toBe(WINDOW_CUT.horde.reduce((n, r) => n + r.count, 0));
  });
});
