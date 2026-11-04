// Palcos das cutscenes do ato 3, pixel a pixel: dentro da chaminé, o feixe de lua no sótão, a janela quebrada
// de perto (por dentro e por fora) e a casa inteira de frente. A noite já vem pintada, como na rua.
// Spec: docs/features/act3-cutscenes.md
import { ditherLevel } from './lighting';
import { PixelCanvas, type RGB, hash } from './PixelCanvas';
import { PAL } from './palette';
import { asphalt, bush, gableRoof, puddles, sidewalk, siding, tree, windowAt } from './streetArt';
import { mixColor, shadeColor } from './tilePainters';

const A = PAL.act3;
const C = PAL.act3Cut;
const S = PAL.street;
const B = PAL.brick;
const D = PAL.decor;

// ---------------- dentro da chaminé ----------------

/** Palco da queda (160×90): as paredes de tijolo dos lados e o vão no meio. */
export const SHAFT = {
  w: 160,
  h: 90,
  /** O vão: de `wallL` a `wallR` (px). */
  wallL: 42,
  wallR: 118,
  /** A imagem dos tijolos se repete a cada `tileH` px. */
  tileH: 64,
  /** Altura da boca da chaminé (o céu lá em cima). */
  mouthH: 50,
} as const;

function brickAt(x: number, y: number, shade: number, soot: number): RGB {
  const course = Math.floor(y / 8);
  const bx = x + (course % 2 ? 8 : 0);
  // Repete a cada 2 fileiras de 8 e tijolos de 16 (a imagem emenda em cima e embaixo).
  if (y % 8 === 7 || bx % 16 === 15) return shadeColor(B.mortar, shade);
  let col = B.base[Math.floor(hash(Math.floor(bx / 16), course, 81) * B.base.length)];
  col = shadeColor(col, shade);
  if (hash(x >> 1, y >> 1, 82) < soot) col = mixColor(col, A.soot, 0.75);
  return col;
}

/** As paredes dos lados da chaminé (o meio é transparente; a imagem repete na vertical). */
export function buildShaftWalls(): PixelCanvas {
  const pc = new PixelCanvas(SHAFT.w, SHAFT.tileH);
  for (let y = 0; y < SHAFT.tileH; y++) {
    for (let x = 0; x < SHAFT.w; x++) {
      if (x >= SHAFT.wallL && x < SHAFT.wallR) continue;
      // Perto do vão a parede fica na sombra; a borda pega um pouco de luz.
      const toGap = x < SHAFT.wallL ? SHAFT.wallL - 1 - x : x - SHAFT.wallR;
      const shade = toGap === 0 ? 0.62 : 0.3 + Math.min(0.22, toGap * 0.012);
      pc.set(x, y, brickAt(x, y, shade, 0.34));
    }
  }
  return pc;
}

/** A parede de trás, no fundo do vão: bem escura e cheia de fuligem. */
export function buildShaftBack(): PixelCanvas {
  const pc = new PixelCanvas(SHAFT.w, SHAFT.tileH);
  for (let y = 0; y < SHAFT.tileH; y++) {
    for (let x = 0; x < SHAFT.w; x++) pc.set(x, y, brickAt(x, y, 0.16, 0.5));
  }
  return pc;
}

/** A boca da chaminé: o céu da tempestade no alto e a borda de tijolos; sobe e sai do quadro na queda. */
export function buildShaftMouth(): PixelCanvas {
  const { w, mouthH, wallL, wallR } = SHAFT;
  const pc = new PixelCanvas(w, mouthH);
  const rimY = mouthH - 8;
  for (let y = 0; y < mouthH; y++) {
    for (let x = 0; x < w; x++) {
      const inGap = x >= wallL && x < wallR;
      if (y < rimY) {
        const n = Math.sin(x / 13 + y / 7) + hash(Math.floor(x / 6), Math.floor(y / 3), 83) * 0.7;
        pc.set(x, y, ditherLevel(Math.max(0, n * 0.5), x, y, 3) > 0.34 ? C.mouthSkyLight : C.mouthSky);
      } else if (!inGap) {
        // A borda da chaminé, um pouco mais larga que a parede, com a luz do céu em cima.
        const top = y === rimY;
        pc.set(x, y, top ? B.light : brickAt(x, y, 0.5, 0.2));
      } else {
        // A luz do céu se perdendo no escuro do vão.
        const t = (y - rimY) / 8;
        if (ditherLevel(1 - t, x, y, 4) > 0.3) pc.set(x, y, C.mouthSky);
      }
    }
  }
  return pc;
}

