// Guarda as conquistas no localStorage do navegador, separadas do progresso: o NEW GAME não apaga.
// Se o navegador bloquear (aba anônima, por exemplo), valem só nesta jogada. Spec: docs/features/achievements.md
import { type Achievement, ACHIEVEMENTS } from '../level/achievements';
import { type GameEvent, parseUnlocked, triggeredBy, unlock } from '../systems/achievements';

const KEY = 'spiderweb.achievements';

/** Cópia em memória, para não avisar de novo quando o localStorage está bloqueado. */
let memory: string[] = [];

export function loadAchievements(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw !== null) memory = parseUnlocked(raw, ACHIEVEMENTS);
  } catch {
    // Sem localStorage: fica a cópia em memória.
  }
  return [...memory];
}

/** Libera o que o acontecimento der direito; devolve só as conquistas novas (para avisar). */
export function award(e: GameEvent): Achievement[] {
  const { unlocked, fresh } = unlock(loadAchievements(), triggeredBy(ACHIEVEMENTS, e).map((a) => a.id));
  if (fresh.length === 0) return [];
  memory = unlocked;
  try {
    localStorage.setItem(KEY, JSON.stringify(unlocked));
  } catch {
    // Só não fica salvo.
  }
  return ACHIEVEMENTS.filter((a) => fresh.includes(a.id));
}
