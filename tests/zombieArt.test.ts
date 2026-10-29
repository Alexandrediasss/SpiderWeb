import { describe, expect, it } from 'vitest';
import { ROOF_SHOT, buildRoofShot } from '../src/art/streetArt';
import { ZOMBIE_FRAMES, ZOMBIE_LOOKS, buildZombieSheets } from '../src/art/zombieArt';
import { ZOMBIE_FRAME_U } from '../src/systems/horde';

const U = 2;
const { body, eyes, frameW, frameH } = buildZombieSheets(U);
const alpha = (pc: typeof body, x: number, y: number) => pc.data[(y * pc.width + x) * 4 + 3];

function eachFrame(fn: (ox: number, oy: number, look: number, frame: number) => void): void {
  ZOMBIE_LOOKS.forEach((_, l) => {
    for (let f = 0; f < ZOMBIE_FRAMES; f++) fn(f * frameW, l * frameH, l, f);
  });
}

describe('arte dos zumbis', () => {
  it('a folha tem um quadro por visual e por passo da caminhada', () => {
    expect(frameW).toBe(ZOMBIE_FRAME_U.w * U);
    expect(frameH).toBe(ZOMBIE_FRAME_U.h * U);
    expect(body.width).toBe(frameW * ZOMBIE_FRAMES);
    expect(body.height).toBe(frameH * ZOMBIE_LOOKS.length);
    expect(eyes.width).toBe(body.width);
  });

  it('em todo quadro pelo menos um pé está no chão (última linha)', () => {
    eachFrame((ox, oy) => {
      let feet = 0;
      for (let x = ox; x < ox + frameW; x++) if (alpha(body, x, oy + frameH - 1)) feet++;
      expect(feet).toBeGreaterThan(0);
    });
  });

  it('os olhos ficam dentro do corpo e todo quadro tem olhos', () => {
    eachFrame((ox, oy) => {
      let n = 0;
      for (let y = oy; y < oy + frameH; y++) {
        for (let x = ox; x < ox + frameW; x++) {
          if (!alpha(eyes, x, y)) continue;
          n++;
          expect(alpha(body, x, y)).toBe(255);
        }
      }
      expect(n).toBeGreaterThan(0);
    });
  });

  it('a caminhada muda de um quadro para o outro', () => {
    const frame = (f: number) => {
      const out: number[] = [];
      for (let y = 0; y < frameH; y++) for (let x = 0; x < frameW; x++) out.push(alpha(body, f * frameW + x, y));
      return out.join(',');
    };
    expect(frame(0)).not.toBe(frame(1));
    expect(frame(1)).not.toBe(frame(2));
  });
});

describe('telhado do plano 1', () => {
  it('a boca do buraco não cobre o buraco (a aranha aparece lá dentro)', () => {
    const { front } = buildRoofShot();
    const { hole } = ROOF_SHOT;
    expect(alpha(front, hole.x, hole.y + 1)).toBe(0);
    expect(alpha(front, hole.x, hole.y + hole.ry + 3)).toBe(255);
  });
});