/** Sombra por cima da chaminé (preto com alfa), mais fechada embaixo. A cena aumenta o alfa na queda. */
export function buildShaftShade(): PixelCanvas {
  const { w, h } = SHAFT;
  const pc = new PixelCanvas(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const q = ditherLevel(0.25 + (y / h) * 0.75, x, y, 5);
      pc.data[(y * w + x) * 4 + 3] = Math.round(q * 235);
    }
  }
  return pc;
}

// ---------------- o sótão ----------------

/** Feixe de lua (70×64, somado por cima do cenário) entrando por um furo no telhado, em cima da Mary. */
export const BEAM = { w: 70, h: 64, apexX: 50, footX: 34 } as const;

export function buildMoonBeam(): PixelCanvas {
  const { w, h, apexX, footX } = BEAM;
  const pc = new PixelCanvas(w, h);
  for (let y = 0; y < h; y++) {
    const t = y / h;
    const cx = apexX + (footX - apexX) * t;
    const half = 2 + t * 20;
    for (let x = 0; x < w; x++) {
      const f = Math.max(0, 1 - Math.abs(x - cx) / half) * (1 - t * 0.35);
      const q = ditherLevel(f, x, y, 4);
      if (q > 0) pc.set(x, y, shadeColor(A.moon, q * 0.42));
    }
  }
  // O furinho no telhado.
  pc.rect(apexX - 1, 0, 3, 1, A.waterLight);
  return pc;
}

/** Marca em cima da Mary na fala: `!` ou `?` (7×11, com contorno). */
export const MARK = { w: 7, h: 11 } as const;

export function buildMark(kind: '!' | '?'): PixelCanvas {
  const rows =
    kind === '!'
      ? ['..xx...', '..xx...', '..xx...', '..xx...', '..xx...', '..xx...', '.......', '..xx...', '..xx...']
      : ['.xxxx..', 'xx..xx.', '....xx.', '...xx..', '..xx...', '..xx...', '.......', '..xx...', '..xx...'];
  const pc = new PixelCanvas(MARK.w, MARK.h);
  // Contorno primeiro, para a marca aparecer em qualquer fundo.
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== 'x') continue;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) pc.set(x + dx, y + 1 + dy, C.markEdge);
    }
  });
  pc.stamp(rows, { x: C.mark }, 0, 1);
  return pc;
}

// ---------------- a janela de perto ----------------

/** Palcos da janela (160×90): o vão, o parapeito e por onde a Mary anda. */
export const SILL = { w: 160, h: 90, x: 34, y: 13, gw: 92, gh: 45, sillY: 58, sillH: 7 } as const;
export const OUTSIDE = { w: 160, h: 90, x: 44, y: 13, gw: 72, gh: 43, sillY: 56, sillH: 6 } as const;

/** Triângulo preenchido: `(ax, ay)`-`(bx, by)` é a base e `(tx, ty)` a ponta. */
function shard(pc: PixelCanvas, ax: number, ay: number, bx: number, by: number, tx: number, ty: number, color: RGB, edge: RGB, alpha: number): void {
  const steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 2;
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    const x0 = ax + (bx - ax) * k;
    const y0 = ay + (by - ay) * k;
    const n = Math.max(Math.abs(tx - x0), Math.abs(ty - y0)) * 2;
    for (let j = 0; j <= n; j++) {
      const u = j / n;
      pc.set(Math.round(x0 + (tx - x0) * u), Math.round(y0 + (ty - y0) * u), color, alpha);
    }
  }
  pc.line(ax, ay, tx, ty, edge, 0.85);
  pc.line(bx, by, tx, ty, edge, 0.85);
}

