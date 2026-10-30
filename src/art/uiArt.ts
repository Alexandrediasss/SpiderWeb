// Peças de interface em pixel art: o cadeado (seleção de atos e telas trancadas do menu).
// Spec: docs/features/title-screen.md
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
