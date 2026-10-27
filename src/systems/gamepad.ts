// Controle (gamepad): converte o estado cru da Gamepad API em input do jogo. Lógica pura.
// Spec: docs/features/gamepad.md
import { GAMEPAD } from '../config';
import type { Vec2 } from '../physics/surfaces';
import type { SpiderInput } from './input';

/** Índices do mapa "standard gamepad" do W3C (layout Xbox). */
export const BUTTON = {
  A: 0,
  LB: 4,
  RB: 5,
  LT: 6,
  RT: 7,
  SELECT: 8,
  START: 9,
  UP: 12,
  DOWN: 13,
  LEFT: 14,
  RIGHT: 15,
} as const;

/** O pedaço do `Gamepad` do navegador que usamos (facilita os testes). */
export interface GamepadSnapshot {
  readonly axes: readonly number[];
  readonly buttons: readonly { readonly pressed: boolean; readonly value: number }[];
}

export interface GamepadFrame {
  move: Vec2;
  run: boolean;
  jumpPressed: boolean;
  webPressed: boolean;
  webHeld: boolean;
  /** Direção unitária da mira. */
  aimDir: Vec2;
  /** O analógico direito passou da zona morta neste frame. */
  aimMoved: boolean;
  musicPressed: boolean;
  helpPressed: boolean;
}

/** Zona morta radial: abaixo de `dz` vira zero; acima, a magnitude é reescalada para 0..1. */
export function applyDeadzone(x: number, y: number, dz: number): Vec2 {
  const mag = Math.hypot(x, y);
  if (mag < dz || mag === 0) return { x: 0, y: 0 };
  const scaled = Math.min(1, (mag - dz) / (1 - dz));
  return { x: (x / mag) * scaled, y: (y / mag) * scaled };
}

/** Encaixa um vetor na direção mais próxima entre 8 (setores de 45°), com eixos em -1/0/1. */
export function snapTo8(v: Vec2): Vec2 {
  if (v.x === 0 && v.y === 0) return { x: 0, y: 0 };
  const sector = Math.round(Math.atan2(v.y, v.x) / (Math.PI / 4));
  const angle = sector * (Math.PI / 4);
  return { x: Math.round(Math.cos(angle)) || 0, y: Math.round(Math.sin(angle)) || 0 };
}

/** Lê o controle frame a frame, guardando o necessário para detectar "apertou agora" e a mira. */
export class GamepadReader {
  private prev = new Set<number>();
  private aimDir: Vec2 = { x: 0, y: -1 };

  read(pad: GamepadSnapshot | null): GamepadFrame | null {
    if (!pad) {
      this.prev.clear();
      return null;
    }
    const down = (i: number) => {
      const b = pad.buttons[i];
      if (!b) return false;
      return i === BUTTON.LT || i === BUTTON.RT ? b.value >= GAMEPAD.triggerThreshold || b.pressed : b.pressed;
    };
    const now = new Set<number>();
    for (const i of Object.values(BUTTON)) if (down(i)) now.add(i);
    const justDown = (i: number) => now.has(i) && !this.prev.has(i);

    const stick = snapTo8(applyDeadzone(pad.axes[0] ?? 0, pad.axes[1] ?? 0, GAMEPAD.moveDeadzone));
    const dpadX = (now.has(BUTTON.RIGHT) ? 1 : 0) - (now.has(BUTTON.LEFT) ? 1 : 0);
    const dpadY = (now.has(BUTTON.DOWN) ? 1 : 0) - (now.has(BUTTON.UP) ? 1 : 0);
    const move = { x: clampUnit(stick.x + dpadX), y: clampUnit(stick.y + dpadY) };

    const aim = applyDeadzone(pad.axes[2] ?? 0, pad.axes[3] ?? 0, GAMEPAD.aimDeadzone);
    const aimMoved = aim.x !== 0 || aim.y !== 0;
    if (aimMoved) {
      const len = Math.hypot(aim.x, aim.y);
      this.aimDir = { x: aim.x / len, y: aim.y / len };
    }

    const frame: GamepadFrame = {
      move,
      run: now.has(BUTTON.LT) || now.has(BUTTON.LB),
      jumpPressed: justDown(BUTTON.A),
      webPressed: (justDown(BUTTON.RT) || justDown(BUTTON.RB)) && !(this.prev.has(BUTTON.RT) || this.prev.has(BUTTON.RB)),
      webHeld: now.has(BUTTON.RT) || now.has(BUTTON.RB),
      aimDir: { ...this.aimDir },
      aimMoved,
      musicPressed: justDown(BUTTON.SELECT),
      helpPressed: justDown(BUTTON.START),
    };
    this.prev = now;
    return frame;
  }
}

export type AimDevice = 'mouse' | 'gamepad';

/**
 * Junta teclado/mouse com o controle. Movimento soma (limitado a [-1, 1]), botões são OU.
 * A mira vem do dispositivo em `aimDevice`; no controle, é um ponto a `WEB.range` na direção mirada.
 */
export function mergeInput(
  kb: SpiderInput,
  pad: GamepadFrame | null,
  aimDevice: AimDevice,
  spiderPos: Vec2,
  range: number,
): SpiderInput {
  if (!pad) return kb;
  const aim =
    aimDevice === 'gamepad'
      ? { x: spiderPos.x + pad.aimDir.x * range, y: spiderPos.y + pad.aimDir.y * range }
      : kb.aim;
  return {
    move: { x: clampUnit(kb.move.x + pad.move.x), y: clampUnit(kb.move.y + pad.move.y) },
    run: kb.run || pad.run,
    jumpPressed: kb.jumpPressed || pad.jumpPressed,
    // Se um dos dois já segurava a teia, apertar o outro não dispara de novo.
    webPressed: (kb.webPressed && !pad.webHeld) || (pad.webPressed && !kb.webHeld),
    webHeld: kb.webHeld || pad.webHeld,
    aim,
  };
}

function clampUnit(v: number): number {
  return Math.max(-1, Math.min(1, v));
}
