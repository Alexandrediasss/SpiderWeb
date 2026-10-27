// Rato branco de olhos vermelhos (vista lateral, olhando para a direita), desenhado por formas + contorno automático.
// Os olhos ficam numa folha separada: no jogo eles não escurecem com a noite (brilham no escuro).
// Também: o casulo de teia (rato preso) e os corações da vida.
import { PixelCanvas } from './PixelCanvas';
import { PAL } from './palette';

const R = PAL.rat;

export const RAT_FRAME = { w: 32, h: 15 } as const;

interface RatPose {
  name: string;
  /** Deslocamento das patas (fase da caminhada). */
  step: number;
  /** Corpo sobe 1 px. */
  bob: number;
  /** Cabeça avançada e boca aberta (mordida). */
  bite?: boolean;
}

export const RAT_POSES: RatPose[] = [
  { name: 'idle', step: 0, bob: 0 },
  { name: 'walk0', step: 1, bob: 0 },
  { name: 'walk1', step: -1, bob: -1 },
  { name: 'bite', step: 0, bob: -1, bite: true },
];

/** Máscara do corpo: elipse do tronco + cabeça afinando até o focinho + orelha. */
function ratShape(x: number, y: number, pose: RatPose): 'fur' | 'shade' | 'ear' | null {
  const by = 9 + pose.bob;
  const hx = pose.bite ? 2 : 0;
  // Orelha (atrás da cabeça)
  if ((x - (18.5 + hx)) ** 2 + (y - (by - 4)) ** 2 <= 4.5) return 'ear';
  // Tronco com as costas arqueadas (mais alto atrás)
  const body = ((x - 11) / 8) ** 2 + ((y - (by - 0.5)) / 4.6) ** 2 <= 1;
  // Cabeça mais baixa que as costas + focinho em cunha
  const head = ((x - (20.5 + hx)) / 4.3) ** 2 + ((y - (by + 0.5)) / 3.1) ** 2 <= 1;
  const snoutLen = 27 + hx - x;
  const snout = x >= 22 + hx && snoutLen >= 0 && Math.abs(y - (by + 1)) <= snoutLen * 0.5;
  if (!body && !head && !snout) return null;
  return y > by + 1.5 ? 'shade' : 'fur';
}

function drawRat(pc: PixelCanvas, eyes: PixelCanvas, ox: number, pose: RatPose): void {
  const { w, h } = RAT_FRAME;
  const by = 9 + pose.bob;
  const hx = pose.bite ? 2 : 0;
  const mask: (string | null)[][] = [];
  for (let y = 0; y < h; y++) {
    mask.push([]);
    for (let x = 0; x < w; x++) mask[y].push(ratShape(x, y, pose));
  }

  // Patas (rosadas), alternando na caminhada: traseiras em 7/10, dianteiras em 17/20.
  const feet = [7, 10, 17, 20];
  feet.forEach((fx, i) => {
    const up = pose.step !== 0 && (i % 2 === 0) === pose.step > 0;
    const x = ox + fx + (pose.step !== 0 ? (i % 2 === 0 ? pose.step : -pose.step) : 0);
    pc.set(x, by + 4 - (up ? 1 : 0), R.outline);
    pc.set(x, by + 5 - (up ? 1 : 0), R.pink);
    if (!up) pc.set(x + 1, by + 5, R.pinkDark);
  });

  // Contorno: pixel vazio encostado no corpo.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y][x]) continue;
      const near = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dx, dy]) => mask[y + dy]?.[x + dx]);
      if (near) pc.set(ox + x, y, R.outline);
    }
  }

  // Pelo, sombra da barriga e orelha.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const m = mask[y][x];
      if (!m) continue;
      let c = m === 'shade' ? R.furShade : m === 'ear' ? R.pink : R.fur;
      if (m === 'fur' && y === by + 1 && x < 12) c = R.furShade;
      if (m === 'shade' && y >= by + 3) c = R.furDark;
      pc.set(ox + x, y, c);
    }
  }
  pc.set(ox + 18 + hx, by - 5, R.pinkDark);

  // Focinho, olho e bigode.
  pc.set(ox + 27 + hx, by + 1, R.pinkDark);
  pc.set(ox + 27 + hx, by + 2, R.pink);
  pc.set(ox + 28 + hx, by, R.furDark);
  pc.set(ox + 28 + hx, by + 3, R.furDark);
  for (const [ex, ey, c] of [
    [21 + hx, by - 1, R.eye],
    [22 + hx, by - 1, R.eye],
    [21 + hx, by - 2, R.eyeGlow],
  ] as const) {
    pc.set(ox + ex, ey, c);
    eyes.set(ox + ex, ey, c);
  }

  if (pose.bite) {
    // Boca aberta com dentinhos.
    pc.set(ox + 25 + hx, by + 2, R.mouth);
    pc.set(ox + 26 + hx, by + 2, R.mouth);
    pc.set(ox + 26 + hx, by + 3, R.tooth);
    pc.set(ox + 24 + hx, by + 2, R.tooth);
  }

  // Rabo: curva fina rosada saindo de trás.
  const tail = [
    [4, by + 2],
    [3, by + 3],
    [2, by + 3],
    [1, by + 2],
    [0, by + 1 + (pose.step > 0 ? 1 : 0)],
  ];
  for (const [tx, ty] of tail) pc.set(ox + tx, ty, R.pink);
}

/** Folha com os quadros do rato e outra, do mesmo tamanho, só com os olhos. */
export function buildRatSheets(): { body: PixelCanvas; eyes: PixelCanvas } {
  const { w, h } = RAT_FRAME;
  const body = new PixelCanvas(w * RAT_POSES.length, h);
  const eyes = new PixelCanvas(w * RAT_POSES.length, h);
  RAT_POSES.forEach((pose, i) => drawRat(body, eyes, i * w, pose));
  return { body, eyes };
}

/** Casulo de teia por cima do rato preso. */
export function buildRatWeb(): PixelCanvas {
  const { w, h } = RAT_FRAME;
  const pc = new PixelCanvas(w, h);
  const c = PAL.decor.web;
  for (let i = -2; i < 7; i++) {
    pc.line(3 + i * 4, 2, 9 + i * 4, h - 2, c, 0.75);
    pc.line(9 + i * 4, 2, 3 + i * 4, h - 2, c, 0.55);
  }
  pc.line(2, 4, w - 2, 5, c, 0.6);
  pc.line(2, h - 4, w - 2, h - 5, c, 0.6);
  // Recorta fora do contorno aproximado do rato.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const inBody = ((x - 15) / 14) ** 2 + ((y - 8.5) / 6.5) ** 2 <= 1;
      if (!inBody) pc.data[(y * w + x) * 4 + 3] = 0;
    }
  }
  return pc;
}

const HEART = [
  '.kk...kk.',
  'kRRk.kRRk',
  'kRhRkRRRk',
  'kRRRRRRRk',
  '.kRRRRRk.',
  '..kRRRk..',
  '...kRk...',
  '....k....',
];

/** Coração cheio e vazio, lado a lado (9×8 cada). */
export function buildHearts(): PixelCanvas {
  const pc = new PixelCanvas(18, 8);
  const U = PAL.ui;
  pc.stamp(HEART, { k: U.heartOutline, R: U.heart, h: U.heartLight }, 0, 0);
  pc.stamp(HEART, { k: U.heartOutline, R: U.heartEmpty, h: U.heartEmpty }, 9, 0);
  return pc;
}
