import { describe, expect, it } from 'vitest';
import { CHANDELIER, SICK, SPIDER } from '../src/config';
import type { Body } from '../src/physics/collide';
import { Chandelier } from '../src/systems/chandelier';
import { Sick, boxesOverlap } from '../src/systems/sick';
import { DT } from './helpers';

const FLOOR = 400;
const def = { x: 200, floorY: FLOOR, minX: 100, maxX: 300 };
const mary = (x: number, y = FLOOR - SPIDER.half): Body => ({ x, y, vx: 0, vy: 0, half: SPIDER.half });

function run(s: Sick, sec: number, target: Body | null) {
  const events = [];
  for (let t = 0; t < sec; t += DT) events.push(...s.update(DT, target));
  return events;
}

describe('o doente', () => {
  it('passivo: anda pela cozinha e não bate nem com a Mary colada nele', () => {
    const s = new Sick(def, 3);
    const events = run(s, 8, mary(s.x + 10));
    expect(events.some((e) => e.type === 'hit' || e.type === 'windup')).toBe(false);
    expect(s.state).toBe('patrol');
    expect(s.x).toBeGreaterThanOrEqual(def.minX);
    expect(s.x).toBeLessThanOrEqual(def.maxX);
  });

  it('a teia de ataque tira vida e deixa bravo: ele persegue e bate quando alcança', () => {
    const s = new Sick(def, 3);
    expect(s.damage()).toBe('hurt');
    expect(s.hp).toBe(SICK.hp - 1);
    expect(s.aggro).toBe(true);
    const target = mary(s.x + 120);
    const x0 = s.x;
    const events = run(s, 6, target);
    expect(s.x).toBeGreaterThan(x0 + 60);
    expect(events.some((e) => e.type === 'windup')).toBe(true);
    expect(events.some((e) => e.type === 'hit')).toBe(true);
  });

  it('dá para fugir durante o bote', () => {
    const s = new Sick(def, 3);
    s.damage();
    const target = mary(s.x + 15);
    const events = s.update(DT, target);
    expect(events.map((e) => e.type)).toContain('windup');
    target.x = s.x - 80;
    expect(run(s, SICK.windupSec + 0.1, target).some((e) => e.type === 'hit')).toBe(false);
  });

  it('não alcança a Mary no teto: fica embaixo esticando o braço', () => {
    const s = new Sick(def, 3);
    s.damage();
    const target = mary(s.x + 40, FLOOR - 200);
    const events = run(s, 6, target);
    expect(events.some((e) => e.type === 'hit')).toBe(false);
    expect(s.reaching).toBe(true);
    expect(Math.abs(s.x - target.x)).toBeLessThan(SICK.reachX);
  });

  it('a teia de prender segura parado e também deixa bravo', () => {
    const s = new Sick(def, 3);
    expect(s.trap()).toBe(true);
    expect(s.aggro).toBe(true);
    const x0 = s.x;
    run(s, SICK.trapSec - 0.1, mary(s.x + 120));
    expect(s.x).toBe(x0);
    run(s, 1, mary(s.x + 120));
    expect(s.x).toBeGreaterThan(x0);
  });

  it('morre com a vida zerada; o lustre mata na hora', () => {
    const s = new Sick(def, 3);
    for (let i = 0; i < SICK.hp - 1; i++) expect(s.damage()).toBe('hurt');
    expect(s.damage()).toBe('died');
    expect(s.alive).toBe(false);
    expect(s.damage()).toBe('ignored');
    expect(s.hits(s.x, FLOOR - 10)).toBe(false);

    const c = new Sick(def, 4);
    expect(c.crush()).toBe(true);
    expect(c.crushed).toBe(true);
    expect(c.alive).toBe(false);
  });

  it('a teia acerta na caixa dele (do chão até a cabeça)', () => {
    const s = new Sick(def, 3);
    expect(s.hits(s.x, FLOOR - 5)).toBe(true);
    expect(s.hits(s.x, FLOOR - SICK.h + 2)).toBe(true);
    expect(s.hits(s.x, FLOOR - SICK.h - 5)).toBe(false);
    expect(s.hits(s.x + SICK.w, FLOOR - 10)).toBe(false);
  });

  it('a Mary morreu na briga: ele volta ao normal (se estiver vivo)', () => {
    const s = new Sick(def, 3);
    s.damage();
    run(s, 2, mary(s.x + 100));
    s.reset();
    expect([s.hp, s.aggro, s.state, s.x]).toEqual([SICK.hp, false, 'patrol', def.x]);
  });
});

describe('o lustre', () => {
  const cdef = { x: 200, y: 100, floorY: FLOOR };

  it('a teia corta a corda; longe da corda não', () => {
    const c = new Chandelier(cdef);
    expect(c.hitsRope(200, 100 + CHANDELIER.ropeLength / 2)).toBe(true);
    expect(c.hitsRope(200 + CHANDELIER.ropeHitPx + 3, 130)).toBe(false);
    expect(c.hitsRope(200, 100 + CHANDELIER.ropeLength + 12)).toBe(false);
  });

  it('cortado, cai em linha reta até o chão', () => {
    const c = new Chandelier(cdef);
    expect(c.cut()).toBe(true);
    expect(c.cut()).toBe(false);
    let landed = false;
    for (let t = 0; t < 3 && !landed; t += DT) landed = c.update(DT);
    expect(landed).toBe(true);
    expect(c.state).toBe('fallen');
    expect(c.box.bottom).toBeCloseTo(FLOOR);
    expect(c.hitsRope(200, 130)).toBe(false);
  });

  it('caindo, cruza a caixa do doente que está embaixo (e não a de quem está longe)', () => {
    const c = new Chandelier(cdef);
    const under = new Sick({ ...def, x: 200 }, 1);
    const far = new Sick({ ...def, x: 290 }, 1);
    c.cut();
    let hitUnder = false;
    let hitFar = false;
    for (let t = 0; t < 3 && c.state === 'falling'; t += DT) {
      c.update(DT);
      hitUnder ||= boxesOverlap(c.box, under.box);
      hitFar ||= boxesOverlap(c.box, far.box);
    }
    expect(hitUnder).toBe(true);
    expect(hitFar).toBe(false);
  });
});
