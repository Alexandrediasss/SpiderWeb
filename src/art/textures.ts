// Ponte entre a arte gerada (PixelCanvas) e o gerenciador de texturas do Phaser.
import Phaser from 'phaser';
import { SPIDER } from '../config';
import type { LevelArt } from './levelArt';
import { PixelCanvas } from './PixelCanvas';
import { PLANK, buildHolePlanks } from './holeArt';
import { buildGlint, buildNote } from './letterArt';
import {
  buildHouseFront,
  buildMark,
  buildMiniMary,
  buildMoonBeam,
  buildOutsideBack,
  buildOutsideFront,
  buildShaftBack,
  buildShaftMouth,
  buildShaftShade,
  buildShaftWalls,
  buildSillBack,
  buildSillFront,
} from './act3CutArt';
import { buildGooBlob, buildGooGlow, buildGooPuddle, buildIntroDarkness, buildIntroStage } from './introArt';
import { getLevelArt } from './levelArt';
import { getNeighborArt } from './neighborArt';
import { RAT_FRAME, RAT_POSES, buildHearts, buildRatSheets, buildRatWeb } from './ratArt';
import { SICK_FRAME, SICK_POSES, buildChandelier, buildSickDead, buildSickSheets } from './sickArt';
import { SPIDER_FRAMES, buildReticle, buildSpiderSheet } from './spiderArt';
import {
  buildFarGround,
  buildHouses,
  buildMidGround,
  buildNearGround,
  buildRoofEdge,
  buildRoofShot,
  buildStreetSky,
  buildWideStreet,
} from './streetArt';
import { ZOMBIE_FRAMES, ZOMBIE_LOOKS, ZOMBIE_SIZES, buildZombieSheets, zombieFrameName } from './zombieArt';

export const TEX = {
  level: 'level',
  light: 'light',
  flash: 'flash',
  beam: (i: number) => `beam${i}`,
  mote: 'mote',
  spider: 'spider',
  reticle: 'reticle',
  rat: 'rat',
  ratEyes: 'ratEyes',
  ratWeb: 'ratWeb',
  hearts: 'hearts',
  introStage: 'introStage',
  introDark: 'introDark',
  introDarkHole: 'introDarkHole',
  gooBlob: 'gooBlob',
  gooPuddle: 'gooPuddle',
  gooGlow: 'gooGlow',
  zombie: (u: number) => `zombie${u}`,
  zombieEyes: (u: number) => `zombieEyes${u}`,
  streetSky: 'streetSky',
  roofSky: 'roofSky',
  roofShot: 'roofShot',
  roofFront: 'roofFront',
  houses: 'houses',
  farGround: 'farGround',
  midGround: 'midGround',
  nearGround: 'nearGround',
  wideStreet: 'wideStreet',
  roofEdge: 'roofEdge',
  note: 'note',
  holePlanks: 'holePlanks',
  glint: 'glint',
} as const;

/** Texturas do ato 3 (o cenário, o doente e o lustre) e dos palcos das cutscenes dele. */
export const T3 = {
  level: 'act3Level',
  light: 'act3Light',
  flash: 'act3Flash',
  sick: 'sick',
  sickEyes: 'sickEyes',
  sickDead: 'sickDead',
  chandelier: 'chandelier',
  chandelierBroken: 'chandelierBroken',
  shaftWalls: 'act3ShaftWalls',
  shaftBack: 'act3ShaftBack',
  shaftMouth: 'act3ShaftMouth',
  shaftShade: 'act3ShaftShade',
  moonBeam: 'act3MoonBeam',
  markBang: 'act3MarkBang',
  markAsk: 'act3MarkAsk',
  sillBack: 'act3SillBack',
  sillFront: 'act3SillFront',
  outsideBack: 'act3OutsideBack',
  outsideFront: 'act3OutsideFront',
  houseFront: 'act3HouseFront',
  miniMary: 'act3MiniMary',
} as const;

function addCanvas(scene: Phaser.Scene, key: string, pc: PixelCanvas): Phaser.Textures.CanvasTexture {
  const tex = scene.textures.addCanvas(key, pc.toCanvas());
  if (!tex) throw new Error(`Não foi possível criar a textura '${key}'`);
  return tex;
}