/** Azulejos da cozinha no escuro: `glow` (0..1 em cada ponto) é a luz que vem da janela. */
function kitchenTiles(pc: PixelCanvas, glow: (x: number, y: number) => number): void {
  const size = 12;
  for (let y = 0; y < pc.height; y++) {
    for (let x = 0; x < pc.width; x++) {
      const tx = Math.floor(x / size);
      const ty = Math.floor(y / size);
      let col: RGB = (tx + ty) % 2 ? A.kitchenTile : A.kitchenTileAlt;
      if (x % size === 0 || y % size === 0) col = A.kitchenGrout;
      else if (hash(x >> 2, y >> 2, 84) < 0.14) col = mixColor(col, A.grime, 0.6);
      const g = ditherLevel(glow(x, y), x, y, 5);
      pc.set(x, y, mixColor(shadeColor(col, 0.2 + g * 0.26), A.moon, g * 0.14));
    }
  }
}

/** Respingos de sangue na parede: gotas em volta de (x, y), algumas escorrendo. */
function bloodOnWall(pc: PixelCanvas, x: number, y: number, seed: number): void {
  const dark = shadeColor(A.blood, 0.5);
  pc.disc(x, y, 3, dark);
  for (let i = 0; i < 12; i++) {
    const a = hash(i, 1, seed) * Math.PI * 2;
    const d = 3 + hash(i, 2, seed) * 7;
    pc.set(x + Math.cos(a) * d, y + Math.sin(a) * d, dark);
  }
  for (let i = 0; i < 3; i++) pc.rect(x - 2 + i * 2, y + 2, 1, 5 + Math.floor(hash(i, 3, seed) * 7), dark);
}

/** A janela vista de dentro: os azulejos, o céu e a moldura. A Mary e a chuva passam por cima. */
export function buildSillBack(): PixelCanvas {
  const { w, h, x: gx, y: gy, gw, gh, sillY, sillH } = SILL;
  const pc = new PixelCanvas(w, h);
  const cx = gx + gw / 2;
  const cy = gy + gh / 2;
  kitchenTiles(pc, (x, y) => Math.max(0, 1 - Math.hypot((x - cx) / 100, (y - cy) / 70)));
  bloodOnWall(pc, 148, 22, 85);
  bloodOnWall(pc, 12, 68, 86);

  // O céu lá fora: as nuvens clareadas pela lua perto do horizonte (a Mary fica recortada contra ele), e os
  // telhados das casas ao longe, bem baixos.
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const px = gx + x;
      const py = gy + y;
      const t = ditherLevel(y / gh, px, py, 6);
      let col = mixColor(S.skyBottom, A.moon, t * 0.55);
      const n = Math.sin(x / 19 + y / 8) + hash(Math.floor(x / 6), Math.floor(y / 3), 87) * 0.6;
      if (ditherLevel(Math.max(0, (n - 0.5) * 0.8), px, py, 3) > 0) col = mixColor(col, A.moon, 0.28);
      pc.set(px, py, col);
    }
  }
  const skyline = (x: number) => {
    const roofs = [
      [14, gh - 2, 9],
      [50, gh, 7],
      [80, gh - 1, 10],
    ].map(([c, base, peak]) => base - Math.max(0, peak - Math.abs(x - c) * 0.5));
    return Math.min(...roofs);
  };
  for (let x = 0; x < gw; x++) for (let y = Math.round(skyline(x)); y < gh; y++) pc.set(gx + x, gy + y, S.houseRoof);

  // A moldura de madeira.
  const frame = shadeColor(D.frame, 0.5);
  pc.rect(gx - 5, gy - 4, gw + 10, 4, frame);
  pc.rect(gx - 5, gy - 4, gw + 10, 1, shadeColor(D.frameLight, 0.55));
  pc.rect(gx - 5, gy, 5, gh, frame);
  pc.rect(gx + gw, gy, 5, gh, frame);
  pc.rect(gx - 1, gy, 1, gh, shadeColor(D.frameLight, 0.7));
  pc.rect(gx + gw, gy, 1, gh, shadeColor(D.frameLight, 0.7));

  // O parapeito molhado, comprido até a borda da direita (por onde a Mary chega), e a sombra embaixo dele.
  for (let x = gx - 9; x < w; x++) {
    const wet = hash(x >> 1, 0, 88) < 0.3;
    pc.set(x, sillY, wet ? C.sillWet : shadeColor(D.sill, 0.48));
    pc.rect(x, sillY + 1, 1, sillH - 2, shadeColor(D.sill, 0.3));
    pc.set(x, sillY + sillH - 1, shadeColor(D.sill, 0.18));
    pc.rect(x, sillY + sillH, 1, 2, 0x000000, 0.45);
  }
  return pc;
}

