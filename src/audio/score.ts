// Partitura do tema da casa: valsa lenta em Ré menor. Lógica pura (sem Web Audio).
// Spec: docs/features/music.md

export const BEATS_PER_BAR = 3;

/** [nota, duração em tempos]. '-' = pausa. */
export type MelodyNote = [string, number];

export interface Bar {
  /** Nota grave no 1º tempo. */
  bass: string;
  /** 3 notas do arpejo (do grave para o agudo). */
  chord: [string, string, string];
  melody: MelodyNote[];
}

// ---------- Parte A: o tema, com o baixo de lamento descendo ----------
const A: Bar[] = [
  { bass: 'D2', chord: ['A2', 'D3', 'F3'], melody: [['-', 1], ['A4', 1], ['D5', 1]] }, // Dm
  { bass: 'C#2', chord: ['A2', 'E3', 'G3'], melody: [['E5', 1.5], ['F5', 0.5], ['E5', 1]] }, // A7/C#
  { bass: 'C2', chord: ['A2', 'D3', 'F3'], melody: [['D5', 1], ['A4', 2]] }, // Dm/C
  { bass: 'B1', chord: ['G#2', 'D3', 'F3'], melody: [['B4', 1.5], ['A4', 0.5], ['G#4', 1]] }, // E7/B
  { bass: 'Bb1', chord: ['F2', 'A2', 'D3'], melody: [['A4', 1], ['Bb4', 1], ['D5', 1]] }, // Bbmaj7
  { bass: 'G1', chord: ['G2', 'Bb2', 'D3'], melody: [['G5', 2], ['F5', 0.5], ['E5', 0.5]] }, // Gm
  { bass: 'E2', chord: ['B2', 'D3', 'G#3'], melody: [['D5', 1], ['B4', 1], ['G#4', 1]] }, // E7
  { bass: 'A1', chord: ['C#3', 'E3', 'G3'], melody: [['A4', 0.25], ['G#4', 0.25], ['A4', 2.5]] }, // A7 + mordente
];

// ---------- Parte B: resposta mais aguda ----------
const B: Bar[] = [
  { bass: 'G1', chord: ['D3', 'G3', 'Bb3'], melody: [['Bb5', 1.5], ['A5', 0.5], ['G5', 1]] }, // Gm
  { bass: 'A1', chord: ['A2', 'D3', 'F3'], melody: [['F5', 1], ['A5', 1], ['D5', 1]] }, // Dm/A
  { bass: 'Bb1', chord: ['F2', 'Bb2', 'D3'], melody: [['F5', 1.5], ['E5', 0.5], ['D5', 1]] }, // Bb
  { bass: 'A1', chord: ['A2', 'C#3', 'E3'], melody: [['C#5', 2], ['E5', 1]] }, // A
  { bass: 'D2', chord: ['A2', 'D3', 'F3'], melody: [['D5', 1], ['F5', 1], ['A5', 1]] }, // Dm
  { bass: 'Bb1', chord: ['G2', 'Bb2', 'D3'], melody: [['Bb5', 1.5], ['A5', 0.5], ['G5', 1]] }, // Gm/Bb
  { bass: 'A1', chord: ['G2', 'C#3', 'E3'], melody: [['F5', 0.5], ['E5', 0.5], ['C#5', 0.5], ['E5', 0.5], ['A4', 1]] }, // A7
  { bass: 'D2', chord: ['A2', 'D3', 'F3'], melody: [['D5', 3]] }, // Dm
];

export const SECTIONS = { A, B };

export interface PartRef {
  section: keyof typeof SECTIONS | 'rest';
  /** Transposição da melodia em semitons. */
  melodyShift?: number;
  /** Multiplicador de volume da parte. */
  volume?: number;
  bars?: number;
}

/** Ordem das partes no loop. */
export const ARRANGEMENT: PartRef[] = [
  { section: 'A' },
  { section: 'B' },
  { section: 'A', melodyShift: 12, volume: 0.65 },
  { section: 'B', volume: 0.85 },
  { section: 'rest', bars: 1 },
];

export interface NoteEvent {
  /** Início em segundos desde o começo do loop. */
  time: number;
  midi: number;
  /** Duração em segundos (até o abafador soltar). */
  duration: number;
  /** 0..1 */
  velocity: number;
}

export interface Song {
  events: NoteEvent[];
  /** Duração do loop em segundos. */
  length: number;
}

const NOTE_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** 'A4' → 69, 'C#5' → 73, 'Bb1' → 34. */
export function noteToMidi(note: string): number {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(note);
  if (!m) throw new Error(`Nota inválida: '${note}'`);
  const accidental = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return 12 * (Number(m[3]) + 1) + NOTE_INDEX[m[1]] + accidental;
}

/** Variação determinística entre -1 e 1 (humanização). */
function jitter(i: number, k: number): number {
  let h = Math.imul(i * 374761393 + k * 668265263, 1274126177);
  h ^= h >>> 16;
  return ((h >>> 0) / 4294967295) * 2 - 1;
}

export function buildSong(bpm: number, arrangement: PartRef[] = ARRANGEMENT): Song {
  const beat = 60 / bpm;
  const events: NoteEvent[] = [];
  let barStart = 0;
  let n = 0;
  const push = (time: number, note: string, beats: number, velocity: number, shift = 0) => {
    n++;
    events.push({
      time: Math.max(0, time + jitter(n, 1) * 0.008),
      midi: noteToMidi(note) + shift,
      duration: beats * beat,
      velocity: Math.min(1, velocity * (1 + jitter(n, 2) * 0.08)),
    });
  };

  for (const part of arrangement) {
    if (part.section === 'rest') {
      barStart += (part.bars ?? 1) * BEATS_PER_BAR * beat;
      continue;
    }
    const vol = part.volume ?? 1;
    for (const bar of SECTIONS[part.section]) {
      // Mão esquerda: arpejo em colcheias, segurado pelo pedal até o fim do compasso.
      const [c0, c1, c2] = bar.chord;
      [bar.bass, c0, c1, c2, c1, c0].forEach((note, i) => {
        const start = i * 0.5;
        const velocity = (i === 0 ? 0.5 : i === 3 ? 0.36 : 0.3) * vol;
        push(barStart + start * beat, note, BEATS_PER_BAR - start + 0.15, velocity);
      });
      // Mão direita: melodia.
      let t = 0;
      for (const [note, beats] of bar.melody) {
        if (note !== '-') push(barStart + t * beat, note, beats * 1.05, 0.62 * vol, part.melodyShift ?? 0);
        t += beats;
      }
      barStart += BEATS_PER_BAR * beat;
    }
  }

  events.sort((a, b) => a.time - b.time);
  return { events, length: barStart };
}
