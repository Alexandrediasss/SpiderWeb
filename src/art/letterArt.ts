// Cartas: a folhinha dobrada no cenário, o brilho de "tem algo aqui" e a página aberta (pergaminho),
// com as patas da aranha segurando pelos cantos de baixo. Spec: docs/features/letters.md
import { NOTE_HEIGHT } from '../systems/letters';
import { ditherLevel } from './lighting';
import { PixelCanvas, type RGB, hash } from './PixelCanvas';
import { PAL } from './palette';
import { mixColor, shadeColor } from './tilePainters';

const L = PAL.letter;

/** Folhinha no cenário (px). A última linha encosta na superfície. */
export const NOTE = { w: 12, h: NOTE_HEIGHT } as const;

/**
 * Página aberta (px da imagem): a imagem inteira, o retângulo do papel e a área do texto
 * (o HTML se posiciona por cima usando essas proporções).
 */
export const PAGE = {
  w: 132,
  h: 170,
  paper: { x: 14, y: 6, w: 104, h: 140 },
  text: { x: 23, y: 15, w: 86, h: 110 },
} as const;

export interface PaperStyle {
  /** Muda as manchas e o desgaste das bordas. */
  seed: number;
  /** Canto de baixo à direita rasgado (senão, a ponta de cima fica dobrada). */
  torn?: boolean;
  /** Coraçãozinho rabiscado no canto. */
  heart?: boolean;
}

// ---------------- no cenário ----------------

/**
 * Folha de papel em pé, um pouco inclinada para trás, com a ponta de cima dobrada e linhas de tinta
 * (o leitor reconhece "carta" de longe). A última linha encosta na superfície.
 */
export function buildNote(): PixelCanvas {
  const pc = new PixelCanvas(NOTE.w, NOTE.h);
  pc.stamp(NOTE_ART, { p: L.paperLight, s: L.noteShade, i: L.noteInk, f: L.paperDark, w: 0xffffff }, 0, 0);
  outline(pc, L.noteOutline);
  return pc;
}

// 12×12 (o contorno é automático): folha inclinada, canto dobrado em cima à direita, rabiscos.
const NOTE_ART = [
  '............',
  '...wwwwf....',
  '...pppppf...',
  '...piiipps..',
  '..ppppppps..',
  '..piipiips..',
  '..ppppppps..',
  '..piiiipps..',
  '.ppppppps...',
  '.piipiiips..',
  '.pppppppps..',
  '.sssssssss..',
];

/** Brilho em cruz (7×7) que pisca em cima das cartas ainda não lidas. */
export function buildGlint(): PixelCanvas {
  const pc = new PixelCanvas(7, 7);
  const c = L.glint;
  pc.set(3, 3, 0xffffff);
  for (const [d, a] of [
    [1, 1],
    [2, 0.6],
    [3, 0.25],
  ]) {
    pc.set(3 + d, 3, c, a);
    pc.set(3 - d, 3, c, a);
    pc.set(3, 3 + d, c, a);
    pc.set(3, 3 - d, c, a);
  }
  return pc;
}

// ---------------- página aberta ----------------

/** Pergaminho com sombra, manchas de chuva, dobras e as patas da aranha segurando. */
export function buildParchment(style: PaperStyle): PixelCanvas {
  const pc = new PixelCanvas(PAGE.w, PAGE.h);
  const P = PAGE.paper;
  const mask = paperMask(style);
  const inPaper = (x: number, y: number) => {
    const u = x - P.x;
    const v = y - P.y;
    return u >= 0 && v >= 0 && u < P.w && v < P.h && mask[v * P.w + u] > 0;
  };

  // Sombra projetada (para baixo e à direita).
  for (let y = 0; y < PAGE.h; y++) {
    for (let x = 0; x < PAGE.w; x++) if (!inPaper(x, y) && inPaper(x - 3, y - 4)) pc.set(x, y, L.shadow, 0.45);
  }

  const stains = stainList(style.seed);
  for (let v = 0; v < P.h; v++) {
    for (let u = 0; u < P.w; u++) {
      const m = mask[v * P.w + u];
      if (m === 0) continue;
      const x = P.x + u;
      const y = P.y + v;
      pc.set(x, y, m === 2 ? flapColor(u, v) : paperColor(u, v, x, y, style.seed, stains));
    }
  }
  // Contorno escuro em volta do papel (pixel art: borda nítida).
  for (let y = 0; y < PAGE.h; y++) {
    for (let x = 0; x < PAGE.w; x++) {
      if (!inPaper(x, y) && (inPaper(x - 1, y) || inPaper(x + 1, y) || inPaper(x, y - 1) || inPaper(x, y + 1))) pc.set(x, y, L.outline);
    }
  }
  if (style.heart) stampHeart(pc, P.x + P.w - 26, P.y + P.h - 26);

  // As patas: atrás (mais escuras) primeiro, depois as da frente. Sombra das pontas no papel.
  for (const leg of LEGS) for (const side of [1, -1] as const) shadeTip(pc, mirrorLeg(leg, side), inPaper);
  for (const back of [true, false]) {
    for (const leg of LEGS) {
      if (leg.back !== back) continue;
      for (const side of [1, -1] as const) drawLeg(pc, mirrorLeg(leg, side), back);
    }
  }
  return pc;
}

