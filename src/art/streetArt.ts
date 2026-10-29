// Cenários da cutscene da rua, pixel a pixel: o telhado visto de fora (com o buraco), a rua do bairro
// (casas do outro lado, calçadas, asfalto molhado) e a beira do telhado com a calha.
// A noite já vem pintada (como o céu do jogo). Spec: docs/features/street-cutscene.md
import { ditherLevel } from './lighting';
import { PixelCanvas, type RGB, hash } from './PixelCanvas';
import { PAL } from './palette';
import { mixColor, shadeColor } from './tilePainters';

const S = PAL.street;

/** Plano 1: o telhado visto de fora e de cima (palco 160×90, zoom 3). */
export const ROOF_SHOT = {
  w: 160,
  h: 90,
  /** Cumeeira: altura na esquerda e na direita (o céu fica acima). */
  ridgeLeft: 30,
  ridgeRight: 17,
  /** Buraco: elipse (centro e raios). */
  hole: { x: 56, y: 62, rx: 16, ry: 7 },
  /** A aranha sai do buraco e anda até aqui (x), com os pés nesta altura. */
  spiderFeetY: 56,
  spiderEndX: 98,
  chimney: { x: 116, w: 16, top: 3 },
} as const;

/**
 * Plano 2: a rua (palco 240×135, zoom 2). Cada camada sobe a câmera com a sua velocidade: aqui fica a
 * linha do chão de cada uma (px do palco) no começo (só pernas) e no fim (cabeças) da subida.
 */
export const STREET_SHOT = {
  w: 240,
  h: 135,
  sky: [-24, 0],
  houses: [24, 96],
  far: [36, 118],
  mid: [60, 160],
  near: [88, 226],
  /** Poste de luz (x) e janelas acesas: usados nos reflexos do chão e na luz dos zumbis. */
  lampX: 102,
  /** Pisca-alerta do carro (posições na imagem das casas) e a janela com a TV ligada. */
  hazards: [
    { x: 175, y: 127 },
    { x: 236, y: 126 },
  ],
  tv: { x: 154, y: 96, w: 10, h: 10 },
} as const;

/** Plano 3: da beira do telhado, a horda enchendo a rua (palco 240×135, zoom 2). */
export const WIDE_SHOT = {
  w: 240,
  h: 135,
  housesBase: 68,
  streetTop: 64,
  /** Linha do chão de cada fileira da multidão (de trás para a frente). A da frente some atrás do telhado. */
  rows: [90, 106],
  gutterY: 99,
  spiderX: 70,
} as const;

/** Linha das casas na imagem `buildHouses` (as fundações). */
export const HOUSES_BASE = 120;
/** Onde fica a linha do chão de cada faixa de chão dentro da sua imagem. */
export const GROUND_ANCHOR = { far: 6, mid: 14, near: 8 } as const;

interface Win {
  x: number;
  y: number;
  w: number;
  h: number;
  lit: 'dark' | 'warm' | 'tv';
}

/** Janelas acesas (x central) para os reflexos no chão molhado. */
const LIT_X = [44, 136, 186];

// ---------------- céu ----------------

/** Céu de tempestade: degradê em faixas com pontilhado e nuvens pesadas. */
export function buildStreetSky(w: number, h: number): PixelCanvas {
  const pc = new PixelCanvas(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = ditherLevel(y / h, x, y, 6);
      let col = mixColor(S.skyTop, S.skyBottom, t);
      // Nuvens: faixas onduladas mais claras.
      const n = Math.sin(x / 23 + y / 9) + Math.sin(x / 11 - y / 17) * 0.6 + hash(Math.floor(x / 6), Math.floor(y / 4), 2) * 0.5;
      const cloud = ditherLevel(Math.max(0, Math.min(1, (n - 0.6) * 0.8)), x, y, 3);
      if (cloud > 0) col = mixColor(col, cloud > 0.5 ? S.cloudLight : S.cloud, 0.75);
      pc.set(x, y, col);
    }
  }
  return pc;
}

// ---------------- plano 1: telhado ----------------

