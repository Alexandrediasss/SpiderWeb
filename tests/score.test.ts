import { describe, expect, it } from 'vitest';
import { BEATS_PER_BAR, SECTIONS, buildSong, noteToMidi } from '../src/audio/score';

describe('noteToMidi', () => {
  it('converte nomes de notas', () => {
    expect(noteToMidi('A4')).toBe(69);
    expect(noteToMidi('C#5')).toBe(73);
    expect(noteToMidi('Bb1')).toBe(34);
    expect(noteToMidi('C4')).toBe(60);
  });

  it('recusa notas inválidas', () => {
    expect(() => noteToMidi('H2')).toThrow();
  });
});

describe('partitura', () => {
  it('cada compasso da melodia soma 3 tempos', () => {
    for (const [name, bars] of Object.entries(SECTIONS)) {
      bars.forEach((bar, i) => {
        const total = bar.melody.reduce((s, [, beats]) => s + beats, 0);
        expect(total, `${name} compasso ${i + 1}`).toBeCloseTo(BEATS_PER_BAR);
      });
    }
  });

  it('gera eventos ordenados dentro do loop', () => {
    const song = buildSong(66);
    // A + B + A + B + 1 compasso de pausa = 33 compassos
    expect(song.length).toBeCloseTo((33 * 3 * 60) / 66);
    expect(song.events.length).toBeGreaterThan(200);
    for (let i = 1; i < song.events.length; i++) {
      expect(song.events[i].time).toBeGreaterThanOrEqual(song.events[i - 1].time);
    }
    expect(song.events.every((e) => e.time < song.length && e.velocity > 0 && e.velocity <= 1)).toBe(true);
  });
});
