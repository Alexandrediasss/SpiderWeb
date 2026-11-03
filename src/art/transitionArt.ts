// Quadros das transições de ato, em baixa resolução: a gosma verde (ato 1) e a teia com vento (ato 2).
// Cada função desenha o quadro do instante `t` (0..1); em t = 1 a tela inteira está preta.
// Spec: docs/features/transitions.md
import { makeRng } from '../systems/storm';
import { ditherLevel } from './lighting';
import { type PixelCanvas, type RGB, hash } from './PixelCanvas';
import { PAL } from './palette';
import { mixColor } from './tilePainters';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeIn = (v: number) => v * v;
const easeOut = (v: number) => 1 - (1 - v) * (1 - v);

function clear(pc: PixelCanvas): void {
  pc.data.fill(0);
}

// ---------------- gosma verde (ato 1) ----------------

interface Splat {
  x: number;
  y: number;
  r: number;
  at: number;
  phase: number;
}

interface Drip {
  x0: number;
  w: number;
  start: number;
  dur: number;
}

function gooPlan(w: number, h: number, seed: number): { splats: Splat[]; drips: Drip[] } {
  const rng = makeRng(seed);
  const splats: Splat[] = Array.from({ length: 6 }, (_, i) => ({
    x: w * (0.12 + rng() * 0.76),
    y: h * (0.12 + rng() * 0.6),
    r: h * (0.1 + rng() * 0.14),
    at: i * 0.03 + rng() * 0.03,
    phase: rng() * Math.PI * 2,
  }));
  const drips: Drip[] = [];
  for (let x = 0; x < w; ) {
    const dw = 6 + Math.floor(rng() * 10);
    drips.push({ x0: x, w: dw, start: 0.12 + rng() * 0.18, dur: 0.3 + rng() * 0.22 });
    x += dw;
  }
  return { splats, drips };
}

/** Gosma: respingos na "lente", fios escorrendo do alto até cobrir tudo e o verde apagando para o preto. */
export function drawGoo(pc: PixelCanvas, t: number, seed: number): void {
  clear(pc);
  const { width: w, height: h } = pc;
  const G = PAL.intro;
  const { splats, drips } = gooPlan(w, h, seed);
  const cover = new Uint8Array(w * h);
  const fill = (x: number, y0: number, y1: number) => {
    for (let y = Math.max(0, Math.floor(y0)); y < Math.min(h, Math.ceil(y1)); y++) cover[y * w + x] = 1;
  };

  // Respingos (e o que escorre deles).
  for (const s of splats) {
    const grow = easeOut(clamp01((t - s.at) / 0.12));
    if (grow <= 0) continue;
    const r = s.r * grow;
    const run = easeIn(clamp01((t - s.at - 0.15) / 0.5)) * h;
    for (let y = Math.floor(s.y - r * 1.4); y < Math.ceil(s.y + r * 1.4 + run); y++) {
      for (let x = Math.floor(s.x - r * 1.4); x < Math.ceil(s.x + r * 1.4); x++) {
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const dx = x - s.x;
        const dy = y - s.y;
        const a = Math.atan2(dy, dx);
        const edge = r * (1 + 0.22 * Math.sin(3 * a + s.phase) + 0.14 * Math.sin(5 * a - s.phase));
        const inBlob = dx * dx + dy * dy <= edge * edge;
        // O escorrido: uma faixa embaixo do respingo, com a ponta redonda.
        const half = r * 0.45;
        const inRun = run > 0 && Math.abs(dx) <= half && dy >= 0 && dy <= run - half + Math.sqrt(Math.max(0, half * half - dx * dx));
        if (inBlob || inRun) cover[y * w + x] = 1;
      }
    }
    // Gotinhas em volta.
    for (let k = 0; k < 7; k++) {
      const a = s.phase + k * 0.9;
      const d = r * (1.35 + hash(k, 0, seed) * 0.6);
      const gx = Math.round(s.x + Math.cos(a) * d);
      const gy = Math.round(s.y + Math.sin(a) * d);
      const gr = grow > 0.6 ? 1 : 0;
      for (let y = gy - gr; y <= gy + gr; y++) for (let x = gx - gr; x <= gx + gr; x++) if (x >= 0 && y >= 0 && x < w && y < h) cover[y * w + x] = 1;
    }
  }

  // Fios escorrendo do alto, cada um com a ponta redonda.
  for (const d of drips) {
    const len = easeIn(clamp01((t - d.start) / d.dur)) * h * 1.2;
    if (len <= 0) continue;
    const cx = d.x0 + d.w / 2;
    for (let x = d.x0; x < Math.min(w, d.x0 + d.w); x++) {
      const k = (x + 0.5 - cx) / (d.w / 2);
      fill(x, 0, len - (d.w / 2) * (1 - Math.sqrt(Math.max(0, 1 - k * k))));
    }
  }
  // E uma "lâmina" que desce atrás, para garantir que tudo fica coberto.
  const sheet = easeIn(clamp01((t - 0.3) / 0.4)) * h;
  for (let x = 0; x < w; x++) fill(x, 0, sheet + Math.sin(x * 0.4 + seed) * 2);

  const dark = clamp01((t - 0.7) / 0.3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!cover[y * w + x]) continue;
      const edge = !cover[y * w + x - 1] || !cover[(y + 1) * w + x] || x === 0 || y === h - 1;
      // Brilho de 1 px logo depois da borda da esquerda (a gosma é grossa e molhada).
      const shine = x > 1 && cover[y * w + x - 1] && !cover[y * w + x - 2];
      // Escorridos verticais: faixas finas um pouco mais escuras, que descem tortas.
      const streak = (x + Math.floor(Math.sin(y * 0.15 + x) * 1.5) + seed) % 11 === 0;
      let c: RGB = edge ? G.gooDark : shine ? G.gooLight : streak ? mixColor(G.goo, G.gooDark, 0.4) : G.goo;
      if (dark > 0) c = mixColor(c, 0x000000, ditherLevel(dark, x, y, 4));
      pc.set(x, y, c);
    }
  }
  // Bolhas brilhando enquanto o verde apaga.
  if (dark > 0 && dark < 1) {
    for (let k = 0; k < 9; k++) {
      const bx = Math.floor(hash(k, 1, seed) * w);
      const by = Math.floor(hash(k, 2, seed) * h);
      const fade = 1 - dark;
      pc.set(bx, by, G.gooGlow, fade);
      pc.set(bx + 1, by, G.gooLight, fade * 0.7);
    }
  }
  if (t >= 1) pc.rect(0, 0, w, h, 0x000000);
}

