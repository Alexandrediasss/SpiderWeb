import { describe, expect, it } from 'vitest';
import { ACTS } from '../src/level/acts';
import { stepMenu } from '../src/systems/menu';
import { currentActIndex, emptyProgress, hasProgress, recordActEnd } from '../src/systems/progress';

describe('stepMenu', () => {
  it('anda para baixo e para cima dando a volta', () => {
    const all = [true, true, true, true];
    expect(stepMenu(all, 0, 1)).toBe(1);
    expect(stepMenu(all, 3, 1)).toBe(0);
    expect(stepMenu(all, 0, -1)).toBe(3);
  });

  it('pula os itens apagados (LOAD GAME sem jogo salvo)', () => {
    const noLoad = [true, false, true, true];
    expect(stepMenu(noLoad, 0, 1)).toBe(2);
    expect(stepMenu(noLoad, 2, -1)).toBe(0);
  });

  it('sem nenhum aceso, fica onde está', () => {
    expect(stepMenu([false, false], 1, 1)).toBe(1);
    expect(stepMenu([], 0, 1)).toBe(0);
  });
});

describe('jogo salvo', () => {
  it('progresso vazio não pede confirmação no NEW GAME; ato terminado ou carta achada pede', () => {
    expect(hasProgress(emptyProgress())).toBe(false);
    expect(hasProgress({ completed: [], letters: { act1: [] } })).toBe(false);
    expect(hasProgress({ completed: [], letters: { act1: ['bed'] } })).toBe(true);
    expect(hasProgress(recordActEnd(emptyProgress(), 'act1', []))).toBe(true);
  });

  it('o LOAD GAME abre no ato mais adiantado já liberado', () => {
    expect(currentActIndex(emptyProgress(), ACTS)).toBe(0);
    const after1 = recordActEnd(emptyProgress(), 'act1', []);
    expect(currentActIndex(after1, ACTS)).toBe(1);
    // O ato 3 ainda não existe: continua no 2 mesmo depois de terminar o 2.
    expect(currentActIndex(recordActEnd(after1, 'act2', []), ACTS)).toBe(1);
  });
});