/** 0 = fora, 1 = papel, 2 = ponta dobrada. Bordas gastas e um canto rasgado ou dobrado. */
function paperMask(style: PaperStyle): Uint8Array {
  const { w, h } = PAGE.paper;
  const s = style.seed;
  const mask = new Uint8Array(w * h);
  const wear = (i: number, k: number) => {
    const r = hash(Math.floor(i / 3), k, s);
    return r < 0.55 ? 0 : r < 0.9 ? 1 : 2;
  };
  for (let v = 0; v < h; v++) {
    for (let u = 0; u < w; u++) {
      if (u < wear(v, 1) || w - 1 - u < wear(v, 2) || v < wear(u, 3) || h - 1 - v < wear(u, 4)) continue;
      const a = w - 1 - u;
      if (style.torn) {
        // Rasgo em diagonal, com a borda serrilhada.
        const b = h - 1 - v;
        if (a + b < 16 + Math.floor(hash(u + v, 0, s + 9) * 4)) continue;
      } else if (a + v < 10) {
        continue;
      } else if (a <= 9 && v <= 9) {
        mask[v * w + u] = 2;
        continue;
      }
      mask[v * w + u] = 1;
    }
  }
  return mask;
}

interface Stain {
  x: number;
  y: number;
  r: number;
}

/** Manchas de água de chuva, em lugares diferentes para cada carta. */
function stainList(seed: number): Stain[] {
  const { w, h } = PAGE.paper;
  return [0, 1, 2].map((i) => ({
    x: Math.round(hash(i, 1, seed) * w),
    y: Math.round(hash(i, 2, seed) * h),
    r: 5 + Math.round(hash(i, 3, seed) * 9),
  }));
}

function paperColor(u: number, v: number, x: number, y: number, seed: number, stains: Stain[]): RGB {
  const { w, h } = PAGE.paper;
  // Papel manchado em blocos, em faixas com pontilhado.
  const n = hash(Math.floor(u / 6), Math.floor(v / 5), seed) * 0.55 + hash(Math.floor(u / 2), Math.floor(v / 2), seed + 1) * 0.45;
  let col = mixColor(L.paperLight, L.paperDark, ditherLevel(n * 0.85, x, y, 3));

  // Bordas envelhecidas.
  const d = Math.min(u, v, w - 1 - u, h - 1 - v);
  // Cantos mais gastos que o meio das bordas.
  const corner = Math.min(Math.hypot(u, v), Math.hypot(w - u, v), Math.hypot(u, h - v), Math.hypot(w - u, h - v));
  const age = Math.max(0, 1 - (d + hash(u, v, seed + 2) * 4) / 18) ** 1.3 + Math.max(0, 1 - corner / 26) * 0.35;
  col = mixColor(col, L.edge, ditherLevel(Math.min(1, age), x, y, 4));
  if (d === 0) col = mixColor(col, L.edgeDark, 0.55);

  // Dobras: a carta foi dobrada em três.
  for (const c of [Math.round(h / 3), Math.round((2 * h) / 3)]) {
    if (v === c) col = mixColor(col, L.crease, 0.8);
    else if (v === c + 1) col = mixColor(col, L.creaseLight, 0.45);
  }
  if (u === Math.round(w / 2) && hash(0, Math.floor(v / 4), seed + 3) < 0.7) col = mixColor(col, L.crease, 0.3);

  // Manchas de chuva: borda mais escura e o miolo levemente manchado.
  for (const s of stains) {
    const dist = Math.hypot(u - s.x, (v - s.y) * 1.15);
    if (Math.abs(dist - s.r) < 0.75) col = mixColor(col, L.stainRing, 0.55);
    else if (dist < s.r) col = mixColor(col, L.stain, ditherLevel(0.45, x, y, 2));
  }
  return col;
}

/** Ponta dobrada: o verso do papel, mais escuro, com a linha da dobra clara. */
function flapColor(u: number, v: number): RGB {
  const a = PAGE.paper.w - 1 - u;
  if (a + v <= 10) return L.creaseLight;
  if (a === 9 || v === 9) return L.edgeDark;
  return shadeColor(L.paperDark, 0.92);
}

function stampHeart(pc: PixelCanvas, x: number, y: number): void {
  pc.stamp(['.kk.kk.', 'k..k..k', 'k.....k', '.k...k.', '..k.k..', '...k...'], { k: L.doodle }, x, y);
}

// ---------------- patas ----------------

interface LegPose {
  /** Pontos da pata da base (fora da imagem, embaixo) até a ponta, no lado esquerdo. */
  pts: [number, number][];
  /** Raio de cada segmento (fêmur grosso, tíbia, tarso fino). */
  radii: number[];
  /** Pata de trás: mais escura e desenhada antes. */
  back: boolean;
}

