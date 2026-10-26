import { LevelGrid } from '../src/physics/LevelGrid';
import type { Surface } from '../src/physics/surfaces';
import type { SpiderMotor } from '../src/systems/SpiderMotor';
import { type SpiderInput, emptyInput } from '../src/systems/input';

export const DT = 1 / 60;

/** Sala 10×8 tiles com um bloco solto 2×2 no meio. */
export const ROOM = [
  '##########',
  '#........#',
  '#........#',
  '#...##...#',
  '#...##...#',
  '#........#',
  '#........#',
  '##########',
];

export function grid(rows: string[] = ROOM): LevelGrid {
  return LevelGrid.fromAscii(rows, 16, (c) => c === '#');
}

export function input(partial: Partial<SpiderInput> = {}): SpiderInput {
  return { ...emptyInput(), ...partial };
}

/** Roda N frames e devolve a sequência de superfícies visitadas (sem repetições seguidas). */
export function run(motor: SpiderMotor, frames: number, inp: SpiderInput): Surface[] {
  const seen: Surface[] = [motor.surface];
  for (let i = 0; i < frames; i++) {
    motor.update(DT, inp);
    if (seen[seen.length - 1] !== motor.surface) seen.push(motor.surface);
  }
  return seen;
}
