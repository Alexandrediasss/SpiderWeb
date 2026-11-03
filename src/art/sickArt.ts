// O doente da cozinha (ato 3) e o lustre, em pixel art desenhada por código. O doente é um homem de
// camiseta branca suja e calça jeans, cheio de cortes, sem a mão do braço de trás (só o toco). Olhando para
// a direita; os olhos claros ficam numa folha à parte (brilham no escuro, como os zumbis da rua).
// Spec: docs/features/act3-lights-out.md
import { CHANDELIER } from '../config';
import { PixelCanvas, type RGB } from './PixelCanvas';
import { PAL } from './palette';

const A = PAL.act3;
const OUTLINE = PAL.zombie.outline;

/** Quadro do doente (px): os pés ficam na última linha. */
export const SICK_FRAME = { w: 34, h: 54 } as const;
/** O doente caído (deitado, de lado). */
export const SICK_DEAD = { w: 56, h: 16 } as const;

export const SICK_POSES = ['walk0', 'walk1', 'walk2', 'walk3', 'windup', 'swing', 'reach'] as const;
export type SickPose = (typeof SICK_POSES)[number];

interface Limb {
  /** Ombro (ou quadril), cotovelo (ou joelho) e a ponta, em px do quadro. */
  a: [number, number];
  b: [number, number];
  c: [number, number];
}

interface PoseDef {
  /** Deslocamento do corpo (balanço da caminhada). */
  bob: number;
  front: Limb;
  back: Limb;
  legFront: Limb;
  legBack: Limb;
}

const HIP_Y = 33;
const legs = (front: number, back: number): Pick<PoseDef, 'legFront' | 'legBack'> => ({
  legFront: { a: [17, HIP_Y], b: [17 + front * 0.6, 43], c: [17 + front, 52] },
  legBack: { a: [14, HIP_Y], b: [14 + back * 0.6, 43], c: [14 + back, 52] },
});
/** O braço de trás (sem a mão) pende, balançando de leve. */
const stump = (swing: number): Limb => ({ a: [13, 18], b: [12 + swing, 25], c: [13 + swing * 1.6, 30] });
/** O braço da frente estendido para a frente, como zumbi. */
const reachForward = (y: number): Limb => ({ a: [20, 18], b: [26, 20 + y], c: [31, 19 + y] });

const POSES: Record<SickPose, PoseDef> = {
  walk0: { bob: 0, front: reachForward(0), back: stump(1), ...legs(4, -4) },
  walk1: { bob: 1, front: reachForward(1), back: stump(0), ...legs(1, -1) },
  walk2: { bob: 0, front: reachForward(0), back: stump(-1), ...legs(-4, 4) },
  walk3: { bob: 1, front: reachForward(1), back: stump(0), ...legs(-1, 1) },
  // O bote: braço levantado atrás da cabeça.
  windup: { bob: 0, front: { a: [20, 18], b: [22, 9], c: [17, 3] }, back: stump(0), ...legs(3, -3) },
  // O tapa: braço descendo na frente, até a altura dos joelhos.
  swing: { bob: 1, front: { a: [20, 18], b: [27, 26], c: [32, 36] }, back: stump(-1), ...legs(5, -4) },
  // Esticando o braço para cima (a Mary está no teto).
  reach: { bob: 0, front: { a: [20, 18], b: [22, 9], c: [23, 1] }, back: stump(0), ...legs(1, -1) },
};

/** Folha do doente: um quadro por pose (corpo) e a dos olhos, do mesmo tamanho. */
export function buildSickSheets(): { body: PixelCanvas; eyes: PixelCanvas } {
  const W = SICK_FRAME.w * SICK_POSES.length;
  const body = new PixelCanvas(W, SICK_FRAME.h);
  const eyes = new PixelCanvas(W, SICK_FRAME.h);
  SICK_POSES.forEach((pose, i) => {
    const frame = new PixelCanvas(SICK_FRAME.w, SICK_FRAME.h);
    const eyeFrame = new PixelCanvas(SICK_FRAME.w, SICK_FRAME.h);
    drawSick(frame, eyeFrame, POSES[pose]);
    outline(frame);
    body.blit(frame, i * SICK_FRAME.w, 0);
    eyes.blit(eyeFrame, i * SICK_FRAME.w, 0);
  });
  return { body, eyes };
}

