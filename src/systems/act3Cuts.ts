// Cutscenes do ato 3: as etapas e o plano de cada uma, a queda na chaminé, o voo pela abertura e a Mary
// descendo no fio. Lógica pura: a cena só desenha. Spec: docs/features/act3-cutscenes.md
import { CHIMNEY_CUT as C, WINDOW_CUT as W } from '../config';
import type { Step } from './cutscene';

export type ChimneyShot = 'black' | 'shaft' | 'breach' | 'attic';
export type WindowShot = 'sill' | 'kitchen' | 'outside' | 'wide';

/**
 * `talk` é só uma marca: o tempo da cutscene para ali até a fala acabar. Precisa durar mais que o maior
 * quadro (1/30 s), senão a linha do tempo pula por cima dela.
 */
export const TALK_MARK_SEC = 0.05;

export const CHIMNEY_STEPS: Step[] = [
  { name: 'dark', sec: C.darkSec },
  { name: 'fall', sec: C.fallSec },
  { name: 'burst', sec: C.burstSec },
  { name: 'settle', sec: C.settleSec },
  { name: 'twitch', sec: C.twitchSec },
  { name: 'flip', sec: C.flipSec },
  { name: 'shake', sec: C.shakeSec },
  { name: 'look', sec: C.lookSec },
  { name: 'back', sec: C.backSec },
  { name: 'talk', sec: TALK_MARK_SEC },
  { name: 'outro', sec: C.outroSec },
];

/** Em que plano fica cada etapa (assim pular `elapsed` no console também troca o plano). */
export const CHIMNEY_STEP_SHOT: Record<string, ChimneyShot> = {
  dark: 'black',
  fall: 'shaft',
  burst: 'breach',
  settle: 'breach',
  twitch: 'breach',
  flip: 'breach',
  shake: 'breach',
  look: 'attic',
  back: 'breach',
  talk: 'breach',
  outro: 'breach',
};

export const WINDOW_STEPS: Step[] = [
  { name: 'sillIn', sec: W.sillInSec },
  { name: 'walk', sec: W.walkSec },
  { name: 'stop', sec: W.stopSec },
  { name: 'turn', sec: W.turnSec },
  { name: 'kitchen', sec: W.kitchenSec },
  { name: 'turnBack', sec: W.turnBackSec },
  { name: 'leave', sec: W.leaveSec },
  { name: 'outIn', sec: W.outInSec },
  { name: 'rain', sec: W.rainSec },
  { name: 'thread', sec: W.threadSec },
  { name: 'wide', sec: W.wideSec },
  { name: 'outro', sec: W.outroSec },
];

export const WINDOW_STEP_SHOT: Record<string, WindowShot> = {
  sillIn: 'sill',
  walk: 'sill',
  stop: 'sill',
  turn: 'sill',
  kitchen: 'kitchen',
  turnBack: 'sill',
  leave: 'sill',
  outIn: 'outside',
  rain: 'outside',
  thread: 'outside',
  wide: 'wide',
  outro: 'wide',
};

/** Suave no começo e no fim (panorâmicas da câmera). */
export function ease(p: number): number {
  return 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, p)));
}

/**
 * Onde a Mary está entre as paredes da chaminé, `t` s depois de começar a cair: -1 = parede esquerda,
 * 1 = direita. Sai do meio e bate numa parede em cada instante de `hits`, uma de cada lado.
 */
export function shaftSide(t: number, hits: readonly number[]): number {
  const wall = (i: number) => (i % 2 === 0 ? 1 : -1);
  if (t <= 0 || hits.length === 0) return 0;
  if (t < hits[0]) return (t / hits[0]) * wall(0);
  for (let i = 1; i < hits.length; i++) {
    if (t < hits[i]) {
      const p = (t - hits[i - 1]) / (hits[i] - hits[i - 1]);
      return wall(i - 1) + (wall(i) - wall(i - 1)) * p;
    }
  }
  return wall(hits.length - 1);
}

/** Quantas batidas na parede acontecem entre `t0` (fora) e `t1` (dentro). */
export function hitsBetween(t0: number, t1: number, hits: readonly number[]): number {
  return hits.filter((h) => h > t0 && h <= t1).length;
}

/** Quanto os tijolos já passaram (px), `t` s depois de começar a cair: acelera. */
export function shaftScroll(t: number, speed: number, accel: number): number {
  return speed * t + (accel * t * t) / 2;
}

export interface BurstPose {
  x: number;
  /** Altura acima do chão (px). */
  height: number;
  /** Giro (graus): termina de barriga para cima (180). */
  angle: number;
}

/** Fim de cada arco do voo (0..1 da etapa) e até onde ele chega (0..1 do caminho). */
const ARC_ENDS = [0.5, 0.82, 1];
const ARC_DIST = [0.66, 0.92, 1];

/**
 * O voo da Mary saindo pela abertura da chaminé, com `p` indo de 0 a 1: sai de `fromX` a `fromHeight` px do
 * chão e chega parada em `toX`, quicando (três arcos de altura `arcs`) e girando até ficar de barriga para cima.
 */
export function burstPose(p: number, fromX: number, fromHeight: number, toX: number, arcs: readonly number[]): BurstPose {
  const q = Math.min(1, Math.max(0, p));
  const i = ARC_ENDS.findIndex((end) => q <= end);
  const start = i === 0 ? 0 : ARC_ENDS[i - 1];
  const u = (q - start) / (ARC_ENDS[i] - start);
  const d0 = i === 0 ? 0 : ARC_DIST[i - 1];
  const dist = d0 + (ARC_DIST[i] - d0) * u;
  const base = i === 0 ? fromHeight * (1 - u) : 0;
  return {
    x: fromX + (toX - fromX) * dist,
    height: base + 4 * arcs[i] * u * (1 - u),
    // Uma volta e meia para o lado do voo.
    angle: -540 * (1 - (1 - q) ** 2) + 720,
  };
}

/**
 * Até onde a Mary desceu no fio (0..1) no plano da casa inteira, com `p` = progresso da etapa: chega ao chão
 * em `endAt`, começando devagar.
 */
export function threadDrop(p: number, endAt: number): number {
  return Math.min(1, Math.max(0, p / endAt)) ** 1.4;
}
