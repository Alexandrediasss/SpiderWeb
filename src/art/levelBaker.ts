// "Assa" o cenário inteiro (tiles + fundos + decorações) num único PixelCanvas.
import { TILE } from '../config';
import { type Decor, type Room } from '../level/houseMap';
import { tileDef } from '../level/legend';
import { PixelCanvas } from './PixelCanvas';
import { DECOR_PAINTERS } from './decorArt';
import { PAL } from './palette';
import { BACKGROUND_PAINTERS, type BackgroundStyle, MATERIAL_PAINTERS, type TileCtx, shadeColor } from './tilePainters';

const BACKGROUND_FURNITURE_SHADE = 0.6;
const AO_TOP = [0.55, 0.7, 0.82, 0.92];
const AO_SIDE = [0.65, 0.82, 0.93];

export function bakeLevel(map: string[], rooms: Room[], decorations: Decor[]): PixelCanvas {
  const rows = map.length;
  const cols = map[0].length;
  const pc = new PixelCanvas(cols * TILE, rows * TILE);
  const charAt = (x: number, y: number) => (x < 0 || y < 0 || x >= cols || y >= rows ? '#' : map[y][x]);

  const makeCtx = (tx: number, ty: number): TileCtx => ({
    tx,
    ty,
    ch: charAt(tx, ty),
    at: (dx, dy) => charAt(tx + dx, ty + dy),
    isSolid: (dx, dy) => tileDef(charAt(tx + dx, ty + dy)).solid,
    sameAbove: () => {
      let n = 0;
      while (charAt(tx, ty - n - 1) === charAt(tx, ty)) n++;
      return n;
    },
  });

  const roomStyleAt = (tx: number, ty: number): BackgroundStyle => {
    let style: BackgroundStyle = 'cavity';
    for (const r of rooms) if (tx >= r.x0 && tx <= r.x1 && ty >= r.y0 && ty <= r.y1) style = r.style;
    return style;
  };

  for (let ty = 0; ty < rows; ty++) {
    for (let tx = 0; tx < cols; tx++) {
      const c = makeCtx(tx, ty);
      const def = tileDef(c.ch);
      const ox = tx * TILE;
      const oy = ty * TILE;
      const material = MATERIAL_PAINTERS[def.material];

      if (def.solid && material) {
        paint(pc, ox, oy, (px, py) => material(px, py, c));
        outlineEdges(pc, ox, oy, c);
        continue;
      }

      const style: BackgroundStyle = c.ch === '~' ? 'sky' : roomStyleAt(tx, ty);
      const bg = BACKGROUND_PAINTERS[style];
      paint(pc, ox, oy, (px, py) => bg(px, py, c));
      if (style !== 'sky' && style !== 'attic' && style !== 'cavity' && tileDef(c.at(0, 1)).structural) {
        drawBaseboard(pc, ox, oy);
      }
      ambientOcclusion(pc, ox, oy, c);

      if (def.background && material) {
        // Peça isolada na horizontal (pé de mesa, encosto de cadeira) vira uma haste fina.
        const isPost = c.at(-1, 0) !== c.ch && c.at(1, 0) !== c.ch;
        paint(pc, ox, oy, (px, py) => {
          if (isPost && (px < 5 || px > 10)) return null;
          const col = shadeColor(material(px, py, c), BACKGROUND_FURNITURE_SHADE);
          return isPost && (px === 5 || px === 10) ? shadeColor(col, 0.7) : col;
        });
        if (!isPost) outlineEdges(pc, ox, oy, c);
      }
    }
  }

  for (const d of decorations) DECOR_PAINTERS[d.kind](pc, d.tx * TILE, d.ty * TILE, d.flipX ?? false);
  return pc;
}

function paint(pc: PixelCanvas, ox: number, oy: number, fn: (px: number, py: number) => number | null): void {
  for (let py = 0; py < TILE; py++) {
    for (let px = 0; px < TILE; px++) {
      const color = fn(px, py);
      if (color !== null) pc.set(ox + px, oy + py, color);
    }
  }
}

/** Contorno escuro nos lados onde o vizinho é de outro material (estruturas não se contornam entre si). */
function outlineEdges(pc: PixelCanvas, ox: number, oy: number, c: TileCtx): void {
  const self = tileDef(c.ch);
  const needs = (dx: number, dy: number) => {
    const n = c.at(dx, dy);
    if (n === c.ch) return false;
    const nd = tileDef(n);
    return !(self.structural && nd.structural);
  };
  if (needs(0, -1)) pc.shadeRect(ox, oy, TILE, 1, 0.45);
  if (needs(0, 1)) pc.shadeRect(ox, oy + TILE - 1, TILE, 1, 0.45);
  if (needs(-1, 0)) pc.shadeRect(ox, oy, 1, TILE, 0.45);
  if (needs(1, 0)) pc.shadeRect(ox + TILE - 1, oy, 1, TILE, 0.45);
}

function drawBaseboard(pc: PixelCanvas, ox: number, oy: number): void {
  pc.rect(ox, oy + TILE - 4, TILE, 1, PAL.wall.baseboardDark);
  pc.rect(ox, oy + TILE - 3, TILE, 3, PAL.wall.baseboard);
}

/** Sombra suave embaixo e ao lado de superfícies sólidas. */
function ambientOcclusion(pc: PixelCanvas, ox: number, oy: number, c: TileCtx): void {
  if (c.isSolid(0, -1)) AO_TOP.forEach((f, i) => pc.shadeRect(ox, oy + i, TILE, 1, f));
  if (c.isSolid(-1, 0)) AO_SIDE.forEach((f, i) => pc.shadeRect(ox + i, oy, 1, TILE, f));
  if (c.isSolid(1, 0)) AO_SIDE.forEach((f, i) => pc.shadeRect(ox + TILE - 1 - i, oy, 1, TILE, f));
}