/**
 * Telha asfáltica vista de cima: fileiras (mais altas perto da câmera) com a borda de baixo na sombra,
 * fendas curtas entre as abas só na metade de baixo, grãos e o brilho molhado na borda de cima.
 */
function shingle(x: number, depth: number, rowH: number, tabW: number): RGB {
  // Altura acumulada: cada fileira tem a altura de onde ela começa (aproximação boa o bastante).
  let row = 0;
  let start = 0;
  let hgt = Math.round(rowH);
  while (start + hgt <= depth) {
    start += hgt;
    row++;
    hgt = Math.round(3 + start / 22);
  }
  const yy = depth - start;
  const off = (row % 2) * Math.floor(tabW / 2);
  const tab = Math.floor((x + off) / tabW);
  let col = S.roof[Math.floor(hash(tab, row, 3) * S.roof.length) % S.roof.length];
  if (yy === hgt - 1) return S.roofDark;
  if ((x + off) % tabW === 0 && yy >= hgt / 2) return S.roofDark;
  if (yy === 0 && hash(x, row, 5) < 0.5) col = S.roofLight;
  if (hash(x, depth, 8) < 0.12) col = shadeColor(col, 1.15);
  // Água escorrendo: riscos escuros.
  if (hash(Math.floor(x / 2), 0, 8) < 0.06) col = shadeColor(col, 0.8);
  return col;
}

function ridgeAt(x: number): number {
  const { ridgeLeft, ridgeRight, w } = ROOF_SHOT;
  return Math.round(ridgeLeft + ((ridgeRight - ridgeLeft) * x) / w);
}

function inHole(x: number, y: number): boolean {
  const { hole } = ROOF_SHOT;
  const jag = (hash(Math.floor(Math.atan2(y - hole.y, x - hole.x) * 6), 0, 17) - 0.5) * 0.18;
  return ((x - hole.x) / hole.rx) ** 2 + ((y - hole.y) / hole.ry) ** 2 <= 1 + jag;
}

/**
 * O telhado (sem o céu, que vai atrás) e a "boca" da frente do buraco, desenhada por cima da aranha
 * enquanto ela sobe de dentro dele.
 */
