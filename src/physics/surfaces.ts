// Superfícies onde a aranha pode grudar. Veja a tabela em docs/features/surface-movement.md.

export interface Vec2 {
  x: number;
  y: number;
}

export type AttachedSurface = 'floor' | 'ceiling' | 'wallLeft' | 'wallRight';
export type Surface = AttachedSurface | 'air';

interface SurfaceDef {
  /** Aponta para fora do sólido. */
  normal: Vec2;
  /** Sentido de dir = +1. Escolhido para o sinal de dir não mudar ao virar cantos. */
  tangent: Vec2;
  /** Rotação do sprite em graus. */
  angle: number;
}

export const SURFACES: Record<AttachedSurface, SurfaceDef> = {
  floor: { normal: { x: 0, y: -1 }, tangent: { x: 1, y: 0 }, angle: 0 },
  wallRight: { normal: { x: -1, y: 0 }, tangent: { x: 0, y: -1 }, angle: -90 },
  ceiling: { normal: { x: 0, y: 1 }, tangent: { x: -1, y: 0 }, angle: 180 },
  wallLeft: { normal: { x: 1, y: 0 }, tangent: { x: 0, y: 1 }, angle: 90 },
};

const ATTACHED = Object.keys(SURFACES) as AttachedSurface[];

export function surfaceWithNormal(n: Vec2): AttachedSurface {
  const s = ATTACHED.find((k) => SURFACES[k].normal.x === n.x && SURFACES[k].normal.y === n.y);
  if (!s) throw new Error(`Normal inválida: ${n.x},${n.y}`);
  return s;
}

/** Superfície que a aranha ganha quando o sólido está na direção `d` (vetor de eixo). */
export function surfaceFacing(d: Vec2): AttachedSurface {
  return surfaceWithNormal({ x: -d.x, y: -d.y });
}
