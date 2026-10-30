// Visual da aranha no Phaser: lê o SpiderMotor e desenha sprite, rotação, animação e teia.
import Phaser from 'phaser';
import { SPIDER, WEB } from '../config';
import { TEX } from '../art/textures';
import type { LevelGrid } from '../physics/LevelGrid';
import { SURFACES } from '../physics/surfaces';
import { SpiderMotor } from '../systems/SpiderMotor';
import type { SpiderInput } from '../systems/input';

/** Quadros da caminhada em que um par de patas toca o chão (toca um passinho). */
const STEP_FRAMES = new Set(['walk0', 'walk2']);

export class Spider {
  readonly motor: SpiderMotor;
  readonly sprite: Phaser.GameObjects.Sprite;
  private readonly web: Phaser.GameObjects.Graphics;
  private angleDeg = 0;
  private webColor: number = WEB.color;

  /** `onStep`: chamado a cada passo da animação de andar (para o som). */
  constructor(scene: Phaser.Scene, grid: LevelGrid, x: number, y: number, onStep?: () => void) {
    this.motor = new SpiderMotor(grid, x, y);
    // Acima da camada de escuro: a cor é ajustada à mão por `setLight` (assim ela nunca some no escuro).
    this.web = scene.add.graphics().setDepth(8);
    this.sprite = scene.add.sprite(x, y, TEX.spider, 'idle0').setDepth(9);
    this.sprite.play('spider-idle');
    this.sprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, (_a: unknown, frame: Phaser.Animations.AnimationFrame) => {
      if (onStep && STEP_FRAMES.has(String(frame.textureFrame))) onStep();
    });
  }

  /**
   * Efeito de dano (chamar depois de `setLight`): vermelho logo após a mordida e piscando enquanto
   * está invencível. `dead` deixa a aranha vermelha e de barriga para cima.
   */
  setDamageFx(invulnLeft: number, invulnSec: number, dead: boolean): void {
    if (dead) {
      this.sprite.setTint(0xff4040).setFlipY(true).setAlpha(1);
      return;
    }
    this.sprite.setFlipY(false);
    if (invulnLeft <= 0) {
      this.sprite.setAlpha(1);
      return;
    }
    if (invulnSec - invulnLeft < 0.2) this.sprite.setTint(0xff5050);
    this.sprite.setAlpha(Math.floor(invulnLeft / 0.08) % 2 ? 0.35 : 1);
  }

  /** Luz do lugar onde a aranha está (0..1 por canal); `min` evita que ela suma no escuro. */
  setLight([r, g, b]: [number, number, number], min: number): void {
    const ch = (v: number) => Math.round(Math.max(min, Math.min(1, v)) * 255);
    const tint = (ch(r) << 16) | (ch(g) << 8) | ch(b);
    this.sprite.setTint(tint);
    const wr = (((WEB.color >> 16) & 255) * ch(r)) / 255;
    const wg = (((WEB.color >> 8) & 255) * ch(g)) / 255;
    const wb = ((WEB.color & 255) * ch(b)) / 255;
    this.webColor = (Math.round(wr) << 16) | (Math.round(wg) << 8) | Math.round(wb);
  }

  update(dt: number, input: SpiderInput): void {
    this.motor.update(dt, input);
    this.updateSprite(dt);
    this.drawWeb();
  }

  /** Vira o sprite na hora para o ângulo da superfície (sem girar aos poucos), depois de reposicionar. */
  snapAngle(): void {
    this.angleDeg = this.targetAngle();
    this.updateSprite(0);
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

    // Arrastada pelo vento, as patas se mexem como se tentasse se segurar.
    const anim = m.surface === 'air' ? 'spider-air' : m.isWalking || m.sliding ? 'spider-walk' : 'spider-idle';
    if (this.sprite.anims.currentAnim?.key !== anim) this.sprite.play(anim);
    this.sprite.anims.timeScale = anim === 'spider-walk' && m.running ? 1.9 : 1;
  }

  private drawWeb(): void {
    const m = this.motor;
    this.web.clear();
    if (m.rope) {
      this.web.fillStyle(this.webColor, 1);
      pixelLine(this.web, m.body.x, m.body.y, m.rope.anchor.x, m.rope.anchor.y);
    }
    if (m.shotFlash) {
      this.web.fillStyle(this.webColor, Math.max(0, m.shotFlash.timeLeft / WEB.missFlashSec) * 0.6);
      pixelLine(this.web, m.shotFlash.from.x, m.shotFlash.from.y, m.shotFlash.to.x, m.shotFlash.to.y);
    }
  }
}

/** Linha de Bresenham com retângulos de 1 px (sem anti-aliasing). */
export function pixelLine(g: Phaser.GameObjects.Graphics, x0: number, y0: number, x1: number, y1: number): void {
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
