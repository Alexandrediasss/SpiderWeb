// Lê teclado, mouse e controle e converte para o SpiderInput abstrato.
import Phaser from 'phaser';
import { GAMEPAD, WEB } from '../config';
import type { Vec2 } from '../physics/surfaces';
import { type AimDevice, type GamepadFrame, GamepadReader, mergeInput } from '../systems/gamepad';
import type { SpiderInput } from '../systems/input';

type KeyName = 'W' | 'A' | 'S' | 'D' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'SPACE' | 'SHIFT';

export class PlayerInput {
  private readonly keys: Record<KeyName, Phaser.Input.Keyboard.Key>;
  private wasMouseDown = false;
  private readonly padReader = new GamepadReader();
  private pad: Gamepad | null = null;
  /** Estado do controle no último `read` (null = nenhum controle). */
  padFrame: GamepadFrame | null = null;
  /** Quem manda na mira: o último dispositivo usado para mirar. */
  aimDevice: AimDevice = 'mouse';

  constructor(private readonly scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    if (!kb) throw new Error('Teclado indisponível');
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,SHIFT') as Record<KeyName, Phaser.Input.Keyboard.Key>;
    scene.input.mouse?.disableContextMenu();
    const useMouse = () => (this.aimDevice = 'mouse');
    scene.input.on('pointermove', useMouse);
    scene.input.on('pointerdown', useMouse);
  }

  read(spiderPos: Vec2): SpiderInput {
    const k = this.keys;
    const x = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    const y = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);

    const pointer = this.scene.input.activePointer;
    const aim = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const mouseDown = pointer.leftButtonDown();
    const webPressed = mouseDown && !this.wasMouseDown;
    this.wasMouseDown = mouseDown;

    const kbInput: SpiderInput = {
      move: { x, y },
      run: k.SHIFT.isDown,
      jumpPressed: Phaser.Input.Keyboard.JustDown(k.SPACE),
      webPressed,
      webHeld: mouseDown,
      aim: { x: aim.x, y: aim.y },
    };

    this.pad = findGamepad();
    this.padFrame = this.padReader.read(this.pad);
    if (this.padFrame && (this.padFrame.aimMoved || this.padFrame.webPressed)) this.aimDevice = 'gamepad';

    return mergeInput(kbInput, this.padFrame, this.aimDevice, spiderPos, WEB.range);
  }

  /** Tranco curto no controle; ignora se o navegador ou o controle não suportarem. */
  rumble(effect = GAMEPAD.rumbleWeb): void {
    const actuator = this.pad?.vibrationActuator;
    if (!actuator) return;
    actuator
      .playEffect('dual-rumble', {
        duration: effect.durationMs,
        strongMagnitude: effect.strong,
        weakMagnitude: effect.weak,
      })
      .catch(() => undefined);
  }
}

/** Primeiro controle conectado com mapa "standard"; senão, o primeiro conectado. */
function findGamepad(): Gamepad | null {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return null;
  const pads = navigator.getGamepads().filter((p): p is Gamepad => p !== null && p.connected);
  return pads.find((p) => p.mapping === 'standard') ?? pads[0] ?? null;
}
