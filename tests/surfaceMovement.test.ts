import { describe, expect, it } from 'vitest';
import { overlapsSolid } from '../src/physics/collide';
import { SpiderMotor } from '../src/systems/SpiderMotor';
import { inputToDir } from '../src/systems/surfaceMovement';
import { grid, input, run } from './helpers';

describe('inputToDir', () => {
  it('mapeia setas horizontais no chão e no teto', () => {
    expect(inputToDir('floor', { x: 1, y: 0 })).toBe(1);
    expect(inputToDir('ceiling', { x: 1, y: 0 })).toBe(-1);
  });

  it('na parede: em direção à parede sobe, para fora desce', () => {
    // wallRight: +1 = subir
    expect(inputToDir('wallRight', { x: 1, y: 0 })).toBe(1);
    expect(inputToDir('wallRight', { x: -1, y: 0 })).toBe(-1);
    // wallLeft: +1 = descer
    expect(inputToDir('wallLeft', { x: -1, y: 0 })).toBe(-1);
    expect(inputToDir('wallLeft', { x: 0, y: 1 })).toBe(1);
  });
});

describe('SpiderMotor: superfícies', () => {
  it('cai e gruda no chão', () => {
    const m = new SpiderMotor(grid(), 40, 40);
    run(m, 120, input());
    expect(m.surface).toBe('floor');
    expect(m.body.y).toBe(7 * 16 - 5);
  });

  it('canto interno: chão → parede direita → teto segurando D', () => {
    const m = new SpiderMotor(grid(), 120, 7 * 16 - 5);
    m.surface = 'floor';
    const seen = run(m, 240, input({ move: { x: 1, y: 0 } }));
    expect(seen.slice(0, 3)).toEqual(['floor', 'wallRight', 'ceiling']);
  });

  it('canto externo: dá a volta completa no bloco segurando D', () => {
    const g = grid();
    const m = new SpiderMotor(g, 80, 3 * 16 - 5);
    m.surface = 'floor';
    const seen = run(m, 300, input({ move: { x: 1, y: 0 } }));
    expect(seen.slice(0, 5)).toEqual(['floor', 'wallLeft', 'ceiling', 'wallRight', 'floor']);
    expect(overlapsSolid(g, m.body)).toBe(false);
  });

  it('pula do chão e gruda no teto', () => {
    const m = new SpiderMotor(grid(), 40, 7 * 16 - 5);
    m.surface = 'floor';
    m.update(1 / 60, input({ jumpPressed: true }));
    expect(m.surface).toBe('air');
    run(m, 120, input());
    expect(['ceiling', 'floor']).toContain(m.surface);
  });
});
