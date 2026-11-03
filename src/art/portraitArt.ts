// Retrato da Mary para a caixa de diálogo: rosto de aranha de frente (48×48), em quatro humores.
// Olhos grandes e brilhantes, sobrancelhas de pelinho, quelíceras embaixo e as patas da frente emoldurando.
// Spec: docs/features/dialogue.md
import type { Mood } from '../systems/dialogue';
import { PixelCanvas, type RGB } from './PixelCanvas';
import { PAL } from './palette';
import { mixColor, shadeColor } from './tilePainters';

const S = PAL.spider;

export const PORTRAIT = { w: 48, h: 48 } as const;

const P = {
  bgTop: 0xe2c494,
  bgBottom: 0xc79d68,
  fang: 0xe8d8b8,
  tear: 0x8fd0ff,
  tearLight: 0xd8f0ff,
  blush: 0x9a4a40,
};

export function buildPortrait(mood: Mood): PixelCanvas {
  const pc = new PixelCanvas(PORTRAIT.w, PORTRAIT.h);
  // Fundo de papel queimado (como o retrato do Stardew), com vinheta.
  for (let y = 0; y < PORTRAIT.h; y++) {
    for (let x = 0; x < PORTRAIT.w; x++) {
      const v = Math.hypot((x - 24) / 30, (y - 24) / 30);
      pc.set(x, y, shadeColor(mixColor(P.bgTop, P.bgBottom, y / PORTRAIT.h), 1 - Math.max(0, v - 0.5) * 0.5));
    }
  }

  // Patas da frente subindo pelos lados, emoldurando o rosto (a de trás mais escura).
  for (const side of [-1, 1]) {
    const mx = (x: number) => (side < 0 ? x : 47 - x);
    thick(pc, [mx(10), 40], [mx(3), 22], 3, S.legFar);
    thick(pc, [mx(3), 22], [mx(7), 6], 2, S.legFar);
    thick(pc, [mx(12), 34], [mx(6), 16], 3, S.legNear);
    thick(pc, [mx(6), 16], [mx(12), 2], 2, S.legNear);
    pc.rect(mx(6) - 1, 15, 3, 2, S.headLight);
  }

  // Cabeça (cefalotórax de frente): oval peludo, mais claro em cima à esquerda.
  for (let y = 0; y < PORTRAIT.h; y++) {
    for (let x = 0; x < PORTRAIT.w; x++) {
      const dx = (x + 0.5 - 24) / 17;
      const dy = (y + 0.5 - 28) / 16;
      const d = dx * dx + dy * dy;
      // Pelinhos: a borda tem pixels saindo.
      const fuzz = d <= 1.08 && (x * 7 + y * 13) % 5 === 0;
      if (d > 1 && !fuzz) continue;
      const lit = dx < -0.1 && dy < -0.15 ? S.headLight : d > 0.82 ? shadeColor(S.head, 0.8) : S.head;
      pc.set(x, y, lit);
    }
  }
  outlineShape(pc, S.outline);

  // Desenho claro na testa (o mesmo do abdômen do sprite).
  pc.line(18, 15, 24, 19, S.pattern);
  pc.line(30, 15, 24, 19, S.pattern);
  pc.set(24, 20, S.pattern);

  const surprised = mood === 'surprised';
  const sad = mood === 'sad' || mood === 'cry';
  const r = surprised ? 5.2 : 4.4;
  // Rosto mais claro embaixo dos olhos (as "bochechas"), para os olhos se destacarem.
  for (let y = 22; y <= 34; y++) {
    for (let x = 8; x <= 40; x++) {
      if (((x - 24) / 15) ** 2 + ((y - 28) / 6.5) ** 2 <= 1) pc.set(x, y, S.headLight);
    }
  }

  // Olhos: os dois grandes do meio, os dois menores dos lados e os de cima.
  for (const [x, y, rr] of [
    [8.5, 27, 2],
    [39.5, 27, 2],
    [20.5, 19, 1.5],
    [27.5, 19, 1.5],
    [13, 20.5, 1.3],
    [35, 20.5, 1.3],
  ] as const) {
    disc(pc, x, y, rr, S.eye);
    pc.set(Math.round(x - rr / 2), Math.round(y - rr / 2), S.eyeShine);
  }
  for (const ex of [16.5, 31.5]) {
    disc(pc, ex, 27, r + 1, S.outline);
    disc(pc, ex, 27, r, S.eye);
    // Brilho grande em cima à esquerda e um pequeno embaixo (olhos "fofos").
    pc.rect(Math.round(ex - r / 2) - 1, Math.round(27 - r / 2) - 1, surprised ? 3 : 2, surprised ? 3 : 2, S.eyeShine);
    pc.set(Math.round(ex + 2), 29, S.eyeShine);
    if (mood === 'cry') pc.set(Math.round(ex - 1), 30, P.tearLight);
    if (sad) {
      // Pálpebra caída: cobre a parte de cima do olho.
      for (let y = Math.floor(27 - r - 1); y <= 25; y++) {
        for (let x = Math.floor(ex - r - 1); x <= ex + r + 1; x++) if (Math.hypot(x + 0.5 - ex, y + 0.5 - 27) <= r + 1) pc.set(x, y, S.headLight);
      }
      pc.line(Math.round(ex - r), 26, Math.round(ex + r), 26, S.outline);
    }
  }

  // Sobrancelhas de pelinho.
  const brow = (x0: number, y0: number, x1: number, y1: number) => {
    pc.line(x0, y0, x1, y1, S.pattern);
    pc.line(x0, y0 - 1, x1, y1 - 1, shadeColor(S.pattern, 0.75));
  };
  if (surprised) {
    brow(13, 18, 20, 16);
    brow(28, 16, 35, 18);
  } else if (sad) {
    brow(13, 22, 21, 19);
    brow(27, 19, 35, 22);
  } else {
    brow(13, 20, 21, 20);
    brow(27, 20, 35, 20);
  }

  // Quelíceras (as "presas"), com as pontas viradas para dentro, e os palpos dos lados.
  for (const [fx, tip] of [
    [20, 1],
    [28, -1],
  ] as const) {
    for (let y = 33; y <= 41; y++) {
      for (let x = fx - 4; x <= fx + 4; x++) {
        if (((x - fx) / 3.6) ** 2 + ((y - 37) / 4.4) ** 2 <= 1) pc.set(x, y, y < 35 ? S.legNear : shadeColor(S.legNear, 0.85));
      }
    }
    pc.set(fx + tip, 41, shadeColor(S.legNear, 0.7));
    pc.set(fx + tip * 2, 42, P.fang);
  }
  for (const px of [11, 37]) disc(pc, px, 37, 2.4, S.legFar);
  if (surprised) disc(pc, 24, 40, 1.6, S.eye);

  // Bochechas coradas quando surpresa; lágrimas escorrendo quando chora.
  if (surprised) for (const bx of [8, 37]) pc.rect(bx, 31, 3, 1, P.blush);
  if (mood === 'cry') {
    for (const ex of [13, 35]) {
      for (let y = 31; y < 46; y++) {
        const x = ex + Math.round(Math.sin(y * 0.5) * 0.6) + (ex < 24 ? -Math.floor((y - 31) / 6) : Math.floor((y - 31) / 6));
        pc.set(x, y, y % 4 === 0 ? P.tearLight : P.tear);
      }
      pc.rect(ex + (ex < 24 ? -3 : 2), 46, 2, 2, P.tear);
    }
  }
  return pc;
}

