import { describe, expect, it } from 'vitest';
import { ACT2, SPIDER, TILE, WEB } from '../src/config';
import {
  CHECKPOINTS,
  CHIMNEY,
  END_ZONE,
  FIRST_AIM,
  LOOSE_WIRES,
  ROOFTOP_MAP,
  ROOFTOP_START,
  STREET_ROW,
  WIRE_SPANS,
  isRooftopSolid,
  rooftopTile,
} from '../src/level/rooftops';
import { LevelGrid } from '../src/physics/LevelGrid';
import { FOOT, bakeRooftops, buildDebrisSheet, buildZombieFoot, lampBulbs } from '../src/art/rooftopArt';
import { SpiderMotor } from '../src/systems/SpiderMotor';
import { inZone, nextCheckpoint, spawnPoint, touchedStreet } from '../src/systems/checkpoints';
import { raycastWeb } from '../src/systems/webRope';
import { DT, input } from './helpers';

const grid = LevelGrid.fromAscii(ROOFTOP_MAP, TILE, isRooftopSolid);
const px = (tx: number) => (tx + 0.5) * TILE;

describe('mapa do ato 2', () => {
  it('todas as linhas do mesmo tamanho e só caracteres da legenda', () => {
    expect(new Set(ROOFTOP_MAP.map((r) => r.length)).size).toBe(1);
    for (const row of ROOFTOP_MAP) for (const ch of row) expect(() => rooftopTile(ch)).not.toThrow();
  });

  it('a rua é a última faixa inteira', () => {
    for (let y = STREET_ROW; y < ROOFTOP_MAP.length; y++) expect(ROOFTOP_MAP[y]).toMatch(/^_+$/);
  });

  it.each(CHECKPOINTS)('checkpoint "$name": reaparece em cima de uma superfície, dentro da própria área', (cp) => {
    expect(grid.isSolidTile(cp.spawn.tx, cp.spawn.ty)).toBe(false);
    expect(grid.isSolidTile(cp.spawn.tx, cp.spawn.ty + 1)).toBe(true);
    expect(inZone(spawnPoint(cp, TILE, SPIDER.half), cp.zone, TILE)).toBe(true);
  });

  it('o começo é o checkpoint 0', () => {
    expect(CHECKPOINTS[0].spawn).toEqual(ROOFTOP_START);
  });

  it('da calha, a teia da cutscene pega embaixo do braço do poste 1', () => {
    const from = spawnPoint(CHECKPOINTS[0], TILE, SPIDER.half);
    const hit = raycastWeb(grid, from, FIRST_AIM, WEB.range);
    expect(hit?.surface).toBe('ceiling');
  });

  it('cutscene: atirando a teia e subindo por ela, a aranha gruda embaixo do braço', () => {
    const from = spawnPoint(CHECKPOINTS[0], TILE, SPIDER.half);
    const m = new SpiderMotor(grid, from.x, from.y);
    m.surface = 'floor';
    m.update(DT, input({ webPressed: true, webHeld: true, aim: FIRST_AIM }));
    const surface = () => m.surface;
    for (let i = 0; i < 240 && surface() === 'air'; i++) m.update(DT, input({ webHeld: true, move: { x: 0, y: -1 } }));
    expect(m.surface).toBe('ceiling');
  });

  // Vãos principais: de um ponto seguro, a teia alcança o próximo apoio.
  it.each([
    ['braço do poste 1 → cruzeta 1', { x: px(27), y: 17 * TILE - 5 }, { x: px(38), y: 14 * TILE - 1 }],
    ['cruzeta 1 → galho de cima', { x: px(43), y: 14 * TILE + 5 }, { x: px(52), y: 18 * TILE - 1 }],
    ['ponto de ônibus → braço do poste 2', { x: px(74), y: 27 * TILE - 5 }, { x: px(77), y: 16 * TILE - 1 }],
    ['outdoor → cruzeta 2', { x: px(100), y: 17 * TILE - 5 }, { x: px(109), y: 13 * TILE - 1 }],
    ['cruzeta 2 → braço do semáforo', { x: px(115), y: 13 * TILE + 5 }, { x: px(127), y: 15 * TILE - 1 }],
    ['semáforo → braço do poste 3', { x: px(134), y: 18 * TILE + 5 }, { x: px(148), y: 17 * TILE - 1 }],
    ['poste 3 → cruzeta 3', { x: px(152), y: 18 * TILE + 5 }, { x: px(158), y: 13 * TILE - 1 }],
    ['garagem → calha da casa vizinha', { x: px(171), y: 24 * TILE - 5 }, { x: px(183), y: 23 * TILE - 1 }],
  ])('%s', (_name, from, to) => {
    const hit = raycastWeb(grid, from, to, WEB.range);
    expect(hit).not.toBeNull();
  });

  it('a chaminé: topo livre em cima, sólida embaixo, dentro da área do fim', () => {
    const { tx, ty, w, h } = CHIMNEY;
    for (let x = tx; x < tx + w; x++) {
      expect(grid.isSolidTile(x, ty - 1)).toBe(false);
      for (let y = ty; y < ty + h; y++) expect(ROOFTOP_MAP[y][x]).toBe('c');
      expect(x >= END_ZONE.x0 && x <= END_ZONE.x1).toBe(true);
    }
  });

  it('fios soltos pendem embaixo de uma cruzeta e os inteiros saem de cima delas', () => {
    for (const w of LOOSE_WIRES) expect(ROOFTOP_MAP[Math.floor((w.y - 1) / TILE)][Math.floor(w.x / TILE)]).toBe('x');
    for (const s of WIRE_SPANS) {
      expect(ROOFTOP_MAP[Math.floor((s.y0 + 3) / TILE)][Math.floor(s.x0 / TILE)]).toBe('x');
      expect(ROOFTOP_MAP[Math.floor((s.y1 + 3) / TILE)][Math.floor(s.x1 / TILE)]).toBe('x');
    }
  });
});

