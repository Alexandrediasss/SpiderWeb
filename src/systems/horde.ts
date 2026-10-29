// A horda da cutscene da rua: fileiras de zumbis andando para a direita, quando cada um geme e
// quando cada pé pisa. Lógica pura; quem desenha decide a altura de cada fileira.
// Spec: docs/features/street-cutscene.md
import { HORDE } from '../config';
import { makeRng } from './storm';

export interface HordeRow {
  /** Tamanho do bloco do zumbi (px). */
  u: number;
  count: number;
  speed: readonly [number, number];
  /** Volume dos gemidos desta fileira (0 = muda). */
  voice: number;
  /** Volume dos passos (0 = sem passos). */
  steps: number;
}

export interface Zombie {
  row: number;
  /** Centro em x (px do palco). Anda para a direita. */
  x: number;
  speed: number;
  /** Índice do visual (roupa, pele...). */
  look: number;
  /** Fase da caminhada, 0..1 (um ciclo = dois passos). */
  phase: number;
  groanIn: number;
}

export type HordeEvent =
  | { type: 'groan'; row: number; index: number; pan: number; volume: number; seed: number }
  | { type: 'step'; row: number; pan: number; volume: number };

/** Largura de um quadro do zumbi, em blocos `u` (a margem para entrar e sair da tela). */
export const ZOMBIE_FRAME_U = { w: 24, h: 36 } as const;

/** Os pés tocam o chão nestas fases (perna da frente esticada à frente, depois a de trás). */
const STEP_PHASES = [0.25, 0.75];

export class Horde {
  readonly zombies: Zombie[] = [];
  private readonly rng: () => number;

  constructor(
    readonly rows: readonly HordeRow[],
    /** Largura do palco (px). */
    readonly width: number,
    /** Quantos visuais existem. */
    private readonly looks: number,
    seed: number,
  ) {
    this.rng = makeRng(seed);
    rows.forEach((row, r) => {
      const span = width + 2 * this.margin(r);
      for (let i = 0; i < row.count; i++) {
        this.zombies.push({
          row: r,
          // Espalhados pela largura, com um pouco de sorteio para não parecer um desfile.
          x: -this.margin(r) + ((i + 0.15 + this.rng() * 0.7) / row.count) * span,
          speed: this.between(row.speed),
          look: Math.floor(this.rng() * looks),
          phase: this.rng(),
          groanIn: this.between(HORDE.firstGroanSec),
        });
      }
    });
  }

  /** Quanto o zumbi sai da tela antes de dar a volta (meio quadro). */
  margin(row: number): number {
    return (ZOMBIE_FRAME_U.w * this.rows[row].u) / 2;
  }

  update(dt: number): HordeEvent[] {
    const events: HordeEvent[] = [];
    this.zombies.forEach((z, index) => {
      const row = this.rows[z.row];
      const before = z.phase;
      z.x += z.speed * dt;
      z.phase = (z.phase + (z.speed * dt) / (HORDE.strideU * row.u)) % 1;
      if (row.steps > 0 && crossed(before, z.phase)) {
        events.push({ type: 'step', row: z.row, pan: this.pan(z.x), volume: row.steps * (0.75 + this.rng() * 0.25) });
      }

      const m = this.margin(z.row);
      if (z.x > this.width + m) {
        // Saiu pela direita: volta pela esquerda com outro visual.
        z.x -= this.width + 2 * m;
        z.look = Math.floor(this.rng() * this.looks);
      }

      z.groanIn -= dt;
      if (z.groanIn <= 0) {
        z.groanIn = this.between(HORDE.groanGapSec);
        if (row.voice > 0) {
          events.push({
            type: 'groan',
            row: z.row,
            index,
            pan: this.pan(z.x),
            volume: row.voice * (0.7 + this.rng() * 0.3),
            seed: Math.floor(this.rng() * 1e9),
          });
        }
      }
    });
    return events;
  }

  /** Posição na tela → pan estéreo (-0,8..0,8). */
  private pan(x: number): number {
    return Math.max(-1, Math.min(1, (x / this.width) * 2 - 1)) * 0.8;
  }

  private between([min, max]: readonly [number, number]): number {
    return min + this.rng() * (max - min);
  }
}

/** Quadro da caminhada (0..frames-1) para uma fase 0..1. */
export function walkFrame(phase: number, frames: number): number {
  return Math.floor(phase * frames) % frames;
}

/** A fase passou por um dos momentos em que o pé pisa? (considera a volta de 1 para 0) */
function crossed(before: number, after: number): boolean {
  return STEP_PHASES.some((p) => (after >= before ? before < p && after >= p : before < p || after >= p));
}
