// Buraco no telhado do sótão: por onde a aranha sai para a cutscene da rua. Lógica pura.
// Spec: docs/features/street-cutscene.md
import type { LevelGrid } from '../physics/LevelGrid';
import type { Vec2 } from '../physics/surfaces';

/** Retângulo em tiles. */
export interface TileRect {
  tx: number;
  ty: number;
  w: number;
  h: number;
}

export interface PxRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export function tileRectToPx(r: TileRect, tile: number): PxRect {
  return { x0: r.tx * tile, y0: r.ty * tile, x1: (r.tx + r.w) * tile, y1: (r.ty + r.h) * tile };
}

/** O centro da aranha está dentro do buraco? */
export function inRoofHole(p: Vec2, hole: TileRect, tile: number): boolean {
  const r = tileRectToPx(hole, tile);
  return p.x >= r.x0 && p.x < r.x1 && p.y >= r.y0 && p.y < r.y1;
}

/**
 * Faixa embaixo do buraco por onde a chuva entra: da borda de baixo do buraco até o primeiro
 * tile sólido (o chão do sótão). Um pouco mais estreita que o buraco.
 */
export function roofLeakRect(grid: LevelGrid, hole: TileRect): PxRect {
  const t = grid.tileSize;
  const r = tileRectToPx(hole, t);
  let ty = hole.ty + hole.h;
  while (ty < grid.rows && !grid.isSolidTile(hole.tx, ty)) ty++;
  return { x0: r.x0 + 2, y0: r.y1, x1: r.x1 - 2, y1: ty * t };
}
