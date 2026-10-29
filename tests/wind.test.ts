import { describe, expect, it } from 'vitest';
import { SPIDER, WIND } from '../src/config';
import { SpiderMotor } from '../src/systems/SpiderMotor';
import { DebrisField } from '../src/systems/debris';
import { LooseWire } from '../src/systems/looseWire';
import { Wind } from '../src/systems/wind';
import { DT, grid, input } from './helpers';

/** Sala grande vazia (o chão na última linha). */
const OPEN = ['####################', ...Array.from({ length: 10 }, () => '#..................#'), '####################'];

function runWind(w: Wind, sec: number): string[] {
  const phases: string[] = [w.phase];
  for (let t = 0; t < sec; t += DT) {
    const p = w.update(DT);
    if (p) phases.push(p);
  }
  return phases;
}

describe('Wind', () => {
  it('ciclo calma → aviso → rajada → fim → calma, com a primeira calma longa', () => {
    const w = new Wind(1);
    expect(runWind(w, WIND.firstCalmSec - 0.1)).toEqual(['calm']);
    const phases = runWind(w, WIND.warnSec + WIND.gustSec + WIND.fadeSec + 0.3);
    expect(phases.slice(1, 5)).toEqual(['warn', 'gust', 'fade', 'calm']);
  });

  it('a força sobe no aviso, chega a 1 na rajada e cai no fim', () => {
    const w = new Wind(2);
    w.forceGust(-1);
    expect(w.strength).toBe(0);
    runWind(w, WIND.warnSec - 0.05);
    expect(w.strength).toBeGreaterThan(WIND.warnStrength * 0.9);
    expect(w.strength).toBeLessThanOrEqual(WIND.warnStrength);
    runWind(w, 0.05 + WIND.rampSec + 0.1);
    expect(w.phase).toBe('gust');
    expect(w.strength).toBe(1);
    expect(w.accel).toBe(-WIND.gustAccel);
  });

  it('na cutscene a força é fixa e o ciclo para', () => {
    const w = new Wind(3);
    w.script(0.2, 1);
    runWind(w, 30);
    expect([w.phase, w.strength, w.dir]).toEqual(['calm', 0.2, 1]);
    w.script(null);
    expect(w.strength).toBe(0);
  });

  it('é determinístico pela semente', () => {
    const a = new Wind(9);
    const b = new Wind(9);
    for (let i = 0; i < 3000; i++) {
      a.update(DT);
      b.update(DT);
    }
    expect([a.phase, a.dir, a.strength]).toEqual([b.phase, b.dir, b.strength]);
  });
});

describe('vento na aranha', () => {
  it('no ar, empurra até a velocidade máxima do vento', () => {
    const m = new SpiderMotor(grid(OPEN), 160, 40);
    m.wind = -WIND.gustAccel;
    for (let i = 0; i < 30; i++) m.update(DT, input());
    expect(m.surface).toBe('air');
    expect(m.body.vx).toBeLessThan(-WIND.maxAirSpeed * 0.9);
    expect(m.body.vx).toBeGreaterThan(-WIND.maxAirSpeed - WIND.gustAccel * DT);
  });

  it('na teia, empurra o pêndulo para o lado', () => {
    const still = new SpiderMotor(grid(OPEN), 160, 100);
    const blown = new SpiderMotor(grid(OPEN), 160, 100);
    for (const m of [still, blown]) m.update(DT, input({ webPressed: true, webHeld: true, aim: { x: 160, y: 0 } }));
    blown.wind = WIND.gustAccel;
    for (let i = 0; i < 30; i++) {
      still.update(DT, input({ webHeld: true }));
      blown.update(DT, input({ webHeld: true }));
    }
    expect(blown.rope).not.toBeNull();
    expect(blown.body.x - still.body.x).toBeGreaterThan(20);
  });

  it('grudada, nunca solta; andando contra o vento fica mais lenta e a favor, mais rápida', () => {
    const floorY = 11 * 16 - SPIDER.half;
    const make = (wind: number) => {
      const m = new SpiderMotor(grid(OPEN), 100, floorY);
      m.surface = 'floor';
      m.wind = wind;
      for (let i = 0; i < 30; i++) m.update(DT, input({ move: { x: 1, y: 0 } }));
      return m;
    };
    const calm = make(0);
    const against = make(-WIND.gustAccel);
    const behind = make(WIND.gustAccel);
    for (const m of [calm, against, behind]) expect(m.surface).toBe('floor');
    expect(against.body.x - 100).toBeCloseTo((calm.body.x - 100) * WIND.walkMin, 0);
    expect(behind.body.x).toBeGreaterThan(calm.body.x);
    // Parada, nem se mexe.
    const idle = new SpiderMotor(grid(OPEN), 100, floorY);
    idle.surface = 'floor';
    idle.wind = -WIND.gustAccel;
    for (let i = 0; i < 30; i++) idle.update(DT, input());
    expect([idle.surface, idle.body.x]).toEqual(['floor', 100]);
  });
});

