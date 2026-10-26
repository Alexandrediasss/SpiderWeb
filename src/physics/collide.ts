// Movimento de uma AABB com colisão contra a grade (eixo a eixo). Lógica pura.
import type { LevelGrid } from './LevelGrid';

export interface Body {
  /** Centro da caixa. */
  x: number;
  y: number;
  vx: number;
  vy: number;
  half: number;
}

export interface Hit {
  /** -1/1 = bateu indo para esquerda/direita (ou cima/baixo); 0 = não bateu. */
  x: number;
  y: number;
}

const MAX_SUBSTEP = 4;

export function overlapsSolid(grid: LevelGrid, b: Body): boolean {
  return grid.rectOverlapsSolid(b.x - b.half, b.y - b.half, b.x + b.half, b.y + b.half);
}

/** Move o corpo (dx, dy) parando nos tiles sólidos. Zera a velocidade no eixo que bateu. */
export function moveAndCollide(grid: LevelGrid, b: Body, dx: number, dy: number): Hit {
  const hit: Hit = { x: 0, y: 0 };
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / MAX_SUBSTEP));
  const sx = dx / steps;
  const sy = dy / steps;
  const t = grid.tileSize;

  for (let i = 0; i < steps; i++) {
    if (sx !== 0 && hit.x === 0) {
      b.x += sx;
      if (overlapsSolid(grid, b)) {
        b.x = sx > 0 ? Math.floor((b.x + b.half) / t) * t - b.half : (Math.floor((b.x - b.half) / t) + 1) * t + b.half;
        hit.x = Math.sign(sx);
        b.vx = 0;
      }
    }
    if (sy !== 0 && hit.y === 0) {
      b.y += sy;
      if (overlapsSolid(grid, b)) {
        b.y = sy > 0 ? Math.floor((b.y + b.half) / t) * t - b.half : (Math.floor((b.y - b.half) / t) + 1) * t + b.half;
        hit.y = Math.sign(sy);
        b.vy = 0;
      }
    }
  }
  return hit;
}