export function registerTextures(scene: Phaser.Scene): void {
  const art = getLevelArt();
  addCanvas(scene, TEX.level, art.canvas);
  addCanvas(scene, TEX.light, art.light);
  addCanvas(scene, TEX.flash, art.flash);
  art.beams.forEach((b, i) => addCanvas(scene, TEX.beam(i), b));
  const mote = new PixelCanvas(1, 1);
  mote.set(0, 0, 0xffffff);
  addCanvas(scene, TEX.mote, mote);
  addCanvas(scene, TEX.reticle, buildReticle());

  const sheet = addCanvas(scene, TEX.spider, buildSpiderSheet());
  SPIDER_FRAMES.forEach((f, i) => sheet.add(f.name, 0, i * SPIDER.frameW, 0, SPIDER.frameW, SPIDER.frameH));

  const rat = buildRatSheets();
  for (const [key, pc] of [
    [TEX.rat, rat.body],
    [TEX.ratEyes, rat.eyes],
  ] as const) {
    const tex = addCanvas(scene, key, pc);
    RAT_POSES.forEach((p, i) => tex.add(p.name, 0, i * RAT_FRAME.w, 0, RAT_FRAME.w, RAT_FRAME.h));
  }
  addCanvas(scene, TEX.ratWeb, buildRatWeb());
  const hearts = addCanvas(scene, TEX.hearts, buildHearts());
  hearts.add('full', 0, 0, 0, 9, 8);
  hearts.add('empty', 0, 9, 0, 9, 8);

  addCanvas(scene, TEX.introStage, buildIntroStage());
  addCanvas(scene, TEX.introDark, buildIntroDarkness(false));
  addCanvas(scene, TEX.introDarkHole, buildIntroDarkness(true));
  addCanvas(scene, TEX.gooBlob, buildGooBlob());
  addCanvas(scene, TEX.gooPuddle, buildGooPuddle());
  addCanvas(scene, TEX.gooGlow, buildGooGlow());

  // Cartas no cenário.
  addCanvas(scene, TEX.note, buildNote());
  // Tábuas que tapam o buraco do telhado até as cartas obrigatórias serem lidas.
  const planks = addCanvas(scene, TEX.holePlanks, buildHolePlanks());
  for (let i = 0; i < PLANK.count; i++) planks.add(`plank${i}`, 0, 0, i * PLANK.h, PLANK.w, PLANK.h);
  addCanvas(scene, TEX.glint, buildGlint());

  // Cutscene da rua.
  for (const u of ZOMBIE_SIZES) {
    const sheets = buildZombieSheets(u);
    for (const [key, pc] of [
      [TEX.zombie(u), sheets.body],
      [TEX.zombieEyes(u), sheets.eyes],
    ] as const) {
      const tex = addCanvas(scene, key, pc);
      ZOMBIE_LOOKS.forEach((_, li) => {
        for (let f = 0; f < ZOMBIE_FRAMES; f++) {
          tex.add(zombieFrameName(li, f), 0, f * sheets.frameW, li * sheets.frameH, sheets.frameW, sheets.frameH);
        }
      });
    }
  }
  const roof = buildRoofShot();
  addCanvas(scene, TEX.roofShot, roof.roof);
  addCanvas(scene, TEX.roofFront, roof.front);
  addCanvas(scene, TEX.roofSky, buildStreetSky(160, 90));
  addCanvas(scene, TEX.streetSky, buildStreetSky(240, 160));
  addCanvas(scene, TEX.houses, buildHouses());
  addCanvas(scene, TEX.farGround, buildFarGround());
  addCanvas(scene, TEX.midGround, buildMidGround());
  addCanvas(scene, TEX.nearGround, buildNearGround());
  addCanvas(scene, TEX.wideStreet, buildWideStreet());
  addCanvas(scene, TEX.roofEdge, buildRoofEdge());
}

/** O cenário do ato 3, o doente e o lustre. A arte é pintada uma vez só (as texturas sobrevivem às cenas). */
export function ensureAct3Textures(scene: Phaser.Scene): LevelArt {
  const art = getNeighborArt();
  const tex = scene.textures;
  if (!tex.exists(T3.level)) {
    tex.addCanvas(T3.level, art.canvas.toCanvas());
    tex.addCanvas(T3.light, art.light.toCanvas());
    tex.addCanvas(T3.flash, art.flash.toCanvas());
    const sheets = buildSickSheets();
    for (const [key, pc] of [
      [T3.sick, sheets.body],
      [T3.sickEyes, sheets.eyes],
    ] as const) {
      const t = tex.addCanvas(key, pc.toCanvas());
      SICK_POSES.forEach((p, i) => t?.add(p, 0, i * SICK_FRAME.w, 0, SICK_FRAME.w, SICK_FRAME.h));
    }
    tex.addCanvas(T3.sickDead, buildSickDead().toCanvas());
    tex.addCanvas(T3.chandelier, buildChandelier().toCanvas());
    tex.addCanvas(T3.chandelierBroken, buildChandelier(true).toCanvas());
  }
  return art;
}

/** Os palcos das cutscenes do ato 3 (pintados só quando uma delas abre). */
export function ensureAct3CutTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists(T3.shaftWalls)) return;
  for (const [key, build] of [
    [T3.shaftWalls, buildShaftWalls],
    [T3.shaftBack, buildShaftBack],
    [T3.shaftMouth, buildShaftMouth],
    [T3.shaftShade, buildShaftShade],
    [T3.moonBeam, buildMoonBeam],
    [T3.markBang, () => buildMark('!')],
    [T3.markAsk, () => buildMark('?')],
    [T3.sillBack, buildSillBack],
    [T3.sillFront, buildSillFront],
    [T3.outsideBack, buildOutsideBack],
    [T3.outsideFront, buildOutsideFront],
    [T3.houseFront, buildHouseFront],
    [T3.miniMary, buildMiniMary],
  ] as const) {
    addCanvas(scene, key, build());
  }
}

export function registerAnimations(scene: Phaser.Scene): void {
  const frames = (...names: string[]) => names.map((frame) => ({ key: TEX.spider, frame }));
  scene.anims.create({ key: 'spider-idle', frames: frames('idle0', 'idle1'), frameRate: 2, repeat: -1 });
  scene.anims.create({ key: 'spider-walk', frames: frames('walk0', 'walk1', 'walk2', 'walk3'), frameRate: 12, repeat: -1 });
  scene.anims.create({ key: 'spider-air', frames: frames('air'), frameRate: 1, repeat: -1 });
  const ratFrames = (...names: string[]) => names.map((frame) => ({ key: TEX.rat, frame }));
  scene.anims.create({ key: 'rat-walk', frames: ratFrames('walk0', 'idle', 'walk1', 'idle'), frameRate: 10, repeat: -1 });
}