/** Cacos presos na moldura, vistos de dentro (a Mary passa por trás deles ao sair). */
export function buildSillFront(): PixelCanvas {
  const { w, h, x: gx, y: gy, gw, gh } = SILL;
  const pc = new PixelCanvas(w, h);
  const r = gx + gw;
  const b = gy + gh;
  const edge = A.waterLight;
  shard(pc, gx, gy, gx + 18, gy, gx + 3, gy + 20, C.glassDark, edge, 0.5);
  shard(pc, gx + 24, gy, gx + 38, gy, gx + 30, gy + 11, C.glassDark, edge, 0.5);
  shard(pc, gx + 58, gy, gx + 66, gy, gx + 63, gy + 7, C.glassDark, edge, 0.5);
  shard(pc, r - 20, gy, r, gy, r - 5, gy + 24, C.glassDark, edge, 0.5);
  shard(pc, r, gy + 12, r, gy + 30, r - 13, gy + 22, C.glassDark, edge, 0.5);
  shard(pc, gx, gy + 24, gx, gy + 36, gx + 9, gy + 31, C.glassDark, edge, 0.5);
  shard(pc, gx, b - 1, gx + 14, b - 1, gx + 4, b - 15, C.glassDark, edge, 0.5);
  shard(pc, r - 15, b - 1, r, b - 1, r - 5, b - 13, C.glassDark, edge, 0.5);
  return pc;
}

/** Tábuas de madeira da parede de fora, encharcadas, com o luar na borda de cada uma. */
function wetSiding(pc: PixelCanvas): void {
  const base = S.siding[0];
  for (let y = 0; y < pc.height; y++) {
    for (let x = 0; x < pc.width; x++) {
      const row = y % 6;
      let col = shadeColor(base, row === 0 ? 0.3 : row === 1 ? 0.72 : 0.58);
      if (hash(x >> 2, Math.floor(y / 6), 89) < 0.1) col = shadeColor(col, 0.85);
      // Riscos de água descendo pelas tábuas.
      if (hash(x, 0, 90) < 0.05 && hash(x, Math.floor(y / 9), 91) < 0.7) col = mixColor(col, C.streak, 0.5);
      pc.set(x, y, col);
    }
  }
}

