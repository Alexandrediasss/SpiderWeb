// Conquistas: quais um acontecimento libera, o que já foi conseguido (lido de JSON com validação) e o
// agrupamento por ato para a tela do menu. Lógica pura (quem grava é src/scenes/achievementStore.ts).
// As funções de lista (ler, liberar, agrupar) servem também para as cenas já vistas (systems/scenes.ts).
// Spec: docs/features/achievements.md
import type { Achievement } from '../level/achievements';

/** Acontecimentos do jogo que podem liberar conquistas. */
export type GameEvent =
  | { type: 'letterRead'; act: string; letter: string }
  | { type: 'actEnd'; act: string }
  | { type: 'allRatsKilled'; act: string }
  | { type: 'stomped'; act: string };

/** As conquistas da lista que este acontecimento libera (já tendo ou não). */
export function triggeredBy(list: Achievement[], e: GameEvent): Achievement[] {
  return list.filter((a) => {
    const t = a.trigger;
    if (t.type !== e.type || t.act !== e.act) return false;
    if (t.type === 'letterRead' && e.type === 'letterRead') return !t.letter || t.letter === e.letter;
    return true;
  });
}

/**
 * Junta os ids novos aos que já existiam. `fresh` são só os que ainda não existiam (para avisar uma vez
 * só). Não muda o original.
 */
export function unlock(have: string[], ids: string[]): { unlocked: string[]; fresh: string[] } {
  const fresh = [...new Set(ids)].filter((id) => !have.includes(id));
  return { unlocked: [...have, ...fresh], fresh };
}

/** Lê o JSON salvo: uma lista de ids conhecidos. Qualquer coisa estranha vira lista vazia. */
export function parseUnlocked(json: string | null, known: { id: string }[]): string[] {
  if (!json) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  const ids = new Set(known.map((a) => a.id));
  return [...new Set(raw.filter((v): v is string => typeof v === 'string' && ids.has(v)))];
}

export interface ActGroup<T> {
  act: string;
  items: { item: T; unlocked: boolean }[];
}

/** Agrupa por ato, na ordem da lista, marcando os já conseguidos (conquistas) ou vistos (cenas). */
export function byAct<T extends { id: string; act: string }>(list: T[], have: string[]): ActGroup<T>[] {
  const groups: ActGroup<T>[] = [];
  for (const a of list) {
    let g = groups.find((x) => x.act === a.act);
    if (!g) {
      g = { act: a.act, items: [] };
      groups.push(g);
    }
    g.items.push({ item: a, unlocked: have.includes(a.id) });
  }
  return groups;
}
