// Pintores procedurais de tiles. Cada pintor devolve a cor de UM pixel do tile;
// o levelBaker decide onde escrever. Coordenadas: px/py locais (0..15), wx/wy no mundo.
import { TILE } from '../config';
import type { Material } from '../level/legend';
import type { RoomStyle } from '../level/houseMap';
import { type RGB, hash, pick } from './PixelCanvas';
import { PAL } from './palette';

export interface TileCtx {
  tx: number;
  ty: number;
  ch: string;
  /** Caractere do vizinho (dx, dy). Fora do mapa = '#'. */
  at(dx: number, dy: number): string;
  isSolid(dx: number, dy: number): boolean;
  /** Quantos tiles iguais existem logo acima, em sequência. */
  sameAbove(): number;
}

export type PixelFn = (px: number, py: number, c: TileCtx) => RGB;

export function shadeColor(c: RGB, f: number): RGB {
  const r = Math.min(255, Math.round(((c >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((c >> 8) & 255) * f));
  const b = Math.min(255, Math.round((c & 255) * f));
  return (r << 16) | (g << 8) | b;
}

export function mixColor(a: RGB, b: RGB, t: number): RGB {
  const ch = (s: number) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

const wxOf = (px: number, c: TileCtx) => c.tx * TILE + px;
const wyOf = (py: number, c: TileCtx) => c.ty * TILE + py;

// ---------------- materiais (sólidos e móveis) ----------------

const brick: PixelFn = (px, py, c) => {
  const P = PAL.brick;
  const wx = wxOf(px, c);
  const wy = wyOf(py, c);
  const row = Math.floor(wy / 4);
  const yy = wy % 4;
  const off = (row % 2) * 4;
  const col = Math.floor((wx + off) / 8);
  const xx = (wx + off) % 8;
  if (yy === 3 || xx === 7) return P.mortar;
  let color = pick(P.base, col, row);
  if (yy === 0 && xx < 6) color = P.light;
  if (yy === 2) color = shadeColor(color, 0.88);
  if (hash(wx, wy, 1) < 0.07) color = shadeColor(color, 0.9);
  return color;
};

const floor: PixelFn = (px, py, c) => {
  const P = PAL.floor;
  const wx = wxOf(px, c);
  const topExposed = !c.isSolid(0, -1);
  const bottomExposed = !c.isSolid(0, 1);
  if (topExposed && py < 5) {
    if (py === 0) return P.boardLight;
    if (py === 4) return P.seam;
    const plank = Math.floor((wx + c.ty * 7) / 24);
    if ((wx + c.ty * 7) % 24 === 0) return P.seam;
    const color = pick(P.board, plank, c.ty);
    return hash(Math.floor(wx / 3), py, 2) < 0.15 ? shadeColor(color, 0.9) : color;
  }
  if (bottomExposed && py >= 13) return py === 13 ? P.beamDark : P.plaster;
  const wy = wyOf(py, c);
  if (wy % 8 === 0) return P.beamDark;
  if (wx % 32 === 0) return P.beamDark;
  return hash(wx, wy, 3) < 0.06 ? P.beamDark : P.beam;
};

const roof: PixelFn = (px, py, c) => {
  const P = PAL.roof;
  const wx = wxOf(px, c);
  const wy = wyOf(py, c);
  const row = Math.floor(wy / 5);
  const yy = wy % 5;
  const off = (row % 2) * 3;
  const col = Math.floor((wx + off) / 6);
  const xx = (wx + off) % 6;
  if (yy === 4) return P.dark;
  if (xx === 5 && yy >= 1) return P.dark;
  if (yy === 0) return P.light;
  return shadeColor(P.base, 0.92 + hash(col, row, 4) * 0.14);
};

const wood: PixelFn = (px, py, c) => {
  const P = PAL.wood;
  const wx = wxOf(px, c);
  const wy = wyOf(py, c);
  const band = Math.floor(wy / 8);
  if (wy % 8 === 7) return P.grain;
  let color = pick(P.base, band, Math.floor(wx / 32));
  if (hash(Math.floor(wx / 3), wy, 5) < 0.14) color = P.grain;
  if (!c.isSolid(0, -1) && py === 1) color = P.light;
  return color;
};

const cushion: PixelFn = (px, py, c) => {
  const P = PAL.cushion;
  const wx = wxOf(px, c);
  const wy = wyOf(py, c);
  if (c.at(0, -1) !== c.ch && py < 2) return P.light;
  if (wx % 8 === 4 && wy % 8 === 4) return P.dark;
  if (wx % 8 === 3 && wy % 8 === 3) return P.light;
  if (wx % 16 === 0) return shadeColor(P.base, 0.85);
  return P.base;
};

const mattress: PixelFn = (px, py, c) => {
  const P = PAL.mattress;
  const wx = wxOf(px, c);
  const wy = wyOf(py, c);
  const topEdge = c.at(0, -1) !== c.ch;
  const leftEdge = c.at(-1, 0) !== c.ch;
  // Travesseiro na ponta da cabeceira
  if (topEdge && leftEdge && px >= 1 && px <= 11 && py <= 8) {
    if (py === 0 || px === 1 || px === 11 || py === 8) return P.sheetShade;
    return P.sheet;
  }
  if (topEdge && py < 4) return py === 3 ? P.sheetShade : P.sheet;
  if (wx % 8 === 0 || wy % 8 === 0) return (wx + wy) % 2 === 0 ? P.blanketDark : P.blanket;
  return (Math.floor(wx / 8) + Math.floor(wy / 8)) % 2 === 0 ? P.blanket : P.blanketLight;
};

// Portas de 2 tiles de largura que ocupam a altura inteira do móvel.
const cabinet: PixelFn = (px, py, c) => {
  const P = PAL.cabinet;
  const top = c.at(0, -1) !== c.ch;
  const bottom = c.at(0, 1) !== c.ch;
  if (top && !c.isSolid(0, -1) && py < 3) return py === 0 ? P.topLight : py === 1 ? P.top : P.dark;
  const leftSeam = c.tx % 2 === 0 || c.at(-1, 0) !== c.ch;
  const rightSeam = c.tx % 2 === 1 || c.at(1, 0) !== c.ch;
  const x0 = leftSeam ? 2 : -1;
  const x1 = rightSeam ? 13 : 16;
  const y0 = top ? 4 : -1;
  const y1 = bottom ? 12 : 16;
  if (px < x0 || px > x1 || py < y0 || py > y1) return P.base;
  if ((leftSeam && px === x0) || (top && py === y0)) return P.dark;
  if ((rightSeam && px === x1) || (bottom && py === y1)) return P.light;
  if (top && c.tx % 2 === 0 && px >= 14 && py >= 7 && py <= 8) return P.knob;
  return P.base;
};

const fridge: PixelFn = (px, py, c) => {
  const P = PAL.fridge;
  const above = c.sameAbove();
  if (above === 0 && py < 2) return P.light;
  if (above === 2 && py === 15) return P.dark;
  if (above === 2 && py === 14) return P.shade;
  const rightmost = c.at(1, 0) !== c.ch;
  const handle = rightmost && ((above === 1 && py >= 4) || above === 4 || (above === 5 && py <= 10));
  if (handle && px === 12) return P.dark;
  if (handle && px === 13) return P.light;
  if (c.at(-1, 0) !== c.ch && px < 2) return P.light;
  if (c.at(1, 0) !== c.ch && px > 13) return P.shade;
  return P.base;
};

const books: PixelFn = (px, py, c) => {
  const wood = PAL.wood;
  if (c.at(-1, 0) !== c.ch && px < 2) return px === 0 ? wood.dark : wood.base[0];
  if (c.at(1, 0) !== c.ch && px > 13) return px === 15 ? wood.dark : wood.base[0];
  if (c.at(0, -1) !== c.ch && py < 2) return py === 0 ? wood.light : wood.base[0];
  if (py >= 13) return py === 13 ? wood.light : py === 15 ? wood.dark : wood.base[1];
  // Fileira de livros: larguras e alturas determinísticas por tile.
  let x = 2;
  let i = 0;
  while (x <= 13) {
    const w = 2 + Math.floor(hash(c.tx, c.ty, 10 + i) * 2);
    if (px < x + w) {
      const h = 7 + Math.floor(hash(c.tx, c.ty, 30 + i) * 5);
      const top = 13 - h;
      if (py < top) return 0x2e1f17;
      const color = pick(PAL.books, c.tx * 7 + i, c.ty);
      if (py === top) return shadeColor(color, 1.25);
      if (py === top + 2) return shadeColor(color, 1.35);
      return px === x ? shadeColor(color, 0.8) : color;
    }
    x += w;
    i++;
  }
  return 0x2e1f17;
};

const ceramic: PixelFn = (px, py, c) => {
  const P = PAL.ceramic;
  const wx = wxOf(px, c);
  const wy = wyOf(py, c);
  if (!c.isSolid(0, -1) && py === 0) return P.light;
  if (wx % 8 === 0 || wy % 8 === 0) return P.grout;
  if (wx % 8 === 2 && wy % 8 === 2) return P.light;
  if (c.at(1, 0) !== c.ch && px > 12) return P.shade;
  return P.base;
};

export const MATERIAL_PAINTERS: Partial<Record<Material, PixelFn>> = {
  brick,
  floor,
  roof,
  wood,
  cushion,
  mattress,
  cabinet,
  fridge,
  books,
  ceramic,
};

// ---------------- fundos (paredes dos cômodos) ----------------

export type BackgroundStyle = RoomStyle | 'sky' | 'cavity';

const SKY_HEIGHT = 12 * TILE;

export const BACKGROUND_PAINTERS: Record<BackgroundStyle, PixelFn> = {
  sky: (_px, py, c) => mixColor(PAL.sky.top, PAL.sky.bottom, Math.min(1, wyOf(py, c) / SKY_HEIGHT)),

  cavity: (px, py, c) => (hash(wxOf(px, c), wyOf(py, c), 6) < 0.1 ? shadeColor(PAL.wall.cavity, 0.8) : PAL.wall.cavity),

  attic: (px, py, c) => {
    const W = PAL.wall;
    const wx = wxOf(px, c);
    const wy = wyOf(py, c);
    const board = Math.floor(wx / 6);
    const xx = wx % 6;
    if (xx === 5) return W.atticGap;
    if (xx === 2 && wy % 32 === 6) return W.atticGap;
    const color = pick(W.attic, board, 0);
    return hash(wx, Math.floor(wy / 3), 7) < 0.1 ? shadeColor(color, 0.88) : color;
  },

  bedroom: (px, py, c) => {
    const W = PAL.wall;
    const u = wxOf(px, c) % 12;
    const v = wyOf(py, c) % 12;
    if (Math.abs(u - 6) + Math.abs(v - 6) === 5) return W.bedroomLight;
    if (u === 6 && v === 6) return W.bedroomLight;
    return W.bedroom;
  },

  bathroom: (px, py, c) => {
    const W = PAL.wall;
    const wx = wxOf(px, c);
    const wy = wyOf(py, c);
    if (wx % 8 === 0 || wy % 8 === 0) return W.bathroomGrout;
    if (wx % 8 === 1 && wy % 8 === 1) return shadeColor(W.bathroom, 1.12);
    return W.bathroom;
  },

  living: (px, _py, c) => {
    const W = PAL.wall;
    const wx = wxOf(px, c);
    if (wx % 10 === 0) return shadeColor(W.livingLight, 1.08);
    return wx % 10 < 5 ? W.living : W.livingLight;
  },

  kitchen: (px, py, c) => {
    const W = PAL.wall;
    const wx = wxOf(px, c);
    const wy = wyOf(py, c);
    if (wx % 8 === 0 || wy % 8 === 0) return W.kitchenGrout;
    return (Math.floor(wx / 8) + Math.floor(wy / 8)) % 2 === 0 ? W.kitchen : W.kitchenAlt;
  },
};
