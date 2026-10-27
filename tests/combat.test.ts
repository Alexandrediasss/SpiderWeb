import { describe, expect, it } from 'vitest';
import { PLAYER, RAT, SHOTS } from '../src/config';
import type { RatSpawn } from '../src/level/houseMap';
import { SpiderMotor } from '../src/systems/SpiderMotor';
import { Combat, Health, aimAtTarget } from '../src/systems/combat';
import { Rat } from '../src/systems/rat';
import { DT, grid, input } from './helpers';

/** Corredor largo: chão na linha 7, teto na linha 0. */
const HALL = ['#'.repeat(24), ...Array.from({ length: 6 }, () => '#' + '.'.repeat(22) + '#'), '#'.repeat(24)];
/** Plataforma suspensa (tiles 8..13 da linha 5) num salão vazio. */
const LEDGE = [
  '#'.repeat(24),
  ...Array.from({ length: 4 }, () => '#' + '.'.repeat(22) + '#'),
  '#.......######.........#',
  '#' + '.'.repeat(22) + '#',
  '#' + '.'.repeat(22) + '#',
  '#'.repeat(24),
];
/** Parede no meio do corredor (coluna 12). */
const WALLED = HALL.map((row, y) => (y > 0 && y < 7 ? row.slice(0, 12) + '#' + row.slice(13) : row));

const SPAWN: RatSpawn = { name: 'teste', tx: 6, ty: 6, minTx: 3, maxTx: 10 };
const FLOOR_Y = 7 * 16;

function step(rat: Rat, g: ReturnType<typeof grid>, seconds: number, target: { x: number; y: number } | null) {
  const events = [];
  for (let i = 0; i < seconds / DT; i++) events.push(...rat.update(DT, g, target));
  return events;
}

describe('Rat', () => {
  it('patrulha sem sair da área', () => {
    const g = grid(HALL);
    const rat = new Rat(SPAWN, 16, 1);
    let minX = Infinity;
    let maxX = -Infinity;
    for (let i = 0; i < 30 / DT; i++) {
      rat.update(DT, g, null);
      minX = Math.min(minX, rat.body.x);
      maxX = Math.max(maxX, rat.body.x);
    }
    expect(minX).toBeGreaterThanOrEqual(3.5 * 16 - 2);
    expect(maxX).toBeLessThanOrEqual(10.5 * 16 + 2);
    expect(maxX - minX).toBeGreaterThan(80);
    expect(rat.state).toBe('patrol');
  });

  it('não cai da beirada da plataforma', () => {
    const g = grid(LEDGE);
    const rat = new Rat({ name: 'p', tx: 10, ty: 4, minTx: 2, maxTx: 20 }, 16, 3);
    for (let i = 0; i < 20 / DT; i++) {
      rat.update(DT, g, null);
      expect(rat.body.y).toBeLessThan(5 * 16);
    }
  });

  it('vê na frente; de costas só bem de perto', () => {
    const g = grid(HALL);
    const rat = new Rat(SPAWN, 16, 1);
    step(rat, g, 0.2, null);
    rat.facing = 1;
    const y = rat.body.y;
    expect(rat.canSee(g, { x: rat.body.x + 80, y })).toBe(true);
    expect(rat.canSee(g, { x: rat.body.x - 80, y })).toBe(false);
    expect(rat.canSee(g, { x: rat.body.x - RAT.noticeRange + 4, y })).toBe(true);
    expect(rat.canSee(g, { x: rat.body.x + RAT.sightRange + 20, y })).toBe(false);
  });

  it('não vê através da parede', () => {
    const g = grid(WALLED);
    const rat = new Rat(SPAWN, 16, 1);
    step(rat, g, 0.2, null);
    rat.facing = 1;
    expect(rat.canSee(g, { x: 15 * 16, y: rat.body.y })).toBe(false);
  });

  it('percebe a aranha, persegue e morde depois do bote', () => {
    const g = grid(HALL);
    const rat = new Rat(SPAWN, 16, 1);
    step(rat, g, 0.2, null);
    const target = { x: rat.body.x + 24, y: FLOOR_Y - 5 };
    const events = step(rat, g, 1.5, target);
    expect(events.some((e) => e.type === 'spotted')).toBe(true);
    expect(events.some((e) => e.type === 'bite')).toBe(true);
    // A mordida espera o bote e respeita o intervalo: no máximo 2 em 1,5 s.
    expect(events.filter((e) => e.type === 'bite').length).toBeLessThanOrEqual(2);
  });

  it('preso na teia não morde por 5 segundos e depois volta', () => {
    const g = grid(HALL);
    const rat = new Rat(SPAWN, 16, 1);
    step(rat, g, 0.2, null);
    const target = { x: rat.body.x + 10, y: FLOOR_Y - 5 };
    expect(rat.trap()).toBe(true);
    const during = step(rat, g, SHOTS.trapSec - 0.1, target);
    expect(during.some((e) => e.type === 'bite')).toBe(false);
    expect(rat.state).toBe('trapped');
    const after = step(rat, g, 1.5, target);
    expect(rat.state).not.toBe('trapped');
    expect(after.some((e) => e.type === 'bite')).toBe(true);
  });

  it('leva dano, morre com 3 e some depois da animação', () => {
    const g = grid(HALL);
    const rat = new Rat(SPAWN, 16, 1);
    expect(rat.damage(1, 0)).toBe('hurt');
    expect(rat.state).toBe('hurt');
    expect(rat.damage(1, 0)).toBe('hurt');
    expect(rat.damage(1, 0)).toBe('died');
    expect(rat.damage(1, 0)).toBe('ignored');
    expect(rat.trap()).toBe(false);
    step(rat, g, RAT.deathSec + 0.1, null);
    expect(rat.gone).toBe(true);
  });
});

