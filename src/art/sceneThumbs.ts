// Miniaturas do SCENES: cada cena ganha um quadro feito com a própria arte do jogo (16:9).
// Spec: docs/features/scenes.md
import { SPIDER, WEB } from '../config';
import type { SceneId } from '../level/scenes';
import { ROOFTOP_MAP } from '../level/rooftops';
import { buildActArt } from './actArt';
import { STAGE, buildGooBlob, buildGooPuddle, buildIntroDarkness, buildIntroStage } from './introArt';
import { getLevelArt } from './levelArt';
import { PixelCanvas } from './PixelCanvas';
import { bakeRooftops } from './rooftopArt';
import { SPIDER_FRAMES, buildSpiderSheet } from './spiderArt';
import { HOUSES_BASE, buildHouses, buildStreetSky } from './streetArt';

const W = 320;
const H = 180;
/** As casas do fundo nas miniaturas do ato 2: mais escuras e com a base um pouco acima da borda de baixo. */
const HOUSES_SHADE = 0.55;
const HOUSES_LIFT = 6;

/** Recorte do cenário da casa já com a luz da noite (cor × mapa de luz). */
function houseCrop(x0: number, y0: number): PixelCanvas {
  const art = getLevelArt();
  const pc = new PixelCanvas(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const s = ((y0 + y) * art.canvas.width + x0 + x) * 4;
      const d = (y * W + x) * 4;
      for (let k = 0; k < 3; k++) pc.data[d + k] = (art.canvas.data[s + k] * art.light.data[s + k]) / 255;
      pc.data[d + 3] = 255;
    }
  }
  return pc;
}

/** Recorte da rua do ato 2 (tiles) por cima do céu de tempestade e das casas do outro lado (escurecidas). */
function rooftopCrop(tx: number, ty: number): PixelCanvas {
  const pc = buildStreetSky(W, H);
  const houses = buildHouses();
  houses.shadeRect(0, 0, houses.width, houses.height, HOUSES_SHADE);
  for (let x = 0; x < W; x += houses.width) pc.blit(houses, x, H - HOUSES_BASE - HOUSES_LIFT);
  pc.blit(bakeRooftops(ROOFTOP_MAP, { tx, ty, w: W / 16, h: Math.ceil(H / 16) }).canvas, 0, 0);
  return pc;
}

/** A aranha no ar (quadro "air"), presa por um fio de teia em `anchor` (px da miniatura). */
function drawSwing(pc: PixelCanvas, anchor: { x: number; y: number }, at: { x: number; y: number }): void {
  pc.line(anchor.x, anchor.y, at.x, at.y, WEB.color);
  const sheet = buildSpiderSheet();
  const f = SPIDER_FRAMES.findIndex((s) => s.air);
  const frame = new PixelCanvas(SPIDER.frameW, SPIDER.frameH);
  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      const s = (y * sheet.width + f * SPIDER.frameW + x) * 4;
      frame.data.set(sheet.data.subarray(s, s + 4), (y * frame.width + x) * 4);
    }
  }
  pc.blit(frame, Math.round(at.x - SPIDER.frameW / 2), Math.round(at.y - SPIDER.frameH / 2));
}

export function buildSceneThumb(id: SceneId): PixelCanvas {
  switch (id) {
    case 'act1-intro': {
      const stage = buildIntroStage();
      stage.blit(buildGooPuddle(), STAGE.spiderX - 15, STAGE.floorY - 2);
      stage.blit(buildGooBlob(), STAGE.spiderX - 10, STAGE.floorY - 8);
      stage.blit(buildIntroDarkness(true), 0, 0);
      return stage;
    }
    case 'act1-recap':
      // A sala: a estante, o sofá e a luminária, com o buraco de rato.
      return houseCrop(32, 29 * 16 - 4);
    case 'act1-street':
      return buildActArt('act1');
    case 'act2-intro':
      return buildActArt('act2');
    case 'act2-recap': {
      // A aranha balançando no braço do poste de luz 2, por cima das casas.
      const pc = rooftopCrop(64, 12);
      drawSwing(pc, { x: 206, y: 64 }, { x: 150, y: 126 });
      return pc;
    }
    case 'act2-ending':
      // O telhado da casa vizinha e a chaminé.
      return rooftopCrop(176, 4);
  }
}
