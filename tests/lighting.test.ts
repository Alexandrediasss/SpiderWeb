import { describe, expect, it } from 'vitest';
import { LIGHT } from '../src/config';
import { lampBulb } from '../src/art/decorArt';
import { getLevelArt } from '../src/art/levelArt';
import { buildFlashMap, buildLightMap, ditherLevel, lampIntensity, sampleLight } from '../src/art/lighting';
import { PAL } from '../src/art/palette';
import { DECORATIONS } from '../src/level/houseMap';
import { grid } from './helpers';

/** Dois andares: lâmpada no de cima, laje grossa no meio. */
const HOUSE = [
  '##############',
  '#............#',
  '#............#',
  '#............#',
  '#............#',
  '#............#',
  '##############',
  '##############',
  '#............#',
  '#............#',
  '#............#',
  '##############',
];
const LAMP = { x: 7 * 16, y: 16 + 22 };

const amb = [(PAL.light.ambient >> 16) & 255, (PAL.light.ambient >> 8) & 255, PAL.light.ambient & 255];

function pixel(pc: { data: Uint8ClampedArray; width: number }, x: number, y: number): number[] {
  const o = (y * pc.width + x) * 4;
  return [pc.data[o], pc.data[o + 1], pc.data[o + 2], pc.data[o + 3]];
}

describe('LevelGrid.firstSolidDistance', () => {
  it('acha o teto subindo e devolve Infinity no vazio', () => {
    const g = grid();
    expect(g.firstSolidDistance(40, 40, 40, 0)).toBeCloseTo(24);
    expect(g.firstSolidDistance(40, 40, 60, 40)).toBe(Infinity);
  });

  it('o bloco do meio faz sombra', () => {
    const g = grid();
    // De (40, 72) para (120, 72) passa pelo bloco 2x2 (tiles 4..5, 3..4).
    expect(g.firstSolidDistance(40, 72, 120, 72)).toBeCloseTo(24);
  });
});

describe('ditherLevel', () => {
  it('mantém os extremos e, na média, o valor', () => {
    expect(ditherLevel(0, 3, 1, 6)).toBe(0);
    expect(ditherLevel(1, 3, 1, 6)).toBe(1);
    let sum = 0;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) sum += ditherLevel(0.37, x, y, 6);
    expect(sum / 16).toBeCloseTo(0.37, 1);
  });
});

describe('luz das luminárias', () => {
  it('o cone ilumina para baixo e não para cima', () => {
    expect(lampIntensity(0, 60)).toBeGreaterThan(0.3);
    expect(lampIntensity(0, -60)).toBe(0);
    expect(lampIntensity(150, 20)).toBe(0);
  });

  it('embaixo da lâmpada é mais claro; o andar de baixo fica só no escuro ambiente', () => {
    const g = grid(HOUSE);
    const map = buildLightMap(g, new Uint8Array(g.widthPx * g.heightPx), [LAMP]);
    const under = pixel(map, LAMP.x, 5 * 16 + 8);
    const below = pixel(map, LAMP.x, 9 * 16 + 8);
    expect(under[0]).toBeGreaterThan(amb[0] + 40);
    expect(below.slice(0, 3)).toEqual(amb);
  });

  it('o lado de fora não escurece', () => {
    const g = grid(HOUSE);
    const outside = new Uint8Array(g.widthPx * g.heightPx);
    outside[100 * g.widthPx + 50] = 1;
    const map = buildLightMap(g, outside, [LAMP]);
    expect(pixel(map, 50, 100)).toEqual([255, 255, 255, 255]);
  });

  it('nunca fica mais escuro que o ambiente', () => {
    const g = grid(HOUSE);
    const map = buildLightMap(g, new Uint8Array(g.widthPx * g.heightPx), [LAMP]);
    for (let i = 0; i < map.data.length; i += 4) expect(map.data[i]).toBeGreaterThanOrEqual(amb[0]);
  });
});

describe('clarão do relâmpago', () => {
  it('lado de fora acende inteiro; perto da janela acende, longe não', () => {
    const g = grid(HOUSE);
    const outside = new Uint8Array(g.widthPx * g.heightPx);
    outside[40 * g.widthPx + 40] = 1;
    const win = { x: 40, y: 40 };
    const map = buildFlashMap(g, outside, [win]);
    expect(pixel(map, 40, 40)[3]).toBe(255);
    expect(pixel(map, 60, 50)[3]).toBeGreaterThan(0);
    // Andar de baixo: a laje bloqueia.
    expect(pixel(map, 40, 9 * 16 + 8)[3]).toBe(0);
  });
});

describe('casa de verdade', () => {
  it('gera tudo rápido o bastante para o boot', () => {
    const t0 = performance.now();
    const art = getLevelArt();
    expect(performance.now() - t0).toBeLessThan(3000);
    expect(art.beams.length).toBe(art.lamps.length);
  });

  it('o vidro das janelas é "lado de fora"; a moldura não', () => {
    const art = getLevelArt();
    const win = DECORATIONS.find((d) => d.kind === 'window')!;
    const x = win.tx * 16;
    const y = win.ty * 16;
    const W = art.canvas.width;
    expect(art.outside[(y + 10) * W + x + 14]).toBe(1);
    expect(art.outside[y * W + x + 2]).toBe(0);
  });

  it('cada luminária ilumina o próprio cômodo', () => {
    const art = getLevelArt();
    for (const d of DECORATIONS.filter((k) => k.kind === 'lamp')) {
      const bulb = lampBulb(d);
      const [r] = sampleLight(art.light, bulb.x, bulb.y + 30);
      expect(r).toBeGreaterThan(amb[0] / 255 + 0.2);
    }
    expect(LIGHT.bands).toBeGreaterThan(1);
  });
});
