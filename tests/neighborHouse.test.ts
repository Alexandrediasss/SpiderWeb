import { describe, expect, it } from 'vitest';
import { CHANDELIER, LETTER, SICK, SPIDER, TILE } from '../src/config';
import { ACTS } from '../src/level/acts';
import { ACT3_LETTERS } from '../src/level/letters';
import { isSolidChar } from '../src/level/legend';
import {
  ACT3_CHECKPOINTS,
  ACT3_WINDOW,
  CHANDELIER_DEF,
  CHIMNEY_BREACH,
  GOO,
  NEIGHBOR_MAP,
  NEIGHBOR_RATS,
  NEIGHBOR_ROOMS,
  SICK_DEF,
  WATER_DRIPS,
} from '../src/level/neighborHouse';
import { LevelGrid } from '../src/physics/LevelGrid';
import { inZone, spawnPoint } from '../src/systems/checkpoints';
import { nearbyLetter } from '../src/systems/letters';
import { inRoofHole } from '../src/systems/roofHole';
import { SpiderMotor } from '../src/systems/SpiderMotor';
import { DT, input } from './helpers';

const grid = LevelGrid.fromAscii(NEIGHBOR_MAP, TILE, isSolidChar);
const solid = (tx: number, ty: number) => grid.isSolidTile(tx, ty);
const tile = (px: number) => Math.floor(px / TILE);

/** Deixa a aranha cair até grudar em algo (ou o tempo acabar). */
function fall(m: SpiderMotor, sec = 4): void {
  for (let t = 0; t < sec && m.surface === 'air'; t += DT) m.update(DT, input());
}

describe('mapa da casa vizinha', () => {
  it('todas as linhas têm o mesmo tamanho e só usam caracteres da legenda', () => {
    expect(() => LevelGrid.fromAscii(NEIGHBOR_MAP, TILE, isSolidChar)).not.toThrow();
    expect(NEIGHBOR_MAP[0].length).toBe(80);
  });

  it('checkpoints: o lugar de nascer é vazio, em cima de um chão e dentro da área', () => {
    for (const cp of ACT3_CHECKPOINTS) {
      expect(solid(cp.spawn.tx, cp.spawn.ty)).toBe(false);
      expect(solid(cp.spawn.tx, cp.spawn.ty + 1)).toBe(true);
      expect(inZone(spawnPoint(cp, TILE, SPIDER.half), cp.zone, TILE)).toBe(true);
    }
  });

  it('a Mary sai da chaminé e cai no chão do sótão, no primeiro checkpoint', () => {
    const m = new SpiderMotor(grid, CHIMNEY_BREACH.x, CHIMNEY_BREACH.y);
    fall(m);
    expect(m.surface).toBe('floor');
    expect(inZone(m.body, ACT3_CHECKPOINTS[0].zone, TILE)).toBe(true);
  });

  it.each([
    [5, 12, 1],
    [73, 27, 2],
  ])('pelo buraco do chão na coluna %i ela cai no checkpoint seguinte', (tx, ty, cp) => {
    expect(solid(tx, ty)).toBe(false);
    const m = new SpiderMotor(grid, (tx + 0.5) * TILE, ty * TILE + 4);
    fall(m);
    expect(m.surface).toBe('floor');
    expect(inZone(m.body, ACT3_CHECKPOINTS[cp].zone, TILE)).toBe(true);
  });
});

describe('cartas do ato 3', () => {
  it('são as do ato 3, com ids únicos', () => {
    expect(ACT3_LETTERS.map((l) => l.id)).toEqual(ACTS.find((a) => a.id === 'act3')?.letters);
  });

  it.each(ACT3_LETTERS)('"$id": tile vazio, apoiada numa superfície, dentro de um cômodo', (l) => {
    expect(solid(l.tx, l.ty)).toBe(false);
    expect(solid(l.tx, l.ty + 1)).toBe(true);
    expect(NEIGHBOR_ROOMS.some((r) => l.tx >= r.x0 && l.tx <= r.x1 && l.ty >= r.y0 && l.ty <= r.y1)).toBe(true);
  });

  it.each(ACT3_LETTERS)('andando na superfície, a Mary chega perto o bastante para ler "$id"', (l) => {
    // Começa à esquerda, na mesma superfície (a carta do sótão fica em cima de uma caixa estreita).
    const from = [2, 1].map((d) => l.tx - d).find((tx) => solid(tx, l.ty + 1) && !solid(tx, l.ty));
    expect(from).toBeDefined();
    const m = new SpiderMotor(grid, (from! + 0.5) * TILE, (l.ty + 1) * TILE - SPIDER.half);
    m.surface = 'floor';
    let found = false;
    for (let i = 0; i < 90 && !found; i++) {
      m.update(DT, input({ move: { x: 1, y: 0 } }));
      found = nearbyLetter(ACT3_LETTERS, m.body, TILE, LETTER.readRadius)?.id === l.id;
    }
    expect(found).toBe(true);
  });
});