function drawSick(pc: PixelCanvas, eyes: PixelCanvas, p: PoseDef): void {
  const b = p.bob;
  // Pernas (a de trás mais escura), com os tênis.
  limb(pc, shift(p.legBack, 0), 4, A.sickJeansDark);
  limb(pc, shift(p.legFront, 0), 4, A.sickJeans);
  for (const [leg, dark] of [
    [p.legBack, true],
    [p.legFront, false],
  ] as const) {
    const [fx, fy] = leg.c;
    pc.rect(Math.round(fx) - 2, fy, 7, 2, dark ? shade(A.sickShoe, 0.8) : A.sickShoe);
  }
  // Braço de trás (o toco, sem a mão, pingando sangue).
  limb(pc, shift(p.back, b), 3, A.sickSkinDark);
  const [sx, sy] = p.back.c;
  pc.rect(Math.round(sx) - 1, Math.round(sy) + b, 3, 2, A.sickCut);
  pc.set(Math.round(sx), Math.round(sy) + b + 3, A.sickCut);
  // Tronco inclinado para a frente: a camiseta rasgada e suja.
  for (let y = 16; y <= HIP_Y; y++) {
    const lean = Math.round((HIP_Y - y) * 0.12);
    const x0 = 11 + lean;
    for (let x = x0; x < x0 + 11; x++) {
      const torn = y >= HIP_Y - 1 && (x + y) % 3 === 0;
      if (torn) continue;
      const dirty = (x * 7 + y * 3) % 11 === 0;
      pc.set(x, y + b, x === x0 ? A.sickShirtDark : dirty ? A.sickShirtDark : A.sickShirt);
    }
  }
  // Cinto e a barra da calça em cima.
  pc.rect(11, HIP_Y + b, 11, 1, A.sickJeansDark);
  // Cortes atravessando o corpo (e manchas de sangue na camiseta).
  pc.line(13, 20 + b, 19, 25 + b, A.sickCut);
  pc.line(14, 28 + b, 20, 24 + b, A.sickCut);
  pc.rect(18, 29 + b, 3, 2, A.sickCut);
  // Pescoço e cabeça (pendendo para a frente).
  pc.rect(17, 13 + b, 4, 3, A.sickSkinDark);
  for (let y = 3; y <= 13; y++) {
    for (let x = 14; x <= 24; x++) {
      const dx = (x - 19.5) / 5.5;
      const dy = (y - 8.5) / 5.5;
      if (dx * dx + dy * dy > 1) continue;
      pc.set(x, y + b, x <= 15 ? A.sickSkinDark : A.sickSkin);
    }
  }
  // Cabelo bagunçado.
  for (let x = 14; x <= 23; x++) pc.rect(x, 3 + b - ((x * 5) % 3 === 0 ? 1 : 0), 1, 3 - (x > 20 ? 1 : 0), A.sickHair);
  pc.rect(14, 6 + b, 2, 4, A.sickHair);
  // Olho fundo, boca aberta e o corte no rosto.
  pc.set(21, 8 + b, OUTLINE);
  eyes.set(21, 8 + b, A.sickEye);
  eyes.set(22, 8 + b, A.sickEye, 0.6);
  pc.rect(21, 11 + b, 3, 2, A.sickMouth);
  pc.set(22, 11 + b, PAL.zombie.tooth);
  pc.line(17, 6 + b, 19, 11 + b, A.sickCut);
  // Braço da frente (a mão boa), com cortes.
  limb(pc, shift(p.front, b), 3, A.sickSkin);
  const [hx, hy] = p.front.c;
  pc.rect(Math.round(hx) - 1, Math.round(hy) + b - 1, 3, 3, A.sickSkin);
  const mid: [number, number] = [(p.front.a[0] + p.front.b[0]) / 2, (p.front.a[1] + p.front.b[1]) / 2 + b];
  pc.set(Math.round(mid[0]), Math.round(mid[1]), A.sickCut);
  pc.set(Math.round(mid[0]) + 1, Math.round(mid[1]) - 1, A.sickCut);
}

