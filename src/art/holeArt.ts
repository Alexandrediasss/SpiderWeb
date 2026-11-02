// As tábuas que o pai pregou por dentro do buraco no telhado do sótão (para a chuva não entrar), até a chuva
// arrebentá-las. Quatro tábuas empilhadas, uma por quadro (elas caem separadas). Spec: docs/features/street-cutscene.md
import { TILE } from '../config';
import { ROOF_HOLE } from '../level/houseMap';
import { PixelCanvas, hash } from './PixelCanvas';
import { PAL } from './palette';
import { shadeColor } from './tilePainters';

/** Cada tábua: passa 2 px do buraco de cada lado (pregada no telhado) e tem 1/4 da altura dele. */
export const PLANK = { w: ROOF_HOLE.w * TILE + 4, h: (ROOF_HOLE.h * TILE) / 4, count: 4 } as const;

/** Folha com as quatro tábuas, uma embaixo da outra (quadros `plank0`..`plank3`). Cores "de dia". */
export function buildHolePlanks(): PixelCanvas {
  const W = PAL.wood;
  const pc = new PixelCanvas(PLANK.w, PLANK.h * PLANK.count);
  for (let i = 0; i < PLANK.count; i++) {
    const y0 = i * PLANK.h;
    for (let y = 0; y < PLANK.h; y++) {
      for (let x = 0; x < PLANK.w; x++) {
        let c = W.base[(i + Math.floor(x / 12)) % W.base.length];
        if (y === 0) c = W.light;
        else if (y === PLANK.h - 1) c = W.dark;
        else if (hash(Math.floor(x / 3), y, i + 5) < 0.18) c = W.grain;
        // Madeira encharcada: escorridos escuros de água.
        if (y > 0 && hash(x, 0, i + 9) < 0.08) c = shadeColor(c, 0.7);
        pc.set(x, y0 + y, c);
      }
    }
    // Pregos nas pontas (presos no telhado).
    for (const nx of [1, PLANK.w - 2]) pc.set(nx, y0 + 3, PAL.decor.silverDark);
  }
  return pc;
}