describe('gosma e goteiras', () => {
  it.each([...GOO.drips, ...WATER_DRIPS])('goteira em ($x, $y): embaixo de um teto, com ar embaixo', (d) => {
    expect(d.y % TILE).toBe(0);
    expect(solid(tile(d.x), d.y / TILE - 1)).toBe(true);
    expect(solid(tile(d.x), d.y / TILE)).toBe(false);
  });

  it.each(GOO.jets)('jorro em ($x, $y): em cima de um chão, com espaço para a coluna', (j) => {
    expect(solid(tile(j.x), j.y / TILE)).toBe(true);
    for (let y = j.y - 1; y > j.y - j.height; y -= TILE / 2) expect(grid.isSolidPixel(j.x, y)).toBe(false);
  });

  it.each(GOO.pools)('poça de $x0 a $x1: em cima de um chão', (p) => {
    for (let x = p.x0; x <= p.x1; x += 4) {
      expect(grid.isSolidPixel(x, p.y + 1)).toBe(true);
      expect(grid.isSolidPixel(x, p.y - 1)).toBe(false);
    }
  });

  it('a chegada no sótão não tem gosma', () => {
    const attic = ACT3_CHECKPOINTS[0].zone;
    for (const d of GOO.drips) expect(inZone(d, attic, TILE)).toBe(false);
  });
});

describe('cozinha', () => {
  it('o doente anda no chão livre: nada sólido no corpo dele entre minX e maxX', () => {
    const floor = SICK_DEF.floorY / TILE;
    for (let x = SICK_DEF.minX - SICK.w / 2; x <= SICK_DEF.maxX + SICK.w / 2; x += 2) {
      expect(solid(tile(x), floor)).toBe(true);
      for (let y = SICK_DEF.floorY - 1; y > SICK_DEF.floorY - SICK.h; y -= 4) expect(grid.isSolidPixel(x, y)).toBe(false);
    }
  });

  it('o lustre fica num teto, acima da cabeça do doente e dentro do caminho dele', () => {
    expect(solid(tile(CHANDELIER_DEF.x), CHANDELIER_DEF.y / TILE - 1)).toBe(true);
    expect(CHANDELIER_DEF.y + CHANDELIER.ropeLength + CHANDELIER.h).toBeLessThan(SICK_DEF.floorY - SICK.h);
    expect(CHANDELIER_DEF.x).toBeGreaterThan(SICK_DEF.minX);
    expect(CHANDELIER_DEF.x).toBeLessThan(SICK_DEF.maxX);
    expect(CHANDELIER_DEF.floorY).toBe(SICK_DEF.floorY);
  });

  it('a janela é um vão na parede, acima do alcance do doente', () => {
    const { tx, ty, w, h } = ACT3_WINDOW;
    for (let y = ty; y < ty + h; y++) for (let x = tx; x < tx + w; x++) expect(NEIGHBOR_MAP[y][x]).toBe('~');
    expect(solid(tx + w - 1, ty + h)).toBe(true);
    expect((ty + h) * TILE).toBeLessThan(SICK_DEF.floorY - SICK.reachUp);
  });

  it('subindo pela parede de cima da bancada, a Mary entra no vão da janela', () => {
    const { tx, ty } = ACT3_WINDOW;
    // Em cima da bancada, encostada na parede da esquerda.
    const counterTop = 37;
    const m = new SpiderMotor(grid, 2 * TILE + SPIDER.half + 6, counterTop * TILE - SPIDER.half);
    m.surface = 'floor';
    let inside = false;
    for (let i = 0; i < 400 && !inside; i++) {
      m.update(DT, input({ move: { x: -1, y: -1 } }));
      inside = inRoofHole(m.body, ACT3_WINDOW, TILE);
    }
    expect(inside).toBe(true);
    expect(tile(m.body.x)).toBeLessThan(tx + 2);
    expect(tile(m.body.y)).toBeGreaterThanOrEqual(ty);
  });

  it('ratos nascem num tile vazio, com chão embaixo em toda a patrulha', () => {
    for (const r of NEIGHBOR_RATS) {
      expect(solid(r.tx, r.ty)).toBe(false);
      for (let x = r.minTx; x <= r.maxTx; x++) {
        expect(solid(x, r.ty + 1)).toBe(true);
        expect(solid(x, r.ty)).toBe(false);
      }
    }
  });
});
