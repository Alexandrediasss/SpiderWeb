// Fio arrebentado pendurado numa cruzeta: um pêndulo que balança sozinho e com o vento, e faísca na ponta.
// Encostar dá choque. Lógica pura. Spec: docs/features/wind.md
import { AIR, WIRE } from '../config';
import type { Vec2 } from '../physics/surfaces';
import { makeRng } from './storm';

export interface LooseWireDef {
  /** De onde o fio pende (px). */
  x: number;
  y: number;
  length: number;
}

/** Quantos pedaços tem o desenho (e o teste de toque) do fio. */
const SEGMENTS = 6;

export class LooseWire {
  /** Ângulo com a vertical (rad): positivo = ponta para a direita. */
  angle = 0;
  private angVel = 0;
  private t = 0;
  private sparkIn: number;
  private readonly rng: () => number;

  constructor(
    readonly def: LooseWireDef,
    seed: number,
  ) {
    this.rng = makeRng(seed);
    this.sparkIn = this.between(WIRE.sparkEverySec);
    this.t = this.rng() * 10;
  }

  /** Avança o pêndulo com o vento (aceleração horizontal, px/s²). Devolve true quando a ponta faísca. */
  update(dt: number, windAccel: number): boolean {
    this.t += dt;
    const L = this.def.length;
    // Gravidade puxa para baixo; o vento empurra de lado; um balanço leve para nunca ficar parado.
    const idle = Math.sin(this.t * 1.7) * WIRE.idleSwing * AIR.gravity;
    const acc = (-AIR.gravity * Math.sin(this.angle) + (windAccel + idle) * Math.cos(this.angle)) / L - WIRE.damping * this.angVel;
    this.angVel += acc * dt;
    this.angle = Math.max(-1.3, Math.min(1.3, this.angle + this.angVel * dt));
    this.sparkIn -= dt;
    if (this.sparkIn > 0) return false;
    this.sparkIn = this.between(WIRE.sparkEverySec);
    return true;
  }

  /** Pontos do fio, do ponto preso até a ponta. Ele faz uma curva leve (o pedaço de cima balança menos). */
  points(): Vec2[] {
    const { x, y, length } = this.def;
    const pts: Vec2[] = [];
    for (let i = 0; i <= SEGMENTS; i++) {
      const k = i / SEGMENTS;
      const a = this.angle * (0.55 + 0.45 * k);
      const prev = pts[i - 1] ?? { x, y };
      if (i === 0) pts.push({ x, y });
      else pts.push({ x: prev.x + Math.sin(a) * (length / SEGMENTS), y: prev.y + Math.cos(a) * (length / SEGMENTS) });
    }
    return pts;
  }

  tip(): Vec2 {
    const pts = this.points();
    return pts[pts.length - 1];
  }

  /** O ponto do fio mais perto de `p`, e a distância. */
  closest(p: Vec2): { point: Vec2; dist: number } {
    const pts = this.points();
    let best = { point: pts[0], dist: Infinity };
    for (let i = 1; i < pts.length; i++) {
      const q = closestOnSegment(p, pts[i - 1], pts[i]);
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      if (d < best.dist) best = { point: q, dist: d };
    }
    return best;
  }

  private between([min, max]: readonly [number, number]): number {
    return min + this.rng() * (max - min);
  }
}

function closestOnSegment(p: Vec2, a: Vec2, b: Vec2): Vec2 {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return { x: a.x + dx * t, y: a.y + dy * t };
}
