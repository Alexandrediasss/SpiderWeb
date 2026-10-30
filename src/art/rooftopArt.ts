// Ato 2: os tiles da rua por cima dos postes, pintados pixel a pixel com cores "de dia" e escurecidos para a
// noite (menos o que brilha), mais a luz das luminárias; o pé do zumbi e os detritos.
// Spec: docs/features/act2-rooftops.md
import { LIGHT, TILE } from '../config';
import { ROOFTOP_MAP, type RooftopMaterial, rooftopTile } from '../level/rooftops';
import type { Vec2 } from '../physics/surfaces';
import { coneFactor, ditherLevel } from './lighting';
import { PixelCanvas, type RGB, hash, pick } from './PixelCanvas';
import { PAL } from './palette';
import { MATERIAL_PAINTERS, type TileCtx, mixColor, shadeColor } from './tilePainters';

const A = PAL.act2;

/** Um pixel pintado: cor, opacidade e se brilha (não escurece à noite). */
interface Px {
  c: RGB;
  a?: number;
  glow?: boolean;
}

type Painter = (px: number, py: number, c: TileCtx) => Px | RGB | null;

/** Recorte do mapa em tiles. */
export interface Region {
  tx: number;
  ty: number;
  w: number;
  h: number;
}

export interface RooftopArt {
  canvas: PixelCanvas;
  /** Lâmpadas das luminárias (px do mundo), para a luz e o feixe. */
  lamps: Vec2[];
}

/** Lâmpada de cada luminária (`L`): no vidro dela. */
export function lampBulbs(map: string[] = ROOFTOP_MAP): Vec2[] {
  const out: Vec2[] = [];
  map.forEach((row, ty) => {
    for (let tx = 0; tx < row.length; tx++) if (row[tx] === 'L') out.push({ x: (tx + 0.5) * TILE, y: ty * TILE + 9 });
  });
  return out;
}

/** Luz vermelha do semáforo (px do mundo), para o brilho em volta. */
function signalLights(map: string[]): Vec2[] {
  const out: Vec2[] = [];
  map.forEach((row, ty) => {
    for (let tx = 0; tx < row.length; tx++) {
      if (row[tx] === 't' && map[ty - 1]?.[tx] !== 't' && row[tx - 1] !== 't') out.push({ x: tx * TILE + 16, y: ty * TILE + 8 });
    }
  });
  return out;
}

/** Pinta o mapa (ou um recorte dele) num PixelCanvas: tiles, noite e a luz das luminárias. */
export function bakeRooftops(map: string[] = ROOFTOP_MAP, region?: Region): RooftopArt {
  const rows = map.length;
  const cols = map[0].length;
  const r = region ?? { tx: 0, ty: 0, w: cols, h: rows };
  const pc = new PixelCanvas(r.w * TILE, r.h * TILE);
  const glow = new Uint8Array(pc.width * pc.height);
  const charAt = (x: number, y: number) => (x < 0 || y < 0 || x >= cols || y >= rows ? '.' : map[y][x]);

  for (let ty = r.ty; ty < r.ty + r.h; ty++) {
    for (let tx = r.tx; tx < r.tx + r.w; tx++) {
      const ch = charAt(tx, ty);
      const material = rooftopTile(ch).material;
      if (material === 'air') continue;
      const ctx: TileCtx = {
        tx,
        ty,
        ch,
        at: (dx, dy) => charAt(tx + dx, ty + dy),
        isSolid: (dx, dy) => rooftopTile(charAt(tx + dx, ty + dy)).solid,
        sameAbove: () => {
          let n = 0;
          while (charAt(tx, ty - n - 1) === ch) n++;
          return n;
        },
      };
      const paint = PAINTERS[material];
      for (let py = 0; py < TILE; py++) {
        for (let px = 0; px < TILE; px++) {
          const res = paint(px, py, ctx);
          if (res === null) continue;
          const p = typeof res === 'number' ? { c: res } : res;
          const x = (tx - r.tx) * TILE + px;
          const y = (ty - r.ty) * TILE + py;
          pc.set(x, y, p.c, p.a ?? 1);
          if (p.glow) glow[y * pc.width + x] = 1;
        }
      }
    }
  }

  // Noite: tudo multiplicado pela cor da noite, menos o que brilha.
  const night = channels(A.night);
  for (let i = 0; i < pc.width * pc.height; i++) {
    if (glow[i] || pc.data[i * 4 + 3] === 0) continue;
    for (let k = 0; k < 3; k++) pc.data[i * 4 + k] *= night[k];
  }

  // Luz quente das luminárias (cone para baixo + brilho em volta) e o vermelho do semáforo.
  const lamps = lampBulbs(map);
  const ox = r.tx * TILE;
  const oy = r.ty * TILE;
  for (const l of lamps) light(pc, glow, l.x - ox, l.y - oy, A.lamp, LIGHT.lampRadius, true);
  for (const s of signalLights(map)) light(pc, glow, s.x - ox, s.y - oy, A.redLit, 22, false);
  return { canvas: pc, lamps };
}

