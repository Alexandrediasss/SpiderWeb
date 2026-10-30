// SCENES do menu principal (como o museu do Sonic Generations): as cenas de cada ato, na ordem da história.
// Só dá para assistir as já vistas no jogo. Elemento #scenes em index.html. Spec: docs/features/scenes.md
import { buildSceneThumb } from '../art/sceneThumbs';
import { buildLockIcon } from '../art/uiArt';
import { ACTS } from '../level/acts';
import { SCENES, type SceneDef, type SceneId } from '../level/scenes';
import { byAct } from '../systems/achievements';
import { loadSeenScenes } from './sceneStore';

/** Ignora teclas logo depois de abrir (a mesma tecla que abriu não pode já escolher). */
const OPEN_GRACE_MS = 250;
/** Cartões por linha (uma linha por ato). */
const COLS = 3;

/** Miniaturas e o cadeado viram imagem uma vez só. */
const thumbs = new Map<SceneId, string>();
let lockUrl: string | null = null;

function thumbUrl(id: SceneId): string {
  let url = thumbs.get(id);
  if (!url) {
    url = buildSceneThumb(id).toCanvas().toDataURL();
    thumbs.set(id, url);
  }
  return url;
}

/** O que falta para liberar: resumo = terminar o ato; cutscene = chegar nela jogando. */
function lockedHint(s: SceneDef): string {
  const act = ACTS.find((a) => a.id === s.act);
  return s.kind === 'recap' ? `FINISH ACT ${act?.number ?? ''} TO UNLOCK` : `WATCH IT IN ACT ${act?.number ?? ''} TO UNLOCK`;
}

export class ScenesScreen {
  private readonly root = document.getElementById('scenes');
  private readonly list = document.getElementById('scenes-list');
  private readonly count = document.getElementById('scenes-count');
  /** Some com todos os ouvintes quando a cena reinicia (os elementos HTML são os mesmos). */
  private readonly abort = new AbortController();
  private cards: { el: HTMLElement; id: SceneId; unlocked: boolean }[] = [];
  private index = 0;
  private open = false;
  private openedAt = 0;

  constructor(
    private readonly onPlay: (id: SceneId) => void,
    private readonly onBack: () => void,
  ) {
    const signal = this.abort.signal;
    document.getElementById('scenes-watch')?.addEventListener('click', () => this.confirm(), { signal });
    document.getElementById('scenes-back')?.addEventListener('click', () => this.back(), { signal });
    document.addEventListener('keydown', (e) => this.onKey(e), { signal });
    this.hide();
  }

  get isOpen(): boolean {
    return this.open;
  }

  /** Monta os cartões a partir das cenas já vistas; `focus` escolhe qual começa selecionada. */
  show(focus?: SceneId): void {
    const seen = loadSeenScenes();
    if (this.count) this.count.textContent = `${seen.length} / ${SCENES.length}`;
    this.cards = [];
    const signal = this.abort.signal;
    this.list?.replaceChildren(
      ...byAct(SCENES, seen).map((group) => {
        const act = ACTS.find((a) => a.id === group.act);
        const section = document.createElement('section');
        const title = document.createElement('h3');
        title.textContent = act ? `ACT ${act.number} · ${act.name}` : group.act.toUpperCase();
        const row = document.createElement('div');
        row.className = 'scene-row';
        group.items.forEach(({ item: s, unlocked }, k) => {
          const i = this.cards.length;
          const card = document.createElement('button');
          card.type = 'button';
          card.className = unlocked ? 'scene-card' : 'scene-card locked';
          const frame = document.createElement('div');
          frame.className = 'scene-frame';
          const img = document.createElement('img');
          img.src = unlocked ? thumbUrl(s.id) : (lockUrl ??= buildLockIcon().toCanvas().toDataURL());
          img.alt = '';
          frame.append(img);
          if (unlocked) {
            const play = document.createElement('span');
            play.className = 'play';
            play.textContent = '▶';
            frame.append(play);
          }
          if (s.kind === 'recap') {
            const badge = document.createElement('span');
            badge.className = 'badge';
            badge.textContent = 'RECAP';
            frame.append(badge);
          }
          const name = document.createElement('p');
          name.className = 'scene-name';
          name.textContent = unlocked ? `${k + 1}. ${s.name}` : `${k + 1}. ???`;
          const desc = document.createElement('p');
          desc.className = 'scene-desc';
          desc.textContent = unlocked ? s.description : lockedHint(s);
          card.append(frame, name, desc);
          card.addEventListener('mouseenter', () => this.select(i), { signal });
          card.addEventListener('click', () => {
            this.select(i);
            this.confirm();
          }, { signal });
          this.cards.push({ el: card, id: s.id, unlocked });
          row.append(card);
        });
        section.append(title, row);
        return section;
      }),
    );
    const start = focus ? this.cards.findIndex((c) => c.id === focus) : this.cards.findIndex((c) => c.unlocked);
    this.select(Math.max(0, start));
    this.open = true;
    this.openedAt = performance.now();
    this.root?.classList.remove('hidden');
  }

  hide(): void {
    this.open = false;
    this.root?.classList.add('hidden');
  }

  /** ←/→ anda no cartão; ↑/↓ troca de ato (linha). */
  move(dx: number, dy: number): void {
    if (!this.ready() || this.cards.length === 0) return;
    const n = this.cards.length;
    const next = dy !== 0 ? (this.index + dy * COLS + n) % n : (this.index + dx + n) % n;
    this.select(next);
  }

  /** Assiste a cena selecionada (se já foi vista). */
  confirm(): void {
    const c = this.cards[this.index];
    if (!this.ready() || !c?.unlocked) return;
    this.onPlay(c.id);
  }

  back(): void {
    if (!this.ready()) return;
    this.onBack();
  }

  destroy(): void {
    this.abort.abort();
    this.hide();
  }

  private ready(): boolean {
    return this.open && performance.now() - this.openedAt > OPEN_GRACE_MS;
  }

  private select(i: number): void {
    this.index = i;
    this.cards.forEach((c, k) => c.el.classList.toggle('selected', k === i));
    document.getElementById('scenes-watch')?.classList.toggle('disabled', !this.cards[i]?.unlocked);
  }

  private onKey(e: KeyboardEvent): void {
    if (!this.open) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.move(-1, 0);
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') this.move(1, 0);
    else if (e.code === 'ArrowUp' || e.code === 'KeyW') this.move(0, -1);
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') this.move(0, 1);
    else if (e.code === 'Enter' || e.code === 'Space' || e.code === 'NumpadEnter') this.confirm();
    else if (e.code === 'Escape' || e.code === 'Backspace') this.back();
    else return;
    e.preventDefault();
  }
}