export function buildRoofShot(): { roof: PixelCanvas; front: PixelCanvas } {
  const { w, h, hole, chimney } = ROOF_SHOT;
  const roof = new PixelCanvas(w, h);
  for (let x = 0; x < w; x++) {
    const top = ridgeAt(x);
    for (let y = top; y < h; y++) {
      roof.set(x, y, y === top ? S.roofLight : shingle(x, y - top, 3 + (y - top) / 22, 12));
    }
  }

  // Chaminé de tijolos com tampa.
  const ct = chimney.top;
  const cb = ridgeAt(chimney.x + chimney.w) + 4;
  for (let y = ct; y < cb; y++) {
    for (let x = chimney.x; x < chimney.x + chimney.w; x++) {
      const brickRow = Math.floor((y - ct) / 3);
      const mortar = (y - ct) % 3 === 2 || (x + (brickRow % 2) * 3) % 6 === 5;
      let col = mortar ? S.mortar : x < chimney.x + 4 ? S.chimney : S.chimneyLight;
      if (x === chimney.x) col = shadeColor(col, 0.7);
      roof.set(x, y, col);
    }
  }
  roof.rect(chimney.x - 2, ct - 2, chimney.w + 4, 3, S.roofDark);
  roof.rect(chimney.x - 2, ct - 2, chimney.w + 4, 1, S.roofLight);

  // Antena de TV velha.
  const ax = 30;
  roof.line(ax, ridgeAt(ax), ax, 3, S.antenna);
  for (const [y, half] of [
    [5, 9],
    [9, 7],
    [13, 5],
  ]) {
    roof.line(ax - half, y + 1, ax + half, y - 1, S.antenna);
  }

  // O buraco: escuro, com a luz quente do sótão lá no fundo e um caibro quebrado atravessado.
  for (let y = hole.y - hole.ry - 2; y <= hole.y + hole.ry + 2; y++) {
    for (let x = hole.x - hole.rx - 3; x <= hole.x + hole.rx + 3; x++) {
      if (inHole(x, y)) {
        const deep = (y - (hole.y - hole.ry)) / (hole.ry * 2);
        const glow = Math.max(0, 1 - Math.hypot((x - hole.x) / (hole.rx * 0.8), (y - hole.y - hole.ry * 0.7) / (hole.ry * 0.9)));
        const lit = ditherLevel(glow * 0.75, x, y, 4);
        roof.set(x, y, mixColor(mixColor(S.holeDark, 0x1a120c, deep), S.holeGlow, lit * 0.7));
      } else if (inHole(x - 1, y) || inHole(x + 1, y) || inHole(x, y - 1) || inHole(x, y + 1)) {
        // Borda quebrada: madeira lascada aparecendo embaixo das telhas.
        roof.set(x, y, y > hole.y ? PAL.decor.splinterDark : PAL.decor.splinter);
      }
    }
  }
  roof.line(hole.x - hole.rx + 3, hole.y - 2, hole.x + 4, hole.y + hole.ry - 1, PAL.decor.splinterDark);
  roof.line(hole.x - hole.rx + 3, hole.y - 3, hole.x + 4, hole.y + hole.ry - 2, PAL.decor.splinter);
  // Telhas soltas em volta.
  for (const [dx, dy] of [
    [-19, -3],
    [17, -5],
    [14, 6],
  ]) {
    roof.rect(hole.x + dx, hole.y + dy, 6, 3, S.roofDark);
    roof.rect(hole.x + dx, hole.y + dy, 6, 1, S.roofLight);
  }

  // Frente do buraco: só o telhado abaixo da borda de trás (a aranha sobe por trás dele).
  const front = new PixelCanvas(w, h);
  for (let y = hole.y - hole.ry; y < h; y++) {
    for (let x = hole.x - hole.rx - 4; x <= hole.x + hole.rx + 4; x++) {
      if (inHole(x, y) || y < hole.y) continue;
      const i = (y * w + x) * 4;
      if (roof.data[i + 3] === 0) continue;
      front.set(x, y, (roof.data[i] << 16) | (roof.data[i + 1] << 8) | roof.data[i + 2]);
    }
  }
  return { roof, front };
}

// ---------------- plano 2: as casas do outro lado da rua ----------------

function siding(pc: PixelCanvas, x: number, y: number, w: number, h: number, base: RGB): void {
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      let col = (y + yy) % 3 === 0 ? S.sidingDark : base;
      if (hash(x + xx, Math.floor((y + yy) / 3), 4) < 0.05) col = shadeColor(col, 0.85);
      pc.set(x + xx, y + yy, col);
    }
  }
  pc.rect(x, y, 2, h, S.trim);
  pc.rect(x + w - 2, y, 2, h, shadeColor(S.trim, 0.75));
}

function gableRoof(pc: PixelCanvas, cx: number, eaveY: number, halfW: number, height: number): void {
  for (let r = 0; r <= height; r++) {
    const half = Math.round(halfW * (r / height));
    const y = eaveY - height + r;
    for (let x = cx - half; x <= cx + half; x++) {
      let col = (y % 3 === 0 ? S.houseRoofLight : S.houseRoof) as RGB;
      if (x === cx - half || x === cx + half) col = S.trim;
      pc.set(x, y, col);
    }
  }
  pc.rect(cx - halfW, eaveY, halfW * 2 + 1, 2, S.trim);
}

