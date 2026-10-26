// Ponte entre a arte gerada (PixelCanvas) e o gerenciador de texturas do Phaser.
import Phaser from 'phaser';
import { SPIDER } from '../config';
import { DECORATIONS, HOUSE_MAP, ROOMS } from '../level/houseMap';
import type { PixelCanvas } from './PixelCanvas';
import { bakeLevel } from './levelBaker';
import { SPIDER_FRAMES, buildReticle, buildSpiderSheet } from './spiderArt';

export const TEX = {
  level: 'level',
  spider: 'spider',
  reticle: 'reticle',
} as const;

function addCanvas(scene: Phaser.Scene, key: string, pc: PixelCanvas): Phaser.Textures.CanvasTexture {
  const tex = scene.textures.addCanvas(key, pc.toCanvas());
  if (!tex) throw new Error(`Não foi possível criar a textura '${key}'`);
  return tex;
}

export function registerTextures(scene: Phaser.Scene): void {
  addCanvas(scene, TEX.level, bakeLevel(HOUSE_MAP, ROOMS, DECORATIONS));
  addCanvas(scene, TEX.reticle, buildReticle());

  const sheet = addCanvas(scene, TEX.spider, buildSpiderSheet());
  SPIDER_FRAMES.forEach((f, i) => sheet.add(f.name, 0, i * SPIDER.frameW, 0, SPIDER.frameW, SPIDER.frameH));
}

export function registerAnimations(scene: Phaser.Scene): void {
  const frames = (...names: string[]) => names.map((frame) => ({ key: TEX.spider, frame }));
  scene.anims.create({ key: 'spider-idle', frames: frames('idle0', 'idle1'), frameRate: 2, repeat: -1 });
  scene.anims.create({ key: 'spider-walk', frames: frames('walk0', 'walk1', 'walk2', 'walk3'), frameRate: 12, repeat: -1 });
  scene.anims.create({ key: 'spider-air', frames: frames('air'), frameRate: 1, repeat: -1 });
}