describe('checkpoints', () => {
  it('só avança grudada, e voltar não desativa', () => {
    const bus = spawnPoint(CHECKPOINTS[1], TILE, SPIDER.half);
    expect(nextCheckpoint(CHECKPOINTS, 0, bus, false, TILE)).toBe(0);
    expect(nextCheckpoint(CHECKPOINTS, 0, bus, true, TILE)).toBe(1);
    expect(nextCheckpoint(CHECKPOINTS, 2, bus, true, TILE)).toBe(2);
  });

  it('encostar na rua é cair', () => {
    const y = STREET_ROW * TILE - SPIDER.half;
    expect(touchedStreet({ x: 0, y, vx: 0, vy: 0, half: SPIDER.half }, STREET_ROW, TILE)).toBe(true);
    expect(touchedStreet({ x: 0, y: y - 2, vx: 0, vy: 0, half: SPIDER.half }, STREET_ROW, TILE)).toBe(false);
  });
});

describe('abertura do ato 2', () => {
  it('é curta e termina devolvendo o controle (sem a aranha atirar a teia sozinha)', () => {
    expect(ACT2.introFadeSec + ACT2.introLookSec + ACT2.introWindSec).toBeLessThanOrEqual(5);
    expect(ACT2).not.toHaveProperty('introShootSec');
    expect(ACT2).not.toHaveProperty('introSwingSec');
  });
});

describe('bordas do mapa do ato 2', () => {
  const edgeGrid = () => LevelGrid.fromAscii(ROOFTOP_MAP, TILE, isRooftopSolid, 'edge');

  it('no topo do telhado, andando para a esquerda, para na borda e não sobe para o céu', () => {
    const grid = edgeGrid();
    // Topo do telhado: o primeiro 'r' das colunas 0–4 está na linha 9.
    const m = new SpiderMotor(grid, 3 * TILE + 8, 9 * TILE - SPIDER.half);
    m.surface = 'floor';
    m.bounds = { minX: 0, maxX: grid.widthPx };
    for (let i = 0; i < 6 / DT; i++) m.update(DT, input({ move: { x: -1, y: 0 } }));
    expect(m.surface).toBe('floor');
    expect(m.body.x).toBe(SPIDER.half);
    expect(m.body.y).toBeCloseTo(9 * TILE - SPIDER.half, 5);
    // Apertando "para cima" na borda também não escala nada.
    for (let i = 0; i < 2 / DT; i++) m.update(DT, input({ move: { x: 0, y: -1 } }));
    expect(m.body.y).toBeGreaterThan(8 * TILE);
  });

  it('a teia não prende no céu (acima do mapa é ar)', () => {
    expect(raycastWeb(edgeGrid(), { x: 300, y: 200 }, { x: 300, y: -100 }, WEB.range)).toBeNull();
  });

  it('a casa e a rua continuam sólidas fora do mapa; a casa do ato 1 continua toda fechada', () => {
    const grid = edgeGrid();
    expect(grid.isSolidTile(-1, 15)).toBe(true);
    expect(grid.isSolidTile(-1, 3)).toBe(false);
    expect(grid.isSolidTile(10, -1)).toBe(false);
    expect(grid.isSolidTile(10, ROOFTOP_MAP.length)).toBe(true);
    expect(LevelGrid.fromAscii(ROOFTOP_MAP, TILE, isRooftopSolid).isSolidTile(10, -1)).toBe(true);
  });
});

