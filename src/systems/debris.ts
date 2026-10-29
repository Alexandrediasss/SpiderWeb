// Detritos que a rajada traz (telhas, jornais, galhos, tampas de lixo). Lógica pura.
// Spec: docs/features/wind.md
import { DEBRIS } from '../config';
import type { Body } from '../physics/collide';
import type { Vec2 } from '../physics/surfaces';
import { makeRng } from './storm';
import type { WindPhase } from './wind';

export const DEBRIS_KINDS = ['shingle', 'paper', 'branch', 'lid'] as const;
export type DebrisKind = (typeof DEBRIS_KINDS)[number];

export interface Debris {
  kind: DebrisKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  age: number;
}

export interface WindState {
  phase: WindPhase;
  dir: -1 | 1;
  strength: number;
}

export interface View {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class DebrisField {
  readonly items: Debris[] = [];
  private spawnIn = 0;
  private readonly rng: () => number;

  constructor(seed: number) {
    this.rng = makeRng(seed);
  }

  /** Move os detritos e, na rajada forte, solta novos na borda de onde vem o vento, perto de `target`. */
  update(dt: number, wind: WindState, view: View, target: Vec2): void {
    const strong = wind.phase === 'gust' && wind.strength > 0.6;
    if (strong) {
      this.spawnIn -= dt;
      if (this.spawnIn <= 0) {
        this.spawnIn = this.between(DEBRIS.spawnEverySec);
        this.spawn(wind, view, target);
      }
    } else {
      this.spawnIn = 0;
    }

    for (let i = this.items.length - 1; i >= 0; i--) {
      const d = this.items[i];
      d.age += dt;
      d.x += d.vx * dt;
      // Balança enquanto voa (papel e galho tremulam mais).
      const wobble = d.kind === 'paper' ? 60 : 25;
      d.y += (d.vy + Math.sin(d.age * 9 + i) * wobble) * dt;
      d.angle += d.spin * dt;
      const out = d.x < view.x - 120 || d.x > view.x + view.width + 120 || d.y > view.y + view.height + 120;
      if (out || d.age > 8) this.items.splice(i, 1);
    }
  }

  /** O detrito que encosta na caixa da aranha, ou null. Ele some ao acertar. */
  hit(body: Body): Debris | null {
    const r = DEBRIS.radius;
    for (let i = 0; i < this.items.length; i++) {
      const d = this.items[i];
      const nx = Math.max(body.x - body.half, Math.min(d.x, body.x + body.half));
      const ny = Math.max(body.y - body.half, Math.min(d.y, body.y + body.half));
      if ((d.x - nx) ** 2 + (d.y - ny) ** 2 <= r * r) {
        this.items.splice(i, 1);
        return d;
      }
    }
    return null;
  }

  clear(): void {
    this.items.length = 0;
  }

  private spawn(wind: WindState, view: View, target: Vec2): void {
    const y = Math.max(view.y + 8, Math.min(view.y + view.height - 8, target.y + (this.rng() * 2 - 1) * DEBRIS.spreadY));
    this.items.push({
      kind: DEBRIS_KINDS[Math.floor(this.rng() * DEBRIS_KINDS.length)],
      x: wind.dir > 0 ? view.x - 30 : view.x + view.width + 30,
      y,
      vx: wind.dir * this.between(DEBRIS.speed) * (0.8 + 0.4 * wind.strength),
      vy: (this.rng() - 0.5) * 40,
      angle: this.rng() * Math.PI * 2,
      spin: (this.rng() - 0.5) * 14,
      age: 0,
    });
  }

  private between([min, max]: readonly [number, number]): number {
    return min + this.rng() * (max - min);
  }
}