function channels(c: RGB): [number, number, number] {
  return [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
}

/** Clareia os pixels pintados em volta de uma luz (em faixas com pontilhado, como no ato 1). */
function light(pc: PixelCanvas, glow: Uint8Array, lx: number, ly: number, color: RGB, radius: number, cone: boolean): void {
  const tint = channels(color);
  for (let y = Math.max(0, Math.floor(ly - radius)); y < Math.min(pc.height, ly + radius); y++) {
    for (let x = Math.max(0, Math.floor(lx - radius)); x < Math.min(pc.width, lx + radius); x++) {
      const i = y * pc.width + x;
      if (glow[i] || pc.data[i * 4 + 3] === 0) continue;
      const dx = x + 0.5 - lx;
      const dy = y + 0.5 - ly;
      const d = Math.hypot(dx, dy);
      let f = Math.max(0, 1 - d / LIGHT.glowRadius) * LIGHT.glowStrength;
      if (cone) f = Math.max(f, coneFactor(dx, dy, radius));
      else f = Math.max(0, 1 - d / radius) * 0.8;
      const level = ditherLevel(f, x, y, LIGHT.bands);
      if (level <= 0) continue;
      for (let k = 0; k < 3; k++) pc.data[i * 4 + k] = Math.min(255, pc.data[i * 4 + k] * (1 + level * 1.7 * tint[k]));
    }
  }
}

// ---------------- pintores ----------------

const wx = (px: number, c: TileCtx) => c.tx * TILE + px;
const wy = (py: number, c: TileCtx) => c.ty * TILE + py;
/** Quantos tiles iguais existem à esquerda / acima (para saber a posição dentro de uma peça grande). */
const runLeft = (c: TileCtx) => {
  let n = 0;
  while (c.at(-n - 1, 0) === c.ch) n++;
  return n;
};
const runUp = (c: TileCtx) => c.sameAbove();
const runRight = (c: TileCtx) => {
  let n = 0;
  while (c.at(n + 1, 0) === c.ch) n++;
  return n;
};
const runDown = (c: TileCtx) => {
  let n = 0;
  while (c.at(0, n + 1) === c.ch) n++;
  return n;
};

const street: Painter = (px, py, c) => {
  const x = wx(px, c);
  if (c.at(0, -1) !== '_') {
    // Calçada com o meio-fio em cima.
    if (py < 2) return A.curb;
    if (x % 32 === 0) return shadeColor(A.concrete, 0.75);
    return hash(x, py, 3) < 0.08 ? shadeColor(A.concrete, 0.9) : A.concrete;
  }
  // Asfalto molhado com reflexos e a faixa amarela tracejada.
  if (c.at(0, -2) === '_' && c.at(0, -3) !== '_' && py >= 6 && py <= 7 && x % 48 < 24) return 0xc9b04a;
  if (hash(Math.floor(x / 7), c.ty * 16 + py, 5) < 0.07) return A.wet;
  return hash(x, wy(py, c), 4) < 0.1 ? A.asphaltLight : A.asphalt;
};

const roofTile: Painter = (px, py, c) => MATERIAL_PAINTERS.roof?.(px, py, c) ?? PAL.roof.base;

/** Parede de madeira com janelas (umas acesas). */
const siding: Painter = (px, py, c) => {
  const x = wx(px, c);
  const y = wy(py, c);
  // Janela: 2×3 tiles, a cada 6 colunas e 7 linhas, longe das bordas da parede.
  const wxTile = (c.tx % 6) - 2;
  const wyTile = (c.ty % 7) - 2;
  const inside = runLeft(c) >= 1 && runRight(c) >= 1 && runDown(c) >= 2 && runUp(c) >= 1;
  if (inside && wxTile >= 0 && wxTile < 2 && wyTile >= 0 && wyTile < 3) {
    const u = wxTile * TILE + px;
    const v = wyTile * TILE + py;
    if (u < 2 || u > 29 || v < 2 || v > 45) return A.trim;
    if (u === 15 || u === 16 || v === 23) return A.trim;
    const lit = hash(Math.floor(c.tx / 6), Math.floor(c.ty / 7), 21) < 0.45;
    return lit ? { c: v > 30 ? A.windowLit : mixColor(A.windowLit, 0xffe9b8, 0.4), glow: true } : A.windowDark;
  }
  if (y % 5 === 4) return A.sidingSeam;
  if (y % 5 === 0) return A.sidingLight;
  return hash(Math.floor(x / 24), Math.floor(y / 5), 6) < 0.15 ? shadeColor(A.siding, 0.93) : A.siding;
};

const chimney: Painter = (px, py, c) => {
  if (c.at(0, -1) !== 'c' && py < 3) return py === 0 ? 0xc0c0c8 : A.chimneyCap;
  return MATERIAL_PAINTERS.brick?.(px, py, c) ?? PAL.brick.base[0];
};

// Regra das peças sólidas: o desenho ocupa o tile inteiro (16×16), porque a colisão é o tile inteiro.
// Peça desenhada mais fina que o tile deixa a aranha "flutuando" longe dela (em cima, embaixo ou do lado).
// Treliças podem ter buracos no meio, mas as bordas (onde a aranha encosta) são cheias. O teste
// `tests/rooftopArt.test.ts` confere.

/** Poste de metal: o tile inteiro de largura, brilho de um lado, sombra do outro, anéis a cada 48 px. */
const pole: Painter = (px, py, c) => {
  if (px === 0 || px === 15) return A.metalDark;
  if (wy(py, c) % 48 < 2) return A.metalDark;
  if (px <= 3) return A.metalLight;
  if (px >= 12) return shadeColor(A.metal, 0.75);
  return A.metal;
};

/** Braço de metal: treliça com banzo em cima e embaixo (onde a aranha anda) e diagonais no meio. */
const arm: Painter = (px, py, c) => {
  const x = wx(px, c);
  const endLeft = c.at(-1, 0) !== 'a' && c.at(-1, 0) !== 'p';
  const endRight = c.at(1, 0) !== 'a' && c.at(1, 0) !== 'p';
  if (py === 0) return A.metalLight;
  if (py === 15) return A.metalDark;
  if (py <= 3) return py === 1 ? mixColor(A.metal, A.metalLight, 0.4) : A.metal;
  if (py >= 12) return shadeColor(A.metal, 0.8);
  // Ponta fechada por uma barra vertical.
  if ((endLeft && px <= 1) || (endRight && px >= 14)) return A.metal;
  // Diagonais em X a cada 16 px (o meio é vazado).
  const k = ((x % 16) + 16) % 16;
  if (Math.abs(k - (py - 4) * 2) <= 1 || Math.abs(15 - k - (py - 4) * 2) <= 1) return shadeColor(A.metal, 0.9);
  return null;
};

/** Luminária (fundo): cúpula escura e o vidro aceso embaixo. */
const lamp: Painter = (px, py) => {
  if (py <= 1) return px === 7 || px === 8 ? A.metalDark : null;
  if (py <= 5) {
    const inset = 5 - py;
    if (px < 1 + inset || px > 14 - inset) return null;
    return py === 2 ? A.metal : A.metalDark;
  }
  if (py <= 10) return px < 3 || px > 12 ? null : { c: py === 6 ? 0xffffff : A.lampGlass, glow: true };
  if (py === 11) return px < 2 || px > 13 ? null : A.metalDark;
  return null;
};

/** Poste de madeira (o tile inteiro de largura), com os degraus de metal alternados nas bordas. */
const wood: Painter = (px, py, c) => {
  const y = wy(py, c);
  const step = y % 24 < 2;
  if (step && (Math.floor(y / 24) % 2 === 0 ? px <= 1 : px >= 14)) return A.metalLight;
  if (px === 0 || px === 15) return A.woodDark;
  if (px <= 2) return A.woodLight;
  if (px % 4 === 1 && hash(px, Math.floor(y / 6), 7) < 0.5) return shadeColor(A.wood, 0.85);
  return A.wood;
};

/** Cruzeta de madeira (viga cheia), com isoladores de vidro verde na face, no segundo tile de cada ponta. */
const crossbar: Painter = (px, py, c) => {
  const insulator = (c.at(-1, 0) === 'x' && c.at(-2, 0) !== 'x') || (c.at(1, 0) === 'x' && c.at(2, 0) !== 'x');
  if (insulator && py >= 1 && py <= 6 && px >= 5 && px <= 10) {
    return py === 1 || px === 5 || px === 10 ? shadeColor(A.insulator, 0.6) : A.insulator;
  }
  const endL = c.at(-1, 0) !== 'x';
  const endR = c.at(1, 0) !== 'x';
  if (py === 0) return A.woodLight;
  if (py === 15 || (endL && px === 0) || (endR && px === 15)) return A.woodDark;
  return wx(px, c) % 9 === 0 ? shadeColor(A.wood, 0.85) : A.wood;
};

const trunk: Painter = (px, py, c) => {
  const x = wx(px, c);
  const y = wy(py, c);
  if ((px === 0 && c.at(-1, 0) !== 'k') || (px === 15 && c.at(1, 0) !== 'k')) return A.barkDark;
  if (hash(Math.floor(x / 3), Math.floor(y / 5), 8) < 0.25) return A.barkDark;
  if (x % 7 === 0) return A.barkLight;
  return A.bark;
};

/** Galho grosso (o tile inteiro de altura); só a ponta solta afina um pouco. */
const branch: Painter = (px, py, c) => {
  const open = (dx: number) => c.at(dx, 0) !== 'b' && c.at(dx, 0) !== 'k';
  // Ponta arredondada: só os cantinhos somem.
  if (open(-1) && px < 3 && (py < 3 - px || py > 12 + px)) return null;
  if (open(1) && px > 12 && (py < px - 12 || py > 27 - px)) return null;
  if (py === 0) return A.barkLight;
  if (py === 15) return A.barkDark;
  return hash(wx(px, c), py, 9) < 0.15 ? A.barkDark : A.bark;
};

/** Copa da árvore (fundo): cachos de folhas com buracos por onde o céu aparece. */
const foliage: Painter = (px, py, c) => {
  const x = wx(px, c);
  const y = wy(py, c);
  const n = hash(Math.floor(x / 4), Math.floor(y / 4), 1) * 0.6 + hash(Math.floor(x / 2), Math.floor(y / 2), 2) * 0.4;
  if (n < 0.3) return null;
  const leaf = n > 0.78 ? A.leafLight : pick(A.leaf, Math.floor(x / 4), Math.floor(y / 4));
  return shadeColor(leaf, 0.8);
};

/** Letras 5×7 para o anúncio do outdoor. */
const GLYPHS: Record<string, string[]> = {
  S: ['.###.', '#....', '#....', '.###.', '....#', '....#', '###..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
};

function textPixel(text: string, u: number, v: number, x0: number, y0: number, scale: number): boolean {
  const lx = Math.floor((u - x0) / scale);
  const ly = Math.floor((v - y0) / scale);
  if (ly < 0 || ly >= 7 || lx < 0) return false;
  const ch = text[Math.floor(lx / 6)];
  const g = ch ? GLYPHS[ch] : undefined;
  return !!g && g[ly][lx % 6] === '#';
}

/** Outdoor com um anúncio velho e irônico ("SUNNY DAYS AHEAD"), descascando com a chuva. */
const billboard: Painter = (px, py, c) => {
  const u = runLeft(c) * TILE + px;
  const v = runUp(c) * TILE + py;
  const W = (runLeft(c) + runRight(c) + 1) * TILE;
  const H = (runUp(c) + runDown(c) + 1) * TILE;
  if (u < 3 || v < 3 || u > W - 4 || v > H - 4) return A.posterFrame;
  if (hash(Math.floor(u / 7), Math.floor(v / 6), 9) < 0.07) return 0x8a8a8a;
  const sun = Math.hypot(u - 38, v - 44);
  if (sun < 20) return sun > 17 ? A.posterSunDark : A.posterSun;
  if (textPixel('SUNNY DAYS', u, v, 74, 22, 2) || textPixel('AHEAD', u, v, 112, 50, 2)) return A.posterText;
  let col = mixColor(A.posterSky, A.posterCream, ditherLevel(v / H, u, v, 4));
  if (hash(u, 0, 3) < 0.05 && v > 10) col = shadeColor(col, 0.85);
  return col;
};

/** Passarela embaixo do outdoor: piso de grade em cima, treliça embaixo (banzo de baixo cheio). */
const catwalk: Painter = (px, py, c) => {
  const x = wx(px, c);
  const endL = c.at(-1, 0) !== 'y';
  const endR = c.at(1, 0) !== 'y';
  if (py < 2) return A.grate;
  if (py < 5) return (x + py) % 3 === 0 ? A.grateDark : A.grate;
  if (py >= 13) return py === 15 ? A.grateDark : A.grate;
  if ((endL && px <= 1) || (endR && px >= 14)) return A.grateDark;
  const k = ((x % 16) + 16) % 16;
  if (Math.abs(k - (py - 5) * 2) <= 1 || Math.abs(15 - k - (py - 5) * 2) <= 1) return A.grateDark;
  return null;
};

/** Teto do ponto de ônibus: chapa em cima e a faixa da fachada embaixo, o tile inteiro de altura. */
const shelter: Painter = (px, py, c) => {
  const endL = c.at(-1, 0) !== 's';
  const endR = c.at(1, 0) !== 's';
  if (py === 0) return mixColor(A.shelter, 0xffffff, 0.3);
  if (py === 15 || (endL && px === 0) || (endR && px === 15)) return A.shelterDark;
  if (py <= 6) return A.shelter;
  if (py === 7) return A.shelterDark;
  // Faixa da fachada com rebites.
  return wx(px, c) % 12 === 6 && py === 11 ? mixColor(A.shelter, 0xffffff, 0.2) : shadeColor(A.shelter, 0.82);
};

const post: Painter = (px) => (px >= 6 && px <= 9 ? (px === 6 ? A.metalLight : A.metal) : null);

/** Vidro do ponto de ônibus (fundo, transparente). */
const glass: Painter = (px, py, c) => {
  if ((py === 0 && c.at(0, -1) !== 'G') || (py === 15 && c.at(0, 1) !== 'G')) return A.metal;
  const shine = (wx(px, c) + wy(py, c)) % 23 < 2;
  return { c: A.glass, a: shine ? 0.5 : 0.22 };
};

/** Semáforo: caixa amarela com três luzes; só a vermelha acesa. */
const signal: Painter = (px, py, c) => {
  const u = runLeft(c) * TILE + px;
  const v = runUp(c) * TILE + py;
  if (u <= 1 || u >= 30 || v === 0 || v === 47) return A.signalDark;
  for (const [cy, lit] of [
    [8, true],
    [24, false],
    [40, false],
  ] as const) {
    const d = Math.hypot(u - 15.5, v - cy);
    if (d < 6) {
      if (!lit) return A.lightOff;
      return { c: d < 2.5 ? 0xffd0c8 : A.redLit, glow: true };
    }
    if (d < 7.5 && v < cy) return A.signalDark;
  }
  return A.signal;
};

const PAINTERS: Record<RooftopMaterial, Painter> = {
  air: () => null,
  street,
  roof: roofTile,
  siding,
  chimney,
  pole,
  arm,
  lamp,
  wood,
  crossbar,
  trunk,
  branch,
  foliage,
  billboard,
  catwalk,
  shelter,
  post,
  glass,
  signal,
};

// ---------------- o pé do zumbi ----------------

export const FOOT = { w: 44, h: 76 } as const;

/** O pé que pisa: barra da calça rasgada em cima, tornozelo verde e um tênis sujo (bico para a direita). */
export function buildZombieFoot(): PixelCanvas {
  const pc = new PixelCanvas(FOOT.w, FOOT.h);
  const legX0 = 8;
  const legX1 = 30;
  // Calça.
  for (let y = 0; y < 54; y++) {
    for (let x = legX0; x <= legX1; x++) {
      const hem = 50 + Math.floor(hash(x, 0, 5) * 4);
      if (y > hem) continue;
      let col = A.jeans;
      if (x === legX0 || x === legX1) col = A.jeansDark;
      else if (x < legX0 + 4) col = A.jeansLight;
      else if ((x + Math.floor(y / 9)) % 11 === 0) col = A.jeansDark;
      if (y > hem - 2) col = A.jeansDark;
      pc.set(x, y, col);
    }
  }
  // Tornozelo.
  pc.rect(13, 52, 13, 6, A.skin);
  pc.rect(13, 52, 2, 6, shadeColor(A.skin, 0.8));
  // Tênis: cano, corpo, bico e sola grossa.
  const shoeTop = 57;
  for (let y = shoeTop; y < 72; y++) {
    const toe = y < 63 ? 30 : 40 - Math.max(0, 66 - y);
    for (let x = 6; x <= toe; x++) {
      let col = A.sneaker;
      if (y >= 69) col = A.sole;
      else if (y === 68) col = mixColor(A.sole, A.sneaker, 0.4);
      else if (y >= 63 && y <= 64 && x > 14) col = A.sneakerStripe;
      else if (x < 9 || y === shoeTop) col = A.sneakerDark;
      if (hash(x >> 1, y >> 1, 12) < 0.12 && y < 68) col = A.mud;
      pc.set(x, y, col);
    }
  }
  // Cadarços.
  for (let i = 0; i < 4; i++) pc.rect(18 + i * 3, 58 + i, 2, 1, PAL.outline);
  outlineSprite(pc, PAL.outline);
  return pc;
}

// ---------------- detritos ----------------

export const DEBRIS_FRAME = 14;

/** Folha com um quadro por tipo, na ordem de DEBRIS_KINDS: telha, jornal, galho, tampa de lixo. */
export function buildDebrisSheet(): PixelCanvas {
  const S = DEBRIS_FRAME;
  const pc = new PixelCanvas(S * 4, S);
  // Telha: paralelogramo.
  for (let y = 4; y < 10; y++) for (let x = 2 + (y - 4) / 2; x < 11 + (y - 4) / 2; x++) pc.set(x, y, y === 4 ? A.shingleLight : A.shingle);
  // Jornal amassado com linhas de texto.
  for (let y = 3; y < 11; y++) {
    for (let x = S + 2; x < S + 12; x++) {
      if (hash(x, y, 4) < 0.12) continue;
      pc.set(x, y, y % 2 === 0 && x > S + 3 && x < S + 11 ? A.paperInk : A.paper);
    }
  }
  // Galho com duas folhas.
  pc.line(2 * S + 1, 10, 2 * S + 12, 4, A.twig);
  pc.line(2 * S + 6, 7, 2 * S + 8, 11, A.twig);
  pc.disc(2 * S + 11, 3, 1, A.leaf[1]);
  pc.disc(2 * S + 8, 12, 1, A.leafLight);
  // Tampa de lixo: disco de metal com a alça.
  pc.disc(3 * S + 7, 8, 5, A.lid);
  pc.rect(3 * S + 3, 8, 9, 1, A.lidDark);
  pc.rect(3 * S + 5, 2, 5, 2, A.lidDark);
  outlineSprite(pc, PAL.outline);
  return pc;
}

/** Contorno de 1 px em volta do que foi pintado (4 vizinhos). */
function outlineSprite(pc: PixelCanvas, c: RGB): void {
  const filled = (x: number, y: number) => x >= 0 && y >= 0 && x < pc.width && y < pc.height && pc.data[(y * pc.width + x) * 4 + 3] > 0;
  const edge: [number, number][] = [];
  for (let y = 0; y < pc.height; y++) {
    for (let x = 0; x < pc.width; x++) {
      if (!filled(x, y) && (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1))) edge.push([x, y]);
    }
  }
  for (const [x, y] of edge) pc.set(x, y, c);
}
