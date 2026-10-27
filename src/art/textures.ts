// Ponte entre a arte gerada (PixelCanvas) e o gerenciador de texturas do Phaser.
import Phaser from 'phaser';
import { SPIDER } from '../config';
import { PixelCanvas } from './PixelCanvas';
import { buildGooBlob, buildGooGlow, buildGooPuddle, buildIntroDarkness, buildIntroStage } from './introArt';
import { getLevelArt } from './levelArt';
import { RAT_FRAME, RAT_POSES, buildHearts, buildRatSheets, buildRatWeb } from './ratArt';
import { SPIDER_FRAMES, buildReticle, buildSpiderSheet } from './spiderArt';

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
}

export function registerAnimations(scene: Phaser.Scene): void {
  const frames = (...names: string[]) => names.map((frame) => ({ key: TEX.spider, frame }));
  scene.anims.create({ key: 'spider-idle', frames: frames('idle0', 'idle1'), frameRate: 2, repeat: -1 });
  scene.anims.create({ key: 'spider-walk', frames: frames('walk0', 'walk1', 'walk2', 'walk3'), frameRate: 12, repeat: -1 });
  scene.anims.create({ key: 'spider-air', frames: frames('air'), frameRate: 1, repeat: -1 });
  const ratFrames = (...names: string[]) => names.map((frame) => ({ key: TEX.rat, frame }));
  scene.anims.create({ key: 'rat-walk', frames: ratFrames('walk0', 'idle', 'walk1', 'idle'), frameRate: 10, repeat: -1 });
}
