// Andar grudada em superfícies, incluindo cantos internos e externos.
// Regras: docs/features/surface-movement.md
import type { LevelGrid } from '../physics/LevelGrid';
import { type Body, moveAndCollide, overlapsSolid } from '../physics/collide';
import { type AttachedSurface, type Vec2, SURFACES, surfaceFacing, surfaceWithNormal } from '../physics/surfaces';

/** Existe sólido encostado no lado dos pés (faixa de 1 px ao longo de toda a caixa)? */
export function hasSupport(grid: LevelGrid, b: Body, surface: AttachedSurface): boolean {
  const n = SURFACES[surface].normal;
  const l = b.x - b.half;
  const r = b.x + b.half;
  const t = b.y - b.half;
  const bt = b.y + b.half;
  if (n.y === -1) return grid.rectOverlapsSolid(l, bt, r, bt + 1);
  if (n.y === 1) return grid.rectOverlapsSolid(l, t - 1, r, t);
  if (n.x === 1) return grid.rectOverlapsSolid(l - 1, t, l, bt);
  return grid.rectOverlapsSolid(r, t, r + 1, bt);
}

/** Converte o input em dir (-1, 0, 1) para a superfície atual (sem considerar a trava). */
export function inputToDir(surface: AttachedSurface, move: Vec2): number {
  const { tangent, normal } = SURFACES[surface];
  const along = Math.sign(move.x * tangent.x + move.y * tangent.y);
  if (along !== 0) return along;
  const isWall = normal.x !== 0;
  if (isWall && move.x !== 0) {
    // Em direção à parede = subir; para fora = descer.
    const towardWall = Math.sign(move.x) === -normal.x;
    const upDir = tangent.y < 0 ? 1 : -1;
    return towardWall ? upDir : -upDir;
  }
  return 0;
}

export interface WalkResult {
  surface: AttachedSurface | 'air';
  /** Virou algum canto neste frame (cria a trava de input). */
  turnedCorner: boolean;
}

/** Anda `distance` px (com sinal = dir) sobre a superfície, virando cantos. */
export function walkAlongSurface(
  grid: LevelGrid,
  b: Body,
  surface: AttachedSurface,
  dir: number,
  distance: number,
  stepPx: number,
): WalkResult {
  let current: AttachedSurface = surface;
  let turnedCorner = false;
  let remaining = Math.abs(distance);

  while (remaining > 1e-6) {
    const step = Math.min(remaining, stepPx);
    remaining -= step;
    const tan = SURFACES[current].tangent;
    const travel = { x: tan.x * dir, y: tan.y * dir };
    const hit = moveAndCollide(grid, b, travel.x * step, travel.y * step);

    // Canto interno: bateu de frente num sólido.
    if ((travel.x !== 0 && hit.x !== 0) || (travel.y !== 0 && hit.y !== 0)) {
      current = surfaceFacing(travel);
      turnedCorner = true;
      continue;
    }

    // Canto externo: os pés perderam o apoio.
    if (!hasSupport(grid, b, current)) {
      const wrapped = wrapOuterCorner(grid, b, current, travel);
      if (!wrapped) return { surface: 'air', turnedCorner };
      current = wrapped;
      turnedCorner = true;
    }
  }
  return { surface: current, turnedCorner };
}

/** Dá a volta num canto externo. Retorna a nova superfície ou null se não couber. */
function wrapOuterCorner(grid: LevelGrid, b: Body, surface: AttachedSurface, travel: Vec2): AttachedSurface | null {
  const t = grid.tileSize;
  const feet = { x: -SURFACES[surface].normal.x, y: -SURFACES[surface].normal.y };
  const prev = { x: b.x, y: b.y };

  // Encaixa a borda de trás da caixa na linha do canto.
  if (travel.x > 0) b.x = Math.floor((b.x - b.half) / t) * t + b.half;
  if (travel.x < 0) b.x = Math.ceil((b.x + b.half) / t) * t - b.half;
  if (travel.y > 0) b.y = Math.floor((b.y - b.half) / t) * t + b.half;
  if (travel.y < 0) b.y = Math.ceil((b.y + b.half) / t) * t - b.half;

  // Contorna o canto: passa para o outro lado na direção dos pés.
  b.x += feet.x * b.half * 2;
  b.y += feet.y * b.half * 2;

  const next = surfaceWithNormal(travel);
  if (overlapsSolid(grid, b) || !hasSupport(grid, b, next)) {
    b.x = prev.x;
    b.y = prev.y;
    return null;
  }
  return next;
}
