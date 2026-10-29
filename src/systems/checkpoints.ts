// Ato 2: checkpoints, queda na rua e a chegada no telhado do fim. Lógica pura.
// Spec: docs/features/act2-rooftops.md
import type { CheckpointDef, TileZone } from '../level/rooftops';
import type { Body } from '../physics/collide';
import type { Vec2 } from '../physics/surfaces';

/** O centro `p` está dentro da área (tiles, inclusiva)? */
export function inZone(p: Vec2, z: TileZone, tile: number): boolean {
  const tx = Math.floor(p.x / tile);
  const ty = Math.floor(p.y / tile);
  return tx >= z.x0 && tx <= z.x1 && ty >= z.y0 && ty <= z.y1;
}

/**
 * Checkpoint ativo depois deste quadro: só muda quando a aranha está grudada (`attached`) dentro da área
 * de um checkpoint mais adiantado que o atual. Voltar para trás não desativa.
 */
export function nextCheckpoint(cps: CheckpointDef[], current: number, p: Vec2, attached: boolean, tile: number): number {
  if (!attached) return current;
  for (let i = cps.length - 1; i > current; i--) if (inZone(p, cps[i].zone, tile)) return i;
  return current;
}

/** Centro da aranha ao reaparecer: em cima da superfície, no tile do checkpoint. */
export function spawnPoint(cp: CheckpointDef, tile: number, half: number): Vec2 {
  return { x: (cp.spawn.tx + 0.5) * tile, y: (cp.spawn.ty + 1) * tile - half };
}

/** A aranha encostou na rua? */
export function touchedStreet(body: Body, streetRow: number, tile: number): boolean {
  return body.y + body.half >= streetRow * tile - 0.5;
}
