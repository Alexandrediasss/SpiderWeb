// Decorações de fundo desenhadas em código (janelas, quadros, luminárias...).
// Cada função recebe a posição em pixels do canto superior esquerdo.
import type { Vec2 } from '../physics/surfaces';
import { type Decor, type DecorKind, ROOF_HOLE } from '../level/houseMap';
import { type PixelCanvas, hash } from './PixelCanvas';
import { PAL } from './palette';
import { mixColor, shadeColor, skyColorAt } from './tilePainters';

const D = PAL.decor;

/** Marca pixels que mostram o lado de fora (vidro das janelas): lá a chuva e o relâmpago aparecem. */
export type OutsideMarker = (x: number, y: number, outside: boolean) => void;

type DecorPainter = (pc: PixelCanvas, x: number, y: number, flipX: boolean, mark: OutsideMarker) => void;

const noMark: OutsideMarker = () => {};

/** Onde fica a lâmpada (a fonte de luz) de uma luminária. */
export function lampBulb(d: Decor): Vec2 {
  return { x: d.tx * 16 + 8, y: d.ty * 16 + 22 };
}

/** Centro do vidro de uma janela (de onde entra a luz do relâmpago), ou null se não for janela. O buraco no telhado conta. */
export function windowCenter(d: Decor): Vec2 | null {
  if (d.kind === 'window') return { x: d.tx * 16 + 24, y: d.ty * 16 + 20 };
  if (d.kind === 'roundWindow') return { x: d.tx * 16 + 16, y: d.ty * 16 + 16 };
  if (d.kind === 'roofHole') return { x: d.tx * 16 + ROOF_HOLE.w * 8, y: d.ty * 16 + ROOF_HOLE.h * 8 };
  return null;
}

function frameRect(pc: PixelCanvas, x: number, y: number, w: number, h: number, light: number, dark: number, t = 2): void {
  pc.rect(x, y, w, h, dark);
  pc.rect(x + 1, y + 1, w - 2, h - 2, light);
  pc.rect(x + t, y + t, w - t * 2, h - t * 2, dark);
}

/** Pinta um retângulo de moldura/cortina por cima do vidro: esses pixels deixam de ser "lado de fora". */
function inside(pc: PixelCanvas, mark: OutsideMarker, x: number, y: number, w: number, h: number, c: number): void {
  pc.rect(x, y, w, h, c);
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) mark(xx, yy, false);
}

const windowDecor: DecorPainter = (pc, x, y, _flipX, mark) => {
  const w = 44;
  const h = 40;
  const gx = x + 2;
  // Vidro com o céu da noite
  frameRect(pc, gx, y, w, h, D.frameLight, D.frame, 3);
  for (let yy = 3; yy < h - 3; yy++) {
    pc.rect(gx + 3, y + yy, w - 6, 1, mixColor(D.glassTop, D.glassBottom, yy / h));
    for (let xx = 3; xx < w - 3; xx++) mark(gx + xx, y + yy, true);
  }
  // Reflexos diagonais (fracos: é noite)
  for (let i = 0; i < 10; i++) {
    pc.set(gx + 8 + i, y + 18 - i, D.glassShine, 0.35);
    pc.set(gx + 12 + i, y + 18 - i, D.glassShine, 0.2);
  }
  // Caixilhos
  inside(pc, mark, gx + w / 2 - 1, y + 3, 2, h - 6, D.frame);
  inside(pc, mark, gx + 3, y + h / 2 - 1, w - 6, 2, D.frame);
  // Peitoril
  pc.rect(gx - 2, y + h, w + 4, 3, D.sill);
  pc.rect(gx - 2, y + h + 3, w + 4, 1, shadeColor(D.sill, 0.7));
  // Cortinas
  for (const side of [0, 1]) {
    const cx = side === 0 ? x : x + w - 4;
    for (let yy = -2; yy < h - 4; yy++) {
      const sway = Math.round(Math.sin(yy / 5) * 0.8);
      for (let xx = 0; xx < 8; xx++) {
        const fold = (xx + sway) % 3 === 0;
        pc.set(cx + xx, y + yy, fold ? D.curtainDark : D.curtain);
        mark(cx + xx, y + yy, false);
      }
    }
  }
  pc.rect(x - 2, y - 3, w + 8, 2, D.goldDark);
};