/** O doente caído de lado, depois de derrotado. */
export function buildSickDead(): PixelCanvas {
  const pc = new PixelCanvas(SICK_DEAD.w, SICK_DEAD.h);
  const floor = SICK_DEAD.h - 1;
  // Pernas e tênis (à esquerda), tronco, cabeça (à direita), o braço bom esticado.
  pc.rect(2, floor - 4, 18, 4, A.sickJeans);
  pc.rect(2, floor - 6, 16, 2, A.sickJeansDark);
  pc.rect(0, floor - 5, 3, 5, A.sickShoe);
  pc.rect(19, floor - 7, 18, 7, A.sickShirt);
  pc.rect(19, floor - 7, 18, 1, A.sickShirtDark);
  pc.line(22, floor - 6, 28, floor - 2, A.sickCut);
  pc.line(29, floor - 5, 34, floor - 1, A.sickCut);
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 10; x++) if (((x - 4.5) / 5) ** 2 + ((y - 4.5) / 4.6) ** 2 <= 1) pc.set(37 + x, floor - 9 + y, A.sickSkin);
  }
  pc.rect(37, floor - 9, 10, 3, A.sickHair);
  pc.rect(42, floor - 3, 3, 2, A.sickMouth);
  pc.rect(20, floor - 10, 14, 2, A.sickSkinDark);
  pc.rect(47, floor - 1, 7, 1, A.sickCut);
  outline(pc);
  return pc;
}

/** Tamanho do quadro do lustre (px). */
export const CHANDELIER_ART = { w: CHANDELIER.w + 2, h: CHANDELIER.h + 2 } as const;

/**
 * O lustre de latão: argola, haste, o aro com braços, velas apagadas (não tem energia, e ninguém as
 * acendeu) e cristais pendurados. `broken`: caído, com braços tortos e sem cristais.
 */
export function buildChandelier(broken = false): PixelCanvas {
  const { w, h } = CHANDELIER_ART;
  const pc = new PixelCanvas(w, h);
  const cx = Math.floor(w / 2);
  pc.rect(cx - 1, 0, 3, 2, A.brassDark);
  pc.rect(cx, 2, 1, 5, A.brass);
  // O aro.
  for (let x = 3; x < w - 3; x++) {
    pc.set(x, 9, A.brassLight);
    pc.set(x, 10, A.brass);
    pc.set(x, 11, A.brassDark);
  }
  pc.rect(cx - 3, 6, 7, 4, A.brass);
  pc.rect(cx - 2, 6, 2, 1, A.brassLight);
  // Braços com as velas (os de dentro mais altos).
  const arms = broken ? [3, 9, 22, 28] : [3, 9, 15, 22, 28];
  for (const ax of arms) {
    const tilt = broken && ax > cx ? 2 : 0;
    pc.line(ax, 9 - tilt, ax, 6 - tilt, A.brass);
    pc.rect(ax - 1, 5 - tilt, 3, 1, A.brassDark);
    pc.rect(ax, 1 - tilt, 1, 4, A.candle);
    pc.set(ax, 0 - tilt, A.candleShade);
  }
  // Cristais e o pingente de baixo.
  if (!broken) for (const x of [5, 8, 12, 19, 23, 26]) pc.rect(x, 12, 1, 2 + (x % 2), A.crystal);
  pc.rect(cx - 1, 12, 3, 3, A.brassDark);
  pc.set(cx, 15, A.crystal);
  return pc;
}

// ---------- peças ----------

function shift(l: Limb, dy: number): Limb {
  return { a: [l.a[0], l.a[1] + dy], b: [l.b[0], l.b[1] + dy], c: [l.c[0], l.c[1] + dy] };
}

/** Membro em dois segmentos grossos (`r` px). */
function limb(pc: PixelCanvas, l: Limb, r: number, c: RGB): void {
  thick(pc, l.a, l.b, r, c);
  thick(pc, l.b, l.c, r - 1, c);
}

function thick(pc: PixelCanvas, a: [number, number], b: [number, number], r: number, c: RGB): void {
  const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = a[0] + (b[0] - a[0]) * t;
    const y = a[1] + (b[1] - a[1]) * t;
    pc.rect(Math.round(x - r / 2), Math.round(y - r / 2), r, r, c);
  }
}

function shade(c: RGB, f: number): RGB {
  return (Math.round(((c >> 16) & 255) * f) << 16) | (Math.round(((c >> 8) & 255) * f) << 8) | Math.round((c & 255) * f);
}

/** Contorno escuro de 1 px em volta do desenho (pixel art: silhueta nítida). */
function outline(pc: PixelCanvas): void {
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < pc.width && y < pc.height && pc.data[(y * pc.width + x) * 4 + 3] > 0;
  const edge: [number, number][] = [];
  for (let y = 0; y < pc.height; y++) {
    for (let x = 0; x < pc.width; x++) {
      if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) edge.push([x, y]);
    }
  }
  for (const [x, y] of edge) pc.set(x, y, OUTLINE);
}
