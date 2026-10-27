// Vida da aranha: corações em pixel art no canto de cima à direita (presos à tela, não ao mundo).
import Phaser from 'phaser';
import { VIEW } from '../config';
import { TEX } from '../art/textures';

const GAP = 11;
const MARGIN = 6;
const BLINK_SEC = 0.7;

export class HeartsHud {
  private readonly hearts: Phaser.GameObjects.Image[];
  private lastHp: number;
  private blinkLeft = 0;

  constructor(scene: Phaser.Scene, max: number) {
    this.lastHp = max;
    this.hearts = Array.from({ length: max }, (_, i) =>
      scene.add
        .image(VIEW.width - MARGIN - (max - i) * GAP, MARGIN, TEX.hearts, 'full')
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(30),
    );
  }

  setVisible(on: boolean): void {
    for (const h of this.hearts) h.setVisible(on);
  }

  /** O coração que acabou de ser perdido pisca um pouco antes de ficar vazio. */
  update(hp: number, dt: number): void {
    if (hp < this.lastHp) this.blinkLeft = BLINK_SEC;
    this.lastHp = hp;
    this.blinkLeft = Math.max(0, this.blinkLeft - dt);
    const blinkOn = Math.floor(this.blinkLeft / 0.1) % 2 === 1;
    this.hearts.forEach((h, i) => {
      const lost = i === hp && this.blinkLeft > 0;
      h.setFrame(i < hp || (lost && blinkOn) ? 'full' : 'empty');
    });
  }
}