describe('Health', () => {
  it('fica invencível um tempo depois de cada dano', () => {
    const h = new Health(3);
    expect(h.hit()).toBe(true);
    expect(h.hit()).toBe(false);
    h.update(PLAYER.invulnSec + 0.01);
    expect(h.hit()).toBe(true);
    expect(h.hp).toBe(1);
  });
});

describe('Combat', () => {
  function setup() {
    const g = grid(HALL);
    const combat = new Combat(g, [SPAWN], 1);
    const rat = combat.rats[0];
    // Aranha longe e alta, para o rato não perseguir.
    const spider = new SpiderMotor(g, 21 * 16, 2 * 16);
    combat.update(0.2, spider);
    return { g, combat, rat, spider };
  }

  function run(combat: Combat, spider: SpiderMotor, seconds: number) {
    const events = [];
    for (let i = 0; i < seconds / DT; i++) {
      spider.update(DT, input());
      events.push(...combat.update(DT, spider));
    }
    return events;
  }

  it('a teia de ataque tira 1 de vida do rato', () => {
    const { combat, rat, spider } = setup();
    const from = { x: rat.body.x - 60, y: rat.body.y };
    expect(combat.fire('attack', from, { x: 1, y: 0 })).toEqual([{ type: 'fire', kind: 'attack' }]);
    const events = run(combat, spider, 0.5);
    expect(events.some((e) => e.type === 'ratHurt')).toBe(true);
    expect(rat.hp).toBe(RAT.hp - SHOTS.damage);
    expect(combat.shots.length).toBe(0);
  });

  it('a teia que prende deixa o rato preso', () => {
    const { combat, rat, spider } = setup();
    combat.fire('trap', { x: rat.body.x + 50, y: rat.body.y }, { x: -1, y: 0 });
    const events = run(combat, spider, 0.5);
    expect(events.some((e) => e.type === 'ratTrapped')).toBe(true);
    expect(rat.state).toBe('trapped');
    expect(rat.hp).toBe(RAT.hp);
  });

  it('teia que bate na parede some com um respingo', () => {
    const { combat, spider } = setup();
    combat.fire('attack', { x: 40, y: 40 }, { x: 0, y: -1 });
    const events = run(combat, spider, 0.3);
    expect(events.some((e) => e.type === 'splat')).toBe(true);
    expect(combat.shots.length).toBe(0);
  });

  it('respeita a recarga', () => {
    const { combat } = setup();
    expect(combat.fire('attack', { x: 40, y: 40 }, { x: 1, y: 0 }).length).toBe(1);
    expect(combat.fire('attack', { x: 40, y: 40 }, { x: 1, y: 0 }).length).toBe(0);
    expect(combat.fire('trap', { x: 40, y: 40 }, { x: 1, y: 0 }).length).toBe(1);
  });

  it('mordidas tiram vida, empurram a aranha e na terceira ela morre', () => {
    const g = grid(HALL);
    const combat = new Combat(g, [SPAWN], 1);
    const rat = combat.rats[0];
    const spider = new SpiderMotor(g, rat.body.x + 14, FLOOR_Y - 6);
    const events: string[] = [];
    let kicked = false;
    for (let i = 0; i < 12 / DT && !combat.health.dead; i++) {
      // A aranha fica parada perto do rato (volta para o lugar depois de cada empurrão).
      if (spider.surface === 'air' && combat.health.invulnLeft > 0) kicked = true;
      if (spider.surface !== 'air') spider.body.x = rat.body.x + 14;
      spider.update(DT, input());
      for (const e of combat.update(DT, spider)) events.push(e.type);
    }
    expect(kicked).toBe(true);
    expect(events.filter((e) => e === 'spiderHurt').length).toBe(PLAYER.maxHp);
    expect(events).toContain('spiderDied');
    expect(combat.fire('attack', { x: 0, y: 0 }, { x: 1, y: 0 })).toEqual([]);
  });
});

describe('aimAtTarget', () => {
  it('vira para um rato perto da mira, mas não atrás da parede nem longe do ângulo', () => {
    const g = grid(WALLED);
    const from = { x: 40, y: 90 };
    const near = { x: 140, y: 100, vx: 0, vy: 0, half: 6 };
    const d = aimAtTarget(g, from, { x: 1, y: 0 }, [near], 230, 12);
    expect(d.y).toBeGreaterThan(0);
    expect(aimAtTarget(g, from, { x: 0, y: -1 }, [near], 230, 12)).toEqual({ x: 0, y: -1 });
    const behindWall = { x: 260, y: 90, vx: 0, vy: 0, half: 6 };
    expect(aimAtTarget(g, from, { x: 1, y: 0 }, [behindWall], 300, 12)).toEqual({ x: 1, y: 0 });
  });
});
