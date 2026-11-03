// Ato 3: o cenário da casa vizinha (tiles, papéis de parede, decorações só desta casa) e a luz de uma casa
// sem energia (escuro, lua pelas janelas, brilho verde da gosma). Calculado uma vez e guardado.
// Spec: docs/features/act3-lights-out.md
import { TILE } from '../config';
import { isSolidChar } from '../level/legend';
import {
  ACT3_WINDOW,
  GOO,
  NEIGHBOR_DECOR,
  NEIGHBOR_EXTRA_DECOR,
  NEIGHBOR_MAP,
  NEIGHBOR_ROOMS,
  type NeighborDecorKind,
} from '../level/neighborHouse';
import { LevelGrid } from '../physics/LevelGrid';
import type { Vec2 } from '../physics/surfaces';
import { type OutsideMarker, windowCenter } from './decorArt';
import type { LevelArt } from './levelArt';
import { bakeLevel } from './levelBaker';
import { type Glow, buildFlashMap, buildGlowLightMap } from './lighting';
import { PixelCanvas, type RGB, hash } from './PixelCanvas';
import { PAL } from './palette';
import { mixColor, shadeColor } from './tilePainters';

const A = PAL.act3;

/** Brilho da gosma e da lua no mapa de luz (raio em px e força no centro). */
const GOO_GLOW = { radius: 70, strength: 0.6 };
const MOON_GLOW = { radius: 120, strength: 0.42 };

let cache: LevelArt | null = null;

/** O cenário do ato 3 (tiles, decorações, luz, clarão). Mesmo formato da casa do ato 1, sem luminárias. */
export function getNeighborArt(): LevelArt {
  if (cache) return cache;
  const grid = LevelGrid.fromAscii(NEIGHBOR_MAP, TILE, isSolidChar);
  const baked = bakeLevel(NEIGHBOR_MAP, NEIGHBOR_ROOMS, NEIGHBOR_DECOR);
  const W = baked.canvas.width;
  const mark: OutsideMarker = (x, y, isOutside) => {
    if (x >= 0 && y >= 0 && x < W && y < baked.canvas.height) baked.outside[y * W + x] = isOutside ? 1 : 0;
  };
  for (const d of NEIGHBOR_EXTRA_DECOR) {
    NEIGHBOR_PAINTERS[d.kind](baked.canvas, d.tx * TILE, d.ty * TILE, d.w ?? 1, d.flipX ?? false, mark);
  }
  const windows = [...NEIGHBOR_DECOR.map(windowCenter).filter((w): w is Vec2 => w !== null), brokenWindowCenter()];
  const glows: Glow[] = [
    ...windows.map((w) => ({ ...w, ...MOON_GLOW, color: A.moon })),
    ...GOO.pools.map((p) => ({ x: (p.x0 + p.x1) / 2, y: p.y - 4, ...GOO_GLOW, color: A.gooLight })),
    ...GOO.jets.map((j) => ({ x: j.x, y: j.y - 6, ...GOO_GLOW, radius: GOO_GLOW.radius * 0.8, color: A.gooLight })),
  ];
  cache = {
    ...baked,
    light: buildGlowLightMap(grid, baked.outside, A.ambient, glows),
    flash: buildFlashMap(grid, baked.outside, windows),
    beams: [],
    grid,
    lamps: [],
    leaks: [],
  };
  return cache;
}

/** Centro do vão da janela quebrada (de onde entra a luz da lua e do relâmpago). */
export function brokenWindowCenter(): Vec2 {
  const w = ACT3_WINDOW;
  return { x: (w.tx + w.w) * TILE + 2, y: (w.ty + w.h / 2) * TILE };
}

// ---------------- decorações só desta casa ----------------

/** (x, y) = canto de cima à esquerda do tile, `w` = largura em tiles. */
type Painter = (pc: PixelCanvas, x: number, y: number, w: number, flipX: boolean, mark: OutsideMarker) => void;

