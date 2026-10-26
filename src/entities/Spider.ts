// Visual da aranha no Phaser: lê o SpiderMotor e desenha sprite, rotação, animação e teia.
import Phaser from 'phaser';
import { SPIDER, WEB } from '../config';
import { TEX } from '../art/textures';
import type { LevelGrid } from '../physics/LevelGrid';
import { SURFACES } from '../physics/surfaces';
import { SpiderMotor } from '../systems/SpiderMotor';
import type { SpiderInput } from '../systems/input';

export class Spider {
  readonly motor: SpiderMotor;
  readonly sprite: Phaser.GameObjects.Sprite;
  private readonly web: Phaser.GameObjects.Graphics;
  private angleDeg = 0;

  constructor(scene: Phaser.Scene, grid: LevelGrid, x: number, y: number) {
    this.motor = new SpiderMotor(grid, x, y);
    this.web = scene.add.graphics().setDepth(4);
    this.sprite = scene.add.sprite(x, y, TEX.spider, 'idle0').setDepth(5);
    this.sprite.play('spider-idle');
  }

  update(dt: number, input: SpiderInput): void {
    this.motor.update(dt, input);
    this.updateSprite(dt);
    this.drawWeb();
  }

  private targetAngle(): number {
    const m = this.motor;
    if (m.rope) {
      // As costas apontam para a âncora.
      const ux = m.rope.anchor.x - m.body.x;
      const uy = m.rope.anchor.y - m.body.y;
      return Phaser.Math.RadToDeg(Math.atan2(ux, -uy));
    }
    if (m.surface === 'air') return 0;
    return SURFACES[m.surface].angle;
  }

  private updateSprite(dt: number): void {
    const m = this.motor;
    const target = this.targetAngle();
    const diff = ((((target - this.angleDeg) % 360) + 540) % 360) - 180;
    this.angleDeg += diff * Math.min(1, dt * SPIDER.rotateLerp);

    // Desloca o sprite para os pés encostarem na superfície.
    const rad = Phaser.Math.DegToRad(this.angleDeg);
    const offset = SPIDER.half - SPIDER.frameH / 2;
    this.sprite.setPosition(m.body.x - Math.sin(rad) * offset, m.body.y + Math.cos(rad) * offset);
    this.sprite.setAngle(this.angleDeg);
    this.sprite.setFlipX(m.facing < 0);

    const anim = m.surface === 'air' ? 'spider-air' : m.isWalking ? 'spider-walk' : 'spider-idle';
    if (this.sprite.anims.currentAnim?.key !== anim) this.sprite.play(anim);
    this.sprite.anims.timeScale = anim === 'spider-walk' && m.running ? 1.9 : 1;
  }

  private drawWeb(): void {
    const m = this.motor;
    this.web.clear();
    if (m.rope) {
      this.web.fillStyle(WEB.color, 1);
      pixelLine(this.web, m.body.x, m.body.y, m.rope.anchor.x, m.rope.anchor.y);
    }
    if (m.shotFlash) {
      this.web.fillStyle(WEB.color, Math.max(0, m.shotFlash.timeLeft / WEB.missFlashSec) * 0.6);
      pixelLine(this.web, m.shotFlash.from.x, m.shotFlash.from.y, m.shotFlash.to.x, m.shotFlash.to.y);
    }
  }
}

/** Linha de Bresenham com retângulos de 1 px (sem anti-aliasing). */
function pixelLine(g: Phaser.GameObjects.Graphics, x0: number, y0: number, x1: number, y1: number): void {
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    g.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}