// ---------------- teia e vento (ato 2) ----------------

/** Teia e vento: riscos de vento, a teia tecida no meio com o fundo escurecendo, e a rajada que arranca a teia. */
export function drawWeb(pc: PixelCanvas, t: number, seed: number): void {
  clear(pc);
  const { width: w, height: h } = pc;

  // Fundo escurecendo.
  const dark = clamp01((t - 0.15) / 0.45);
  if (dark > 0) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const a = ditherLevel(dark, x, y, 4);
        if (a > 0) pc.set(x, y, 0x000000, a);
      }
    }
  }

  // A teia: raios das bordas até o centro, depois a espiral de fora para dentro.
  const gust = easeIn(clamp01((t - 0.7) / 0.3));
  const cx = w * 0.5;
  const cy = h * 0.48;
  const spokes = 14;
  const ends = Array.from({ length: spokes }, (_, k) => {
    const a = (k / spokes) * Math.PI * 2 + (hash(k, 3, seed) - 0.5) * 0.25;
    return borderPoint(cx, cy, a, w, h);
  });
  const blow = (x: number, y: number, k: number): [number, number] => {
    if (gust <= 0) return [x, y];
    const push = gust * w * (0.6 + hash(Math.round(x), Math.round(y), seed + k) * 0.8);
    return [x + push, y + Math.sin(x * 0.2 + k) * gust * 6];
  };
  const web = PAL.letter.glint;
  const alpha = 1 - gust;
  if (alpha > 0) {
    ends.forEach(([ex, ey], k) => {
      const p = easeOut(clamp01((t - 0.15 - k * 0.012) / 0.14));
      if (p <= 0) return;
      line(pc, blow(ex, ey, k), blow(ex + (cx - ex) * p, ey + (cy - ey) * p, k), web, alpha);
    });
    const rings = 11;
    const total = rings * spokes;
    const drawn = Math.floor(total * clamp01((t - 0.33) / 0.32));
    const outer = Math.min(w, h) * 0.62;
    const pointAt = (i: number): [number, number] => {
      const k = i % spokes;
      const [ex, ey] = ends[k];
      const maxR = Math.hypot(ex - cx, ey - cy);
      const r = Math.min(maxR, outer) * (1 - i / total) ** 1.15;
      const d = Math.hypot(ex - cx, ey - cy) || 1;
      return [cx + ((ex - cx) / d) * r, cy + ((ey - cy) / d) * r];
    };
    for (let i = 1; i < drawn; i++) {
      const [ax, ay] = pointAt(i - 1);
      const [bx, by] = pointAt(i);
      line(pc, blow(ax, ay, i), blow(bx, by, i + 1), web, alpha * 0.85);
    }
  }

  // Riscos de vento: no começo e de novo na rajada.
  const wind = Math.max(clamp01(1 - t / 0.4) * clamp01(t / 0.05), gust);
  const streaks = Math.floor(28 * wind);
  for (let i = 0; i < streaks; i++) {
    const len = 6 + Math.floor(hash(i, 5, seed) * 22);
    const y = Math.floor(hash(i, 6, seed) * h);
    const x = Math.floor((hash(i, 7, seed) * (w + len) + t * w * 3.2) % (w + len)) - len;
    for (let k = 0; k < len; k++) pc.set(x + k, y, 0xffffff, 0.8 * (k / len));
  }

  if (t >= 1) pc.rect(0, 0, w, h, 0x000000);
}

