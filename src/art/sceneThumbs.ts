// Miniaturas do SCENES: cada cena ganha um quadro feito com a própria arte do jogo (16:9).
// Spec: docs/features/scenes.md
import { CHANDELIER, SPIDER, TILE, WEB } from '../config';
import { ACT3_ENDING_START, CHANDELIER_DEF, CHIMNEY_BREACH, SICK_DEF } from '../level/neighborHouse';
import type { SceneId } from '../level/scenes';
import { ROOFTOP_MAP } from '../level/rooftops';
import { buildActArt } from './actArt';
import { STAGE, buildGooBlob, buildGooPuddle, buildIntroDarkness, buildIntroStage } from './introArt';
import { getLevelArt } from './levelArt';
import { litNeighbor } from './neighborArt';
import { PAL } from './palette';
import { PixelCanvas } from './PixelCanvas';
import { bakeRooftops } from './rooftopArt';
import { SICK_FRAME, SICK_POSES, buildChandelier, buildSickSheets } from './sickArt';
import { SPIDER_FRAMES, type SpiderFrame, buildSpiderSheet } from './spiderArt';
import { HOUSES_BASE, buildHouses, buildStreetSky } from './streetArt';

const W = 320;
const H = 180;
/** As casas do fundo nas miniaturas do ato 2: mais escuras e com a base um pouco acima da borda de baixo. */
const HOUSES_SHADE = 0.55;
const HOUSES_LIFT = 6;
/** Ato 3: a casa sem energia clareada um pouco (na miniatura pequena ela some no preto) e a luz dos bonecos. */
const NEIGHBOR_LIFT = 1.7;
const ACT3_SPRITE_LIGHT = 0.6;
/** Chegada e janela: recorte de meia miniatura ampliado 2× (a Mary é pequena). */
const ACT3_ZOOM = 2;

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

/** Recorta o quadro `index` (de `w`×`h`) de uma folha de sprites. */
function frameOf(sheet: PixelCanvas, index: number, w: number, h: number): PixelCanvas {
  const frame = new PixelCanvas(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = (y * sheet.width + index * w + x) * 4;
      frame.data.set(sheet.data.subarray(s, s + 4), (y * w + x) * 4);
    }
  }
  return frame;
}

function spiderFrame(pick: (f: SpiderFrame) => boolean): PixelCanvas {
  return frameOf(buildSpiderSheet(), SPIDER_FRAMES.findIndex(pick), SPIDER.frameW, SPIDER.frameH);
}

/** A aranha no ar (quadro "air"), presa por um fio de teia em `anchor` (px da miniatura). */
function drawSwing(pc: PixelCanvas, anchor: { x: number; y: number }, at: { x: number; y: number }): void {
  pc.line(anchor.x, anchor.y, at.x, at.y, WEB.color);
  pc.blit(spiderFrame((f) => !!f.air), Math.round(at.x - SPIDER.frameW / 2), Math.round(at.y - SPIDER.frameH / 2));
}

/**
 * Recorte da casa vizinha (ato 3) com a luz sem energia, um pouco clareada. `(x0, y0)` em px do mundo; com
 * `zoom` 2 o recorte é de meia miniatura (ampliado depois com `enlarge`), para a Mary aparecer.
 */
function neighborCrop(x0: number, y0: number, zoom = 1): PixelCanvas {
  const lit = (neighborLit ??= litNeighbor());
  const w = W / zoom;
  const h = H / zoom;
  const pc = new PixelCanvas(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = ((y0 + y) * lit.width + x0 + x) * 4;
      const d = (y * w + x) * 4;
      for (let k = 0; k < 3; k++) pc.data[d + k] = Math.min(255, lit.data[s + k] * NEIGHBOR_LIFT);
      pc.data[d + 3] = 255;
    }
  }
  return pc;
}

