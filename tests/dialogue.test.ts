import { describe, expect, it } from 'vitest';
import { DIALOGUE } from '../src/config';
import { DIALOGUES } from '../src/level/dialogues';
import { DialogueRun } from '../src/systems/dialogue';

describe('falas da Mary', () => {
  it('o texto aparece letra por letra, com a voz a cada blipEvery letras', () => {
    const run = new DialogueRun([{ text: 'abcdefgh', mood: 'normal' }]);
    let blips = run.update(3.5 / DIALOGUE.cps);
    expect(run.shown).toBe('abc');
    blips += run.update(10);
    expect(run.shown).toBe('abcdefgh');
    expect(run.typing).toBe(false);
    expect(blips).toBe(Math.ceil(8 / DIALOGUE.blipEvery));
  });

  it('espaços e pontuação não têm voz, e a pontuação dá uma pausa', () => {
    const run = new DialogueRun([{ text: 'a. b', mood: 'normal' }]);
    expect(run.update(10)).toBe(Math.ceil(2 / DIALOGUE.blipEvery));
    const slow = new DialogueRun([{ text: 'a.b', mood: 'normal' }]);
    slow.update(3.2 / DIALOGUE.cps);
    expect(slow.shown).toBe('a.');
  });

  it('avançar: completa a linha, passa para a próxima e termina na última', () => {
    const run = new DialogueRun([
      { text: 'Hello there.', mood: 'normal' },
      { text: 'Bye.', mood: 'sad' },
    ]);
    run.update(0.05);
    expect(run.advance()).toBe('completed');
    expect(run.shown).toBe('Hello there.');
    expect(run.advance()).toBe('next');
    expect(run.line.mood).toBe('sad');
    expect(run.shown).toBe('');
    run.update(10);
    expect(run.advance()).toBe('done');
    expect(run.done).toBe(true);
    expect(run.update(1)).toBe(0);
  });

  it('as falas do jogo existem e cabem na caixa', () => {
    for (const lines of Object.values(DIALOGUES)) {
      expect(lines.length).toBeGreaterThan(0);
      for (const l of lines) expect(l.text.length).toBeLessThanOrEqual(90);
    }
    expect(DIALOGUES.day40.some((l) => l.mood === 'cry')).toBe(true);
  });
});