/** Duas patas de cada lado (o lado direito é o espelho, um pouco mais baixo). */
const LEGS: LegPose[] = [
  { pts: [[-8, 196], [3, 141], [13, 126], [26, 135]], radii: [4, 3, 2], back: false },
  { pts: [[14, 200], [7, 163], [22, 150], [36, 143]], radii: [3, 2, 1], back: true },
];

function mirrorLeg(leg: LegPose, side: 1 | -1): LegPose {
  if (side === 1) return leg;
  return { ...leg, pts: leg.pts.map(([x, y]) => [PAGE.w - 1 - x, y + 2] as [number, number]) };
}

function drawLeg(pc: PixelCanvas, leg: LegPose, back: boolean): void {
  const base = back ? mixColor(L.legBase, L.legDark, 0.45) : L.legBase;
  const light = back ? mixColor(L.legLight, L.legDark, 0.45) : L.legLight;
  const segs = leg.pts.slice(1).map((p, i) => ({ a: leg.pts[i], b: p, r: leg.radii[i] }));
  // Contorno, preenchimento, brilho em cima e os pelos.
  for (const s of segs) thick(pc, s.a, s.b, s.r + 1, L.legDark);
  for (const s of segs) thick(pc, s.a, s.b, s.r, base);
  for (const s of segs) {
    if (s.r >= 2) pc.line(s.a[0] - 1, s.a[1] - 1, s.b[0] - 1, s.b[1] - 1, light);
    hairs(pc, s.a, s.b, s.r, back);
  }
  // Juntas: anéis claros, da cor do desenho das costas dela (como nas aranhas de verdade).
  const ring = mixColor(light, PAL.spider.pattern, back ? 0.25 : 0.5);
  for (let i = 1; i < leg.pts.length - 1; i++) {
    const [jx, jy] = leg.pts[i];
    pc.disc(jx, jy, Math.max(1, leg.radii[i]), ring);
    pc.set(jx - 1, jy - 1, shadeColor(ring, 1.2));
  }
  // Garra na ponta.
  const [tx, ty] = leg.pts[leg.pts.length - 1];
  pc.set(tx, ty, L.legDark);
  pc.set(tx + Math.sign(tx - leg.pts[leg.pts.length - 2][0]), ty + 1, L.legDark);
}

/** Linha grossa: discos de raio `r` ao longo do segmento. */
function thick(pc: PixelCanvas, a: [number, number], b: [number, number], r: number, c: RGB): void {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  for (let t = 0; t <= len; t += 0.5) {
    const k = len === 0 ? 0 : t / len;
    pc.disc(Math.round(a[0] + (b[0] - a[0]) * k), Math.round(a[1] + (b[1] - a[1]) * k), r, c);
  }
}

/** Pelinhos curtos saindo dos dois lados do segmento. */
function hairs(pc: PixelCanvas, a: [number, number], b: [number, number], r: number, back: boolean): void {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len === 0) return;
  const nx = -dy / len;
  const ny = dx / len;
  const col = back ? mixColor(L.legHair, L.legDark, 0.5) : L.legHair;
  for (let t = 2; t < len - 2; t += 2.5) {
    const side = hash(Math.round(a[0] + t), Math.round(a[1]), 41) < 0.5 ? 1 : -1;
    // Pelo inclinado para a ponta da pata, com 1 ou 2 px.
    const size = hash(Math.round(t), r, 43) < 0.5 ? 1 : 2;
    for (let k = 1; k <= size; k++) {
      const px = a[0] + (dx * (t + k)) / len + nx * (r + 0.5 + k) * side;
      const py = a[1] + (dy * (t + k)) / len + ny * (r + 0.5 + k) * side;
      pc.set(Math.round(px), Math.round(py), col);
    }
  }
}

/** Escurece o papel embaixo de cada ponta de pata (ela aperta a folha). */
function shadeTip(pc: PixelCanvas, leg: LegPose, inPaper: (x: number, y: number) => boolean): void {
  const [tx, ty] = leg.pts[leg.pts.length - 1];
  for (let y = ty - 2; y <= ty + 5; y++) {
    for (let x = tx - 3; x <= tx + 4; x++) {
      if (inPaper(x, y) && Math.hypot(x - tx - 1, (y - ty - 2) * 1.3) < 3.5) pc.shade(x, y, 0.82);
    }
  }
}

/** Pinta de `c` os pixels transparentes encostados (4 vizinhos) em pixels pintados. */
function outline(pc: PixelCanvas, c: RGB): void {
  const filled = (x: number, y: number) => x >= 0 && y >= 0 && x < pc.width && y < pc.height && pc.data[(y * pc.width + x) * 4 + 3] > 0;
  const edge: [number, number][] = [];
  for (let y = 0; y < pc.height; y++) {
    for (let x = 0; x < pc.width; x++) {
      if (!filled(x, y) && (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1))) edge.push([x, y]);
    }
  }
  for (const [x, y] of edge) pc.set(x, y, c);
}
