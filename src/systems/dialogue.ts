// Falas da Mary: o texto aparecendo letra por letra, avançar e as sílabas da voz ("ts"). Lógica pura.
// Spec: docs/features/dialogue.md
import { DIALOGUE } from '../config';

export type Mood = 'normal' | 'surprised' | 'sad' | 'cry';

export interface DialogueLine {
  text: string;
  mood: Mood;
}

export type AdvanceResult = 'completed' | 'next' | 'done';

const PAUSES = new Set(['.', ',', '!', '?', '…', ';', ':']);
const SILENT = /[\s.,!?…;:'"\-]/;

export class DialogueRun {
  index = 0;
  /** Letras já mostradas da linha atual. */
  chars = 0;
  /** Tempo acumulado para a próxima letra (s). */
  private clock = 0;
  /** Letras com voz desde o último "ts". */
  private voiced = 0;

  constructor(readonly lines: DialogueLine[]) {}

  get line(): DialogueLine {
    return this.lines[Math.min(this.index, this.lines.length - 1)];
  }

  get shown(): string {
    return this.line.text.slice(0, this.chars);
  }

  /** A linha atual ainda está aparecendo? */
  get typing(): boolean {
    return this.chars < this.line.text.length;
  }

  get done(): boolean {
    return this.index >= this.lines.length;
  }

  /** Avança o tempo. Devolve quantos "ts" da voz tocar neste quadro. */
  update(dt: number): number {
    if (this.done) return 0;
    let blips = 0;
    this.clock += dt;
    const text = this.line.text;
    while (this.chars < text.length) {
      const prev = this.chars > 0 ? text[this.chars - 1] : '';
      const wait = 1 / DIALOGUE.cps + (PAUSES.has(prev) ? DIALOGUE.punctuationPauseSec : 0);
      if (this.clock < wait) break;
      this.clock -= wait;
      const ch = text[this.chars];
      this.chars++;
      if (SILENT.test(ch)) continue;
      // A primeira letra com voz já toca; depois, uma a cada `blipEvery`.
      if (this.voiced % DIALOGUE.blipEvery === 0) blips++;
      this.voiced++;
    }
    if (!this.typing) this.clock = 0;
    return blips;
  }

  /** Botão de avançar: completa a linha, passa para a próxima ou termina. */
  advance(): AdvanceResult {
    if (this.done) return 'done';
    if (this.typing) {
      this.chars = this.line.text.length;
      return 'completed';
    }
    this.index++;
    this.chars = 0;
    this.clock = 0;
    this.voiced = 0;
    return this.done ? 'done' : 'next';
  }
}
