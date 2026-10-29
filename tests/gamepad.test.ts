import { describe, expect, it } from 'vitest';
import {
  BUTTON,
  type GamepadSnapshot,
  GamepadReader,
  applyDeadzone,
  assistAim,
  mergeInput,
  snapTo8,
} from '../src/systems/gamepad';
import { emptyInput } from '../src/systems/input';
import { grid } from './helpers';

/** Monta um controle com 17 botões soltos e os eixos/botões indicados. */
function pad(opts: { axes?: number[]; pressed?: number[]; values?: Record<number, number> } = {}): GamepadSnapshot {
  const buttons = Array.from({ length: 17 }, (_, i) => {
    const value = opts.values?.[i] ?? (opts.pressed?.includes(i) ? 1 : 0);
    return { pressed: opts.pressed?.includes(i) ?? false, value };
  });
  return { axes: opts.axes ?? [0, 0, 0, 0], buttons };
}

/** Lê uma sequência de estados a 60 fps e devolve o último quadro. */
function readFrames(r: GamepadReader, pads: GamepadSnapshot[], startMs = 0) {
  let f = null;
  pads.forEach((p, i) => (f = r.read(p, startMs + i * 16)));
  return f as ReturnType<GamepadReader['read']>;
}

describe('applyDeadzone', () => {
  it('zera abaixo da zona morta', () => {
    expect(applyDeadzone(0.1, 0.1, 0.3)).toEqual({ x: 0, y: 0 });
  });

  it('reescala a magnitude a partir da zona morta', () => {
    expect(applyDeadzone(1, 0, 0.3).x).toBeCloseTo(1);
    expect(applyDeadzone(0.65, 0, 0.3).x).toBeCloseTo(0.5);
  });
});

