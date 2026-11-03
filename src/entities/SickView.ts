// Desenha o doente da cozinha (sprite, olhos que brilham, teia de prender, caído) e o lustre na corda.
// Lê o estado de Sick (src/systems/sick.ts) e Chandelier (src/systems/chandelier.ts).
// Spec: docs/features/act3-lights-out.md
import Phaser from 'phaser';
import { CHANDELIER, SICK, WEB } from '../config';
import { PAL } from '../art/palette';
import type { Chandelier } from '../systems/chandelier';
import type { Sick } from '../systems/sick';
import { pixelLine } from './Spider';

type Light = (x: number, y: number) => [number, number, number];

/** Texturas (registradas pela cena do ato 3). */
export interface SickTextures {
  body: string;
  eyes: string;
  dead: string;
  chandelier: string;
  chandelierBroken: string;
}

/** O doente fica na frente da gosma e atrás dos ratos e da aranha; o lustre na frente dele. */
const DEPTH = { sick: 6.9, web: 6.95, chandelier: 7.5 } as const;
const MIN_LIGHT = 0.5;
const WALK = ['walk0', 'walk1', 'walk2', 'walk3'];

const tint = ([r, g, b]: [number, number, number], min: number) => {
  const ch = (v: number) => Math.round(Math.max(min, Math.min(1, v)) * 255);
  return (ch(r) << 16) | (ch(g) << 8) | ch(b);
};

export class SickView {
  private readonly body: Phaser.GameObjects.Sprite;
  private readonly eyes: Phaser.GameObjects.Sprite;
  private readonly dead: Phaser.GameObjects.Image;
  private readonly lustre: Phaser.GameObjects.Image;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly brokenKey: string;

  constructor(
    scene: Phaser.Scene,
    private readonly sick: Sick,
    private readonly chandelier: Chandelier,
    tex: SickTextures,
  ) {
    this.body = scene.add.sprite(0, 0, tex.body, 'walk1').setOrigin(0.5, 1).setDepth(DEPTH.sick);
    this.eyes = scene.add.sprite(0, 0, tex.eyes, 'walk1').setOrigin(0.5, 1).setDepth(DEPTH.sick + 0.01);
    this.dead = scene.add.image(0, 0, tex.dead).setOrigin(0.5, 1).setDepth(DEPTH.sick).setVisible(false);
    this.lustre = scene.add.image(0, 0, tex.chandelier).setOrigin(0.5, 0).setDepth(DEPTH.chandelier);
    this.gfx = scene.add.graphics().setDepth(DEPTH.web);
    this.brokenKey = tex.chandelierBroken;
  }

  update(time: number, light: Light): void {
    const s = this.sick;
    const g = this.gfx;
    g.clear();

    // O doente: pose pelo estado, a caminhada pelo quanto andou.
    if (!s.alive) {
      this.body.setVisible(false);
      this.eyes.setVisible(false);
      this.dead.setVisible(true).setPosition(Math.round(s.x), s.y).setFlipX(s.facing < 0);
      this.dead.setTint(tint(light(s.x, s.y - 6), MIN_LIGHT));
    } else {
      this.dead.setVisible(false);
      const pose =
        s.state === 'windup' ? 'windup' : s.state === 'swing' ? 'swing' : s.reaching ? 'reach' : s.moving ? WALK[Math.floor(s.x / 5) % 4] : 'walk1';
      // Balança parado, como os doentes da rua.
      const sway = s.moving || s.state !== 'patrol' ? 0 : Math.round(Math.sin(time / 600 + s.x) * 0.6);
      for (const o of [this.body, this.eyes]) {
        o.setVisible(true).setFrame(pose).setFlipX(s.facing < 0).setPosition(Math.round(s.x) + sway, s.y);
      }
      if (s.flashLeft > 0) this.body.setTintFill(0xff5050);
      else this.body.setTint(tint(light(s.x, s.y - SICK.h / 2), MIN_LIGHT));
      // Preso na teia de prender: fios cruzados por cima dele, tremendo no último meio segundo.
      if (s.state === 'trapped') {
        const shake = s.trappedLeft < 0.5 && Math.floor(time / 50) % 2 ? 1 : 0;
        const b = s.box;
        g.fillStyle(WEB.color, 0.85);
        for (let k = 0; k <= 4; k++) {
          const y = b.top + 6 + k * 10;
          pixelLine(g, b.left - 3 + shake, y, b.right + 3 + shake, y + 6);
          pixelLine(g, b.right + 3 + shake, y, b.left - 3 + shake, y + 6);
        }
      }
    }

    // O lustre: na corda (balançando), caindo ou quebrado no chão.
    const c = this.chandelier;
    const lit = tint(light(c.x, c.box.top + CHANDELIER.h / 2), 0.55);
    if (c.state === 'hanging') {
      const end = c.ropeEnd;
      g.fillStyle(PAL.act3.rope, 1);
      pixelLine(g, c.def.x, c.def.y, end.x, end.y);
      this.lustre.setPosition(Math.round(end.x), Math.round(end.y)).setRotation(-c.angle).setTint(lit);
    } else {
      this.lustre.setRotation(0).setPosition(Math.round(c.x), Math.round(c.box.top)).setTint(lit);
      if (c.state === 'falling') {
        // Um pedaço da corda cortada caindo junto.
        g.fillStyle(PAL.act3.rope, 1);
        pixelLine(g, c.x, c.box.top, c.x, c.box.top - 8);
      } else if (this.lustre.texture.key !== this.brokenKey) {
        this.lustre.setTexture(this.brokenKey).setAngle(-6);
      }
    }
  }

  /** Volta o lustre inteiro para a corda (a Mary morreu e o doente ainda está vivo). */
  resetChandelier(key: string): void {
    this.lustre.setTexture(key).setAngle(0);
  }

  /** Para o debug: as caixas do doente, do alcance do tapa e do lustre. */
  drawDebug(g: Phaser.GameObjects.Graphics): void {
    const s = this.sick;
    if (s.alive) {
      const b = s.box;
      g.lineStyle(1, 0xff3366, 1).strokeRect(b.left, b.top, b.right - b.left, b.bottom - b.top);
      const r = s.reachBox;
      g.lineStyle(1, 0xffcc00, 0.6).strokeRect(r.left, r.top, r.right - r.left, r.bottom - r.top);
    }
    const c = this.chandelier.box;
    g.lineStyle(1, 0x66ccff, 1).strokeRect(c.left, c.top, c.right - c.left, c.bottom - c.top);
  }
}