function windowAt(pc: PixelCanvas, win: Win): void {
  const { x, y, w, h, lit } = win;
  pc.rect(x - 3, y, 3, h, S.sidingDark);
  pc.rect(x + w, y, 3, h, S.sidingDark);
  pc.rect(x - 1, y - 1, w + 2, h + 2, S.trim);
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      let col: RGB = S.window;
      if (lit === 'warm') {
        col = mixColor(S.windowLit, S.windowLitDark, ditherLevel(yy / h, x + xx, y + yy, 3));
        // Cortina meio fechada.
        if (xx < 2 || (xx > w - 4 && yy < h - 2)) col = S.windowLitDark;
      } else if (lit === 'tv') {
        col = mixColor(0x2a3a7a, 0x5a78d8, ditherLevel(1 - yy / h, x + xx, y + yy, 3));
      } else if (xx + yy === 4 || xx + yy === 6) {
        col = S.sidingDark;
      }
      pc.set(x + xx, y + yy, col);
    }
  }
  pc.rect(x + Math.floor(w / 2), y, 1, h, S.trim);
  pc.rect(x, y + Math.floor(h / 2), w, 1, S.trim);
  pc.rect(x - 2, y + h + 1, w + 4, 1, S.trim);
}

function tree(pc: PixelCanvas, cx: number, base: number, r: number, trunkH: number): void {
  pc.rect(cx - 2, base - trunkH, 4, trunkH, S.trunk);
  const top = base - trunkH - r + 4;
  const blobs = [
    [0, 0, r],
    [-r * 0.6, r * 0.3, r * 0.7],
    [r * 0.6, r * 0.35, r * 0.7],
    [0, -r * 0.45, r * 0.65],
  ];
  for (const [bx, by, br] of blobs) {
    for (let y = -br; y <= br; y++) {
      for (let x = -br; x <= br; x++) {
        if (x * x + y * y > br * br) continue;
        const px = Math.round(cx + bx + x);
        const py = Math.round(top + by + y);
        // Luz vindo de cima à esquerda (o poste), em pontilhado.
        const lightness = ditherLevel(Math.max(0, (-x - y) / (br * 2)), px, py, 3);
        pc.set(px, py, lightness > 0.3 && hash(px, py, 6) < 0.6 ? S.treeLight : S.tree);
      }
    }
  }
}

function bush(pc: PixelCanvas, x: number, base: number, w: number, h: number): void {
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      const nx = (xx - w / 2) / (w / 2);
      const ny = (yy - h) / h;
      if (nx * nx + ny * ny > 1 + (hash(x + xx, yy, 9) - 0.5) * 0.3) continue;
      pc.set(x + xx, base - h + yy, yy < h / 3 && hash(x + xx, yy, 2) < 0.4 ? S.treeLight : S.bush);
    }
  }
}

