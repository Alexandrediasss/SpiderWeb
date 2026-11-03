import { describe, expect, it } from 'vitest';
import { ACT3, RECAP, TILE } from '../src/config';
import { HOUSE_MAP, RATS } from '../src/level/houseMap';
import { isSolidChar } from '../src/level/legend';
import {
  ACT3_ENDING_START,
  ACT3_WINDOW,
  CHANDELIER_DEF,
  GOO,
  NEIGHBOR_MAP,
  NEIGHBOR_RATS,
  SICK_DEF,
} from '../src/level/neighborHouse';
import { ACT1_RECAP, ACT2_RECAP, ACT3_RECAP } from '../src/level/recaps';
import { ENDING_START, END_ZONE, ROOFTOP_MAP, STREET_ROW, isRooftopSolid } from '../src/level/rooftops';
import { LevelGrid } from '../src/physics/LevelGrid';
import { SpiderMotor } from '../src/systems/SpiderMotor';
import { Chandelier } from '../src/systems/chandelier';
import { Combat } from '../src/systems/combat';
import { GooField } from '../src/systems/goo';
import { emptyInput } from '../src/systems/input';
import { Kitchen, type KitchenEvent, kitchenCues } from '../src/systems/kitchen';
import { type RecapActors, RecapDirector, type RecapShot, RecapRun, goalReached } from '../src/systems/recap';
import { inRoofHole } from '../src/systems/roofHole';
import { Sick } from '../src/systems/sick';
import { DT } from './helpers';

type World = Pick<RecapActors, 'stepWorld' | 'cues'>;

/** Roda o resumo como a cena roda (passos fixos, aranha invencível, ratos com semente fixa). */
function run(
  shots: RecapShot[],
  grid: LevelGrid,
  combat: Combat | null,
  onStep?: (m: SpiderMotor) => void,
  world: (motor: SpiderMotor) => World = () => ({}),
) {
  const motor = new SpiderMotor(grid, 0, 0);
  // Como no ato 2: a borda do mapa é uma parede invisível.
  if (grid.outside === 'edge') motor.bounds = { minX: 0, maxX: grid.widthPx };
  const rec = new RecapRun(shots, { motor, combat, stepSpider: (dt, input) => motor.update(dt, input), ...world(motor) }, TILE);
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
    const v = { x: 10, y: 20, surface: 'floor' as const, hasRope: false, rats: [], cues: {} };
    expect(goalReached({ minX: 5, maxY: 30, attached: true }, v)).toBe(true);
    expect(goalReached({ attached: 'ceiling' }, v)).toBe(false);
    expect(goalReached({ maxX: 5 }, v)).toBe(false);
  });

  it('corta para cada plano, segura o fim e termina', () => {
    const shots: RecapShot[] = [
      { name: 'a', start: { tx: 0, ty: 1 }, zoom: 1, actions: [{ type: 'wait', sec: 0.5 }], holdSec: 0.5 },
      { name: 'b', start: { tx: 2, ty: 1 }, zoom: 1, actions: [{ type: 'read', letter: 'x', sec: 0.2 }], holdSec: 0.2 },
    ];
    const { director, reads, motor } = run(shots, grid, null);
    expect(director.done).toBe(true);
    expect(director.timeouts).toEqual([]);
    expect(reads).toEqual(['x']);
    expect(motor.body.x).toBeCloseTo(2.5 * 16);
  });

  it('ação que não chega no objetivo termina no tempo máximo e fica registrada', () => {
    const shots: RecapShot[] = [
      { name: 'stuck', start: { tx: 0, ty: 1 }, zoom: 1, actions: [{ type: 'move', move: { x: 0, y: 0 }, until: { minX: 999 }, maxSec: 0.3 }], holdSec: 0 },
    ];
    expect(run(shots, grid, null).director.timeouts).toEqual(['stuck#0']);
  });

  it('atira numa marca até ela acabar e espera outra', () => {
    const shots: RecapShot[] = [
      {
        name: 'cue',
        start: { tx: 0, ty: 1 },
        zoom: 1,
        actions: [
          { type: 'shoot', kind: 'trap', cue: 'target', everySec: 0.5, maxSec: 2 },
          { type: 'await', cue: 'later', maxSec: 2 },
        ],
        holdSec: 0,
      },
    ];
    const d = new RecapDirector(shots);
    const view = (done: boolean, later: boolean) => ({
      x: 8,
      y: 24,
      surface: 'floor' as const,
      hasRope: false,
      rats: [],
      cues: { target: { x: 60, y: 24, done }, later: { x: 0, y: 0, done: later } },
    });
    d.step(DT, view(false, false));
    const first = d.step(DT, view(false, false)).input;
    expect(first.trapPressed).toBe(true);
    expect(first.aim).toEqual({ x: 60, y: 24 });
    // Não atira de novo antes de `everySec`.
    expect(d.step(DT, view(false, false)).input.trapPressed).toBe(false);
    d.step(DT, view(true, false));
    expect(d.action).toBe(1);
    d.step(DT, view(true, false));
    expect(d.action).toBe(1);
    d.step(DT, view(true, true));
    expect(d.action).toBe(2);
    expect(d.timeouts).toEqual([]);
  });
});

