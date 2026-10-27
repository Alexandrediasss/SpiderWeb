// Desenha o combate: ratos (com olhos que brilham no escuro), teias voando e respingos.
// Lê o estado do Combat (src/systems/combat.ts). Spec: docs/features/combat.md
import Phaser from 'phaser';
import { RAT, WEB } from '../config';
import { TEX } from '../art/textures';
import type { Combat, ShotKind } from '../systems/combat';
import type { Rat } from '../systems/rat';

type Light = (x: number, y: number) => [number, number, number];

/** Ordem: ratos 7, teias 8 (a aranha fica em 9). */
const DEPTH = { rat: 7, shots: 8 } as const;
const RAT_MIN_LIGHT = 0.5;
const SPLAT_SEC = 0.25;

class RatView {
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly eyes: Phaser.GameObjects.Sprite;
  private readonly web: Phaser.GameObjects.Image;

  constructor(
    scene: Phaser.Scene,
    private readonly rat: Rat,
  ) {
    this.sprite = scene.add.sprite(0, 0, TEX.rat, 'idle').setOrigin(0.5, 1).setDepth(DEPTH.rat);
    this.eyes = scene.add.sprite(0, 0, TEX.ratEyes, 'idle').setOrigin(0.5, 1).setDepth(DEPTH.rat + 0.1);
    this.web = scene.add.image(0, 0, TEX.ratWeb).setOrigin(0.5, 1).setDepth(DEPTH.rat + 0.2).setVisible(false);
  }

  update(time: number, light: Light): void {
    const r = this.rat;
    const b = r.body;
    if (r.gone) {
      for (const o of [this.sprite, this.eyes, this.web]) o.setVisible(false);
      return;
    }

    // Preso na teia: treme no último segundo, avisando que vai se soltar.
    const shake = r.state === 'trapped' && r.trappedLeft < 1 ? (Math.floor(time / 50) % 2 ? 1 : -1) : 0;
    const x = Math.round(b.x + shake);
    const y = Math.round(b.y + b.half);
    const flip = r.facing < 0;

    if (r.state === 'dead') {
      this.sprite.anims.stop();
      this.sprite.setFrame('idle');
    } else if (r.windup > 0) {
      this.sprite.anims.stop();
      this.sprite.setFrame('bite');
    } else if (r.moving && r.state !== 'trapped') {
      if (this.sprite.anims.currentAnim?.key !== 'rat-walk' || !this.sprite.anims.isPlaying) this.sprite.play('rat-walk');
      this.sprite.anims.timeScale = r.state === 'chase' ? 1.8 : 1;
    } else {
      this.sprite.anims.stop();
      this.sprite.setFrame('idle');
    }

    const alpha = r.state === 'dead' ? Math.max(0, 1 - r.deadFor / RAT.deathSec) : 1;
    for (const o of [this.sprite, this.eyes]) o.setPosition(x, y).setFlip(flip, r.state === 'dead').setAlpha(alpha);
    this.eyes.setFrame(this.sprite.frame.name);
    this.web.setPosition(x, y).setFlipX(flip).setVisible(r.state === 'trapped');

    if (r.flashLeft > 0) {
      this.sprite.setTint(0xff5050);
    } else {
      const [lr, lg, lb] = light(b.x, b.y);
      const ch = (v: number) => Math.round(Math.max(RAT_MIN_LIGHT, Math.min(1, v)) * 255);
      this.sprite.setTint((ch(lr) << 16) | (ch(lg) << 8) | ch(lb));
    }
  }
}

interface Splat {
  x: number;
  y: number;
  kind: ShotKind;
  age: number;
}

export class CombatView {
  private readonly rats: RatView[];
  private readonly gfx: Phaser.GameObjects.Graphics;
  private splats: Splat[] = [];

  constructor(
    scene: Phaser.Scene,
    private readonly combat: Combat,
  ) {
    this.rats = combat.rats.map((r) => new RatView(scene, r));
    this.gfx = scene.add.graphics().setDepth(DEPTH.shots);
  }

  addSplat(x: number, y: number, kind: ShotKind): void {
    this.splats.push({ x, y, kind, age: 0 });
  }

  update(dt: number, time: number, light: Light): void {
    for (const r of this.rats) r.update(time, light);

    const g = this.gfx;
    g.clear();
    g.fillStyle(WEB.color, 1);
    for (const s of this.combat.shots) {
      const x = Math.round(s.x);
      const y = Math.round(s.y);
      if (s.kind === 'attack') {
        // Bolinha de teia em cruz com um rastro.
        g.fillRect(x - 1, y, 3, 1);
        g.fillRect(x, y - 1, 1, 3);
        g.fillStyle(WEB.color, 0.45);
        g.fillRect(Math.round(x - s.dx * 4), Math.round(y - s.dy * 4), 1, 1);
        g.fillRect(Math.round(x - s.dx * 6), Math.round(y - s.dy * 6), 1, 1);
        g.fillStyle(WEB.color, 1);
      } else {
        // Rede 5×5 (xadrez), maior e mais lenta.
        for (let yy = -2; yy <= 2; yy++) for (let xx = -2; xx <= 2; xx++) if ((xx + yy) % 2 === 0) g.fillRect(x + xx, y + yy, 1, 1);
      }
    }

    // Respingos: pontinhos que se espalham e somem.
    this.splats = this.splats.filter((s) => (s.age += dt) < SPLAT_SEC);
    for (const s of this.splats) {
      const k = s.age / SPLAT_SEC;
      const spread = 1 + k * (s.kind === 'trap' ? 7 : 5);
      g.fillStyle(WEB.color, 1 - k);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.4;
        g.fillRect(Math.round(s.x + Math.cos(a) * spread), Math.round(s.y + Math.sin(a) * spread), 1, 1);
      }
    }
  }
}
