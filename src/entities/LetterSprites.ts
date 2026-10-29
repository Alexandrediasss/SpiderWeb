// Desenha as cartas no cenário: a folha (com a luz do lugar) e o brilho piscando nas que ainda não foram lidas.
// Spec: docs/features/letters.md
import Phaser from 'phaser';
import { LETTER, TILE } from '../config';
import { TEX } from '../art/textures';
import type { Letter } from '../level/letters';
import { type LetterLog, letterBase } from '../systems/letters';

type Light = (x: number, y: number) => [number, number, number];

/** Atrás dos ratos (7): o rato da cama passa na frente da carta. */
const DEPTH = { note: 6.5, glint: 6.6 } as const;

export class LetterSprites {
  private readonly items: { letter: Letter; note: Phaser.GameObjects.Image; glint: Phaser.GameObjects.Image }[];

  constructor(scene: Phaser.Scene, letters: Letter[]) {
    this.items = letters.map((letter, i) => {
      const b = letterBase(letter, TILE);
      const note = scene.add.image(b.x, b.y, TEX.note).setOrigin(0.5, 1).setDepth(DEPTH.note);
      // Cada carta pisca num momento diferente.
      const glint = scene.add
        .image(b.x + 3, b.y - 10, TEX.glint)
        .setDepth(DEPTH.glint)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setData('offset', i * 0.37);
      return { letter, note, glint };
    });
  }

  update(time: number, log: LetterLog, light: Light): void {
    const t = time / 1000;
    for (const { letter, note, glint } of this.items) {
      const [r, g, b] = light(note.x, note.y - 4);
      const ch = (v: number) => Math.round(Math.max(LETTER.minLight, Math.min(1, v)) * 255);
      note.setTint((ch(r) << 16) | (ch(g) << 8) | ch(b));

      const phase = (t / LETTER.glintEverySec + glint.getData('offset')) % 1;
      const on = phase * LETTER.glintEverySec;
      const show = !log.has(letter.id) && on < LETTER.glintSec;
      glint.setVisible(show);
      if (show) glint.setAlpha(Math.sin((on / LETTER.glintSec) * Math.PI));
    }
  }
}