/** As casas do outro lado da rua (240×150). As fundações ficam em HOUSES_BASE; abaixo, os gramados. */
export function buildHouses(): PixelCanvas {
  const W = STREET_SHOT.w;
  const pc = new PixelCanvas(W, 150);
  const B = HOUSES_BASE;

  // Árvores do fundo (quintais) e a árvore grande entre as casas.
  for (const [cx, r] of [
    [10, 22],
    [96, 26],
    [214, 20],
  ]) {
    tree(pc, cx, B, r, 24);
  }

  // Gramados, entrada de carro e o caminho até a porta.
  for (let y = B; y < 150; y++) {
    for (let x = 0; x < W; x++) {
      let col = ditherLevel((y - B) / 30, x, y, 3) > 0.5 ? S.lawnLight : S.lawn;
      if (x >= 6 + (B - y) * 0.2 && x <= 40 + (y - B) * 0.25) col = mixColor(S.concrete, S.concreteLight, (y - B) / 30);
      pc.set(x, y, col);
    }
  }

  // Casa A: térrea, com garagem.
  gableRoof(pc, 46, B - 46, 50, 22);
  pc.rect(56, B - 70, 7, 12, S.chimney);
  pc.rect(55, B - 71, 9, 2, S.roofDark);
  siding(pc, 0, B - 44, 92, 44, S.siding[0]);
  pc.rect(6, B - 30, 32, 30, S.trim);
  for (let y = B - 28; y < B; y++) pc.rect(8, y, 28, 1, (y - (B - 28)) % 6 === 5 ? shadeColor(S.garage, 0.6) : S.garage);
  windowAt(pc, { x: 38, y: B - 34, w: 13, h: 15, lit: 'warm' });
  windowAt(pc, { x: 74, y: B - 34, w: 12, h: 15, lit: 'dark' });
  pc.rect(58, B - 24, 11, 24, S.trim);
  pc.rect(60, B - 22, 7, 22, S.door);
  pc.set(65, B - 11, S.windowLit);
  pc.rect(55, B - 27, 17, 2, S.trim);
  bush(pc, 70, B, 14, 8);
  bush(pc, 40, B, 12, 6);

  // Casa B: dois andares, varanda com colunas.
  gableRoof(pc, 168, B - 72, 50, 28);
  siding(pc, 122, B - 70, 92, 70, S.siding[1]);
  windowAt(pc, { x: 130, y: B - 62, w: 12, h: 15, lit: 'warm' });
  windowAt(pc, { x: 190, y: B - 62, w: 12, h: 15, lit: 'dark' });
  windowAt(pc, { x: 154, y: B - 26, w: 10, h: 12, lit: 'tv' });
  windowAt(pc, { x: 192, y: B - 28, w: 12, h: 15, lit: 'dark' });
  pc.rect(171, B - 26, 12, 26, S.trim);
  pc.rect(173, B - 24, 8, 24, S.door);
  pc.rect(150, B - 34, 50, 3, S.trim);
  pc.rect(150, B - 31, 50, 1, S.sidingDark);
  for (const cx of [151, 166, 186, 198]) pc.rect(cx, B - 31, 2, 31, S.trim);
  pc.rect(148, B - 2, 54, 2, S.concreteLight);
  bush(pc, 124, B, 16, 9);

  // Casa C: só um pedaço, na borda.
  gableRoof(pc, 262, B - 40, 36, 18);
  siding(pc, 228, B - 38, 30, 38, S.siding[2]);
  windowAt(pc, { x: 233, y: B - 30, w: 12, h: 14, lit: 'dark' });

  // Cerquinha branca entre os gramados.
  for (let x = 88; x < 122; x += 3) pc.rect(x, B + 4, 2, 9, S.fence);
  pc.rect(88, B + 6, 34, 1, S.fence);
  pc.rect(88, B + 10, 34, 1, S.fence);
  // Caixa de correio.
  pc.rect(112, B + 14, 2, 14, S.pole);
  pc.rect(108, B + 10, 10, 6, S.mailbox);
  pc.rect(118, B + 10, 1, 4, S.hazard);

  // Carro abandonado na entrada da casa B, porta aberta (o pisca-alerta é aceso pela cena).
  car(pc, 172, B + 12);

  // Poste de luz e os fios.
  const lx = STREET_SHOT.lampX;
  pc.rect(lx - 1, 18, 3, 132, S.pole);
  pc.rect(lx, 18, 12, 2, S.pole);
  pc.rect(lx + 9, 20, 6, 2, S.lampGlow);
  lampCone(pc, lx + 12, 22);
  for (const [y0, sag] of [
    [10, 7],
    [15, 6],
  ]) {
    for (let x = 0; x < W; x++) {
      const t = (x - W / 2) / (W / 2);
      pc.set(x, Math.round(y0 + sag * (1 - t * t)), S.wire);
    }
  }
  return pc;
}

/** Cone de luz laranja do poste (somado por cima, em faixas). Também clareia a chuva lá na cena. */
function lampCone(pc: PixelCanvas, x: number, y: number): void {
  for (let yy = 0; y + yy < pc.height; yy++) {
    for (let xx = -40; xx <= 40; xx++) {
      const spread = 3 + yy * 0.35;
      const f = Math.max(0, 1 - Math.abs(xx) / spread) * Math.max(0, 1 - yy / 140);
      const a = ditherLevel(f, x + xx, y + yy, 4) * 0.22;
      if (a > 0) pc.set(x + xx, y + yy, S.lampCone, a);
    }
  }
}

