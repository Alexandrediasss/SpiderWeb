// O lustre da cozinha (ato 3): pendurado numa corda; uma teia de combate corta a corda e ele cai em linha
// reta. Em cima do doente, mata na hora. Lógica pura. Spec: docs/features/act3-lights-out.md
import { CHANDELIER } from '../config';
import type { Vec2 } from '../physics/surfaces';
import type { Box } from './sick';

/** Gancho no teto em (x, y) e o chão embaixo (px). */
export interface ChandelierDef {
  x: number;
  y: number;
  floorY: number;
}

export type ChandelierState = 'hanging' | 'falling' | 'fallen';

export class Chandelier {
  state: ChandelierState = 'hanging';
  /** Topo do lustre (px). */
  top: number;
  vy = 0;
  /** Relógio do balanço. */
  private t = 0;

  constructor(readonly def: ChandelierDef) {
    this.top = def.y + CHANDELIER.ropeLength;
  }

  /** Ângulo da corda (rad): balança de leve enquanto pendurado. */
  get angle(): number {
    if (this.state !== 'hanging') return 0;
    return ((Math.sin(this.t * CHANDELIER.swaySpeed) * CHANDELIER.swayDeg) / 180) * Math.PI;
  }

  /** Ponta de baixo da corda (onde o lustre está preso). */
  get ropeEnd(): Vec2 {
    const a = this.angle;
    return { x: this.def.x + Math.sin(a) * CHANDELIER.ropeLength, y: this.def.y + Math.cos(a) * CHANDELIER.ropeLength };
  }

  /** Centro do lustre em x. */
  get x(): number {
    return this.state === 'hanging' ? this.ropeEnd.x : this.def.x;
  }

  get box(): Box {
    const half = CHANDELIER.w / 2;
    const top = this.state === 'hanging' ? this.ropeEnd.y : this.top;
    return { left: this.x - half, right: this.x + half, top, bottom: top + CHANDELIER.h };
  }

  /** Uma teia em (x, y) passa pela corda? */
  hitsRope(x: number, y: number): boolean {
    if (this.state !== 'hanging') return false;
    return distToSegment({ x, y }, this.def, this.ropeEnd) <= CHANDELIER.ropeHitPx;
  }

  /** A corda foi cortada: começa a cair. */
  cut(): boolean {
    if (this.state !== 'hanging') return false;
    this.top = this.ropeEnd.y;
    this.state = 'falling';
    this.vy = 0;
    return true;
  }

  /** Avança. Devolve true no quadro em que bate no chão. */
  update(dt: number): boolean {
    this.t += dt;
    if (this.state !== 'falling') return false;
    this.vy += CHANDELIER.gravity * dt;
    this.top += this.vy * dt;
    if (this.top + CHANDELIER.h >= this.def.floorY) {
      this.top = this.def.floorY - CHANDELIER.h;
      this.state = 'fallen';
      this.vy = 0;
      return true;
    }
    return false;
  }

  /** De volta na corda (a Mary morreu e o doente ainda está vivo). */
  reset(): void {
    this.state = 'hanging';
    this.top = this.def.y + CHANDELIER.ropeLength;
    this.vy = 0;
  }
}

function distToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const k = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + dx * k), p.y - (a.y + dy * k));
}
