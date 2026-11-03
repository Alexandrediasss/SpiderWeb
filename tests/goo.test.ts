import { describe, expect, it } from 'vitest';
import { GOO_CFG, POISON, SPIDER } from '../src/config';
import type { Body } from '../src/physics/collide';
import { GooField } from '../src/systems/goo';
import { Poison } from '../src/systems/poison';
import { SpiderMotor } from '../src/systems/SpiderMotor';
import { DT, grid, input } from './helpers';

// Sala 10×8 (tiles de 16): teto embaixo da linha 0 (y = 16) e chão em cima da linha 7 (y = 112).
const g = grid();
const FLOOR = 112;
const CEIL = 16;
const body = (x: number, y: number): Body => ({ x, y, vx: 0, vy: 0, half: SPIDER.half });

function step(field: GooField, sec: number) {
  const events = [];
  for (let t = 0; t < sec; t += DT) events.push(...field.update(DT, g));
  return events;
}

describe('goteira de gosma', () => {
  it('a gota se forma, cai e estoura no chão embaixo', () => {
    const f = new GooField([{ x: 40, y: CEIL, every: 0.5 }], []);
    step(f, 0.5 + GOO_CFG.dripFormSec / 2);
    expect(f.drips[0].state).toBe('form');
    const events = step(f, 1.5);
    const splash = events.find((e) => e.type === 'splash');
    expect(splash).toMatchObject({ type: 'splash', x: 40, y: FLOOR });
  });

  it('só acerta enquanto cai, e só quem está embaixo', () => {
    const f = new GooField([{ x: 40, y: CEIL, every: 0.2 }], []);
    const under = body(40, FLOOR - SPIDER.half);
    const aside = body(80, FLOOR - SPIDER.half);
    expect(f.touches(under)).toBe(false);
    let hit = false;
    for (let t = 0; t < 2 && !hit; t += DT) {
      f.update(DT, g);
      expect(f.touches(aside)).toBe(false);
      hit = f.touches(under);
    }
    expect(hit).toBe(true);
    expect(f.drips[0].state).toBe('fall');
  });
});

describe('jorro de gosma', () => {
  it('parado → borbulhando → jorrando → parado, avisando em cada troca', () => {
    const f = new GooField([], [{ x: 60, y: FLOOR, height: 50, idleSec: 1 }]);
    const events = step(f, 1 + GOO_CFG.jetWarnSec + GOO_CFG.jetSpraySec + 0.2);
    expect(events.map((e) => e.type)).toEqual(['jetWarn', 'jetSpray']);
    expect(f.jets[0].state).toBe('idle');
  });

  it('a coluna só acerta jorrando e até a altura dela', () => {
    const f = new GooField([], [{ x: 60, y: FLOOR, height: 50, idleSec: 0.1 }]);
    const low = body(60, FLOOR - 20);
    const high = body(60, FLOOR - 80);
    expect(f.touches(low)).toBe(false);
    step(f, 0.1 + GOO_CFG.jetWarnSec + 0.5);
    expect(f.jets[0].state).toBe('spray');
    expect(GooField.jetHeight(f.jets[0])).toBeCloseTo(50);
    expect(f.touches(low)).toBe(true);
    expect(f.touches(high)).toBe(false);
  });
});

describe('poça de gosma', () => {
  const f = new GooField([], [], [{ x0: 40, x1: 70, y: FLOOR }]);
  it('acerta quem pisa nela, não quem passa por cima', () => {
    expect(f.touches(body(55, FLOOR - SPIDER.half))).toBe(true);
    expect(f.touches(body(55, FLOOR - 30))).toBe(false);
    expect(f.touches(body(20, FLOOR - SPIDER.half))).toBe(false);
  });
});

describe('veneno', () => {
  it('mata depois de POISON.sec, sem reiniciar o tempo ao encostar de novo', () => {
    const p = new Poison();
    expect(p.apply()).toBe(true);
    let died = false;
    for (let t = 0; t < POISON.sec - 1; t += DT) died ||= p.update(DT);
    expect(p.apply()).toBe(false);
    expect(died).toBe(false);
    for (let t = 0; t < 1.1; t += DT) died ||= p.update(DT);
    expect(died).toBe(true);
    expect(p.canWeb).toBe(false);
    p.clear();
    expect(p.active).toBe(false);
    expect(p.canWeb).toBe(true);
  });

  it('envenenada, anda mais devagar e pula mais baixo', () => {
    const walk = (poisoned: boolean) => {
      const m = new SpiderMotor(g, 40, FLOOR - SPIDER.half);
      m.surface = 'floor';
      const p = new Poison();
      if (poisoned) p.apply();
      p.applyTo(m);
      for (let i = 0; i < 20; i++) m.update(DT, input({ move: { x: 1, y: 0 } }));
      return m.body.x - 40;
    };
    expect(walk(true)).toBeLessThan(walk(false) * 0.6);

    const jump = (poisoned: boolean) => {
      const m = new SpiderMotor(g, 80, FLOOR - SPIDER.half);
      m.surface = 'floor';
      const p = new Poison();
      if (poisoned) p.apply();
      p.applyTo(m);
      m.update(DT, input({ jumpPressed: true }));
      let top = m.body.y;
      for (let i = 0; i < 60; i++) {
        m.update(DT, input());
        top = Math.min(top, m.body.y);
      }
      return FLOOR - SPIDER.half - top;
    };
    expect(jump(true)).toBeLessThan(jump(false) * 0.5);
  });
});