/** Onde um raio que sai de (cx, cy) no ângulo `a` encontra a borda da tela. */
function borderPoint(cx: number, cy: number, a: number, w: number, h: number): [number, number] {
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const tx = dx > 0 ? (w - 1 - cx) / dx : dx < 0 ? -cx / dx : Infinity;
  const ty = dy > 0 ? (h - 1 - cy) / dy : dy < 0 ? -cy / dy : Infinity;
  const k = Math.min(tx, ty);
  return [cx + dx * k, cy + dy * k];
}

function line(pc: PixelCanvas, a: [number, number], b: [number, number], c: RGB, alpha: number): void {
  pc.line(a[0], a[1], b[0], b[1], c, alpha);
}

// ---------------- a luz que apaga (ato 3) ----------------

/**
 * A luz que apaga: a tela pisca como uma lâmpada morrendo (clarões quentes e apagões cada vez mais longos)
 * até ficar preta; no escuro, gotas de gosma verde caem do alto, estouram embaixo e o brilho verde some.
 */
export function drawPowerOut(pc: PixelCanvas, t: number, seed: number): void {
  clear(pc);
  const { width: w, height: h } = pc;
  const G = PAL.intro;

  // 1. A lâmpada morrendo: o escuro sobe aos trancos, com clarões quentes no meio.
  const dark = easeIn(clamp01(t / 0.45));
  const tick = Math.floor(t * 26);
  const r = hash(tick, 0, seed);
  const off = t > 0.04 && r < 0.3 + dark * 0.4;
  const flash = t > 0.04 && t < 0.4 && !off && r > 0.82;
  const black = t >= 0.45 ? 1 : off ? Math.min(1, dark + 0.45) : dark;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (flash) pc.set(x, y, PAL.light.lamp, 0.22 * (1 - dark));
      const a = black >= 1 ? 1 : ditherLevel(black, x, y, 4);
      if (a > 0) pc.set(x, y, 0x000000, a);
    }
  }
  // O filamento da lâmpada, laranja, apagando no meio da tela.
  if (t < 0.6) {
    const glow = clamp01(1 - t / 0.6) * (off ? 0.35 : 1);
    const bx = Math.round(w / 2);
    const by = Math.round(h * 0.38);
    for (let y = -7; y <= 7; y++) {
      for (let x = -6; x <= 6; x++) {
        const d = Math.hypot(x / 6, (y + 1) / 7);
        if (d > 1 || d < 0.82) continue;
        pc.set(bx + x, by + y, 0x5a5448, Math.max(0.3, black));
      }
    }
    pc.rect(bx - 2, by + 7, 5, 3, 0x7a7262, Math.max(0.3, black));
    for (let k = -3; k <= 3; k++) pc.set(bx + k, by - 1 + (k % 2 === 0 ? 0 : -1), 0xffa040, glow);
    if (glow > 0.2) for (let k = -2; k <= 2; k++) pc.set(bx + k, by - 3, 0xffe2a0, glow * 0.5);
  }

  // 2. No escuro, as gotas de gosma caindo do alto e estourando embaixo.
  if (t >= 0.45) {
    const fade = 1 - clamp01((t - 0.86) / 0.14);
    const drops = 6;
    for (let k = 0; k < drops; k++) {
      const start = 0.47 + k * 0.055 + hash(k, 1, seed) * 0.03;
      const p = clamp01((t - start) / 0.16);
      if (p <= 0) continue;
      const x = Math.round(w * (0.12 + hash(k, 2, seed) * 0.76));
      const y = Math.round(easeIn(p) * (h - 3));
      if (p < 1) {
        pc.rect(x, y - 3, 2, 3, G.goo, fade);
        pc.set(x, y - 3, G.gooLight, fade);
        continue;
      }
      // Estourou: respingos e o brilho em volta, embaixo.
      const since = clamp01((t - start - 0.16) / 0.12);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI + Math.PI;
        const d = 2 + since * 6;
        pc.set(Math.round(x + Math.cos(a) * d), Math.round(h - 2 + Math.sin(a) * d * 0.6), G.gooLight, fade * (1 - since));
      }
      for (let yy = h - 14; yy < h; yy++) {
        for (let xx = x - 16; xx <= x + 16; xx++) {
          const v = 1 - Math.hypot((xx - x) / 16, (yy - h) / 12);
          if (v > 0 && xx >= 0 && xx < w) pc.set(xx, yy, G.gooGlow, ditherLevel(v, xx, yy, 4) * 0.4 * fade);
        }
      }
      pc.rect(x - 3, h - 1, 7, 1, G.goo, fade);
    }
  }
  if (t >= 1) pc.rect(0, 0, w, h, 0x000000);
}