const roundWindow: DecorPainter = (pc, x, y, _flipX, mark) => {
  const cx = x + 16;
  const cy = y + 16;
  pc.disc(cx, cy, 14, D.frame);
  pc.disc(cx, cy, 12, D.frameLight);
  pc.disc(cx, cy, 11, D.frame);
  for (let yy = -10; yy <= 10; yy++) {
    for (let xx = -10; xx <= 10; xx++) {
      if (xx * xx + yy * yy > 100) continue;
      pc.set(cx + xx, cy + yy, mixColor(D.glassTop, D.glassBottom, (yy + 10) / 20));
      mark(cx + xx, cy + yy, true);
    }
  }
  inside(pc, mark, cx - 1, cy - 10, 2, 21, D.frame);
  inside(pc, mark, cx - 10, cy - 1, 21, 2, D.frame);
  for (let i = 0; i < 5; i++) pc.set(cx - 6 + i, cy - 3 - i, D.glassShine, 0.4);
};

const painting: DecorPainter = (pc, x, y) => {
  const w = 40;
  const h = 28;
  frameRect(pc, x, y, w, h, D.gold, D.goldDark, 3);
  // Paisagem: céu, sol, morros
  for (let yy = 3; yy < h - 3; yy++) {
    for (let xx = 3; xx < w - 3; xx++) {
      const hill1 = 16 + Math.round(Math.sin(xx / 6) * 3);
      const hill2 = 19 + Math.round(Math.sin(xx / 4 + 2) * 2);
      let c = mixColor(0x87b9dc, 0xf3d9a4, yy / h);
      if (yy > hill1) c = 0x5c8a4f;
      if (yy > hill2) c = 0x46713e;
      pc.set(x + xx, y + yy, c);
    }
  }
  pc.disc(x + 29, y + 9, 3, 0xf6d36b);
  // Fio do quadro
  pc.line(x + 10, y, x + w / 2, y - 6, D.cord);
  pc.line(x + w - 10, y, x + w / 2, y - 6, D.cord);
};

const lamp: DecorPainter = (pc, x, y) => {
  const cx = x + 8;
  pc.rect(cx, y, 1, 14, D.cord);
  // Cúpula trapezoidal
  for (let i = 0; i < 7; i++) {
    const half = 3 + i;
    pc.rect(cx - half, y + 14 + i, half * 2 + 1, 1, i === 6 ? D.lampShadeDark : D.lampShade);
    pc.set(cx - half, y + 14 + i, D.lampShadeDark);
    pc.set(cx + half, y + 14 + i, D.lampShadeDark);
  }
  pc.rect(cx - 1, y + 21, 3, 2, D.lampLight);
  // O cone de luz não é pintado aqui: é a luz dinâmica de src/art/lighting.ts.
};

const clock: DecorPainter = (pc, x, y) => {
  const cx = x + 8;
  const cy = y + 8;
  pc.disc(cx, cy, 7, D.frame);
  pc.disc(cx, cy, 6, D.clockFace);
  for (const [dx, dy] of [
    [0, -5],
    [5, 0],
    [0, 5],
    [-5, 0],
  ]) {
    pc.set(cx + dx, cy + dy, D.cord);
  }
  pc.line(cx, cy, cx, cy - 4, D.cord);
  pc.line(cx, cy, cx + 3, cy + 1, D.cord);
  pc.set(cx - 3, cy - 3, 0xffffff);
};

const plant: DecorPainter = (pc, x, y) => {
  // Vaso (encosta no chão: y + 48 = base do tile de baixo)
  const base = y + 32;
  for (let i = 0; i < 10; i++) {
    const half = 5 - Math.floor(i / 4);
    pc.rect(x + 8 - half, base - 10 + i, half * 2, 1, i < 2 ? D.plantPot : shadeColor(D.plantPot, 0.95));
    pc.set(x + 8 + half - 1, base - 10 + i, D.plantPotDark);
  }
  pc.rect(x + 2, base - 11, 12, 2, D.plantPotDark);
  // Folhas
  const leaves = [
    [8, -12, 2, -26],
    [8, -12, 13, -24],
    [8, -12, 3, -20],
    [8, -12, 15, -17],
    [8, -12, 8, -28],
    [8, -12, 0, -14],
  ];
  leaves.forEach(([x0, y0, x1, y1], i) => {
    pc.line(x + x0, base + y0, x + x1, base + y1, i % 2 ? D.leafDark : D.leaf);
    pc.line(x + x0 + 1, base + y0, x + x1 + 1, base + y1, i % 2 ? D.leaf : D.leafLight);
  });
};