describe('resumo do ato 1 (THE HOUSE)', () => {
  const grid = LevelGrid.fromAscii(HOUSE_MAP, TILE, isSolidChar);

  it('toda ação chega no objetivo com a física de verdade', () => {
    const { director } = run(ACT1_RECAP, grid, new Combat(grid, RATS, RECAP.seed));
    expect(director.done).toBe(true);
    expect(director.timeouts).toEqual([]);
  });

  it('mata os ratos da sala, da cama e do sótão; lê duas cartas', () => {
    const { reads, combat } = run(ACT1_RECAP, grid, new Combat(grid, RATS, RECAP.seed));
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
    const { director } = run(ACT2_RECAP, grid, null);
    expect(director.done).toBe(true);
    expect(director.timeouts).toEqual([]);
  });

  it('nunca encosta na rua (seria pisada) e termina no telhado da casa vizinha', () => {
    let lowest = 0;
    const { motor } = run(ACT2_RECAP, grid, null, (m) => (lowest = Math.max(lowest, m.body.y + m.body.half)));
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

/**
 * Roda o resumo do ato 3 como a NeighborScene: ratos, o doente e o lustre com a semente fixa, e a gosma
 * andando no mesmo passo fixo. Anota cada vez que a gosma encosta na Mary.
 */
function runAct3() {
  const grid = LevelGrid.fromAscii(NEIGHBOR_MAP, TILE, isSolidChar);
  const combat = new Combat(grid, NEIGHBOR_RATS, RECAP.seed);
  const kitchen = new Kitchen(new Sick(SICK_DEF, RECAP.seed), new Chandelier(CHANDELIER_DEF));
  combat.targets = kitchen.targets;
  const goo = new GooField(GOO.drips, GOO.jets, GOO.pools);
  const gooTouches: string[] = [];
  const kitchenEvents: KitchenEvent['type'][] = [];
  const out = run(ACT3_RECAP, grid, combat, undefined, (motor) => ({
    stepWorld: (dt, fired) => {
      goo.update(dt, grid);
      if (goo.touches(motor.body)) gooTouches.push(`${motor.body.x.toFixed(0)},${motor.body.y.toFixed(0)}`);
      for (const e of [...kitchen.onCombat(fired), ...kitchen.update(dt, motor.body)]) kitchenEvents.push(e.type);
    },
    cues: () => kitchenCues(kitchen),
  }));
  return { ...out, grid, kitchen, gooTouches, kitchenEvents };
}

describe('resumo do ato 3 (THE HOUSE NEXT DOOR)', () => {
  const r = runAct3();

  it('toda ação chega no objetivo com a física de verdade (e a gosma, o doente e o lustre)', () => {
    expect(r.director.done).toBe(true);
    expect(r.director.timeouts).toEqual([]);
  });

  it('a gosma nunca encosta na Mary', () => {
    expect(r.gooTouches).toEqual([]);
  });

  it('lê as três cartas na ordem e mata só o rato do corredor', () => {
    expect(r.reads).toEqual(['day22', 'day35', 'day40']);
    expect(r.combat?.rats.map((rat) => rat.alive)).toEqual([true, false, true]);
  });

  it('acerta o doente, corta a corda e o lustre cai nele', () => {
    expect(r.kitchenEvents).toContain('sickShot');
    expect(r.kitchenEvents).toContain('ropeCut');
    expect(r.kitchenEvents).toContain('sickDefeated');
    expect(r.kitchen.sick.crushed).toBe(true);
    expect(r.kitchenEvents).not.toContain('maryCrushed');
    expect(r.motor.surface).toBe('ceiling');
  });

  it('cada plano começa num tile vazio em cima de chão', () => {
    for (const s of ACT3_RECAP) {
      expect(r.grid.isSolidTile(s.start.tx, s.start.ty), s.name).toBe(false);
      expect(r.grid.isSolidTile(s.start.tx, s.start.ty + 1), s.name).toBe(true);
    }
  });
});

describe('janela assistida pelo SCENES', () => {
  it('da bancada, andando para a esquerda, a Mary sobe a parede e entra no vão da janela', () => {
    const grid = LevelGrid.fromAscii(NEIGHBOR_MAP, TILE, isSolidChar);
    const s = ACT3_ENDING_START;
    expect(grid.isSolidTile(s.tx, s.ty)).toBe(false);
    expect(grid.isSolidTile(s.tx, s.ty + 1)).toBe(true);
    const motor = new SpiderMotor(grid, (s.tx + 0.5) * TILE, (s.ty + 1) * TILE - 5);
    motor.surface = 'floor';
    const input = { ...emptyInput(), move: { x: -1, y: 0 } };
    let frames = 0;
    while (frames++ < 60 * ACT3.endApproachMaxSec && !inRoofHole(motor.body, ACT3_WINDOW, TILE)) motor.update(DT, input);
    expect(inRoofHole(motor.body, ACT3_WINDOW, TILE)).toBe(true);
  });
});
