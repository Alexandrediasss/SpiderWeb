// Miniaturas do SCENES: cada cena ganha um quadro feito com a própria arte do jogo (16:9).
// Spec: docs/features/scenes.md
import type { SceneId } from '../level/scenes';
import { ROOFTOP_MAP } from '../level/rooftops';
import { buildActArt } from './actArt';
import { STAGE, buildGooBlob, buildGooPuddle, buildIntroDarkness, buildIntroStage } from './introArt';
import { getLevelArt } from './levelArt';
import { PixelCanvas } from './PixelCanvas';
import { bakeRooftops } from './rooftopArt';
import { buildStreetSky } from './streetArt';

const W = 320;
const H = 180;

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

/** Recorte da rua do ato 2 (tiles) por cima do céu de tempestade. */
function rooftopCrop(tx: number, ty: number): PixelCanvas {
  const pc = buildStreetSky(W, H);
  pc.blit(bakeRooftops(ROOFTOP_MAP, { tx, ty, w: W / 16, h: Math.ceil(H / 16) }).canvas, 0, 0);
  return pc;
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
    case 'act2-recap':
      // O ponto de ônibus, o poste de luz 2 e o outdoor.
      return rooftopCrop(64, 9);
    case 'act2-ending':
      // A casa vizinha e a chaminé.
      return rooftopCrop(178, 3);
  }
}
