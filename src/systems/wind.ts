// Ventania do ato 2: calma → aviso → rajada → fim, com direção sorteada a cada rajada. Lógica pura.
// Spec: docs/features/wind.md
import { WIND } from '../config';
import { makeRng } from './storm';

export type WindPhase = 'calm' | 'warn' | 'gust' | 'fade';

export class Wind {
  phase: WindPhase = 'calm';
  /** -1 = soprando para a esquerda (contra), 1 = para a direita (a favor). */
  private direction: -1 | 1 = -1;
  private elapsed = 0;
  private duration: number;
  /** Na cutscene a força é fixa e o ciclo não anda. */
  private scripted: { strength: number; dir: -1 | 1 } | null = null;
  private readonly rng: () => number;

  constructor(seed: number) {
    this.rng = makeRng(seed);
    this.duration = WIND.firstCalmSec;
  }

  /** Avança o tempo; devolve a fase nova quando ela muda. */
  update(dt: number): WindPhase | null {
    if (this.scripted) return null;
    this.elapsed += dt;
    if (this.elapsed < this.duration) return null;
    this.enter(next(this.phase));
    return this.phase;
  }

  /** Força agora (0..1). */
  get strength(): number {
    if (this.scripted) return this.scripted.strength;
    const p = Math.min(1, this.elapsed / Math.max(1e-6, this.duration));
    switch (this.phase) {
      case 'calm':
        return 0;
      case 'warn':
        return WIND.warnStrength * p;
      case 'gust':
        return WIND.warnStrength + (1 - WIND.warnStrength) * Math.min(1, this.elapsed / WIND.rampSec);
      case 'fade':
        return 1 - p;
    }
  }

  get dir(): -1 | 1 {
    return this.scripted ? this.scripted.dir : this.direction;
  }

  /** Aceleração horizontal agora (px/s²). */
  get accel(): number {
    return this.dir * this.strength * WIND.gustAccel;
  }

  /** Segundos até a fase mudar (debug). */
  get timeLeft(): number {
    return Math.max(0, this.duration - this.elapsed);
  }

  /** Começa um aviso de rajada agora, na direção pedida (debug e testes). */
  forceGust(dir: -1 | 1): void {
    this.scripted = null;
    this.enter('warn');
    this.direction = dir;
  }

  /** Cutscenes: força fixa (ou `null` para voltar ao ciclo, recomeçando da calma). */
  script(strength: number | null, dir: -1 | 1 = -1): void {
    if (strength === null) {
      if (this.scripted) this.enter('calm');
      this.scripted = null;
      return;
    }
    this.scripted = { strength, dir };
  }

  private enter(phase: WindPhase): void {
    this.phase = phase;
    this.elapsed = 0;
    switch (phase) {
      case 'calm':
        this.duration = WIND.calmSec[0] + this.rng() * (WIND.calmSec[1] - WIND.calmSec[0]);
        break;
      case 'warn':
        this.duration = WIND.warnSec;
        this.direction = this.rng() < WIND.againstChance ? -1 : 1;
        break;
      case 'gust':
        this.duration = WIND.gustSec;
        break;
      case 'fade':
        this.duration = WIND.fadeSec;
        break;
    }
  }
}

function next(p: WindPhase): WindPhase {
  return p === 'calm' ? 'warn' : p === 'warn' ? 'gust' : p === 'gust' ? 'fade' : 'calm';
}
