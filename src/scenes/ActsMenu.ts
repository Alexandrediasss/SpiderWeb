// Seleção de atos em HTML/CSS por cima do canvas, no estilo dos episódios da Telltale: nome do ato entre
// setas, a arte numa moldura e os botões embaixo. Elemento #acts em index.html. Spec: docs/features/acts.md
import { buildActArt } from '../art/actArt';
import { type Act, ACTS } from '../level/acts';
import { type Progress, actStatus, isUnlocked } from '../systems/progress';

/** A arte de cada ato é gerada uma vez só. */
const arts = new Map<string, HTMLCanvasElement>();

function actCanvas(act: Act): HTMLCanvasElement {
  let c = arts.get(act.id);
  if (!c) {
    c = buildActArt(act.id).toCanvas();
    c.className = 'acts-art';
    arts.set(act.id, c);
  }
  return c;
}

/** Ignora teclas e cliques logo depois de abrir (o Enter do PLAY não pode já escolher o ato). */
const OPEN_GRACE_MS = 250;

export class ActsMenu {
  private readonly root = document.getElementById('acts');
  private readonly title = document.getElementById('acts-title');
  private readonly frame = document.getElementById('acts-frame');
  private readonly status = document.getElementById('acts-status');
  private readonly dots = document.getElementById('acts-dots');
  private readonly select = document.getElementById('acts-select');
  /** Some com todos os ouvintes quando a cena reinicia (os elementos HTML são os mesmos). */
  private readonly abort = new AbortController();
  private progress: Progress = { completed: [], letters: {} };
  private index = 0;
  private open = false;
  private openedAt = 0;

  constructor(
    private readonly onPlay: (act: Act) => void,
    private readonly onBack: () => void,
  ) {
    const signal = this.abort.signal;
    const on = (id: string, fn: () => void) => document.getElementById(id)?.addEventListener('click', fn, { signal });
    on('acts-prev', () => this.move(-1));
    on('acts-next', () => this.move(1));
    on('acts-frame', () => this.confirm());
    on('acts-select', () => this.confirm());
    on('acts-back', () => this.back());
    document.addEventListener('keydown', (e) => this.onKey(e), { signal });
    this.root?.classList.add('hidden');
  }

  get isOpen(): boolean {
    return this.open;
  }

  show(progress: Progress, index = 0): void {
    this.progress = progress;
    this.open = true;
    this.openedAt = performance.now();
    this.root?.classList.remove('hidden');
    this.render(index);
  }

  hide(): void {
    this.open = false;
    this.root?.classList.add('hidden');
  }

  /** Ato anterior (-1) ou seguinte (1), dando a volta. */
  move(delta: number): void {
    if (!this.ready()) return;
    this.render((this.index + delta + ACTS.length) % ACTS.length);
  }

  /** Escolhe o ato mostrado (se ele já puder ser jogado). */
  confirm(): void {
    const act = ACTS[this.index];
    if (!this.ready() || !isUnlocked(this.progress, act)) return;
    this.onPlay(act);
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

  private render(index: number): void {
    this.index = index;
    const act = ACTS[index];
    const st = actStatus(this.progress, act);
    const open = isUnlocked(this.progress, act);
    const needs = ACTS.find((a) => a.id === act.requires);
    if (this.title) this.title.textContent = act.playable ? `ACT ${act.number}: ${act.name}` : `ACT ${act.number}`;
    if (this.frame) {
      this.frame.querySelector('.acts-art')?.remove();
      this.frame.prepend(actCanvas(act));
      this.frame.classList.toggle('locked', !open);
      // Ato que já existe mas ainda não foi liberado: a arte aparece apagada.
      this.frame.classList.toggle('needs', act.playable && !open);
    }
    if (this.status) {
      const letters = st.lettersTotal > 0 ? `  ·  LETTERS ${st.lettersFound}/${st.lettersTotal}` : '';
      this.status.textContent = !act.playable
        ? 'COMING SOON'
        : !open
          ? `FINISH ACT ${needs?.number ?? ''} TO UNLOCK`
          : st.completed
            ? `COMPLETED${letters}`
            : '';
    }
    this.select?.classList.toggle('disabled', !open);
    this.dots?.replaceChildren(
      ...ACTS.map((_, i) => {
        const d = document.createElement('span');
        if (i === index) d.className = 'on';
        return d;
      }),
    );
  }

  private onKey(e: KeyboardEvent): void {
    if (!this.open) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.move(-1);
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') this.move(1);
    else if (e.code === 'Enter' || e.code === 'Space' || e.code === 'NumpadEnter') this.confirm();
    else if (e.code === 'Escape' || e.code === 'Backspace') this.back();
    else return;
    e.preventDefault();
  }
}
