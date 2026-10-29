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
