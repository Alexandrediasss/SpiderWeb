import { describe, expect, it } from 'vitest';
import { HORDE } from '../src/config';
import { Horde, type HordeEvent, type HordeRow, walkFrame } from '../src/systems/horde';

const ROWS: HordeRow[] = [
  { u: 2, count: 6, speed: [8, 10], voice: 0.5, steps: 0 },
  { u: 6, count: 3, speed: [15, 18], voice: 1, steps: 1 },
];

function runFor(horde: Horde, seconds: number, dt = 1 / 60): HordeEvent[] {
  const all: HordeEvent[] = [];
  for (let t = 0; t < seconds; t += dt) all.push(...horde.update(dt));
  return all;
}

describe('Horde', () => {
  it('cria a quantidade pedida em cada fileira, espalhada pela largura', () => {
    const h = new Horde(ROWS, 240, 6, 1);
    expect(h.zombies.filter((z) => z.row === 0)).toHaveLength(6);
    expect(h.zombies.filter((z) => z.row === 1)).toHaveLength(3);
    const xs = h.zombies.filter((z) => z.row === 0).map((z) => z.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(120);
  });

  it('é determinística para a mesma semente', () => {
    const a = new Horde(ROWS, 240, 6, 42);
    const b = new Horde(ROWS, 240, 6, 42);
    expect(runFor(a, 5)).toEqual(runFor(b, 5));
    expect(a.zombies).toEqual(b.zombies);
  });

  it('todos andam para a direita e dão a volta pela esquerda', () => {
    const h = new Horde(ROWS, 240, 6, 7);
    const z = h.zombies[0];
    const start = z.x;
    h.update(1);
    expect(z.x).toBeGreaterThan(start);
    runFor(h, 60);
    for (const zz of h.zombies) {
      const m = h.margin(zz.row);
      expect(zz.x).toBeGreaterThanOrEqual(-m - 1);
      expect(zz.x).toBeLessThanOrEqual(240 + m);
    }
  });

  it('cada zumbi geme de tempos em tempos (a horda vira um coro)', () => {
    const h = new Horde(ROWS, 240, 6, 3);
    const groans = runFor(h, 30).filter((e) => e.type === 'groan');
    const perZombie = new Set(groans.map((g) => (g.type === 'groan' ? g.index : -1)));
    expect(perZombie.size).toBe(h.zombies.length);
    // Média de intervalo dentro da faixa configurada.
    const avgGap = (30 * h.zombies.length) / groans.length;
    expect(avgGap).toBeGreaterThan(HORDE.groanGapSec[0] * 0.7);
    expect(avgGap).toBeLessThan(HORDE.groanGapSec[1]);
    for (const g of groans) {
      expect(Math.abs(g.pan)).toBeLessThanOrEqual(0.8);
      expect(g.volume).toBeGreaterThan(0);
    }
  });

  it('fileira muda não geme e só fileiras com passos fazem passos', () => {
    const rows: HordeRow[] = [{ ...ROWS[0], voice: 0 }, ROWS[1]];
    const events = runFor(new Horde(rows, 240, 6, 9), 20);
    expect(events.some((e) => e.type === 'groan' && e.row === 0)).toBe(false);
    expect(events.some((e) => e.type === 'step' && e.row === 0)).toBe(false);
    expect(events.some((e) => e.type === 'step' && e.row === 1)).toBe(true);
  });

  it('dois passos por ciclo da caminhada', () => {
    const rows: HordeRow[] = [{ u: 4, count: 1, speed: [10, 10], voice: 0, steps: 1 }];
    const h = new Horde(rows, 10_000, 6, 5);
    const cycleSec = (HORDE.strideU * 4) / 10;
    const steps = runFor(h, cycleSec * 5).filter((e) => e.type === 'step');
    expect(steps.length).toBeGreaterThanOrEqual(9);
    expect(steps.length).toBeLessThanOrEqual(11);
  });
});

describe('walkFrame', () => {
  it('divide a fase em quadros', () => {
    expect(walkFrame(0, 6)).toBe(0);
    expect(walkFrame(0.5, 6)).toBe(3);
    expect(walkFrame(0.999, 6)).toBe(5);
  });
});
