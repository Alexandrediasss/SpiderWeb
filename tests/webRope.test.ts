import { describe, expect, it } from 'vitest';
import { SpiderMotor } from '../src/systems/SpiderMotor';
import { raycastWeb } from '../src/systems/webRope';
import { ROOM, grid, input, run } from './helpers';

describe('raycastWeb', () => {
  it('acerta o teto por baixo', () => {
    const hit = raycastWeb(grid(), { x: 40, y: 100 }, { x: 40, y: 0 }, 180);
    expect(hit?.surface).toBe('ceiling');
    expect(hit?.point.y).toBeGreaterThanOrEqual(16);
  });

  it('acerta a parede direita', () => {
    const hit = raycastWeb(grid(), { x: 120, y: 100 }, { x: 300, y: 100 }, 180);
    expect(hit?.surface).toBe('wallRight');
  });

  it('erra fora do alcance', () => {
    expect(raycastWeb(grid(), { x: 40, y: 100 }, { x: 40, y: 0 }, 20)).toBeNull();
  });
});

describe('SpiderMotor: teia', () => {
  it('sobe pela teia e gruda no teto', () => {
    const m = new SpiderMotor(grid(), 40, 7 * 16 - 5);
    m.surface = 'floor';
    const aim = { x: 40, y: 0 };
    m.update(1 / 60, input({ webPressed: true, webHeld: true, aim }));
    expect(m.rope).not.toBeNull();
    run(m, 200, input({ webHeld: true, aim, move: { x: 0, y: -1 } }));
    expect(m.rope).toBeNull();
    expect(m.surface).toBe('ceiling');
  });

  it('balança e mantém o embalo ao soltar', () => {
    const empty = grid(ROOM.map((r, y) => (y === 3 || y === 4 ? '#........#' : r)));
    const m = new SpiderMotor(empty, 120, 60);
    const aim = { x: 60, y: 0 };
    m.update(1 / 60, input({ webPressed: true, webHeld: true, aim }));
    run(m, 20, input({ webHeld: true, aim }));
    expect(Math.abs(m.body.vx)).toBeGreaterThan(10);
    m.update(1 / 60, input());
    expect(m.rope).toBeNull();
  });
});
