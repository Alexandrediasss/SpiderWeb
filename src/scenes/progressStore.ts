// Guarda o progresso (atos completos, cartas achadas) no localStorage do navegador.
// Se o navegador bloquear (aba anônima, por exemplo), o jogo funciona igual, só não salva. Spec: docs/features/acts.md
import { type Progress, emptyProgress, parseProgress } from '../systems/progress';

const KEY = 'spiderweb.progress';

export function loadProgress(): Progress {
  try {
    return parseProgress(localStorage.getItem(KEY));
  } catch {
    return emptyProgress();
  }
}

/** Existe um jogo salvo neste navegador? (o LOAD GAME só acende se existir) */
export function hasSave(): boolean {
  try {
    return localStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}

/** NEW GAME: troca o jogo salvo por um vazio. */
export function startNewSave(): void {
  saveProgress(emptyProgress());
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Sem localStorage: só não fica salvo.
  }
}
