// Lê teclado, mouse e controle e converte para o SpiderInput abstrato.
import Phaser from 'phaser';
import { GAMEPAD, WEB } from '../config';
import type { LevelGrid } from '../physics/LevelGrid';
import type { Vec2 } from '../physics/surfaces';
import { type AimDevice, type GamepadFrame, GamepadReader, assistAim, mergeInput } from '../systems/gamepad';
import type { SpiderInput } from '../systems/input';

type KeyName = 'W' | 'A' | 'S' | 'D' | 'E' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'SPACE' | 'SHIFT';

/**
 * Um leitor de controle só, que sobrevive aos reinícios da cena: assim um botão que continua
 * apertado (o A que escolheu "Main Menu") não vira um "apertou agora" na cena nova.
 */
const padReader = new GamepadReader();

export class PlayerInput {
  private readonly keys: Record<KeyName, Phaser.Input.Keyboard.Key>;
  private wasMouseDown = false;
  private wasRightDown = false;
  private pad: Gamepad | null = null;
  /** Estado do controle no último `read` (null = nenhum controle). */
  padFrame: GamepadFrame | null = null;
  /** Quem manda na mira: o último dispositivo usado para mirar. */
  aimDevice: AimDevice = 'mouse';
  /** Direção da mira do controle já com a mira assistida. */
  padAimDir: Vec2 = { x: 0, y: -1 };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly grid: LevelGrid,
  ) {
    const kb = scene.input.keyboard;
    if (!kb) throw new Error('Teclado indisponível');
    this.keys = kb.addKeys('W,A,S,D,E,UP,DOWN,LEFT,RIGHT,SPACE,SHIFT') as Record<KeyName, Phaser.Input.Keyboard.Key>;
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
    const rightDown = pointer.rightButtonDown();
    const attackPressed = rightDown && !this.wasRightDown;
    this.wasRightDown = rightDown;

    const kbInput: SpiderInput = {
      move: { x, y },
      run: k.SHIFT.isDown,
      jumpPressed: Phaser.Input.Keyboard.JustDown(k.SPACE),
      webPressed,
      webHeld: mouseDown,
      attackPressed,
      trapPressed: Phaser.Input.Keyboard.JustDown(k.E),
      aim: { x: aim.x, y: aim.y },
    };

    this.pad = findGamepad();
    this.padFrame = padReader.read(this.pad, performance.now());
    if (this.padFrame && (this.padFrame.aimMoved || this.padFrame.webPressed)) this.aimDevice = 'gamepad';
    if (this.padFrame) {
      this.padAimDir = assistAim(this.grid, spiderPos, this.padFrame.aimDir, WEB.range, GAMEPAD.aimAssistDeg, GAMEPAD.aimAssistStepDeg);
    }

    return mergeInput(kbInput, this.padFrame, this.aimDevice, spiderPos, this.padAimDir, WEB.range);
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

/** Lê o controle fora da jogatina (cutscene), com o mesmo leitor compartilhado. */
export function pollPad(): GamepadFrame | null {
  return padReader.read(findGamepad(), performance.now());
}

/** Primeiro controle conectado com mapa "standard"; senão, o primeiro conectado. */
function findGamepad(): Gamepad | null {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return null;
  const pads = navigator.getGamepads().filter((p): p is Gamepad => p !== null && p.connected);
  return pads.find((p) => p.mapping === 'standard') ?? pads[0] ?? null;
}