describe('snapTo8', () => {
  it('encaixa um leve desvio na direção pura', () => {
    expect(snapTo8({ x: 0.9, y: 0.3 })).toEqual({ x: 1, y: 0 });
    expect(snapTo8({ x: -0.2, y: -0.95 })).toEqual({ x: 0, y: -1 });
  });

  it('mantém diagonais', () => {
    expect(snapTo8({ x: 0.7, y: 0.7 })).toEqual({ x: 1, y: 1 });
  });

  it('zero continua zero', () => {
    expect(snapTo8({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });
});

describe('GamepadReader', () => {
  it('sem controle devolve null', () => {
    expect(new GamepadReader().read(null, 0)).toBeNull();
  });

  it('analógico esquerdo vira movimento de 8 direções', () => {
    expect(new GamepadReader().read(pad({ axes: [0.8, 0.25, 0, 0] }), 0)?.move).toEqual({ x: 1, y: 0 });
  });

  it('D-pad também move', () => {
    expect(new GamepadReader().read(pad({ pressed: [BUTTON.LEFT, BUTTON.UP] }), 0)?.move).toEqual({ x: -1, y: -1 });
  });

  it('pular só no frame em que A foi apertado', () => {
    const r = new GamepadReader();
    expect(r.read(pad({ pressed: [BUTTON.A] }), 0)?.jumpPressed).toBe(true);
    expect(r.read(pad({ pressed: [BUTTON.A] }), 16)?.jumpPressed).toBe(false);
    r.read(pad(), 32);
    expect(r.read(pad({ pressed: [BUTTON.A] }), 48)?.jumpPressed).toBe(true);
  });

  it('RB atira a teia de balanço e segura enquanto apertado', () => {
    const r = new GamepadReader();
    const f = r.read(pad({ pressed: [BUTTON.RB] }), 0);
    expect(f?.webPressed).toBe(true);
    expect(f?.webHeld).toBe(true);
    const g = r.read(pad({ pressed: [BUTTON.RB] }), 16);
    expect(g?.webPressed).toBe(false);
    expect(g?.webHeld).toBe(true);
    expect(r.read(pad(), 32)?.webHeld).toBe(false);
  });

  it('X atira teia de ataque e B teia que prende, uma vez por aperto', () => {
    const r = new GamepadReader();
    const f = r.read(pad({ pressed: [BUTTON.X, BUTTON.B] }), 0);
    expect(f?.attackPressed).toBe(true);
    expect(f?.trapPressed).toBe(true);
    expect(f?.webHeld).toBe(false);
    const g = r.read(pad({ pressed: [BUTTON.X, BUTTON.B] }), 16);
    expect(g?.attackPressed).toBe(false);
    expect(g?.trapPressed).toBe(false);
  });

  it('RT conta pelo valor analógico do gatilho', () => {
    const r = new GamepadReader();
    expect(r.read(pad({ values: { [BUTTON.RT]: 0.1 } }), 0)?.webHeld).toBe(false);
    const f = r.read(pad({ values: { [BUTTON.RT]: 0.6 } }), 16);
    expect(f?.webHeld).toBe(true);
    expect(f?.webPressed).toBe(true);
    expect(r.read(pad({ values: { [BUTTON.RT]: 0.9 } }), 32)?.webPressed).toBe(false);
  });

  it('apertar RB com RT já seguro não dispara outra teia', () => {
    const r = new GamepadReader();
    r.read(pad({ pressed: [BUTTON.RT] }), 0);
    const f = r.read(pad({ pressed: [BUTTON.RT, BUTTON.RB] }), 16);
    expect(f?.webPressed).toBe(false);
    expect(f?.webHeld).toBe(true);
  });

  it('LT ou LB correm', () => {
    expect(new GamepadReader().read(pad({ pressed: [BUTTON.LB] }), 0)?.run).toBe(true);
    expect(new GamepadReader().read(pad({ values: { [BUTTON.LT]: 0.5 } }), 0)?.run).toBe(true);
  });

  it('mira começa para cima e guarda a última direção ao soltar o analógico', () => {
    const r = new GamepadReader();
    expect(r.read(pad(), 0)?.aimDir).toEqual({ x: 0, y: -1 });
    const f = r.read(pad({ axes: [0, 0, 1, 0] }), 16);
    expect(f?.aimMoved).toBe(true);
    expect(f?.aimDir.x).toBeCloseTo(1);
    const g = r.read(pad(), 32);
    expect(g?.aimMoved).toBe(false);
    expect(g?.aimDir.x).toBeCloseTo(1);
  });

  it('o solavanco torto ao soltar o analógico não muda a mira', () => {
    const r = new GamepadReader();
    // Mira firme para a direita; ao soltar, passa por leituras fracas e tortas antes do centro.
    const f = readFrames(r, [
      pad({ axes: [0, 0, 1, 0] }),
      pad({ axes: [0, 0, 1, 0] }),
      pad({ axes: [0, 0, 0.6, 0.35] }),
      pad({ axes: [0, 0, 0.3, -0.45] }),
      pad({ axes: [0, 0, 0, 0] }),
    ]);
    expect(f?.aimDir.x).toBeCloseTo(1);
    expect(f?.aimDir.y).toBeCloseTo(0);
  });

  it('inclinar o analógico só um pouco e manter ainda muda a mira', () => {
    const r = new GamepadReader();
    readFrames(r, [pad({ axes: [0, 0, 1, 0] })]);
    // Depois de passar a janela do pico, uma inclinação menor e firme vale.
    const f = readFrames(r, Array.from({ length: 12 }, () => pad({ axes: [0, 0, 0, -0.7] })), 500);
    expect(f?.aimDir.y).toBeCloseTo(-1);
  });

  it('A confirma, Start pausa e Select muda o som, uma vez por aperto', () => {
    const r = new GamepadReader();
    const f = r.read(pad({ pressed: [BUTTON.SELECT, BUTTON.START, BUTTON.A] }), 0);
    expect(f?.confirmPressed).toBe(true);
    expect(f?.pausePressed).toBe(true);
    expect(f?.musicPressed).toBe(true);
    const g = r.read(pad({ pressed: [BUTTON.SELECT, BUTTON.START, BUTTON.A] }), 16);
    expect(g?.pausePressed).toBe(false);
    expect(g?.musicPressed).toBe(false);
  });

  it('navegação de menu: um passo por empurrão do D-pad ou analógico', () => {
    const r = new GamepadReader();
    expect(r.read(pad({ pressed: [BUTTON.DOWN] }), 0)?.navY).toBe(1);
    expect(r.read(pad({ pressed: [BUTTON.DOWN] }), 16)?.navY).toBe(0);
    expect(r.read(pad(), 32)?.navY).toBe(0);
    expect(r.read(pad({ axes: [0, -1, 0, 0] }), 48)?.navY).toBe(-1);
  });

  it('navegação para os lados: D-pad, analógico, LB e RB, um passo por aperto', () => {
    const r = new GamepadReader();
    expect(r.read(pad({ pressed: [BUTTON.RIGHT] }), 0)?.navX).toBe(1);
    expect(r.read(pad({ pressed: [BUTTON.RIGHT] }), 16)?.navX).toBe(0);
    expect(r.read(pad({ axes: [-1, 0, 0, 0] }), 32)?.navX).toBe(-1);
    expect(r.read(pad(), 48)?.navX).toBe(0);
    expect(r.read(pad({ pressed: [BUTTON.LB] }), 64)?.navX).toBe(-1);
    expect(r.read(pad({ pressed: [BUTTON.LB] }), 80)?.navX).toBe(0);
    expect(r.read(pad({ pressed: [BUTTON.RB] }), 96)?.navX).toBe(1);
  });

  it('Y lê a carta, uma vez por aperto; "active" só com o controle em uso', () => {
    const r = new GamepadReader();
    const idle = r.read(pad(), 0);
    expect(idle?.readPressed).toBe(false);
    expect(idle?.active).toBe(false);
    const y = r.read(pad({ pressed: [BUTTON.Y] }), 16);
    expect(y?.readPressed).toBe(true);
    expect(y?.active).toBe(true);
    expect(r.read(pad({ pressed: [BUTTON.Y] }), 32)?.readPressed).toBe(false);
  });
});

describe('assistAim', () => {
  // Corredor comprido: mirando reto para a direita o raio não alcança a parede do fundo.
  const HALL = ['#'.repeat(40), '#' + '.'.repeat(38) + '#', '#' + '.'.repeat(38) + '#', '#'.repeat(40)];

  it('mantém a direção se ela já acerta algo', () => {
    const d = assistAim(grid(), { x: 40, y: 100 }, { x: 0, y: -1 }, 240, 14, 1);
    expect(d).toEqual({ x: 0, y: -1 });
  });

  it('gira um pouco para achar um alvo quando o raio erra', () => {
    const from = { x: 40, y: 24 };
    const d = assistAim(grid(HALL), from, { x: 1, y: 0 }, 240, 14, 1);
    expect(Math.abs(d.y)).toBeGreaterThan(0);
    expect(Math.abs(Math.atan2(d.y, d.x))).toBeLessThanOrEqual((14 * Math.PI) / 180 + 1e-9);
  });

  it('desiste se nada estiver no cone', () => {
    const big = ['#'.repeat(60), ...Array.from({ length: 30 }, () => '#' + '.'.repeat(58) + '#'), '#'.repeat(60)];
    const d = assistAim(grid(big), { x: 100, y: 250 }, { x: 1, y: 0 }, 100, 14, 1);
    expect(d).toEqual({ x: 1, y: 0 });
  });
});

describe('mergeInput', () => {
  const pos = { x: 100, y: 100 };

  it('sem controle devolve o teclado', () => {
    const kb = emptyInput();
    expect(mergeInput(kb, null, 'gamepad', pos, { x: 0, y: -1 }, 240)).toBe(kb);
  });

  it('soma movimento e limita a 1', () => {
    const kb = { ...emptyInput(), move: { x: 1, y: 0 } };
    const f = new GamepadReader().read(pad({ axes: [1, 0, 0, 0] }), 0);
    expect(mergeInput(kb, f, 'mouse', pos, { x: 0, y: -1 }, 240).move).toEqual({ x: 1, y: 0 });
  });

  it('mira do controle vira um ponto no alcance da teia', () => {
    const kb = { ...emptyInput(), aim: { x: 5, y: 5 } };
    const f = new GamepadReader().read(pad(), 0);
    const aim = mergeInput(kb, f, 'gamepad', pos, { x: -1, y: 0 }, 240).aim;
    expect(aim.x).toBeCloseTo(-140);
    expect(aim.y).toBeCloseTo(100);
    expect(mergeInput(kb, f, 'mouse', pos, { x: -1, y: 0 }, 240).aim).toEqual({ x: 5, y: 5 });
  });

  it('teia segura no mouse não redispara ao apertar RB', () => {
    const kb = { ...emptyInput(), webHeld: true };
    const f = new GamepadReader().read(pad({ pressed: [BUTTON.RB] }), 0);
    const m = mergeInput(kb, f, 'gamepad', pos, { x: 0, y: -1 }, 240);
    expect(m.webPressed).toBe(false);
    expect(m.webHeld).toBe(true);
  });
});
