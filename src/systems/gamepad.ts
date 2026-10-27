// Controle (gamepad): converte o estado cru da Gamepad API em input do jogo. Lógica pura.
// Spec: docs/features/gamepad.md
import { GAMEPAD } from '../config';
import type { LevelGrid } from '../physics/LevelGrid';
import type { Vec2 } from '../physics/surfaces';
import type { SpiderInput } from './input';
import { raycastWeb } from './webRope';

/** Índices do mapa "standard gamepad" do W3C (layout Xbox). */
export const BUTTON = {
  A: 0,
  X: 2,
  LB: 4,
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
  /** Direção unitária da mira (antes da mira assistida). */
  aimDir: Vec2;
  /** O jogador está mirando com o analógico direito neste frame. */
  aimMoved: boolean;
  /** `Start` ou `A` apertados neste frame (para confirmar em menus). */
  confirmPressed: boolean;
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
  /** Inclinações recentes do analógico direito, para ignorar o "solavanco" ao soltar. */
  private aimHistory: { t: number; mag: number }[] = [];

  /** `nowMs`: relógio em milissegundos (qualquer origem, só precisa crescer). */
  read(pad: GamepadSnapshot | null, nowMs: number): GamepadFrame | null {
    if (!pad) {
      this.prev.clear();
      this.aimHistory = [];
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

    const aimMoved = this.updateAim(pad.axes[2] ?? 0, pad.axes[3] ?? 0, nowMs);
    const webBefore = this.prev.has(BUTTON.RT) || this.prev.has(BUTTON.X);
    const webNow = now.has(BUTTON.RT) || now.has(BUTTON.X);

    const frame: GamepadFrame = {
      move,
      run: now.has(BUTTON.LT) || now.has(BUTTON.LB),
      jumpPressed: justDown(BUTTON.A),
      webPressed: webNow && !webBefore,
      webHeld: webNow,
      aimDir: { ...this.aimDir },
      aimMoved,
      confirmPressed: justDown(BUTTON.A) || justDown(BUTTON.START),
      musicPressed: justDown(BUTTON.SELECT),
      helpPressed: justDown(BUTTON.START),
    };
    this.prev = now;
    return frame;
  }

  /**
   * Atualiza a direção da mira. Só aceita a leitura atual se o analógico estiver quase tão inclinado
   * quanto no pico recente: ao soltar, ele passa por leituras fracas e tortas que mudariam a mira.
   */
  private updateAim(ax: number, ay: number, nowMs: number): boolean {
    const aim = applyDeadzone(ax, ay, GAMEPAD.aimDeadzone);
    const mag = Math.hypot(aim.x, aim.y);
    this.aimHistory = this.aimHistory.filter((s) => nowMs - s.t <= GAMEPAD.aimHoldMs);
    const peak = this.aimHistory.reduce((m, s) => Math.max(m, s.mag), mag);
    this.aimHistory.push({ t: nowMs, mag });
    if (mag === 0 || mag < peak * GAMEPAD.aimReleaseRatio) return false;
    this.aimDir = { x: aim.x / mag, y: aim.y / mag };
    return true;
  }
}

/**
 * Mira assistida: se o raio na direção `dir` não acerta nada dentro de `range`, gira aos poucos
 * para os dois lados (até `maxDeg`) e devolve a primeira direção que acerta. Senão, devolve `dir`.
 */
export function assistAim(grid: LevelGrid, from: Vec2, dir: Vec2, range: number, maxDeg: number, stepDeg: number): Vec2 {
  const hits = (d: Vec2) => raycastWeb(grid, from, { x: from.x + d.x * range, y: from.y + d.y * range }, range);
  if (hits(dir)) return dir;
  const base = Math.atan2(dir.y, dir.x);
  for (let k = 1; k * stepDeg <= maxDeg; k++) {
    for (const side of [1, -1]) {
      const a = base + (side * k * stepDeg * Math.PI) / 180;
      const d = { x: Math.cos(a), y: Math.sin(a) };
      if (hits(d)) return d;
    }
  }
  return dir;
}

export type AimDevice = 'mouse' | 'gamepad';

/**
 * Junta teclado/mouse com o controle. Movimento soma (limitado a [-1, 1]), botões são OU.
 * A mira vem do dispositivo em `aimDevice`; no controle, é um ponto a `range` px na direção `padAimDir`.
 */
export function mergeInput(
  kb: SpiderInput,
  pad: GamepadFrame | null,
  aimDevice: AimDevice,
  spiderPos: Vec2,
  padAimDir: Vec2,
  range: number,
): SpiderInput {
  if (!pad) return kb;
  const aim =
    aimDevice === 'gamepad'
      ? { x: spiderPos.x + padAimDir.x * range, y: spiderPos.y + padAimDir.y * range }
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