/** A janela vista de fora: a parede de madeira, o escuro lá dentro e o brilho verde no fundo. */
export function buildOutsideBack(): PixelCanvas {
  const { w, h, x: gx, y: gy, gw, gh, sillY, sillH } = OUTSIDE;
  const pc = new PixelCanvas(w, h);
  wetSiding(pc);

  // Por dentro: azulejos quase invisíveis e a gosma brilhando lá embaixo.
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const px = gx + x;
      const py = gy + y;
      let col: RGB = C.insideDark;
      if ((x % 12 === 0 || y % 12 === 0) && hash(x, y, 92) < 0.6) col = shadeColor(A.kitchenGrout, 0.28);
      const g = Math.max(0, 1 - Math.hypot((x - gw * 0.64) / 30, (y - gh) / 26));
      const q = ditherLevel(g, px, py, 4);
      if (q > 0) col = mixColor(col, A.gooLight, q * 0.34);
      pc.set(px, py, col);
    }
  }

  // Moldura branca suja (como as das casas da rua) e o parapeito.
  const trim = shadeColor(S.trim, 0.52);
  pc.rect(gx - 4, gy - 4, gw + 8, 4, trim);
  pc.rect(gx - 4, gy, 4, gh, trim);
  pc.rect(gx + gw, gy, 4, gh, trim);
  pc.rect(gx - 4, gy - 4, gw + 8, 1, shadeColor(S.trim, 0.8));
  for (let x = gx - 8; x < gx + gw + 8; x++) {
    pc.set(x, sillY, hash(x >> 1, 0, 93) < 0.4 ? C.sillWet : shadeColor(S.trim, 0.62));
    pc.rect(x, sillY + 1, 1, sillH - 1, shadeColor(S.trim, 0.36));
    pc.rect(x, sillY + sillH, 1, 2, 0x000000, 0.5);
  }
  // A água escorrendo embaixo do parapeito.
  for (let x = gx; x < gx + gw; x += 7) {
    const len = 6 + Math.floor(hash(x, 1, 94) * 18);
    pc.rect(x, sillY + sillH + 2, 1, len, C.streak, 0.75);
  }
  // A calha descendo pela parede.
  pc.rect(142, 0, 7, h, C.gutter);
  pc.rect(143, 0, 1, h, shadeColor(C.gutter, 1.5));
  for (let y = 12; y < h; y += 28) pc.rect(140, y, 11, 2, shadeColor(C.gutter, 0.7));
  return pc;
}

/** Cacos presos na moldura, vistos de fora (a Mary vem de dentro, por trás deles). */
export function buildOutsideFront(): PixelCanvas {
  const { w, h, x: gx, y: gy, gw, gh } = OUTSIDE;
  const pc = new PixelCanvas(w, h);
  const r = gx + gw;
  const b = gy + gh;
  const edge = A.waterLight;
  shard(pc, gx, gy, gx + 18, gy, gx + 4, gy + 20, A.glass, edge, 0.14);
  shard(pc, gx + 26, gy, gx + 40, gy, gx + 32, gy + 11, A.glass, edge, 0.14);
  shard(pc, r - 20, gy, r, gy, r - 5, gy + 26, A.glass, edge, 0.14);
  shard(pc, gx, gy + 24, gx, gy + 38, gx + 9, gy + 31, A.glass, edge, 0.14);
  shard(pc, r, gy + 30, r, b - 1, r - 13, b - 8, A.glass, edge, 0.14);
  shard(pc, gx, b - 1, gx + 13, b - 1, gx + 3, b - 14, A.glass, edge, 0.14);
  return pc;
}

/** A Mary pequenininha no plano da casa inteira (5×4). */
export function buildMiniMary(): PixelCanvas {
  const pc = new PixelCanvas(5, 4);
  pc.stamp(['l.l.l', '.bwb.', '.bbb.', 'l.l.l'], { b: C.miniBody, w: C.miniLight, l: C.miniBody }, 0, 0);
  return pc;
}

// ---------------- a casa inteira ----------------

/** A casa de frente (240×135, o céu é transparente) e por onde a Mary desce. */
export const HOUSE = {
  w: 240,
  h: 135,
  /** O chão da casa e a janela quebrada (térreo, à esquerda). */
  base: 104,
  win: { x: 62, y: 68, w: 15, h: 16 },
  /** Topo da calçada e do asfalto: onde os doentes andam. */
  lawnRow: 110,
  walkRow: 122,
} as const;

