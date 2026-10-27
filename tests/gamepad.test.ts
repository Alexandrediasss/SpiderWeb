import { describe, expect, it } from 'vitest';
import { BUTTON, type GamepadSnapshot, GamepadReader, applyDeadzone, mergeInput, snapTo8 } from '../src/systems/gamepad';
import { emptyInput } from '../src/systems/input';

/** Monta um controle com 17 botões soltos e os eixos/botões indicados. */
function pad(opts: { axes?: number[]; pressed?: number[]; values?: Record<number, number> } = {}): GamepadSnapshot {
  const buttons = Array.from({ length: 17 }, (_, i) => {
    const value = opts.values?.[i] ?? (opts.pressed?.includes(i) ? 1 : 0);
    return { pressed: opts.pressed?.includes(i) ?? false, value };
  });
  return { axes: opts.axes ?? [0, 0, 0, 0], buttons };
}

describe('applyDeadzone', () => {
  it('zera abaixo da zona morta', () => {
    expect(applyDeadzone(0.1, 0.1, 0.3)).toEqual({ x: 0, y: 0 });
  });

  it('reescala a magnitude a partir da zona morta', () => {
    const v = applyDeadzone(1, 0, 0.3);
    expect(v.x).toBeCloseTo(1);
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
    expect(new GamepadReader().read(null)).toBeNull();
  });

  it('analógico esquerdo vira movimento de 8 direções', () => {
    const f = new GamepadReader().read(pad({ axes: [0.8, 0.25, 0, 0] }));
    expect(f?.move).toEqual({ x: 1, y: 0 });
  });

  it('D-pad também move', () => {
    const f = new GamepadReader().read(pad({ pressed: [BUTTON.LEFT, BUTTON.UP] }));
    expect(f?.move).toEqual({ x: -1, y: -1 });
  });

  it('pular só no frame em que A foi apertado', () => {
    const r = new GamepadReader();
    expect(r.read(pad({ pressed: [BUTTON.A] }))?.jumpPressed).toBe(true);
    expect(r.read(pad({ pressed: [BUTTON.A] }))?.jumpPressed).toBe(false);
    r.read(pad());
    expect(r.read(pad({ pressed: [BUTTON.A] }))?.jumpPressed).toBe(true);
  });

  it('RT conta pelo valor analógico do gatilho', () => {
    const r = new GamepadReader();
    expect(r.read(pad({ values: { [BUTTON.RT]: 0.1 } }))?.webHeld).toBe(false);
    const f = r.read(pad({ values: { [BUTTON.RT]: 0.6 } }));
    expect(f?.webHeld).toBe(true);
    expect(f?.webPressed).toBe(true);
    expect(r.read(pad({ values: { [BUTTON.RT]: 0.9 } }))?.webPressed).toBe(false);
  });

  it('apertar RB com RT já seguro não dispara outra teia', () => {
    const r = new GamepadReader();
    r.read(pad({ pressed: [BUTTON.RT] }));
    const f = r.read(pad({ pressed: [BUTTON.RT, BUTTON.RB] }));
    expect(f?.webPressed).toBe(false);
    expect(f?.webHeld).toBe(true);
  });

  it('LT ou LB correm', () => {
    expect(new GamepadReader().read(pad({ pressed: [BUTTON.LB] }))?.run).toBe(true);
    expect(new GamepadReader().read(pad({ values: { [BUTTON.LT]: 0.5 } }))?.run).toBe(true);
  });

  it('mira começa para cima e guarda a última direção ao soltar o analógico', () => {
    const r = new GamepadReader();
    expect(r.read(pad())?.aimDir).toEqual({ x: 0, y: -1 });
    const f = r.read(pad({ axes: [0, 0, 1, 0] }));
    expect(f?.aimMoved).toBe(true);
    expect(f?.aimDir.x).toBeCloseTo(1);
    const g = r.read(pad());
    expect(g?.aimMoved).toBe(false);
    expect(g?.aimDir.x).toBeCloseTo(1);
  });

  it('Select e Start disparam música e ajuda uma vez', () => {
    const r = new GamepadReader();
    const f = r.read(pad({ pressed: [BUTTON.SELECT, BUTTON.START] }));
    expect(f?.musicPressed).toBe(true);
    expect(f?.helpPressed).toBe(true);
    expect(r.read(pad({ pressed: [BUTTON.SELECT] }))?.musicPressed).toBe(false);
  });
});

describe('mergeInput', () => {
  const pos = { x: 100, y: 100 };

  it('sem controle devolve o teclado', () => {
    const kb = emptyInput();
    expect(mergeInput(kb, null, 'gamepad', pos, 240)).toBe(kb);
  });

  it('soma movimento e limita a 1', () => {
    const kb = { ...emptyInput(), move: { x: 1, y: 0 } };
    const f = new GamepadReader().read(pad({ axes: [1, 0, 0, 0] }));
    expect(mergeInput(kb, f, 'mouse', pos, 240).move).toEqual({ x: 1, y: 0 });
  });

  it('mira do controle vira um ponto no alcance da teia', () => {
    const kb = { ...emptyInput(), aim: { x: 5, y: 5 } };
    const f = new GamepadReader().read(pad({ axes: [0, 0, -1, 0] }));
    const aim = mergeInput(kb, f, 'gamepad', pos, 240).aim;
    expect(aim.x).toBeCloseTo(-140);
    expect(aim.y).toBeCloseTo(100);
    expect(mergeInput(kb, f, 'mouse', pos, 240).aim).toEqual({ x: 5, y: 5 });
  });

  it('teia segura no mouse não redispara ao apertar RT', () => {
    const kb = { ...emptyInput(), webHeld: true };
    const f = new GamepadReader().read(pad({ pressed: [BUTTON.RT] }));
    const m = mergeInput(kb, f, 'gamepad', pos, 240);
    expect(m.webPressed).toBe(false);
    expect(m.webHeld).toBe(true);
  });
});
