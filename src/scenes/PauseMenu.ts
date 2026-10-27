// Menu de pausa em HTML/CSS por cima do canvas: Resume, Restart, Main Menu. Elementos em index.html.
// Spec: docs/features/pause-menu.md

export type PauseAction = 'resume' | 'restart' | 'menu';

export class PauseMenu {
  private readonly root = document.getElementById('pause');
  private readonly buttons = [...document.querySelectorAll<HTMLButtonElement>('#pause button[data-action]')];
  /** Some com todos os ouvintes quando a cena reinicia (os elementos HTML são os mesmos). */
  private readonly abort = new AbortController();
  private index = 0;
  private open = false;

  constructor(private readonly onAction: (a: PauseAction) => void) {
    const signal = this.abort.signal;
    this.buttons.forEach((btn, i) => {
      btn.addEventListener('click', () => this.choose(i), { signal });
      btn.addEventListener('mouseenter', () => this.select(i), { signal });
    });
    document.addEventListener('keydown', (e) => this.onKey(e), { signal });
    this.root?.classList.add('hidden');
  }

  get isOpen(): boolean {
    return this.open;
  }

  show(): void {
    this.open = true;
    this.root?.classList.remove('hidden');
    this.select(0);
  }

  hide(): void {
    this.open = false;
    this.root?.classList.add('hidden');
  }

  /** Sobe (-1) ou desce (1) na lista, dando a volta. */
  move(delta: number): void {
    const n = this.buttons.length;
    this.select((this.index + delta + n) % n);
  }

  /** Confirma o item selecionado. */
  confirm(): void {
    this.choose(this.index);
  }

  destroy(): void {
    this.abort.abort();
    this.hide();
  }

  private select(i: number): void {
    this.index = i;
    this.buttons.forEach((b, k) => b.classList.toggle('selected', k === i));
  }

  private choose(i: number): void {
    if (!this.open) return;
    const action = this.buttons[i]?.dataset.action as PauseAction | undefined;
    if (action) this.onAction(action);
  }

  private onKey(e: KeyboardEvent): void {
    if (!this.open) return;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') this.move(-1);
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') this.move(1);
    else if (e.code === 'Enter' || e.code === 'Space' || e.code === 'NumpadEnter') this.confirm();
    else return;
    e.preventDefault();
  }
}