function car(pc: PixelCanvas, x: number, base: number): void {
  const len = 70;
  // Carroceria e cabine.
  for (let yy = 0; yy < 12; yy++) pc.rect(x, base - 12 + yy, len, 1, yy === 0 ? S.carLight : yy > 8 ? S.carDark : S.car);
  for (let yy = 0; yy < 9; yy++) {
    const inset = Math.round((9 - yy) * 1.2);
    pc.rect(x + 16 + inset, base - 21 + yy, 34 - inset * 2 + 6, 1, yy === 0 ? S.carLight : S.car);
  }
  pc.rect(x + 20, base - 19, 12, 6, S.carGlass);
  pc.rect(x + 35, base - 19, 13, 6, S.carGlass);
  // Porta aberta (para fora, mais escura) e o vão dela.
  pc.rect(x + 34, base - 19, 1, 15, S.carDark);
  pc.rect(x + 34, base - 13, 15, 9, 0x120c0e);
  pc.rect(x + 36, base - 22, 6, 18, S.carDark);
  pc.rect(x + 37, base - 20, 4, 6, S.carGlass);
  // Rodas.
  for (const wx of [x + 12, x + 56]) {
    pc.disc(wx, base - 1, 5, S.tire);
    pc.disc(wx, base - 1, 2, S.gutterDark);
  }
}

// ---------------- plano 2: o chão ----------------

/** Reflexo das luzes no chão molhado: riscos verticais ondulados. */
function reflections(pc: PixelCanvas, y0: number, y1: number, strength: number): void {
  for (const lx of [...LIT_X, STREET_SHOT.lampX + 12]) {
    const warm = lx === STREET_SHOT.lampX + 12 ? S.lampGlow : S.windowLit;
    for (let y = y0; y < y1; y++) {
      const wobble = Math.round(Math.sin(y * 0.9 + lx) * 1.5);
      const f = (1 - (y - y0) / (y1 - y0)) * strength;
      for (let dx = -2; dx <= 2; dx++) {
        const a = ditherLevel(f * (1 - Math.abs(dx) / 3), lx + dx + wobble, y, 3) * 0.45;
        if (a > 0) pc.set(lx + dx + wobble, y, warm, a);
      }
    }
  }
}

function puddles(pc: PixelCanvas, y0: number, y1: number, count: number, seed: number): void {
  for (let i = 0; i < count; i++) {
    const cx = Math.floor(hash(i, seed, 1) * pc.width);
    const cy = Math.floor(y0 + hash(i, seed, 2) * (y1 - y0));
    const rx = 6 + Math.floor(hash(i, seed, 3) * 14);
    const ry = Math.max(1, Math.round(rx * 0.18));
    for (let y = -ry; y <= ry; y++) {
      for (let x = -rx; x <= rx; x++) {
        if ((x / rx) ** 2 + (y / ry) ** 2 > 1) continue;
        pc.set(cx + x, cy + y, y === -ry || hash(cx + x, cy + y, 4) < 0.08 ? S.puddleShine : S.puddle);
      }
    }
  }
}

/** Borda de cima suave (pontilhada), para a faixa não fazer emenda com a de trás. */
function softTop(pc: PixelCanvas, rows: number): void {
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < pc.width; x++) {
      if (ditherLevel((y + 1) / (rows + 1), x, y, 4) < 0.5) pc.data[(y * pc.width + x) * 4 + 3] = 0;
    }
  }
}

function asphalt(pc: PixelCanvas, y0: number, y1: number): void {
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < pc.width; x++) {
      let col = hash(x, y, 11) < 0.12 ? S.asphaltLight : S.asphalt;
      if (hash(Math.floor(x / 3), y, 12) < 0.04) col = S.wet;
      pc.set(x, y, col);
    }
  }
}

function sidewalk(pc: PixelCanvas, y0: number, y1: number, slabW: number): void {
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < pc.width; x++) {
      let col = x % slabW === 0 ? S.seam : y === y0 ? S.concreteLight : S.concrete;
      if (hash(x, y, 14) < 0.06) col = S.wet;
      pc.set(x, y, col);
    }
  }
}