const mirror: DecorPainter = (pc, x, y) => {
  const w = 32;
  const h = 38;
  frameRect(pc, x, y, w, h, D.silver, D.silverDark, 2);
  pc.rect(x + 2, y + 2, w - 4, h - 4, D.mirror);
  for (let i = 0; i < 12; i++) {
    pc.set(x + 6 + i, y + 20 - i, 0xffffff, 0.7);
    pc.set(x + 9 + i, y + 20 - i, 0xffffff, 0.4);
  }
};

const cobweb: DecorPainter = (pc, x, y, flipX) => {
  const size = 30;
  const ox = flipX ? x + 31 : x;
  const sx = flipX ? -1 : 1;
  const angles = [0, 0.3, 0.65, 1.0, 1.35, Math.PI / 2];
  const ends = angles.map((a) => ({ x: Math.cos(a) * size, y: Math.sin(a) * size }));
  ends.forEach((e) => pc.line(ox, y, ox + sx * e.x, y + e.y, D.web, 0.55));
  for (const r of [7, 13, 19, 25]) {
    for (let i = 0; i < angles.length - 1; i++) {
      const sag = 1 + hash(r, i, 9) * 1.5;
      const a = { x: Math.cos(angles[i]) * r, y: Math.sin(angles[i]) * r };
      const b = { x: Math.cos(angles[i + 1]) * r, y: Math.sin(angles[i + 1]) * r };
      const m = { x: (a.x + b.x) / 2 - sag * 0.7, y: (a.y + b.y) / 2 - sag * 0.7 };
      pc.line(ox + sx * a.x, y + a.y, ox + sx * m.x, y + m.y, D.web, 0.4);
      pc.line(ox + sx * m.x, y + m.y, ox + sx * b.x, y + b.y, D.web, 0.4);
    }
  }
};

/** Formato de arco (buraco de rato): retângulo embaixo + meio círculo em cima. `dy` conta de baixo para cima. */
export function inArch(dx: number, dyFromBottom: number, w: number, h: number): boolean {
  const r = w / 2;
  if (dyFromBottom < 0 || Math.abs(dx) > r) return false;
  if (dyFromBottom <= h - r) return true;
  const cy = h - r;
  return dx * dx + (dyFromBottom - cy) ** 2 <= r * r;
}

/**
 * Buraco de rato no rodapé: de onde a aranha sai depois da cutscene. Centro em x + 24, base no chão
 * (y + 16). Escuro, com um brilho verde lá dentro e pingos do líquido mutante saindo.
 */
const mouseHole: DecorPainter = (pc, x, y) => {
  const I = PAL.intro;
  const cx = x + 24;
  const bottom = y + 16;
  const hw = 14;
  const hh = 14;
  for (let dy = -1; dy <= hh + 1; dy++) {
    for (let dx = -hw / 2 - 2; dx <= hw / 2 + 2; dx++) {
      const px = cx + dx;
      const py = bottom - 1 - dy;
      if (inArch(dx, dy, hw, hh)) {
        const glow = dy < 4 && Math.abs(dx) < 4 && hash(px, py, 4) < 0.35;
        pc.set(px, py, glow ? I.gooDark : mixColor(0x050404, 0x120d0b, dy / hh));
      } else if (inArch(dx, dy, hw + 3, hh + 2) && hash(px, py, 7) < 0.8) {
        pc.set(px, py, shadeColor(PAL.wall.baseboardDark, 0.55));
      }
    }
  }
  for (const [dx, a] of [
    [2, 0.9],
    [7, 0.7],
    [13, 0.5],
    [20, 0.3],
  ] as const) {
    pc.set(cx + dx, bottom, I.goo, a);
  }
};

/**
 * Buraco no telhado (x, y = canto do buraco, tamanho do ROOF_HOLE). As bordas ficam mordidas (telhas
 * arrancadas, mostrando o céu), com a madeira do forro exposta e lascas apontando para dentro.
 */
