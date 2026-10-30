// Peças de interface em pixel art: o cadeado (seleção de atos e telas trancadas do menu), o respingo da
// teia que puxa as telas e as medalhas das conquistas.
// Spec: docs/features/title-screen.md, docs/features/transitions.md, docs/features/achievements.md
import type { AchievementIcon } from '../level/achievements';
import { PixelCanvas } from './PixelCanvas';
import { PAL } from './palette';

const A = PAL.acts;

/** Tamanho do ícone de cadeado sozinho (px). */
export const LOCK_ICON = { w: 26, h: 32 } as const;

/** Cadeado de metal (centro em cx, alça em cima de `top`). */
export function drawLock(pc: PixelCanvas, cx: number, top: number): void {
  const x0 = Math.round(cx - 11);
  // Alça: meio anel grosso.
  for (let y = top - 12; y <= top; y++) {
    for (let x = x0; x < x0 + 22; x++) {
      const d = Math.hypot(x + 0.5 - cx, y - top);
      if (d >= 6 && d <= 9.5) pc.set(x, y, d < 7 ? A.lockDark : d > 8.6 ? A.lockDark : A.lock);
    }
  }
  pc.rect(x0 - 1, top - 1, 24, 19, PAL.outline);
  pc.rect(x0, top, 22, 17, A.lock);
  pc.rect(x0, top, 22, 2, A.lockLight);
  pc.rect(x0, top + 14, 22, 3, A.lockDark);
  // Buraco da fechadura.
  pc.disc(Math.round(cx), top + 6, 2, PAL.outline);
  pc.rect(Math.round(cx) - 1, top + 7, 2, 5, PAL.outline);
}

/** O cadeado sozinho, num canvas do tamanho certo (para usar no HTML). */
export function buildLockIcon(): PixelCanvas {
  const pc = new PixelCanvas(LOCK_ICON.w, LOCK_ICON.h);
  drawLock(pc, LOCK_ICON.w / 2, 13);
  return pc;
}

/** Tamanho do respingo de teia onde o fio engata no botão (transição do menu). */
export const WEB_SPLAT = { w: 15, h: 15 } as const;

/**
 * Respingo de teia: fios saindo do centro em 8 direções e um anel torto ligando as pontas,
 * como a teia grudando no botão. Spec: docs/features/transitions.md
 */
export function buildWebSplat(): PixelCanvas {
  const { w, h } = WEB_SPLAT;
  const pc = new PixelCanvas(w, h);
  const c = PAL.decor.web;
  const cx = 7;
  const cy = 7;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const r = i % 2 ? 5 : 7;
    pc.line(cx, cy, cx + Math.cos(a) * r, cy + Math.sin(a) * r, c, i % 2 ? 0.7 : 0.95);
  }
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * Math.PI * 2 + 0.2;
    const a1 = ((i + 1) / 8) * Math.PI * 2 + 0.2;
    pc.line(cx + Math.cos(a0) * 3.5, cy + Math.sin(a0) * 3.5, cx + Math.cos(a1) * 3.5, cy + Math.sin(a1) * 3.5, c, 0.6);
  }
  pc.rect(cx - 1, cy - 1, 3, 3, c);
  return pc;
}

/** Tamanho da medalha de conquista (px; na tela fica ampliada). */
export const ACHIEVEMENT_ICON = { w: 24, h: 24 } as const;

/**
 * Medalha de conquista: aro (dourado se conseguida, cinza se não), fundo escuro e o desenho no meio.
 * Ainda não conseguida: só um cadeado. Spec: docs/features/achievements.md
 */
export function buildAchievementIcon(icon: AchievementIcon, unlocked: boolean): PixelCanvas {
  const M = PAL.medal;
  const { w, h } = ACHIEVEMENT_ICON;
  const pc = new PixelCanvas(w, h);
  // Aro com cantos cortados (octógono) e o fundo.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const corner = Math.min(x, w - 1 - x) + Math.min(y, h - 1 - y);
      if (corner < 4) continue;
      const edge = Math.min(x, y, w - 1 - x, h - 1 - y);
      const rim = edge < 2 || corner < 6;
      if (rim) {
        const light = x + y < w;
        pc.set(x, y, unlocked ? (light ? M.rimLight : M.rimDark) : light ? M.lockedRim : M.lockedRimDark);
        if (unlocked && edge === 1 && corner >= 6) pc.set(x, y, M.rim);
      } else {
        pc.set(x, y, unlocked ? M.inner : M.lockedInner);
      }
    }
  }
  if (!unlocked) {
    drawSmallLock(pc, 12, 7);
    return pc;
  }
  const glyph = GLYPHS[icon];
  glyph(pc);
  return pc;
}

