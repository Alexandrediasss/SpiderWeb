// Gosma verde do ato 3: goteiras que pingam do teto, jorros que saem de canos no chão e poças paradas.
// As goteiras de chuva usam a mesma lógica (só não fazem mal). Lógica pura: a cena só desenha e toca os sons.
// Spec: docs/features/goo-poison.md
import { GOO_CFG } from '../config';
import type { LevelGrid } from '../physics/LevelGrid';
import type { Body } from '../physics/collide';

/** Goteira: a gota se forma no teto em (x, y) a cada `every` segundos. `phase` desencontra as goteiras. */
export interface DripDef {
  x: number;
  y: number;
  every: number;
  phase?: number;
}

/** Jorro: cano no chão em (x, y = topo do chão). Jorra `height` px, parado por `idleSec` entre um e outro. */
export interface JetDef {
  x: number;
  y: number;
  height: number;
  idleSec: number;
  phase?: number;
}

/** Poça no chão: de x0 a x1 (px), com a superfície do chão em y. */
export interface PoolDef {
  x0: number;
  x1: number;
  y: number;
}

export type DripState = 'wait' | 'form' | 'fall';
export type JetState = 'idle' | 'warn' | 'spray';

export interface Drip {
  def: DripDef;
  state: DripState;
  /** Segundos no estado atual. */
  t: number;
  /** Posição da gota (caindo) e velocidade. */
  y: number;
  vy: number;
}

export interface Jet {
  def: JetDef;
  state: JetState;
  t: number;
}

export type GooEvent = { type: 'splash'; x: number; y: number; drip: Drip } | { type: 'jetWarn'; jet: Jet } | { type: 'jetSpray'; jet: Jet };

export class GooField {
  readonly drips: Drip[];
  readonly jets: Jet[];

  constructor(
    drips: DripDef[],
    jets: JetDef[],
    readonly pools: PoolDef[] = [],
  ) {
    // Cada uma começa num ponto diferente do ciclo (`phase`, em segundos já passados).
    this.drips = drips.map((def) => ({ def, state: 'wait', t: def.phase ?? 0, y: def.y, vy: 0 }));
    this.jets = jets.map((def) => ({ def, state: 'idle', t: def.phase ?? 0 }));
  }

  update(dt: number, grid: LevelGrid): GooEvent[] {
    const events: GooEvent[] = [];
    for (const d of this.drips) this.updateDrip(d, dt, grid, events);
    for (const j of this.jets) this.updateJet(j, dt, events);
    return events;
  }

  private updateDrip(d: Drip, dt: number, grid: LevelGrid, events: GooEvent[]): void {
    d.t += dt;
    if (d.state === 'wait' && d.t >= d.def.every) {
      d.state = 'form';
      d.t = 0;
    }
    if (d.state === 'form' && d.t >= GOO_CFG.dripFormSec) {
      d.state = 'fall';
      d.t = 0;
      d.y = d.def.y + 2;
      d.vy = 0;
    }
    if (d.state !== 'fall') return;
    d.vy += GOO_CFG.dripGravity * dt;
    // Passos pequenos: a gota não atravessa um chão fino.
    let left = d.vy * dt;
    while (left > 0) {
      const step = Math.min(4, left);
      left -= step;
      d.y += step;
      if (grid.isSolidPixel(d.def.x, d.y + GOO_CFG.dripRadius)) {
        const top = Math.floor((d.y + GOO_CFG.dripRadius) / grid.tileSize) * grid.tileSize;
        events.push({ type: 'splash', x: d.def.x, y: top, drip: d });
        d.state = 'wait';
        d.t = 0;
        d.y = d.def.y;
        d.vy = 0;
        return;
      }
    }
  }

  private updateJet(j: Jet, dt: number, events: GooEvent[]): void {
    j.t += dt;
    if (j.state === 'idle' && j.t >= j.def.idleSec) {
      j.state = 'warn';
      j.t = 0;
      events.push({ type: 'jetWarn', jet: j });
    } else if (j.state === 'warn' && j.t >= GOO_CFG.jetWarnSec) {
      j.state = 'spray';
      j.t = 0;
      events.push({ type: 'jetSpray', jet: j });
    } else if (j.state === 'spray' && j.t >= GOO_CFG.jetSpraySec) {
      j.state = 'idle';
      j.t = 0;
    }
  }

  /** Altura atual da coluna do jorro (px): sobe rápido no começo e desce no fim. */
  static jetHeight(j: Jet): number {
    if (j.state !== 'spray') return 0;
    const rise = Math.min(1, j.t / GOO_CFG.jetRiseSec);
    const fall = Math.min(1, (GOO_CFG.jetSpraySec - j.t) / GOO_CFG.jetRiseSec);
    return j.def.height * Math.max(0, Math.min(rise, fall));
  }

  /** A gosma encosta na caixa `b`? (gota caindo, coluna do jorro ou poça) */
  touches(b: Body): boolean {
    const left = b.x - b.half;
    const right = b.x + b.half;
    const top = b.y - b.half;
    const bottom = b.y + b.half;
    const r = GOO_CFG.dripRadius;
    for (const d of this.drips) {
      if (d.state !== 'fall') continue;
      if (d.def.x + r >= left && d.def.x - r <= right && d.y + r >= top && d.y - r <= bottom) return true;
    }
    for (const j of this.jets) {
      const h = GooField.jetHeight(j);
      if (h <= 0) continue;
      const half = GOO_CFG.jetWidth / 2;
      if (j.def.x + half >= left && j.def.x - half <= right && j.def.y >= top && j.def.y - h <= bottom) return true;
    }
    for (const p of this.pools) {
      if (p.x1 >= left && p.x0 <= right && bottom >= p.y - GOO_CFG.poolDepth && top <= p.y) return true;
    }
    return false;
  }
}