const roofHole: DecorPainter = (pc, x, y, _flipX, mark) => {
  const w = ROOF_HOLE.w * 16;
  const h = ROOF_HOLE.h * 16;
  const paint = (px: number, py: number, c: number, outside: boolean) => {
    pc.set(px, py, c);
    mark(px, py, outside);
  };
  for (let yy = y - 3; yy < y + h; yy += 3) {
    for (const side of [-1, 1]) {
      const depth = Math.floor(hash(yy, side + 2, 31) * 4);
      for (let k = 0; k < 3; k++) {
        const py = yy + k;
        const edge = (d: number) => (side < 0 ? x - d : x + w - 1 + d);
        for (let d = 1; d <= depth; d++) paint(edge(d), py, skyColorAt(py), true);
        // Madeira do forro aparecendo na quebra.
        if (py >= y) {
          paint(edge(depth + 1), py, k === 0 ? D.splinter : D.splinterDark, false);
          pc.shade(edge(depth + 2), py, 0.7);
        }
      }
    }
  }
  // Lascas apontando para dentro do buraco.
  const splinters: [number, number, number, number][] = [
    [x, y + 6, 3, 1],
    [x + w - 1, y + 19, -4, 1],
    [x, y + h - 3, 2, -1],
    [x + w - 1, y + 4, -2, 1],
  ];
  for (const [sx, sy, len, slope] of splinters) {
    for (let i = 0; i < Math.abs(len); i++) paint(sx + Math.sign(len) * i, sy + Math.floor((i * slope) / 2), D.splinter, false);
  }
  // Uma telha solta pendurada no canto de cima à direita.
  for (let i = 0; i < 4; i++) {
    paint(x + w - 1 - i, y - 1 + i, D.brokenShingle, false);
    paint(x + w - i, y - 1 + i, shadeColor(D.brokenShingle, 0.7), false);
  }
  // Pontas quebradas penduradas para dentro do sótão.
  for (const [sx, len] of [
    [x + 2, 4],
    [x + 3, 2],
    [x + w - 4, 3],
  ]) {
    for (let i = 0; i < len; i++) paint(sx, y + h + i, i === len - 1 ? D.splinterDark : D.splinter, false);
  }
};

/** Poça de chuva no chão (x, y = canto do tile acima do chão; a poça fica centrada em x + 32). */
const puddle: DecorPainter = (pc, x, y) => {
  const cx = x + 32;
  const floorY = y + 16;
  const half = 17;
  for (let dx = -half; dx <= half; dx++) {
    const t = Math.abs(dx) / half;
    // Uma lâmina de água em cima das tábuas, com brilhos; as tábuas embaixo ficam molhadas (mais escuras).
    const shine = hash(cx + dx, floorY, 41) < 0.22;
    pc.set(cx + dx, floorY - 1, shine ? D.waterLight : D.water, t > 0.85 ? 0.45 : 0.85);
    const wet = Math.round((1 - t * t) * 4);
    for (let k = 0; k < wet; k++) pc.shade(cx + dx, floorY + k, 0.62);
  }
  for (const [dx, dy] of [
    [-12, -3],
    [9, -2],
    [14, -4],
  ]) {
    pc.set(cx + dx, floorY + dy, D.waterLight, 0.6);
  }
};

const cloud: DecorPainter = (pc, x, y) => {
  const blobs = [
    [10, 10, 7],
    [20, 7, 9],
    [31, 10, 7],
    [40, 12, 5],
  ];
  for (const [bx, by, r] of blobs) pc.disc(x + bx, y + by + 1, r, PAL.sky.cloudShade);
  for (const [bx, by, r] of blobs) pc.disc(x + bx, y + by - 1, r - 1, PAL.sky.cloud);
};

export const DECOR_PAINTERS: Record<DecorKind, DecorPainter> = {
  window: windowDecor,
  roundWindow,
  painting,
  lamp,
  clock,
  plant,
  mirror,
  cobweb,
  cloud,
  mouseHole,
  roofHole,
  puddle,
};

/** Desenha uma decoração. `mark` (opcional) recebe os pixels de vidro que mostram o lado de fora. */
export function paintDecor(kind: DecorKind, pc: PixelCanvas, x: number, y: number, flipX = false, mark = noMark): void {
  DECOR_PAINTERS[kind](pc, x, y, flipX, mark);
}
