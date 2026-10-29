import { describe, expect, it } from 'vitest';
import { SPIDER, TILE } from '../src/config';
import { DECORATIONS, HOUSE_MAP, ROOF_HOLE, ROOMS } from '../src/level/houseMap';
import { isSolidChar } from '../src/level/legend';
import { LevelGrid } from '../src/physics/LevelGrid';
import { SpiderMotor } from '../src/systems/SpiderMotor';
import { inRoofHole, roofLeakRect, roofReturnPoint } from '../src/systems/roofHole';
import { DT, input } from './helpers';

const grid = LevelGrid.fromAscii(HOUSE_MAP, TILE, isSolidChar);
const { tx, ty, w, h } = ROOF_HOLE;

describe('buraco no telhado', () => {
  it('no mapa é céu, com o sótão embaixo e céu em cima', () => {
    for (let y = ty; y < ty + h; y++) for (let x = tx; x < tx + w; x++) expect(HOUSE_MAP[y][x]).toBe('~');
    for (let x = tx; x < tx + w; x++) {
      expect(HOUSE_MAP[ty + h][x]).toBe('.');
      expect(HOUSE_MAP[ty - 1][x]).toBe('~');
    }
    // Paredes do buraco: telhado dos dois lados.
    for (let y = ty; y < ty + h; y++) {
      expect(HOUSE_MAP[y][tx - 1]).toBe('R');
      expect(HOUSE_MAP[y][tx + w]).toBe('R');
    }
    const attic = ROOMS.find((r) => r.style === 'attic')!;
    expect(tx).toBeGreaterThanOrEqual(attic.x0);
    expect(tx + w - 1).toBeLessThanOrEqual(attic.x1);
  });

  it('a decoração do buraco está no mesmo lugar', () => {
    const d = DECORATIONS.find((k) => k.kind === 'roofHole');
    expect(d).toEqual({ kind: 'roofHole', tx, ty });
  });

  it('detecta o centro da aranha só dentro do buraco', () => {
    expect(inRoofHole({ x: (tx + 1) * TILE, y: (ty + 1) * TILE }, ROOF_HOLE, TILE)).toBe(true);
    expect(inRoofHole({ x: (tx + 1) * TILE, y: (ty + h) * TILE + 1 }, ROOF_HOLE, TILE)).toBe(false);
    expect(inRoofHole({ x: tx * TILE - 1, y: (ty + 1) * TILE }, ROOF_HOLE, TILE)).toBe(false);
  });

  it('andando pelo teto do sótão, a aranha contorna o canto e entra no buraco', () => {
    // No teto, logo à esquerda do buraco (embaixo do primeiro tile sólido), andando para a direita.
    let row = ty + h;
    while (grid.isSolidTile(tx - 2, row)) row++;
    const m = new SpiderMotor(grid, (tx - 2) * TILE + 8, row * TILE + SPIDER.half);
    m.surface = 'ceiling';
    let entered = false;
    for (let i = 0; i < 120 && !entered; i++) {
      m.update(DT, input({ move: { x: 1, y: 0 } }));
      entered = inRoofHole(m.body, ROOF_HOLE, TILE);
    }
    expect(entered).toBe(true);
  });

  it('ao voltar da cutscene, a aranha cai do buraco e gruda no chão do sótão', () => {
    const p = roofReturnPoint(ROOF_HOLE, TILE, SPIDER.half);
    expect(inRoofHole(p, ROOF_HOLE, TILE)).toBe(false);
    const m = new SpiderMotor(grid, 0, 0);
    m.placeAt(p.x, p.y);
    for (let i = 0; i < 120; i++) m.update(DT, input());
    expect(m.surface).toBe('floor');
    expect(Math.floor(m.body.y / TILE)).toBe(11);
  });

  it('a chuva que entra vai da borda do buraco até o chão do sótão', () => {
    const leak = roofLeakRect(grid, ROOF_HOLE);
    expect(leak.y0).toBe((ty + h) * TILE);
    expect(leak.y1).toBe(12 * TILE);
    expect(leak.x0).toBeGreaterThan(tx * TILE);
    expect(leak.x1).toBeLessThan((tx + w) * TILE);
  });

  it('a poça fica no chão embaixo do buraco', () => {
    const puddle = DECORATIONS.find((k) => k.kind === 'puddle')!;
    expect(isSolidChar(HOUSE_MAP[puddle.ty + 1][tx])).toBe(true);
    expect(Math.abs(puddle.tx - tx)).toBeLessThanOrEqual(1);
  });
});
