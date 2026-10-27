// Linha do tempo de cutscene: uma lista de etapas com duração. Lógica pura.
// Spec: docs/features/intro.md

export interface Step {
  name: string;
  sec: number;
}

export interface StepAt {
  index: number;
  name: string;
  /** Segundos desde o começo da etapa. */
  local: number;
  /** 0..1 dentro da etapa. */
  progress: number;
}

export class Timeline {
  readonly total: number;

  constructor(readonly steps: Step[]) {
    this.total = steps.reduce((s, st) => s + st.sec, 0);
  }

  /** Etapa no instante `t` (s), ou null depois do fim. */
  at(t: number): StepAt | null {
    let start = 0;
    for (let i = 0; i < this.steps.length; i++) {
      const st = this.steps[i];
      if (t < start + st.sec) {
        const local = Math.max(0, t - start);
        return { index: i, name: st.name, local, progress: st.sec > 0 ? local / st.sec : 1 };
      }
      start += st.sec;
    }
    return null;
  }
}

export interface TextTiming {
  typeCps: number;
  holdSec: number;
  textFadeSec: number;
  textGapSec: number;
}

/** Duração de uma página de texto: escrever + ficar parada + sumir + pausa. */
export function textPageSec(text: string, cfg: TextTiming): number {
  return text.length / cfg.typeCps + cfg.holdSec + cfg.textFadeSec + cfg.textGapSec;
}

/** Como a página aparece `local` segundos depois de começar: o texto já escrito e a opacidade. */
export function textPageAt(text: string, local: number, cfg: TextTiming): { shown: string; opacity: number } {
  const chars = Math.min(text.length, Math.floor(local * cfg.typeCps));
  const typeSec = text.length / cfg.typeCps;
  const fadeStart = typeSec + cfg.holdSec;
  const opacity = local < fadeStart ? 1 : Math.max(0, 1 - (local - fadeStart) / cfg.textFadeSec);
  return { shown: text.slice(0, chars), opacity };
}
