// Luz da casa à noite, calculada pixel a pixel no boot. Lógica pura (sem Phaser): dá para testar no Node.
// Spec: docs/features/atmosphere.md
//
// - Mapa de luz: multiplica as cores do cenário. Escuro azulado (ambiente) + cones das luminárias.
// - Feixe: o cone visível no ar, somado por cima (como poeira iluminada).
// - Mapa do clarão: a luz do relâmpago que entra pelas janelas, somada só durante o clarão.
// Sólidos fazem sombra (a luz entra `LIGHT.penetration` px neles, para acender o topo dos móveis).
// Os degradês são em faixas com pontilhado Bayer, para combinar com a pixel art.
import { LIGHT } from '../config';
import type { LevelGrid } from '../physics/LevelGrid';
import type { Vec2 } from '../physics/surfaces';
import { PixelCanvas, type RGB } from './PixelCanvas';
import { PAL } from './palette';

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const DEG = Math.PI / 180;

/** Quantiza `v` (0..1) em `bands` degraus, com pontilhado ordenado na passagem entre eles. */
export function ditherLevel(v: number, x: number, y: number, bands: number): number {
  const threshold = (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
  return Math.min(bands, Math.floor(v * bands + threshold)) / bands;
}

/** Fator do cone de uma luminária (0..1) num ponto (dx, dy) relativo à lâmpada; o cone aponta para baixo. */
export function coneFactor(dx: number, dy: number, radius: number): number {
  const d = Math.hypot(dx, dy);
  if (dy <= 0 || d >= radius) return 0;
  const angle = Math.atan2(Math.abs(dx), dy) / DEG;
  const edge = clamp01((LIGHT.coneHalfDeg + LIGHT.coneSoftDeg / 2 - angle) / LIGHT.coneSoftDeg);
  return edge * (1 - d / radius) ** LIGHT.falloffPow;
}

/** Intensidade da luminária (cone + brilho em volta da lâmpada), sem contar sombras. */
export function lampIntensity(dx: number, dy: number): number {
  const d = Math.hypot(dx, dy);
  const glow = d < LIGHT.glowRadius ? LIGHT.glowStrength * (1 - d / LIGHT.glowRadius) ** 2 : 0;
  return Math.min(1, coneFactor(dx, dy, LIGHT.lampRadius) + glow);
}

/** A luz de `src` chega em (x, y)? Pode atravessar até `penetration` px de sólido no fim do caminho. */
export function reaches(grid: LevelGrid, src: Vec2, x: number, y: number, penetration: number): boolean {
  const d = Math.hypot(x - src.x, y - src.y);
  return grid.firstSolidDistance(src.x, src.y, x, y) >= d - penetration;
}

export interface LightMaps {
  /** Multiplica o cenário (RGB, opaco). Lado de fora = branco (não escurece). */
  light: PixelCanvas;
  /** Somado durante o relâmpago (cor fixa, intensidade no alfa). */
  flash: PixelCanvas;
  /** Um feixe por luminária; a lâmpada fica no meio da borda de cima da imagem. */
  beams: PixelCanvas[];
}

export function buildLightMaps(grid: LevelGrid, outside: Uint8Array, lamps: Vec2[], windows: Vec2[]): LightMaps {
  return {
    light: buildLightMap(grid, outside, lamps),
    flash: buildFlashMap(grid, outside, windows),
    beams: lamps.map((l) => buildBeam(grid, l)),
  };
}

export function buildLightMap(grid: LevelGrid, outside: Uint8Array, lamps: Vec2[]): PixelCanvas {
  const W = grid.widthPx;
  const H = grid.heightPx;
  const acc = new Float32Array(W * H);
  for (const lamp of lamps) {
    const x0 = Math.max(0, Math.floor(lamp.x - LIGHT.lampRadius));
    const x1 = Math.min(W - 1, Math.ceil(lamp.x + LIGHT.lampRadius));
    const y0 = Math.max(0, Math.floor(lamp.y - LIGHT.glowRadius));
    const y1 = Math.min(H - 1, Math.ceil(lamp.y + LIGHT.lampRadius));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * W + x;
        if (outside[i]) continue;
        const intensity = lampIntensity(x + 0.5 - lamp.x, y + 0.5 - lamp.y);
        if (intensity < 0.003) continue;
        if (reaches(grid, lamp, x + 0.5, y + 0.5, LIGHT.penetration)) acc[i] += intensity;
      }
    }
  }

  const pc = new PixelCanvas(W, H);
  const amb = rgb01(PAL.light.ambient);
  const lamp = rgb01(PAL.light.lamp);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const o = i * 4;
      pc.data[o + 3] = 255;
      if (outside[i]) {
        pc.data[o] = pc.data[o + 1] = pc.data[o + 2] = 255;
        continue;
      }
      const q = ditherLevel(Math.min(1, acc[i]), x, y, LIGHT.bands);
      pc.data[o] = Math.round(Math.min(1, amb[0] + lamp[0] * q) * 255);
      pc.data[o + 1] = Math.round(Math.min(1, amb[1] + lamp[1] * q) * 255);
      pc.data[o + 2] = Math.round(Math.min(1, amb[2] + lamp[2] * q) * 255);
    }
  }
  return pc;
}

