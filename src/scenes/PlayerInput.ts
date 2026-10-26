// Lê teclado e mouse e converte para o SpiderInput abstrato.
import Phaser from 'phaser';
import type { SpiderInput } from '../systems/input';

type KeyName = 'W' | 'A' | 'S' | 'D' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'SPACE' | 'SHIFT';

export class PlayerInput {
  private readonly keys: Record<KeyName, Phaser.Input.Keyboard.Key>;
  private wasMouseDown = false;

  constructor(private readonly scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    if (!kb) throw new Error('Teclado indisponível');
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,SHIFT') as Record<KeyName, Phaser.Input.Keyboard.Key>;
    scene.input.mouse?.disableContextMenu();
  }

  read(): SpiderInput {
    const k = this.keys;
    const x = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    const y = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);

    const pointer = this.scene.input.activePointer;
    const aim = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const mouseDown = pointer.leftButtonDown();
    const webPressed = mouseDown && !this.wasMouseDown;
    this.wasMouseDown = mouseDown;

    return {
      move: { x, y },
      run: k.SHIFT.isDown,
      jumpPressed: Phaser.Input.Keyboard.JustDown(k.SPACE),
      webPressed,
      webHeld: mouseDown,
      aim: { x: aim.x, y: aim.y },
    };
  }
}