const NEIGHBOR_PAINTERS: Record<NeighborDecorKind, Painter> = {
  // Luminária apagada pendurada no teto: fio, cúpula escura e a lâmpada cinza.
  deadLamp: (pc, x, y) => {
    pc.rect(x + 7, y, 2, 8, PAL.decor.cord);
    for (let k = 0; k < 6; k++) pc.rect(x + 4 - Math.floor(k / 2), y + 8 + k, 8 + Math.floor(k / 2) * 2, 1, k === 5 ? A.lampDeadLight : A.lampDead);
    pc.rect(x + 6, y + 14, 4, 2, A.bulbDead);
    pc.set(x + 7, y + 14, 0xd8d8d0);
  },

  // A abertura na chaminé por onde a Mary cai: tijolos quebrados e o escuro de fuligem lá dentro.
  chimneyBreach: (pc, x, y) => {
    for (let yy = 3; yy < 30; yy++) {
      const half = 5 + Math.round(Math.sin(yy * 0.7) * 1.5 + hash(yy, 0, 71) * 2);
      for (let xx = 0; xx < half + 2; xx++) {
        if (xx < half) pc.set(x + xx, y + yy, mixColor(A.soot, 0x000000, yy / 40));
        else pc.set(x + xx, y + yy, PAL.brick.light);
      }
    }
    // Fuligem escorrendo pelo tijolo em volta.
    for (let i = 0; i < 26; i++) pc.set(x + Math.floor(hash(i, 1, 72) * 14), y + 30 - Math.floor(hash(i, 2, 72) * 6), A.soot, 0.6);
  },

  // Montinho de fuligem no chão.
  soot: (pc, x, y, w) => {
    const bottom = y + TILE - 1;
    for (let xx = 0; xx < w * TILE; xx++) {
      const h = Math.max(0, Math.round(3 * Math.sin((xx / (w * TILE)) * Math.PI) + hash(xx, 0, 73) * 1.5 - 0.5));
      for (let k = 0; k < h; k++) pc.set(x + xx, bottom - k, k === h - 1 ? A.sootLight : A.soot);
    }
    for (let i = 0; i < 14; i++) pc.set(x + Math.floor(hash(i, 1, 74) * w * TILE), bottom - Math.floor(hash(i, 2, 74) * 3), A.soot, 0.7);
  },

  // Rachadura no teto (na base do tile sólido de cima), com a mancha molhada em volta.
  crack: (pc, x, y) => {
    const by = y + TILE - 1;
    for (let xx = -6; xx <= 6; xx++) {
      const d = Math.abs(xx);
      if (hash(xx, 0, 75) < 0.6) pc.set(x + 8 + xx, by - Math.floor(hash(xx, 1, 75) * 2), A.stain, 0.6 * (1 - d / 7));
    }
    pc.line(x + 3, by - 2, x + 7, by, A.crack);
    pc.line(x + 8, by, x + 12, by - 3, A.crack);
    pc.rect(x + 7, by - 1, 3, 2, A.crack);
  },

  // Balde de metal no chão, com água.
  bucket: (pc, x, y) => {
    const bottom = y + TILE;
    for (let k = 0; k < 8; k++) {
      const inset = Math.floor(k / 3);
      pc.rect(x + 3 + inset, bottom - 1 - k, 10 - inset * 2, 1, k < 7 ? (k % 3 === 0 ? A.bucketDark : A.bucket) : A.bucketLight);
    }
    pc.rect(x + 4, bottom - 8, 8, 1, A.water);
    pc.set(x + 6, bottom - 8, A.waterLight);
    // Alça.
    pc.line(x + 3, bottom - 8, x + 5, bottom - 11, A.bucketDark);
    pc.line(x + 5, bottom - 11, x + 10, bottom - 11, A.bucketDark);
    pc.line(x + 10, bottom - 11, x + 12, bottom - 8, A.bucketDark);
  },

  // Respingo de sangue na parede, com gotas escorrendo.
  bloodSplat: (pc, x, y, _w, flipX) => {
    const fx = (xx: number) => (flipX ? x + 15 - xx : x + xx);
    for (let yy = 0; yy < 16; yy++) {
      for (let xx = 0; xx < 16; xx++) {
        const d = Math.hypot(xx - 7.5, yy - 6.5);
        const edge = 5 + 2 * Math.sin(Math.atan2(yy - 6.5, xx - 7.5) * 5);
        if (d < edge) pc.set(fx(xx), y + yy, d < edge - 2 ? A.blood : A.bloodDark, 0.85);
      }
    }
    for (const [xx, len] of [
      [4, 8],
      [8, 12],
      [11, 6],
    ]) {
      for (let k = 0; k < len; k++) pc.set(fx(xx), y + 10 + k, k === len - 1 ? A.bloodDark : A.blood, 0.85);
    }
    for (let i = 0; i < 8; i++) pc.set(fx(Math.floor(hash(i, 1, 76) * 16)), y + Math.floor(hash(i, 2, 76) * 14), A.blood, 0.8);
  },

  // Poça de sangue no chão (na base do tile).
  bloodPool: (pc, x, y, w) => {
    const bottom = y + TILE - 1;
    const len = w * TILE;
    for (let xx = 0; xx < len; xx++) {
      const h = Math.round(2.2 * Math.sqrt(Math.max(0, 1 - ((xx - len / 2) / (len / 2)) ** 2)) + hash(xx, 0, 77) * 0.8);
      for (let k = 0; k < h; k++) pc.set(x + xx, bottom - k, k === h - 1 ? A.bloodLight : A.blood);
    }
  },

  // A marca de uma mão de sangue escorregando pela parede.
  handprint: (pc, x, y) => {
    pc.stamp(['.k.k.k.', '.k.k.k.', 'kk.k.k.', 'kkkkkk.', '.kkkkk.', '.kkkkk.', '..kkk..', '..k.k..', '..k....', '..k....'], { k: A.blood }, x + 4, y + 3);
  },

  // O machado cravado na parede, com sangue na lâmina.
  axe: (pc, x, y) => {
    for (let k = 0; k < 22; k++) {
      const hx = x + 6 + Math.round(k * 0.7);
      const hy = y + 28 - k;
      pc.rect(hx, hy, 2, 1, k % 5 === 0 ? A.axeHandleDark : A.axeHandle);
      pc.set(hx + 2, hy, A.axeHandleDark);
    }
    // Cabeça do machado: de pé, cravada, com o fio virado para a parede (escondido).
    const hx = x + 19;
    const hy = y + 4;
    pc.rect(hx - 4, hy, 9, 8, A.axeHead);
    pc.rect(hx - 4, hy, 9, 1, A.axeEdge);
    pc.rect(hx + 3, hy + 1, 3, 6, A.axeEdge);
    pc.rect(hx - 4, hy + 7, 9, 1, shadeColor(A.axeHead, 0.7));
    pc.rect(hx + 1, hy + 2, 3, 3, A.blood);
    pc.set(hx + 2, hy + 6, A.bloodDark);
    pc.set(hx + 2, hy + 8, A.blood);
    pc.set(hx + 2, hy + 10, A.blood);
  },

  // O buraco do esgoto: tábuas quebradas no topo do chão e o escuro embaixo (a gosma é desenhada por cima).
  sewerHole: (pc, x, y, w) => {
    const top = y + TILE;
    const len = w * TILE;
    for (let xx = 0; xx < len; xx++) {
      const depth = 3 + Math.round(4 * Math.sin((xx / len) * Math.PI) + hash(xx, 0, 78) * 2);
      for (let k = 0; k < depth; k++) pc.set(x + xx, top + k, k === depth - 1 ? PAL.floor.seam : mixColor(0x0a1a0c, 0x000000, k / depth));
    }
    // Pontas de tábua lascadas.
    for (const ex of [0, len - 3]) pc.rect(x + ex, top - 1, 3, 2, PAL.floor.boardLight);
  },

  // Moldura da janela quebrada em volta do vão (na parede de tijolo) e cacos de vidro nas bordas.
  brokenWindow: (pc, x, y, _w, _flip, mark) => {
    const gw = ACT3_WINDOW.w * TILE;
    const gy = y + TILE;
    const gh = ACT3_WINDOW.h * TILE;
    const D = PAL.decor;
    pc.rect(x, gy - 4, gw + 4, 4, D.frame);
    pc.rect(x, gy - 4, gw + 4, 1, D.frameLight);
    pc.rect(x, gy + gh, gw + 5, 4, D.sill);
    pc.rect(x, gy + gh + 3, gw + 5, 1, shadeColor(D.sill, 0.7));
    pc.rect(x + gw, gy - 4, 4, gh + 4, D.frame);
    pc.rect(x + gw, gy - 4, 1, gh + 4, D.frameLight);
    // Cacos presos na moldura (vidro, deixa de ser "lado de fora").
    const shards: [number, number, number, number][] = [
      [x + gw - 1, gy, -7, 5],
      [x + gw - 1, gy + 10, -4, 3],
      [x + gw - 1, gy + gh - 6, -9, 6],
      [x + 6, gy, 4, 6],
      [x + 18, gy, 5, 9],
      [x + 10, gy + gh - 1, 4, -5],
    ];
    for (const [sx, sy, dx, dy] of shards) {
      const steps = Math.max(Math.abs(dx), Math.abs(dy));
      for (let k = 0; k <= steps; k++) {
        const t = k / steps;
        const span = Math.round((1 - t) * 2);
        for (let s = -span; s <= span; s++) {
          const px = Math.round(sx + dx * t + (dy !== 0 && Math.abs(dx) < Math.abs(dy) ? s : 0));
          const py = Math.round(sy + dy * t + (Math.abs(dx) >= Math.abs(dy) ? s : 0));
          pc.set(px, py, A.glass, 0.75);
          mark(px, py, false);
        }
      }
    }
  },

  // Galões de água filtrada em cima da bancada.
  waterJugs: (pc, x, y, w) => {
    const bottom = y + TILE;
    for (let i = 0; i < w * 2; i++) {
      const jx = x + 2 + i * 8;
      pc.rect(jx, bottom - 11, 6, 11, A.jug, 0.85);
      pc.rect(jx + 1, bottom - 6, 4, 5, A.jugWater, 0.9);
      pc.rect(jx + 1, bottom - 10, 1, 4, 0xffffff, 0.5);
      pc.rect(jx + 2, bottom - 13, 2, 2, A.jugCap);
    }
  },

  // Cano quebrado saindo do chão (de onde a gosma jorra).
  pipe: (pc, x, y) => {
    const bottom = y + TILE;
    pc.rect(x + 4, bottom - 6, 8, 6, A.pipe);
    pc.rect(x + 4, bottom - 6, 1, 6, A.pipeDark);
    pc.rect(x + 11, bottom - 6, 1, 6, A.pipeDark);
    pc.rect(x + 3, bottom - 7, 10, 2, A.pipeRust);
    pc.rect(x + 6, bottom - 7, 4, 1, 0x0a1a0c);
    pc.set(x + 5, bottom - 3, A.pipeRust);
    pc.set(x + 9, bottom - 2, A.pipeRust);
  },

  // Rachadura no chão por onde a gosma brota (no topo do piso, embaixo do tile).
  seep: (pc, x, y, w) => {
    const top = y + TILE;
    const len = w * TILE;
    for (let xx = 0; xx < len; xx++) {
      pc.set(x + xx, top + Math.round(1 + Math.sin(xx * 0.6) + hash(xx, 0, 79)), 0x0a1a0c);
      if (hash(xx, 1, 79) < 0.4) pc.set(x + xx, top, PAL.intro.gooDark, 0.7);
    }
  },
};

/** Para a galeria: o cenário já com a luz da casa sem energia. */
export function litNeighbor(): PixelCanvas {
  const art = getNeighborArt();
  const out = art.canvas;
  const lit = new PixelCanvas(out.width, out.height);
  for (let i = 0; i < out.data.length; i += 4) {
    for (let k = 0; k < 3; k++) lit.data[i + k] = (out.data[i + k] * art.light.data[i + k]) / 255;
    lit.data[i + 3] = 255;
  }
  return lit;
}

/** Cor (0xRRGGBB) de um pixel do canvas. */
export function pixelAt(pc: PixelCanvas, x: number, y: number): RGB {
  const i = (y * pc.width + x) * 4;
  return (pc.data[i] << 16) | (pc.data[i + 1] << 8) | pc.data[i + 2];
}