/** Feixe visível no ar abaixo da lâmpada (só em pixels vazios e sem sombra). */
export function buildBeam(grid: LevelGrid, lamp: Vec2): PixelCanvas {
  const R = LIGHT.beamRadius;
  const pc = new PixelCanvas(R * 2 + 1, R);
  for (let yy = 0; yy < R; yy++) {
    for (let xx = 0; xx <= R * 2; xx++) {
      const wx = lamp.x - R + xx + 0.5;
      const wy = lamp.y + yy + 0.5;
      const f = coneFactor(wx - lamp.x, wy - lamp.y, R);
      if (f <= 0 || grid.isSolidPixel(wx, wy) || !reaches(grid, lamp, wx, wy, 0)) continue;
      const a = ditherLevel(f, Math.floor(wx), Math.floor(wy), LIGHT.bands) * LIGHT.beamAlpha;
      if (a > 0) pc.set(xx, yy, PAL.light.lamp, a);
    }
  }
  return pc;
}

/** Luz do relâmpago: lado de fora inteiro + o que entra pelas janelas (com sombra dos sólidos). */
export function buildFlashMap(grid: LevelGrid, outside: Uint8Array, windows: Vec2[]): PixelCanvas {
  const W = grid.widthPx;
  const H = grid.heightPx;
  const R = LIGHT.windowRadius;
  const acc = new Float32Array(W * H);
  for (const win of windows) {
    const x0 = Math.max(0, Math.floor(win.x - R));
    const x1 = Math.min(W - 1, Math.ceil(win.x + R));
    const y0 = Math.max(0, Math.floor(win.y - R));
    const y1 = Math.min(H - 1, Math.ceil(win.y + R));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * W + x;
        if (outside[i]) continue;
        const d = Math.hypot(x + 0.5 - win.x, y + 0.5 - win.y);
        if (d >= R) continue;
        if (reaches(grid, win, x + 0.5, y + 0.5, LIGHT.penetration)) acc[i] += (1 - d / R) ** 1.4;
      }
    }
  }

  const pc = new PixelCanvas(W, H);
  const [r, g, b] = [(PAL.light.flash >> 16) & 255, (PAL.light.flash >> 8) & 255, PAL.light.flash & 255];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const a = outside[i] ? 1 : ditherLevel(Math.min(1, acc[i]), x, y, LIGHT.bands);
      if (a <= 0) continue;
      const o = i * 4;
      pc.data[o] = r;
      pc.data[o + 1] = g;
      pc.data[o + 2] = b;
      pc.data[o + 3] = Math.round(a * 255);
    }
  }
  return pc;
}

/** Cor da luz (0..1 por canal) num ponto do mapa de luz. */
export function sampleLight(light: PixelCanvas, x: number, y: number): [number, number, number] {
  const px = Math.max(0, Math.min(light.width - 1, Math.floor(x)));
  const py = Math.max(0, Math.min(light.height - 1, Math.floor(y)));
  const o = (py * light.width + px) * 4;
  return [light.data[o] / 255, light.data[o + 1] / 255, light.data[o + 2] / 255];
}

/** Cenário já iluminado (para a galeria): multiplica cada pixel pela luz e soma os feixes. */
export function composeLit(level: PixelCanvas, maps: LightMaps, lamps: Vec2[]): PixelCanvas {
  const out = new PixelCanvas(level.width, level.height);
  for (let i = 0; i < level.data.length; i += 4) {
    out.data[i] = (level.data[i] * maps.light.data[i]) / 255;
    out.data[i + 1] = (level.data[i + 1] * maps.light.data[i + 1]) / 255;
    out.data[i + 2] = (level.data[i + 2] * maps.light.data[i + 2]) / 255;
    out.data[i + 3] = 255;
  }
  maps.beams.forEach((beam, k) => {
    const ox = Math.round(lamps[k].x - LIGHT.beamRadius);
    const oy = Math.round(lamps[k].y);
    for (let y = 0; y < beam.height; y++) {
      for (let x = 0; x < beam.width; x++) {
        const s = (y * beam.width + x) * 4;
        const a = beam.data[s + 3] / 255;
        const tx = ox + x;
        const ty = oy + y;
        if (a === 0 || tx < 0 || ty < 0 || tx >= out.width || ty >= out.height) continue;
        const d = (ty * out.width + tx) * 4;
        for (let c = 0; c < 3; c++) out.data[d + c] = Math.min(255, out.data[d + c] + beam.data[s + c] * a);
      }
    }
  });
  return out;
}

function rgb01(c: RGB): [number, number, number] {
  return [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