describe('DebrisField', () => {
  const view = { x: 0, y: 0, width: 480, height: 270 };
  const gust = { phase: 'gust' as const, dir: -1 as const, strength: 1 };

  it('só nasce detrito na rajada forte, na borda de onde vem o vento', () => {
    const f = new DebrisField(4);
    for (let i = 0; i < 120; i++) f.update(DT, { phase: 'warn', dir: -1, strength: 0.18 }, view, { x: 240, y: 135 });
    expect(f.items.length).toBe(0);
    f.update(DT, gust, view, { x: 240, y: 135 });
    expect(f.items.length).toBe(1);
    expect(f.items[0].x).toBeGreaterThan(view.width);
    expect(f.items[0].vx).toBeLessThan(0);
  });

  it('acerta a caixa da aranha e some', () => {
    const f = new DebrisField(5);
    f.update(DT, gust, view, { x: 240, y: 135 });
    const d = f.items[0];
    expect(f.hit({ x: d.x + 8, y: d.y, vx: 0, vy: 0, half: 5 })).toBe(d);
    expect(f.items.length).toBe(0);
    f.update(DT, gust, view, { x: 240, y: 135 });
    expect(f.hit({ x: 0, y: 0, vx: 0, vy: 0, half: 5 })).toBeNull();
  });

  it('voa com o vento e é removido fora da tela', () => {
    const f = new DebrisField(6);
    f.update(DT, gust, view, { x: 240, y: 135 });
    const x0 = f.items[0].x;
    for (let i = 0; i < 10; i++) f.update(DT, { phase: 'calm', dir: -1, strength: 0 }, view, { x: 240, y: 135 });
    expect(f.items[0].x).toBeLessThan(x0);
    for (let i = 0; i < 300; i++) f.update(DT, { phase: 'calm', dir: -1, strength: 0 }, view, { x: 240, y: 135 });
    expect(f.items.length).toBe(0);
  });
});

describe('LooseWire', () => {
  it('pende para baixo, deita com o vento e dá para saber se encostou', () => {
    const w = new LooseWire({ x: 100, y: 50, length: 80 }, 1);
    for (let i = 0; i < 120; i++) w.update(DT, 0);
    expect(Math.abs(w.angle)).toBeLessThan(0.3);
    expect(w.tip().y).toBeGreaterThan(50 + 70);
    for (let i = 0; i < 300; i++) w.update(DT, WIND.gustAccel);
    expect(w.angle).toBeGreaterThan(0.5);
    const tip = w.tip();
    expect(w.closest({ x: tip.x + 3, y: tip.y }).dist).toBeLessThan(4);
    expect(w.closest({ x: 100 - 40, y: 50 }).dist).toBeGreaterThan(30);
  });

  it('faísca de tempos em tempos', () => {
    const w = new LooseWire({ x: 0, y: 0, length: 60 }, 2);
    let sparks = 0;
    for (let i = 0; i < 600; i++) if (w.update(DT, 0)) sparks++;
    expect(sparks).toBeGreaterThan(3);
  });
});
