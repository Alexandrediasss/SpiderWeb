import { describe, expect, it } from 'vitest';
import { INTRO } from '../src/config';
import { INTRO_PAGES } from '../src/level/story';
import { Timeline, textPageAt, textPageSec } from '../src/systems/cutscene';

describe('Timeline', () => {
  const tl = new Timeline([
    { name: 'a', sec: 1 },
    { name: 'b', sec: 2 },
    { name: 'c', sec: 0.5 },
  ]);

  it('soma a duração total', () => {
    expect(tl.total).toBe(3.5);
  });

  it('acha a etapa e o progresso dentro dela', () => {
    expect(tl.at(0)).toEqual({ index: 0, name: 'a', local: 0, progress: 0 });
    const b = tl.at(2);
    expect(b?.name).toBe('b');
    expect(b?.progress).toBeCloseTo(0.5);
    expect(tl.at(3.2)?.name).toBe('c');
  });

  it('termina depois da última etapa', () => {
    expect(tl.at(3.5)).toBeNull();
    expect(tl.at(10)).toBeNull();
  });
});

describe('páginas de texto', () => {
  const text = 'Hello world';

  it('escreve letra por letra e depois fica inteira', () => {
    expect(textPageAt(text, 0, INTRO).shown).toBe('');
    expect(textPageAt(text, 3 / INTRO.typeCps + 0.001, INTRO).shown).toBe('Hel');
    expect(textPageAt(text, 100, INTRO).shown).toBe(text);
  });

  it('fica visível e some no fim', () => {
    const typed = text.length / INTRO.typeCps;
    expect(textPageAt(text, typed + INTRO.holdSec / 2, INTRO).opacity).toBe(1);
    expect(textPageAt(text, typed + INTRO.holdSec + INTRO.textFadeSec / 2, INTRO).opacity).toBeCloseTo(0.5);
    expect(textPageAt(text, textPageSec(text, INTRO), INTRO).opacity).toBe(0);
  });

  it('o texto da abertura tem tempo de leitura razoável', () => {
    const total = INTRO_PAGES.reduce((s, p) => s + textPageSec(p, INTRO), 0);
    expect(total).toBeGreaterThan(8);
    expect(total).toBeLessThan(25);
  });
});
