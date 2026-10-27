// Arte da cutscene de abertura: o vão escuro dentro da parede, a luz, o líquido mutante verde e o
// buraco de rato por onde a aranha sai. Tudo pixel a pixel. Spec: docs/features/intro.md
import { ditherLevel } from './lighting';
import { PixelCanvas, hash } from './PixelCanvas';
import { inArch, paintDecor } from './decorArt';
import { PAL } from './palette';
import { mixColor, shadeColor } from './tilePainters';

const I = PAL.intro;

/** Palco da cutscene (px). A câmera mostra tudo com zoom. */
export const STAGE = {
  w: 160,
  h: 90,
  /** Topo da viga onde a aranha está deitada. */
  floorY: 74,
  /** Onde a aranha acorda. */
  spiderX: 46,
  /** Furo no cano de onde pinga o líquido verde. */
  drip: { x: 46, y: 15 },
  /** Centro do buraco de rato (embaixo, no chão). */
  holeX: 132,
  holeW: 18,
  holeH: 17,
} as const;

export function buildIntroStage(): PixelCanvas {
  const { w, h, floorY } = STAGE;
  const pc = new PixelCanvas(w, h);

  // Parede de trás: tábuas verticais com frestas e veios.
  for (let y = 0; y < floorY; y++) {
    for (let x = 0; x < w; x++) {
      const plank = Math.floor(x / 22);
      let c = I.plank[plank % I.plank.length];
      if (x % 22 === 0) c = I.plankGap;
      else if (hash(x, Math.floor(y / 3), plank) < 0.12) c = shadeColor(c, 0.85);
      pc.set(x, y, c);
    }
  }
  // Viga de cima.
  pc.rect(0, 0, w, 7, I.beamDark);
  pc.rect(0, 6, w, 1, I.plankGap);

  // Chão: topo da viga.
  for (let y = floorY; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let c = y === floorY ? I.beamTop : mixColor(I.beam, I.beamDark, (y - floorY) / (h - floorY));
      if (y > floorY + 2 && hash(Math.floor(x / 5), y, 3) < 0.15) c = shadeColor(c, 0.8);
      pc.set(x, y, c);
    }
  }

  // Cano de cobre com a junta rachada (de onde pinga o líquido).
  const pipeY = 10;
  for (let x = 0; x < 104; x++) {
    pc.set(x, pipeY, I.pipeLight);
    pc.rect(x, pipeY + 1, 1, 3, I.pipe);
    pc.set(x, pipeY + 4, I.pipeDark);
  }
  pc.rect(STAGE.drip.x - 4, pipeY - 1, 9, 7, I.pipeDark);
  pc.rect(STAGE.drip.x - 3, pipeY, 7, 5, I.pipe);
  pc.rect(STAGE.drip.x - 3, pipeY, 7, 1, I.pipeLight);
  pc.set(STAGE.drip.x, pipeY + 4, I.goo);
  pc.set(STAGE.drip.x, pipeY + 5, I.gooDark);

  paintDecor('cobweb', pc, 0, 7);
  paintDecor('cobweb', pc, w - 32, 7, true);

  // Buraco de rato (visto de dentro): arco com a luz quente do cômodo do outro lado.
  const { holeX, holeW, holeH } = STAGE;
  for (let dy = -1; dy <= holeH + 1; dy++) {
    for (let dx = -holeW / 2 - 1; dx <= holeW / 2 + 1; dx++) {
      const x = holeX + dx;
      const y = floorY - 1 - dy;
      if (inArch(dx, dy, holeW, holeH)) {
        pc.set(x, y, mixColor(I.holeLight, I.holeLightDeep, Math.max(0, dy) / holeH));
      } else if (inArch(dx, dy, holeW + 3, holeH + 2) && hash(x, y, 9) < 0.85) {
        pc.set(x, y, I.holeEdge);
      }
    }
  }
  return pc;
}

/**
 * Escuridão por cima do palco (preto com alfa = 1 - luz). `withHole` inclui a poça de luz do buraco.
 * A luz de cima é um cone saindo da junta do cano, em faixas com pontilhado.
 */
export function buildIntroDarkness(withHole: boolean): PixelCanvas {
  const { w, h, floorY } = STAGE;
  const pc = new PixelCanvas(w, h);
  const src = { x: STAGE.drip.x, y: 4 };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x + 0.5 - src.x;
      const dy = y + 0.5 - src.y;
      const d = Math.hypot(dx, dy);
      const angle = (Math.atan2(Math.abs(dx), dy) * 180) / Math.PI;
      let light = 0;
      if (dy > 0 && d < 120) light = Math.min(1, Math.max(0, (30 - angle) / 12)) * (1 - d / 120) ** 0.5;
      // Poça de luz embaixo do cone, alta o bastante para iluminar a aranha deitada.
      const pool = 1 - Math.hypot((x - src.x) / 34, (y - (floorY - 4)) / 15);
      light = Math.max(light, pool * 1.1);
      if (withHole) {
        const hole = 1 - Math.hypot((x - STAGE.holeX) / 30, (y - (floorY - 8)) / 18);
        // A luz do buraco escorre pelo chão até perto da aranha: o caminho fica visível.
        const spill = 1 - Math.hypot((x - (STAGE.holeX - 30)) / 62, (y - (floorY - 5)) / 13);
        light = Math.max(light, hole * 0.95, spill * 0.6);
      }
      const q = ditherLevel(Math.max(0, light), x, y, 5);
      pc.data[(y * w + x) * 4 + 3] = Math.round((1 - q) * 255);
    }
  }
  return pc;
}

/**
 * Camada de líquido verde sobre a barriga da aranha deitada (20×7), meio transparente e escorrendo
 * pelos lados. As patas ficam para fora, para cima.
 */
export function buildGooBlob(): PixelCanvas {
  const pc = new PixelCanvas(20, 7);
  for (let y = 0; y < 7; y++) {
    for (let x = 0; x < 20; x++) {
      const inside = ((x - 10) / 7.5) ** 2 + ((y - 2.5) / 2.4) ** 2 <= 1;
      const drip = (x === 3 || x === 16 || x === 8) && y >= 2 && y <= 4 + (x % 3);
      if (!inside && !drip) continue;
      const c = y <= 1 ? I.gooLight : y >= 4 ? I.gooDark : I.goo;
      pc.set(x, y, c, 0.72);
    }
  }
  pc.set(7, 1, 0xffffff, 0.85);
  pc.set(8, 1, 0xffffff, 0.5);
  return pc;
}

/** Poça verde no chão (30×4). */
export function buildGooPuddle(): PixelCanvas {
  const pc = new PixelCanvas(30, 4);
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 30; x++) {
      if (((x - 15) / 14.5) ** 2 + ((y - 1.5) / 2) ** 2 > 1) continue;
      pc.set(x, y, y === 0 ? I.gooLight : y >= 2 ? I.gooDark : I.goo, 0.88);
    }
  }
  return pc;
}

/** Brilho verde (para somar por cima: o líquido mutante brilha no escuro). */
export function buildGooGlow(): PixelCanvas {
  const pc = new PixelCanvas(48, 28);
  for (let y = 0; y < 28; y++) {
    for (let x = 0; x < 48; x++) {
      const v = 1 - Math.hypot((x - 24) / 24, (y - 14) / 14);
      const a = ditherLevel(Math.max(0, v), x, y, 4) * 0.35;
      if (a > 0) pc.set(x, y, I.gooGlow, a);
    }
  }
  return pc;
}
