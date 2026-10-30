// Aviso "ACHIEVEMENT UNLOCKED" no topo da tela (#achievement-toast em index.html), com o sininho.
// Fica fora das cenas: o aviso continua mesmo se a cena trocar (fim do ato). Spec: docs/features/achievements.md
import { ACHIEVEMENT } from '../config';
import { buildAchievementIcon } from '../art/uiArt';
import { getSound } from '../audio/sound';
import type { Achievement, AchievementIcon } from '../level/achievements';
import type { GameEvent } from '../systems/achievements';
import { award } from './achievementStore';

/** Tempo da entrada/saída (ms): igual à transição do CSS. */
const SLIDE_MS = 350;

const icons = new Map<string, string>();

/** Medalha em pixel art como imagem (gerada uma vez por ícone e estado). */
export function achievementIconUrl(icon: AchievementIcon, unlocked: boolean): string {
  const key = `${icon}:${unlocked}`;
  let url = icons.get(key);
  if (!url) {
    url = buildAchievementIcon(icon, unlocked).toCanvas().toDataURL();
    icons.set(key, url);
  }
  return url;
}

const queue: Achievement[] = [];
let showing = false;

/** Dispara um acontecimento do jogo: libera e avisa as conquistas novas (uma de cada vez). */
export function achieve(e: GameEvent): void {
  const fresh = award(e);
  if (fresh.length === 0) return;
  queue.push(...fresh);
  if (!showing) showNext();
}

function showNext(): void {
  const el = document.getElementById('achievement-toast');
  const a = queue.shift();
  if (!el || !a) {
    showing = false;
    return;
  }
  showing = true;
  const img = el.querySelector<HTMLImageElement>('img');
  const name = el.querySelector<HTMLElement>('.name');
  if (img) img.src = achievementIconUrl(a.icon, true);
  if (name) name.textContent = a.name;
  el.classList.add('show');
  getSound().sfx.achievement();
  window.setTimeout(() => {
    el.classList.remove('show');
    window.setTimeout(showNext, SLIDE_MS + 100);
  }, ACHIEVEMENT.toastSec * 1000 + SLIDE_MS);
}
