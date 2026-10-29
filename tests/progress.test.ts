import { describe, expect, it } from 'vitest';
import { ACTS } from '../src/level/acts';
import { actStatus, emptyProgress, parseProgress, recordActEnd } from '../src/systems/progress';

const act1 = ACTS[0];

describe('parseProgress', () => {
  it('vazio, estragado ou de outro formato vira progresso vazio', () => {
    for (const bad of [null, '', '{', '42', 'null', '"x"', '[]']) expect(parseProgress(bad)).toEqual(emptyProgress());
  });

  it('ignora campos com tipo errado e tira repetidos', () => {
    const p = parseProgress(JSON.stringify({ completed: ['act1', 'act1', 3], letters: { act1: ['bed', 'bed'], act2: 'x' } }));
    expect(p).toEqual({ completed: [], letters: { act1: ['bed'] } });
    const q = parseProgress(JSON.stringify({ completed: ['act1', 'act1'] }));
    expect(q.completed).toEqual(['act1']);
  });

  it('ida e volta pelo JSON', () => {
    const p = recordActEnd(emptyProgress(), 'act1', ['table']);
    expect(parseProgress(JSON.stringify(p))).toEqual(p);
  });
});

describe('recordActEnd', () => {
  it('marca o ato e junta as cartas com as de jogadas anteriores', () => {
    const a = recordActEnd(emptyProgress(), 'act1', ['table', 'bed']);
    const b = recordActEnd(a, 'act1', ['attic', 'table']);
    expect(b.completed).toEqual(['act1']);
    expect(b.letters.act1.sort()).toEqual(['attic', 'bed', 'table']);
    // Não muda o original.
    expect(a.letters.act1).toEqual(['table', 'bed']);
  });
});

describe('actStatus', () => {
  it('conta só cartas que pertencem ao ato', () => {
    const p = recordActEnd(emptyProgress(), 'act1', ['table', 'outra']);
    expect(actStatus(p, act1)).toEqual({ completed: true, lettersFound: 1, lettersTotal: 3 });
    expect(actStatus(emptyProgress(), act1)).toEqual({ completed: false, lettersFound: 0, lettersTotal: 3 });
  });
});