function disc(pc: PixelCanvas, cx: number, cy: number, r: number, c: RGB): void {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) if (Math.hypot(x + 0.5 - cx - 0.5, y + 0.5 - cy - 0.5) <= r) pc.set(x, y, c);
  }
}

function thick(pc: PixelCanvas, a: [number, number], b: [number, number], r: number, c: RGB): void {
  const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pc.rect(Math.round(a[0] + (b[0] - a[0]) * t - r / 2), Math.round(a[1] + (b[1] - a[1]) * t - r / 2), r, r, c);
  }
}

/** Contorno escuro em volta da cabeça (onde a cor da cabeça encosta no fundo). */
function outlineShape(pc: PixelCanvas, c: RGB): void {
  const isHead = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= pc.width || y >= pc.height) return false;
    const i = (y * pc.width + x) * 4;
    const col = (pc.data[i] << 16) | (pc.data[i + 1] << 8) | pc.data[i + 2];
    return col === S.head || col === S.headLight || col === shadeColor(S.head, 0.8);
  };
  const edge: [number, number][] = [];
  for (let y = 0; y < pc.height; y++) {
    for (let x = 0; x < pc.width; x++) {
      if (isHead(x, y) && (!isHead(x - 1, y) || !isHead(x + 1, y) || !isHead(x, y - 1) || !isHead(x, y + 1))) edge.push([x, y]);
    }
  }
  for (const [x, y] of edge) pc.set(x, y, c);
}
