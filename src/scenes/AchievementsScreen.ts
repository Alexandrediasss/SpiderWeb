// ACHIEVEMENTS do menu principal: as conquistas de cada ato, acesas as conseguidas. Só dá para voltar.
// Elemento #achievements em index.html. Spec: docs/features/achievements.md
import { ACHIEVEMENTS } from '../level/achievements';
import { ACTS } from '../level/acts';
import { byAct } from '../systems/achievements';
import { achievementIconUrl } from './AchievementToast';
import { loadAchievements } from './achievementStore';

/** Ignora teclas logo depois de abrir (a mesma tecla que abriu não pode já voltar). */
const OPEN_GRACE_MS = 250;

export class AchievementsScreen {
  private readonly root = document.getElementById('achievements');
  private readonly list = document.getElementById('achievements-list');
  private readonly count = document.getElementById('achievements-count');
  /** Some com todos os ouvintes quando a cena reinicia (os elementos HTML são os mesmos). */
  private readonly abort = new AbortController();
  private open = false;
  private openedAt = 0;

  constructor(private readonly onBack: () => void) {
    const signal = this.abort.signal;
    document.getElementById('achievements-back')?.addEventListener('click', () => this.back(), { signal });
    document.addEventListener(
      'keydown',
      (e) => {
        if (!this.open) return;
        if (!['Escape', 'Backspace', 'Enter', 'Space', 'NumpadEnter'].includes(e.code)) return;
        e.preventDefault();
        this.back();
      },
      { signal },
    );
    this.hide();
  }

  get isOpen(): boolean {
    return this.open;
  }

  /** Monta a lista a partir do que já foi conseguido (lido do navegador agora). */
  show(): void {
    const have = loadAchievements();
    if (this.count) this.count.textContent = `${have.length} / ${ACHIEVEMENTS.length}`;
    this.list?.replaceChildren(
      ...byAct(ACHIEVEMENTS, have).map((group) => {
        const act = ACTS.find((a) => a.id === group.act);
        const section = document.createElement('section');
        const title = document.createElement('h3');
        title.textContent = act ? `ACT ${act.number} · ${act.name}` : group.act.toUpperCase();
        const grid = document.createElement('div');
        grid.className = 'ach-grid';
        grid.append(
          ...group.items.map(({ item: a, unlocked }) => {
            const card = document.createElement('div');
            card.className = unlocked ? 'ach-card' : 'ach-card locked';
            const img = document.createElement('img');
            img.src = achievementIconUrl(a.icon, unlocked);
            img.alt = '';
            const text = document.createElement('div');
            const name = document.createElement('p');
            name.className = 'ach-name';
            name.textContent = a.name;
            const desc = document.createElement('p');
            desc.className = 'ach-desc';
            desc.textContent = a.description;
            text.append(name, desc);
            card.append(img, text);
            return card;
          }),
        );
        section.append(title, grid);
        return section;
      }),
    );
    this.open = true;
    this.openedAt = performance.now();
    this.root?.classList.remove('hidden');
  }

  hide(): void {
    this.open = false;
    this.root?.classList.add('hidden');
  }

  /** Voltar ao menu (Esc/Backspace/Enter, clique no BACK ou B/A/Start no controle). */
  back(): void {
    if (!this.open || performance.now() - this.openedAt < OPEN_GRACE_MS) return;
    this.onBack();
  }

  destroy(): void {
    this.abort.abort();
    this.hide();
  }
}