/** Cadeado pequeno: alça em cima de `top`, corpo embaixo, centrado em `cx`. */
function drawSmallLock(pc: PixelCanvas, cx: number, top: number): void {
  const M = PAL.medal;
  for (let y = top; y < top + 5; y++) {
    for (let x = cx - 4; x < cx + 4; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - (top + 5));
      if (d >= 2.4 && d <= 4) pc.set(x, y, M.lock);
    }
  }
  pc.rect(cx - 5, top + 5, 10, 8, M.lock);
  pc.rect(cx - 1, top + 7, 2, 3, M.lockedInner);
}

const GLYPHS: Record<AchievementIcon, (pc: PixelCanvas) => void> = {
  // Carta: envelope com a aba em V.
  letter: (pc) => {
    const M = PAL.medal;
    pc.rect(5, 7, 14, 10, M.paperDark);
    pc.rect(6, 8, 12, 8, M.paper);
    pc.line(6, 8, 11, 12, M.paperDark);
    pc.line(17, 8, 12, 12, M.paperDark);
    pc.rect(11, 12, 2, 1, M.paperDark);
  },
  // Coração (a carta de amor).
  heart: (pc) => {
    const U = PAL.ui;
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 14; x++) {
        const u = (x - 6.5) / 6;
        const v = (5.5 - y) / 6;
        if ((u * u + v * v - 1) ** 3 - u * u * v ** 3 <= 0) pc.set(5 + x, 6 + y, y < 4 && x > 2 && x < 6 ? U.heartLight : U.heart);
      }
    }
  },
  // Telhado com o buraco por onde a aranha saiu.
  roof: (pc) => {
    const M = PAL.medal;
    for (let y = 6; y <= 16; y++) {
      const half = y - 5;
      for (let x = 12 - half; x <= 11 + half; x++) pc.set(x, y, (x + y) % 3 === 0 ? M.roofLight : M.roof);
    }
    pc.rect(14, 5, 3, 5, M.roofLight);
    pc.rect(9, 11, 5, 4, M.inner);
    pc.set(11, 12, M.web);
  },
  // Rato branco de perfil, com o olho vermelho (todos os ratos derrotados).
  rat: (pc) => {
    const R = PAL.rat;
    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 24; x++) {
        const head = ((x - 11) / 6.5) ** 2 + ((y - 13) / 4.5) ** 2 <= 1;
        const snout = x >= 15 && x <= 20 && Math.abs(y - 14) <= (20 - x) * 0.55;
        if (head || snout) pc.set(x, y, y > 15 ? R.furShade : R.fur);
      }
    }
    pc.rect(8, 6, 4, 4, R.pink);
    pc.set(8, 6, R.pinkDark);
    pc.rect(14, 11, 2, 2, R.eye);
    pc.set(20, 14, R.pinkDark);
    pc.line(17, 16, 21, 17, R.furDark);
  },
  // Tênis sujo de zumbi (a pisada).
  foot: (pc) => {
    const Z = PAL.medal;
    for (let y = 7; y <= 17; y++) {
      for (let x = 4; x <= 20; x++) {
        const ankle = x <= 10 && y >= 7;
        const toe = x > 10 && y >= 11 + Math.max(0, (x - 17) * 0.5);
        if (!ankle && !toe) continue;
        pc.set(x, y, y >= 15 ? Z.paper : (x + y) % 5 === 0 ? Z.lockedRim : Z.roof);
      }
    }
    pc.rect(4, 17, 17, 1, Z.paperDark);
    pc.line(11, 12, 15, 12, Z.web);
    pc.line(11, 14, 14, 13, Z.web);
  },
  // Teia: fios saindo do canto e dois anéis.
  web: (pc) => {
    const M = PAL.medal;
    const cx = 6;
    const cy = 6;
    for (let i = 0; i <= 4; i++) {
      const a = (i / 4) * (Math.PI / 2);
      pc.line(cx, cy, cx + Math.cos(a) * 13, cy + Math.sin(a) * 13, M.web);
    }
    for (const r of [5, 9, 13]) {
      for (let i = 0; i < 4; i++) {
        const a0 = (i / 4) * (Math.PI / 2);
        const a1 = ((i + 1) / 4) * (Math.PI / 2);
        pc.line(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r, cx + Math.cos(a1) * r, cy + Math.sin(a1) * r, M.web, 0.75);
      }
    }
  },
};
