// Raycast da teia e restrição de corda. Regras: docs/features/web-swing.md
import type { LevelGrid } from '../physics/LevelGrid';
import { type Body, moveAndCollide } from '../physics/collide';
import { type AttachedSurface, type Vec2, surfaceWithNormal } from '../physics/surfaces';

export interface WebHit {
  /** Último ponto vazio antes do sólido. */
  point: Vec2;
  surface: AttachedSurface;
  distance: number;
}

export interface Rope {
  anchor: Vec2;
  length: number;
  anchorSurface: AttachedSurface;
}

export function raycastWeb(grid: LevelGrid, from: Vec2, to: Vec2, range: number): WebHit | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return null;
  const ux = dx / len;
  const uy = dy / len;
  const t = grid.tileSize;

  let prev = { x: from.x, y: from.y };
  for (let d = 1; d <= range; d++) {
    const p = { x: from.x + ux * d, y: from.y + uy * d };
    if (grid.isSolidPixel(p.x, p.y)) {
      const crossedX = Math.floor(p.x / t) !== Math.floor(prev.x / t);
      const normal = crossedX ? { x: -Math.sign(ux), y: 0 } : { x: 0, y: -Math.sign(uy) };
      // Se cruzou X e Y ao mesmo tempo num canto, prefere a face cujo vizinho está livre.
      if (crossedX && Math.floor(p.y / t) !== Math.floor(prev.y / t)) {
        if (grid.isSolidTile(Math.floor(prev.x / t), Math.floor(p.y / t))) {
          normal.x = 0;
          normal.y = -Math.sign(uy);
        }
      }
      return { point: prev, surface: surfaceWithNormal(normal), distance: d - 1 };
    }
    prev = p;
  }
  return null;
}

/** Mantém o corpo dentro do raio da corda e remove a velocidade radial para fora. */
export function applyRopeConstraint(grid: LevelGrid, b: Body, rope: Rope): void {
  const dx = b.x - rope.anchor.x;
  const dy = b.y - rope.anchor.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= rope.length || dist < 1e-6) return;

  const nx = dx / dist;
  const ny = dy / dist;
  const targetX = rope.anchor.x + nx * rope.length;
  const targetY = rope.anchor.y + ny * rope.length;
  moveAndCollide(grid, b, targetX - b.x, targetY - b.y);

  const radial = b.vx * nx + b.vy * ny;
  if (radial > 0) {
    b.vx -= radial * nx;
    b.vy -= radial * ny;
  }
}
