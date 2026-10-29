// Telas do menu que ainda estão trancadas (SCENES e ACHIEVEMENTS): quadros com cadeado, "???" e "LOCKED".
// Por enquanto só dá para voltar. Elemento #locked em index.html. Spec: docs/features/title-screen.md
import { buildLockIcon } from '../art/uiArt';

export type LockedKind = 'scenes' | 'achievements';

const SLOTS: Record<LockedKind, { title: string; count: number }> = {
  scenes: { title: 'SCENES', count: 6 },
  achievements: { title: 'ACHIEVEMENTS', count: 8 },
};

/** Ignora teclas logo depois de abrir (a mesma tecla que abriu não pode já voltar). */
const OPEN_GRACE_MS = 250;

/** O cadeado em pixel art vira uma imagem uma vez só. */
let lockUrl: string | null = null;

export class LockedScreen {
  private readonly root = document.getElementById('locked');
  private readonly title = document.getElementById('locked-title');
  private readonly grid = document.getElementById('locked-grid');
  /** Some com todos os ouvintes quando a cena reinicia (os elementos HTML são os mesmos). */
  private readonly abort = new AbortController();
  private open = false;
  private openedAt = 0;

  constructor(private readonly onBack: () => void) {
    const signal = this.abort.signal;
    document.getElementById('locked-back')?.addEventListener('click', () => this.back(), { signal });
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

  show(kind: LockedKind): void {
    const { title, count } = SLOTS[kind];
    lockUrl ??= buildLockIcon().toCanvas().toDataURL();
    if (this.title) this.title.textContent = title;
    if (this.grid) {
      this.grid.className = kind;
      this.grid.replaceChildren(
        ...Array.from({ length: count }, () => {
          const slot = document.createElement('div');
          slot.className = 'locked-slot';
          const img = document.createElement('img');
          img.src = lockUrl ?? '';
          img.alt = '';
          slot.append(img, '???');
          return slot;
        }),
      );
    }
    this.open = true;
    this.openedAt = performance.now();
    this.root?.classList.remove('hidden');
  }

  hide(): void {
    this.open = false;
    this.root?.classList.add('hidden');
  }

  /** Voltar ao menu (Esc/Backspace/Enter, clique no BACK ou B no controle). */
  back(): void {
    if (!this.open || performance.now() - this.openedAt < OPEN_GRACE_MS) return;
    this.onBack();
  }

  destroy(): void {
    this.abort.abort();
    this.hide();
  }
}