export function buildHouseFront(): PixelCanvas {
  const { w, h, base, win } = HOUSE;
  const pc = new PixelCanvas(w, h);

  // Árvores do fundo e as casas dos lados, bem escuras.
  for (const [cx, r] of [
    [24, 26],
    [204, 24],
  ]) {
    tree(pc, cx, base, r, 30);
  }
  gableRoof(pc, 4, base - 34, 30, 14);
  siding(pc, -24, base - 32, 52, 32, S.siding[2]);
  gableRoof(pc, 236, base - 38, 32, 16);
  siding(pc, 212, base - 36, 44, 36, S.siding[1]);
  pc.shadeRect(0, 0, w, base, 0.55);

  // A chaminé (à direita, como no ato 2), atrás do telhado.
  pc.rect(160, 4, 14, 28, S.chimney);
  pc.rect(159, 3, 16, 2, S.roofDark);
  for (let y = 7; y < 32; y += 4) pc.rect(160, y, 14, 1, S.mortar);

  // A casa: dois andares, tudo apagado.
  gableRoof(pc, 120, 38, 86, 30);
  siding(pc, 42, 40, 156, base - 40, S.siding[0]);
  pc.rect(42, 60, 156, 2, S.sidingDark);
  pc.disc(120, 26, 5, S.trim);
  pc.disc(120, 26, 4, S.window);
  for (const x of [62, 112, 165]) windowAt(pc, { x, y: 43, w: 13, h: 14, lit: 'dark' });
  windowAt(pc, { x: 165, y: 68, w: 13, h: 16, lit: 'dark' });

  // A porta e a varanda.
  pc.rect(109, 68, 22, base - 68, S.trim);
  pc.rect(111, 70, 18, base - 70, S.door);
  pc.set(126, 87, S.trim);
  pc.rect(98, 63, 44, 3, S.trim);
  pc.rect(98, 66, 44, 1, S.sidingDark);
  for (const cx of [99, 139]) pc.rect(cx, 66, 2, base - 66, S.trim);
  pc.rect(96, base - 2, 48, 2, S.concreteLight);
  bush(pc, 150, base, 16, 8);
  bush(pc, 88, base, 12, 7);
  bush(pc, 180, base, 14, 7);

  // Sem nenhuma luz acesa, a casa fica mais escura que as da rua; os doentes aparecem na frente dela.
  pc.shadeRect(0, 0, w, base, 0.72);

  // A janela quebrada: moldura torta, escuro e o verde lá no fundo.
  pc.rect(win.x - 3, win.y - 1, win.w + 6, win.h + 3, S.sidingDark);
  pc.rect(win.x - 1, win.y - 1, win.w + 2, win.h + 2, S.trim);
  for (let y = 0; y < win.h; y++) {
    for (let x = 0; x < win.w; x++) {
      const q = ditherLevel(Math.max(0, 1 - Math.hypot((x - 9) / 7, (y - win.h) / 8)), win.x + x, win.y + y, 3);
      pc.set(win.x + x, win.y + y, mixColor(C.insideDark, A.gooLight, q * 0.4));
    }
  }
  for (const [sx, sy, tx, ty] of [
    [0, 0, 4, 6],
    [6, 0, 8, 4],
    [14, 0, 11, 8],
    [0, 15, 3, 10],
    [14, 15, 12, 11],
  ]) {
    pc.line(win.x + sx, win.y + sy, win.x + tx, win.y + ty, A.glass, 0.8);
  }

  // O gramado, a calçada, o meio-fio e a rua.
  for (let y = base; y < 114; y++) {
    for (let x = 0; x < w; x++) {
      let col = ditherLevel((y - base) / 10, x, y, 3) > 0.5 ? S.lawnLight : S.lawn;
      // O caminho até a porta.
      if (x >= 112 - (y - base) * 0.5 && x <= 128 + (y - base) * 0.5) col = S.concrete;
      pc.set(x, y, col);
    }
  }
  sidewalk(pc, 114, 124, 16);
  pc.rect(0, 124, w, 2, S.curb);
  asphalt(pc, 126, h);
  puddles(pc, 127, h - 1, 5, 95);
  return pc;
}
