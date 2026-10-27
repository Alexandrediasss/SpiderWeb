// Tempestade: decide quando caem raios, a intensidade do clarão e quando soa cada trovão. Lógica pura.
// Spec: docs/features/atmosphere.md
import { STORM } from '../config';
import type { Vec2 } from '../physics/surfaces';

export interface ThunderEvent {
  /** 0..1: trovões perto são mais altos e começam com um estalo. */
  strength: number;
  close: boolean;
  /** Semente para variar o som. */
  seed: number;
}

export interface Bolt {
  /** Posição horizontal na tela, 0..1. */
  x: number;
  seed: number;
}

interface Pulse {
  at: number;
  peak: number;
  tau: number;
}

type Range = readonly [number, number];

/** Gerador pseudoaleatório determinístico (mulberry32). */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Storm {
  /** Intensidade do clarão agora (0..1). */
  flash = 0;
  /** Raio visível no céu (só em raios perto, por um instante). */
  bolt: Bolt | null = null;
  /** Total de raios desde o início (útil para debug e testes). */
  strikes = 0;

  private t = 0;
  private nextStrikeAt: number;
  private boltUntil = 0;
  private pulses: Pulse[] = [];
  private pending: { at: number; event: ThunderEvent }[] = [];
  private readonly rng: () => number;

  constructor(seed: number) {
    this.rng = makeRng(seed);
    this.nextStrikeAt = this.between(STORM.firstStrikeSec);
  }

  /** Avança o tempo; devolve os trovões que devem começar a tocar agora. */
  update(dt: number): ThunderEvent[] {
    this.t += dt;
    if (this.t >= this.nextStrikeAt) {
      this.strike();
      this.nextStrikeAt = this.t + this.between(STORM.gapSec);
    }

    this.pulses = this.pulses.filter((p) => this.t - p.at < p.tau * 8);
    this.flash = this.pulses.reduce((m, p) => Math.max(m, pulseAt(p, this.t)), 0);
    if (this.bolt && this.t >= this.boltUntil) this.bolt = null;

    const due = this.pending.filter((p) => p.at <= this.t);
    this.pending = this.pending.filter((p) => p.at > this.t);
    return due.map((p) => p.event);
  }

  /** Cai um raio agora. Sem argumento, sorteia perto/longe; útil no console para testar. */
  strike(close = this.rng() < STORM.closeChance): void {
    this.strikes++;
    const strength = close ? 0.7 + this.rng() * 0.3 : 0.25 + this.rng() * 0.3;
    const t = this.t;

    // Relâmpagos piscam: um clarão principal, 1 ou 2 repiques e um brilho que some devagar.
    this.pulses.push({ at: t, peak: strength, tau: 0.06 });
    const repeats = close ? 2 : 1;
    let at = t;
    for (let i = 0; i < repeats; i++) {
      at += 0.07 + this.rng() * 0.1;
      this.pulses.push({ at, peak: strength * (0.5 + this.rng() * 0.45), tau: 0.07 });
    }
    this.pulses.push({ at: t, peak: strength * 0.35, tau: close ? 0.35 : 0.2 });

    if (close) {
      this.bolt = { x: 0.15 + this.rng() * 0.7, seed: Math.floor(this.rng() * 1e9) };
      this.boltUntil = t + STORM.boltVisibleSec;
    }

    const delay = this.between(close ? STORM.thunderDelayCloseSec : STORM.thunderDelayFarSec);
    this.pending.push({ at: t + delay, event: { strength, close, seed: Math.floor(this.rng() * 1e9) } });
  }

  /** Segundos até o próximo raio (para debug). */
  get secondsToNextStrike(): number {
    return this.nextStrikeAt - this.t;
  }

  private between([min, max]: Range): number {
    return min + this.rng() * (max - min);
  }
}

function pulseAt(p: Pulse, t: number): number {
  if (t < p.at) return 0;
  return p.peak * Math.exp(-(t - p.at) / p.tau);
}

/**
 * Desenho do raio: um tronco em zigue-zague descendo `length` px a partir de (0, 0) e alguns galhos.
 * Cada linha é uma lista de pontos; quem desenha decide onde posicionar.
 */
export function boltPath(seed: number, length: number): Vec2[][] {
  const rng = makeRng(seed);
  const trunk: Vec2[] = [{ x: 0, y: 0 }];
  const branches: Vec2[][] = [];
  let x = 0;
  let y = 0;
  while (y < length) {
    y += 5 + rng() * 9;
    x += (rng() - 0.5) * 14;
    trunk.push({ x, y: Math.min(y, length) });
    if (rng() < 0.18 && y < length * 0.75) {
      const dir = rng() < 0.5 ? -1 : 1;
      const branch: Vec2[] = [{ x, y }];
      let bx = x;
      let by = y;
      const steps = 2 + Math.floor(rng() * 4);
      for (let i = 0; i < steps; i++) {
        by += 4 + rng() * 7;
        bx += dir * (3 + rng() * 7);
        branch.push({ x: bx, y: by });
      }
      branches.push(branch);
    }
  }
  return [trunk, ...branches];
}