/** Amplia `zoom` vezes, pixel por pixel. */
function enlarge(src: PixelCanvas, zoom: number): PixelCanvas {
  const pc = new PixelCanvas(src.width * zoom, src.height * zoom);
  for (let y = 0; y < pc.height; y++) {
    for (let x = 0; x < pc.width; x++) {
      const s = (Math.floor(y / zoom) * src.width + Math.floor(x / zoom)) * 4;
      pc.data.set(src.data.subarray(s, s + 4), (y * pc.width + x) * 4);
    }
  }
  return pc;
}
let neighborLit: PixelCanvas | null = null;

/** Escurece um sprite (a casa sem energia), sem mexer na transparência. */
function dim(sprite: PixelCanvas, factor = ACT3_SPRITE_LIGHT): PixelCanvas {
  sprite.shadeRect(0, 0, sprite.width, sprite.height, factor);
  return sprite;
}

/** A Mary parada no chão, com o centro do corpo em (x, y) px da miniatura. */
function drawMary(pc: PixelCanvas, x: number, y: number, flipX: boolean): void {
  const offset = SPIDER.half - SPIDER.frameH / 2;
  const frame = dim(spiderFrame((f) => f.name === 'idle0'), 0.8);
  pc.blit(frame, Math.round(x - SPIDER.frameW / 2), Math.round(y + offset - SPIDER.frameH / 2), flipX);
}

/** Nuvem de fuligem em volta de (x, y). */
function sootCloud(pc: PixelCanvas, x: number, y: number): void {
  const puffs = [
    [-9, -4], [-5, -9], [0, -12], [5, -8], [9, -3], [-12, 1], [12, 0], [-3, -16], [3, -5], [7, -13],
  ];
  for (const [dx, dy] of puffs) pc.rect(x + dx, y + dy, 2, 2, PAL.act3.sootLight, 0.85);
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
    case 'act3-intro': {
      // A Mary no chão do sótão, embaixo da abertura da chaminé, numa nuvem de fuligem.
      const x0 = CHIMNEY_BREACH.x - 110;
      const y0 = 12 * TILE + 12 - H / ACT3_ZOOM;
      const pc = neighborCrop(x0, y0, ACT3_ZOOM);
      const floor = 12 * TILE - y0;
      const x = CHIMNEY_BREACH.x - x0 - 8;
      sootCloud(pc, x, floor - 6);
      drawMary(pc, x, floor - SPIDER.half, true);
      return enlarge(pc, ACT3_ZOOM);
    }
    case 'act3-recap': {
      // A cozinha: o lustre na corda e o doente embaixo, esticando o braço para a Mary no teto.
      const x0 = CHANDELIER_DEF.x - 150;
      const y0 = SICK_DEF.floorY + 6 - H;
      const pc = neighborCrop(x0, y0);
      const hx = CHANDELIER_DEF.x - x0;
      const ropeEnd = CHANDELIER_DEF.y + CHANDELIER.ropeLength - y0;
      pc.line(hx, 0, hx, ropeEnd, PAL.act3.rope);
      const lamp = dim(buildChandelier());
      pc.blit(lamp, hx - Math.floor(lamp.width / 2), ropeEnd);
      const sheets = buildSickSheets();
      const pose = SICK_POSES.indexOf('reach');
      const sick = dim(frameOf(sheets.body, pose, SICK_FRAME.w, SICK_FRAME.h));
      sick.blit(frameOf(sheets.eyes, pose, SICK_FRAME.w, SICK_FRAME.h), 0, 0);
      const sx = hx + 14;
      pc.blit(sick, sx - SICK_FRAME.w / 2, SICK_DEF.floorY - y0 - SICK_FRAME.h, true);
      return pc;
    }
    case 'act3-ending': {
      // A janela quebrada da cozinha, com a Mary no parapeito saindo para a chuva.
      const s = ACT3_ENDING_START;
      const y0 = (s.ty + 1) * TILE + 30 - H / ACT3_ZOOM;
      const pc = neighborCrop(0, y0, ACT3_ZOOM);
      drawMary(pc, (s.tx + 0.5) * TILE, (s.ty + 1) * TILE - SPIDER.half - y0, true);
      return enlarge(pc, ACT3_ZOOM);
    }
  }
}