describe('arte do ato 2', () => {
  it('pinta o mapa inteiro rápido, com as três luminárias', () => {
    const t0 = performance.now();
    const art = bakeRooftops();
    expect(performance.now() - t0).toBeLessThan(2500);
    expect([art.canvas.width, art.canvas.height]).toEqual([ROOFTOP_MAP[0].length * TILE, ROOFTOP_MAP.length * TILE]);
    expect(art.lamps).toEqual(lampBulbs());
    expect(art.lamps.length).toBe(3);
    // O ar fica transparente (o céu do fundo aparece) e a rua é pintada.
    const alpha = (x: number, y: number) => art.canvas.data[(y * art.canvas.width + x) * 4 + 3];
    expect(alpha(5, 5)).toBe(0);
    expect(alpha(100, STREET_ROW * TILE + 20)).toBe(255);
  });

  it('peça sólida é desenhada até a borda do tile: a aranha não fica flutuando longe dela', () => {
    // A colisão é o tile inteiro; se o desenho for mais fino, a aranha anda/pendura no "nada".
    const art = bakeRooftops();
    const W = art.canvas.width;
    const painted = (x: number, y: number) => art.canvas.data[(y * W + x) * 4 + 3] > 0;
    const cols = ROOFTOP_MAP[0].length;
    const solidAt = (tx: number, ty: number) => tx >= 0 && ty >= 0 && tx < cols && ty < ROOFTOP_MAP.length && isRooftopSolid(ROOFTOP_MAP[ty][tx]);
    const thin: string[] = [];
    ROOFTOP_MAP.forEach((row, ty) => {
      for (let tx = 0; tx < cols; tx++) {
        if (!isRooftopSolid(row[tx]) || rooftopTile(row[tx]).material === 'street') continue;
        const faces: [boolean, (i: number) => [number, number]][] = [
          [!solidAt(tx, ty - 1), (i) => [tx * TILE + i, ty * TILE]],
          [!solidAt(tx, ty + 1), (i) => [tx * TILE + i, ty * TILE + TILE - 1]],
          [!solidAt(tx - 1, ty), (i) => [tx * TILE, ty * TILE + i]],
          [!solidAt(tx + 1, ty), (i) => [tx * TILE + TILE - 1, ty * TILE + i]],
        ];
        for (const [exposed, at] of faces) {
          if (!exposed) continue;
          let n = 0;
          for (let i = 0; i < TILE; i++) if (painted(...at(i))) n++;
          // Pontas arredondadas (galhos) podem perder alguns pixels; mais que isso é peça flutuando.
          if (n < TILE * 0.6) thin.push(`${row[tx]} (${tx}, ${ty}): ${n}/16`);
        }
      }
    });
    expect(thin).toEqual([]);
  });

  it('o outdoor tem pernas até a passarela (não flutua)', () => {
    const billboardBottom = ROOFTOP_MAP.length - 1 - [...ROOFTOP_MAP].reverse().findIndex((row) => row.includes('g'));
    const catwalkRow = ROOFTOP_MAP.findIndex((row) => row.includes('y'));
    for (let ty = billboardBottom + 1; ty < catwalkRow; ty++) expect(ROOFTOP_MAP[ty].slice(85, 101)).toContain('P');
  });

  it('um recorte tem o tamanho pedido', () => {
    const art = bakeRooftops(ROOFTOP_MAP, { tx: 20, ty: 10, w: 15, h: 9 });
    expect([art.canvas.width, art.canvas.height]).toEqual([240, 144]);
  });

  it('o pé e os detritos têm o tamanho certo', () => {
    expect([buildZombieFoot().width, buildZombieFoot().height]).toEqual([FOOT.w, FOOT.h]);
    expect(buildDebrisSheet().width).toBe(14 * 4);
  });
});
