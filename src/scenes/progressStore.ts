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

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Sem localStorage: só não fica salvo.
  }
}
