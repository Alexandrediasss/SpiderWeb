// Sprite da aranha (vista lateral, olhando para a direita).
// Corpo = ASCII + paleta; pernas = linhas calculadas por quadro (animação procedural).
import { SPIDER } from '../config';
import { PixelCanvas } from './PixelCanvas';
import { PAL } from './palette';

const S = PAL.spider;

const BODY_PALETTE = {
  k: S.outline,
  B: S.abdomen,
  h: S.abdomenLight,
  p: S.pattern,
  b: S.head,
  l: S.headLight,
  e: S.eye,
  w: S.eyeShine,
};

// 22×14. Abdômen atrás (esquerda), cefalotórax e olhos na frente (direita).
const BODY = [
  '......................',
  '......................',
  '.....kkkkkk...........',
  '....kBhhhBBk..........',
  '...kBhhBpBBBk.........',
  '...kBBBBpBBBk.........',
  '...kBBpppppBkkkk......',
  '...kBBBBpBBkkllbk.....',
  '....kBBBpBkbbbbwek....',
  '.....kkkkkkbbbbeek....',
  '...........kkbbbk.....',
  '.............kkk......',
  '......................',
  '......................',
];

interface Leg {
  attach: [number, number];
  knee: [number, number];
  foot: [number, number];
}

// Pernas do lado de perto, da frente para trás. O lado de longe é desenhado deslocado e mais escuro.
const LEGS: Leg[] = [
  { attach: [15, 9], knee: [18, 4], foot: [21, 13] },
  { attach: [14, 9], knee: [15, 3], foot: [17, 13] },
  { attach: [13, 9], knee: [9, 2], foot: [8, 13] },
  { attach: [12, 9], knee: [4, 3], foot: [2, 13] },
];

export interface SpiderFrame {
  name: string;
  /** Fase da caminhada (radianos) ou null para pose parada. */
  phase: number | null;
  bodyDy: number;
  air?: boolean;
}

export const SPIDER_FRAMES: SpiderFrame[] = [
  { name: 'idle0', phase: null, bodyDy: 0 },
  { name: 'idle1', phase: null, bodyDy: 1 },
  { name: 'walk0', phase: 0, bodyDy: 0 },
  { name: 'walk1', phase: Math.PI / 2, bodyDy: -1 },
  { name: 'walk2', phase: Math.PI, bodyDy: 0 },
  { name: 'walk3', phase: (Math.PI * 3) / 2, bodyDy: -1 },
  { name: 'air', phase: null, bodyDy: 0, air: true },
];

function drawLeg(pc: PixelCanvas, leg: Leg, ox: number, frame: SpiderFrame, phaseOffset: number, color: number, shift: number): void {
  let footDx = 0;
  let lift = 0;
  if (frame.phase !== null) {
    const p = frame.phase + phaseOffset;
    footDx = Math.round(Math.cos(p) * 1.6);
    lift = Math.sin(p) > 0.3 ? 1 : 0;
  }
  const [ax, ay] = leg.attach;
  let [kx, ky] = leg.knee;
  let [fx, fy] = leg.foot;
  kx += Math.round(footDx / 2) + shift;
  ky += frame.bodyDy - lift;
  fx += footDx + shift;
  fy -= lift;
  if (frame.air) {
    // No ar as pernas abrem e os pés sobem.
    const spread = fx > ax ? 1 : -1;
    fx += spread;
    fy -= 3;
    ky -= 1;
  }
  pc.line(ox + ax + shift, ay + frame.bodyDy, ox + kx, ky, color);
  pc.line(ox + kx, ky, ox + fx, fy, color);
}

/** Gera a tira de quadros da aranha. */
export function buildSpiderSheet(): PixelCanvas {
  const w = SPIDER.frameW;
  const h = SPIDER.frameH;
  const pc = new PixelCanvas(w * SPIDER_FRAMES.length, h);

  SPIDER_FRAMES.forEach((frame, i) => {
    const ox = i * w;
    // Lado de longe: fase oposta, um pixel para trás.
    LEGS.forEach((leg, li) => drawLeg(pc, leg, ox, frame, (li % 2) * Math.PI + Math.PI, S.legFar, -1));
    // Lado de perto
    LEGS.forEach((leg, li) => drawLeg(pc, leg, ox, frame, (li % 2) * Math.PI, S.legNear, 0));
    pc.stamp(BODY, BODY_PALETTE, ox, frame.bodyDy);
  });
  return pc;
}

/** Mira: uma cruz pequena de 9×9. */
export function buildReticle(): PixelCanvas {
  const pc = new PixelCanvas(9, 9);
  const c = PAL.ui.reticle;
  for (const [x, y] of [
    [4, 0],
    [4, 1],
    [4, 7],
    [4, 8],
    [0, 4],
    [1, 4],
    [7, 4],
    [8, 4],
    [4, 4],
  ]) {
    pc.set(x, y, c);
  }
  return pc;
}