/** Calçada do outro lado (onde anda a fileira de longe) e o começo do asfalto. */
export function buildFarGround(): PixelCanvas {
  const pc = new PixelCanvas(STREET_SHOT.w, 120);
  sidewalk(pc, 0, 11, 20);
  pc.rect(0, 11, pc.width, 1, S.curb);
  pc.rect(0, 12, pc.width, 2, shadeColor(S.curb, 0.6));
  asphalt(pc, 14, 120);
  reflections(pc, 14, 60, 0.8);
  // Poça de luz do poste.
  lightPool(pc, STREET_SHOT.lampX + 12, 8, 34, 10);
  return pc;
}

/** Asfalto do meio da rua (fileira do meio). */
export function buildMidGround(): PixelCanvas {
  const pc = new PixelCanvas(STREET_SHOT.w, 110);
  asphalt(pc, 0, 110);
  puddles(pc, 6, 40, 5, 21);
  reflections(pc, 0, 50, 0.6);
  lightPool(pc, STREET_SHOT.lampX + 12, 10, 40, 12);
  softTop(pc, 5);
  return pc;
}

/** Calçada do lado de cá (a fileira de perto): concreto molhado e poças grandes. */
export function buildNearGround(): PixelCanvas {
  const pc = new PixelCanvas(STREET_SHOT.w, 80);
  pc.rect(0, 0, pc.width, 3, shadeColor(S.curb, 0.6));
  pc.rect(0, 3, pc.width, 1, S.curb);
  sidewalk(pc, 4, 80, 34);
  for (let y = 4; y < 80; y++) for (let x = 0; x < pc.width; x++) pc.shade(x, y, 0.75);
  puddles(pc, 14, 60, 6, 33);
  reflections(pc, 4, 40, 0.35);
  softTop(pc, 3);
  return pc;
}

function lightPool(pc: PixelCanvas, cx: number, cy: number, rx: number, ry: number): void {
  for (let y = cy - ry; y <= cy + ry; y++) {
    for (let x = cx - rx; x <= cx + rx; x++) {
      const f = 1 - Math.hypot((x - cx) / rx, (y - cy) / ry);
      const a = ditherLevel(Math.max(0, f), x, y, 4) * 0.3;
      if (a > 0) pc.set(x, y, S.lampCone, a);
    }
  }
}

// ---------------- plano 3: de cima do telhado ----------------

/** A rua vista de cima do telhado: calçada do outro lado, asfalto e a calçada do lado de cá. */
export function buildWideStreet(): PixelCanvas {
  const pc = new PixelCanvas(WIDE_SHOT.w, 64);
  sidewalk(pc, 0, 7, 16);
  pc.rect(0, 7, pc.width, 2, S.curb);
  asphalt(pc, 9, 50);
  puddles(pc, 14, 46, 7, 52);
  reflections(pc, 9, 40, 0.6);
  lightPool(pc, STREET_SHOT.lampX + 12, 16, 40, 10);
  pc.rect(0, 50, pc.width, 2, S.curb);
  sidewalk(pc, 52, 64, 16);
  return pc;
}

/**
 * Beira do telhado em primeiro plano, de costas para a câmera: a calha de metal em cima (a aranha fica
 * nela) e as telhas descendo até a câmera, bem escuras (primeiro plano na sombra).
 */
export function buildRoofEdge(): PixelCanvas {
  const pc = new PixelCanvas(WIDE_SHOT.w, WIDE_SHOT.h - WIDE_SHOT.gutterY);
  for (let y = 0; y < pc.height; y++) {
    for (let x = 0; x < pc.width; x++) {
      let col: RGB;
      if (y === 0) col = S.gutter;
      else if (y === 1) col = hash(x, 0, 3) < 0.3 ? S.gutter : S.gutterDark;
      else if (y < 4) col = shadeColor(S.gutterDark, y === 3 ? 0.5 : 0.75);
      else col = shadeColor(shingle(x, y - 4, 4, 14), Math.max(0.3, 0.6 - (y - 4) * 0.01));
      pc.set(x, y, col);
    }
  }
  // Suportes da calha.
  for (let x = 18; x < pc.width; x += 46) pc.rect(x, 0, 2, 4, S.gutterDark);
  return pc;
}
