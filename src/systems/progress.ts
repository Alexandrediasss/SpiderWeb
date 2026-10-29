// Progresso salvo entre jogadas: atos completos e cartas já achadas em cada ato. Lógica pura
// (quem lê e grava no navegador é src/scenes/progressStore.ts). Spec: docs/features/acts.md
import type { Act } from '../level/acts';

export interface Progress {
  completed: string[];
  /** Por ato: ids das cartas lidas em alguma jogada que chegou ao fim do ato. */
  letters: Record<string, string[]>;
}

export function emptyProgress(): Progress {
  return { completed: [], letters: {} };
}

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((s) => typeof s === 'string');

/** Lê o JSON salvo. Qualquer coisa estranha (vazio, estragado, outro formato) vira progresso vazio. */
export function parseProgress(json: string | null): Progress {
  if (!json) return emptyProgress();
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return emptyProgress();
  }
  if (typeof raw !== 'object' || raw === null) return emptyProgress();
  const obj = raw as Record<string, unknown>;
  const completed = isStringArray(obj.completed) ? [...new Set(obj.completed)] : [];
  const letters: Record<string, string[]> = {};
  if (typeof obj.letters === 'object' && obj.letters !== null) {
    for (const [act, ids] of Object.entries(obj.letters as Record<string, unknown>)) {
      if (isStringArray(ids)) letters[act] = [...new Set(ids)];
    }
  }
  return { completed, letters };
}

/** Chegou ao fim do ato: marca como completo e junta as cartas lidas às de antes. Não muda o original. */
export function recordActEnd(p: Progress, actId: string, lettersRead: string[]): Progress {
  const before = p.letters[actId] ?? [];
  return {
    completed: p.completed.includes(actId) ? [...p.completed] : [...p.completed, actId],
    letters: { ...p.letters, [actId]: [...new Set([...before, ...lettersRead])] },
  };
}

/** Dá para jogar o ato? Precisa existir e, se depender de outro, esse outro já terminado. */
export function isUnlocked(p: Progress, act: Act): boolean {
  return act.playable && (!act.requires || p.completed.includes(act.requires));
}

export interface ActStatus {
  completed: boolean;
  /** Cartas já achadas / total do ato. */
  lettersFound: number;
  lettersTotal: number;
}

export function actStatus(p: Progress, act: Act): ActStatus {
  const found = (p.letters[act.id] ?? []).filter((id) => act.letters.includes(id)).length;
  return { completed: p.completed.includes(act.id), lettersFound: found, lettersTotal: act.letters.length };
}
