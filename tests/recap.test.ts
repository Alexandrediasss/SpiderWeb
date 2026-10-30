import { describe, expect, it } from 'vitest';
import { RECAP, TILE } from '../src/config';
import { HOUSE_MAP, RATS } from '../src/level/houseMap';
import { isSolidChar } from '../src/level/legend';
import { ACT1_RECAP, ACT2_RECAP } from '../src/level/recaps';
import { ENDING_START, END_ZONE, ROOFTOP_MAP, STREET_ROW, isRooftopSolid } from '../src/level/rooftops';
import { LevelGrid } from '../src/physics/LevelGrid';
import { SpiderMotor } from '../src/systems/SpiderMotor';
import { Combat } from '../src/systems/combat';
import { type RecapShot, RecapRun, goalReached } from '../src/systems/recap';

/** Roda o resumo como a cena roda (passos fixos, aranha invencível, ratos com semente fixa). */
function run(shots: RecapShot[], grid: LevelGrid, withRats: boolean, onStep?: (m: SpiderMotor) => void) {
  const motor = new SpiderMotor(grid, 0, 0);
  // Como no ato 2: a borda do mapa é uma parede invisível.
  if (grid.outside === 'edge') motor.bounds = { minX: 0, maxX: grid.widthPx };
  const combat = withRats ? new Combat(grid, RATS, RECAP.seed) : null;
  const rec = new RecapRun(shots, { motor, combat, stepSpider: (dt, input) => motor.update(dt, input) }, TILE);
  const reads: string[] = [];
  // Quadros irregulares (como no navegador): o passo fixo deixa o resultado igual.
  for (let i = 0; i < 60 * 180 && !rec.director.done; i++) {
    const { events } = rec.advance(i % 7 === 3 ? 1 / 30 : 1 / 61);
    for (const e of events) if (e.type === 'read') reads.push(e.letter);
    onStep?.(motor);
  }
  return { director: rec.director, reads, motor, combat };
}

describe('diretor do resumo', () => {
  const grid = LevelGrid.fromAscii(['....', '....', 'xxxx'], 16, (c) => c === 'x');

  it('objetivo: faixa de posição e superfície', () => {
    const v = { x: 10, y: 20, surface: 'floor' as const, hasRope: false, rats: [] };
    expect(goalReached({ minX: 5, maxY: 30, attached: true }, v)).toBe(true);
    expect(goalReached({ attached: 'ceiling' }, v)).toBe(false);
    expect(goalReached({ maxX: 5 }, v)).toBe(false);
  });

  it('corta para cada plano, segura o fim e termina', () => {
    const shots: RecapShot[] = [
      { name: 'a', start: { tx: 0, ty: 1 }, zoom: 1, actions: [{ type: 'wait', sec: 0.5 }], holdSec: 0.5 },
      { name: 'b', start: { tx: 2, ty: 1 }, zoom: 1, actions: [{ type: 'read', letter: 'x', sec: 0.2 }], holdSec: 0.2 },
    ];
    const { director, reads, motor } = run(shots, grid, false);
    expect(director.done).toBe(true);
    expect(director.timeouts).toEqual([]);
    expect(reads).toEqual(['x']);
    expect(motor.body.x).toBeCloseTo(2.5 * 16);
  });

  it('ação que não chega no objetivo termina no tempo máximo e fica registrada', () => {
    const shots: RecapShot[] = [
      { name: 'stuck', start: { tx: 0, ty: 1 }, zoom: 1, actions: [{ type: 'move', move: { x: 0, y: 0 }, until: { minX: 999 }, maxSec: 0.3 }], holdSec: 0 },
    ];
    expect(run(shots, grid, false).director.timeouts).toEqual(['stuck#0']);
  });
});

describe('resumo do ato 1 (THE HOUSE)', () => {
  const grid = LevelGrid.fromAscii(HOUSE_MAP, TILE, isSolidChar);

  it('toda ação chega no objetivo com a física de verdade', () => {
    const { director } = run(ACT1_RECAP, grid, true);
    expect(director.done).toBe(true);
    expect(director.timeouts).toEqual([]);
  });

  it('mata os ratos da sala, da cama e do sótão; lê duas cartas', () => {
    const { reads, combat } = run(ACT1_RECAP, grid, true);
    expect(reads).toEqual(['table', 'bed']);
    expect(combat?.rats.map((r) => r.alive)).toEqual([false, true, false, false]);
  });

  it('cada plano começa num tile vazio em cima de chão', () => {
    for (const s of ACT1_RECAP) {
      expect(grid.isSolidTile(s.start.tx, s.start.ty), s.name).toBe(false);
      expect(grid.isSolidTile(s.start.tx, s.start.ty + 1), s.name).toBe(true);
    }
  });
});

describe('resumo do ato 2 (ACROSS THE STREET)', () => {
  const grid = LevelGrid.fromAscii(ROOFTOP_MAP, TILE, isRooftopSolid, 'edge');

  it('toda ação chega no objetivo com a física de verdade (e o vento dos planos)', () => {
    const { director } = run(ACT2_RECAP, grid, false);
    expect(director.done).toBe(true);
    expect(director.timeouts).toEqual([]);
  });

  it('nunca encosta na rua (seria pisada) e termina no telhado da casa vizinha', () => {
    let lowest = 0;
    const { motor } = run(ACT2_RECAP, grid, false, (m) => (lowest = Math.max(lowest, m.body.y + m.body.half)));
    expect(lowest).toBeLessThan(STREET_ROW * TILE - 8);
    expect(motor.surface).toBe('floor');
    expect(motor.body.x).toBeGreaterThan(182 * TILE);
  });

  it('cada plano começa num tile vazio em cima de chão', () => {
    for (const s of ACT2_RECAP) {
      expect(grid.isSolidTile(s.start.tx, s.start.ty), s.name).toBe(false);
      expect(grid.isSolidTile(s.start.tx, s.start.ty + 1), s.name).toBe(true);
    }
  });
});

describe('chaminé assistida pelo SCENES', () => {
  it('começa no beiral da casa vizinha, dentro da área do fim do ato', () => {
    const grid = LevelGrid.fromAscii(ROOFTOP_MAP, TILE, isRooftopSolid, 'edge');
    expect(grid.isSolidTile(ENDING_START.tx, ENDING_START.ty)).toBe(false);
    expect(grid.isSolidTile(ENDING_START.tx, ENDING_START.ty + 1)).toBe(true);
    expect(ENDING_START.tx).toBeGreaterThanOrEqual(END_ZONE.x0);
    expect(ENDING_START.tx).toBeLessThanOrEqual(END_ZONE.x1);
  });
});
