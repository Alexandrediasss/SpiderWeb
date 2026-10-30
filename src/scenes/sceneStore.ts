// Guarda no localStorage do navegador quais cenas já foram vistas (para liberar no SCENES), separado do
// progresso: o NEW GAME não apaga. Se o navegador bloquear, vale só nesta jogada. Spec: docs/features/scenes.md
import { SCENES, type SceneId } from '../level/scenes';
import { parseUnlocked, unlock } from '../systems/achievements';

const KEY = 'spiderweb.scenes';

/** Cópia em memória, para o caso do localStorage estar bloqueado. */
let memory: string[] = [];

export function loadSeenScenes(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw !== null) memory = parseUnlocked(raw, SCENES);
  } catch {
    // Sem localStorage: fica a cópia em memória.
  }
  return [...memory];
}

/** Marca a cena como vista (libera no SCENES). Devolve se ela é nova. */
export function markSceneSeen(id: SceneId): boolean {
  const { unlocked, fresh } = unlock(loadSeenScenes(), [id]);
  if (fresh.length === 0) return false;
  memory = unlocked;
  try {
    localStorage.setItem(KEY, JSON.stringify(unlocked));
  } catch {
    // Só não fica salvo.
  }
  return true;
}
