// Tela de fim do ato (END OF ACT 1), em HTML/CSS por cima da tela preta. Elemento #act-end em index.html.
// Spec: docs/features/acts.md
import { ACT_END } from '../config';
import type { Act } from '../level/acts';

export class ActEnd {
  private readonly root = document.getElementById('act-end');
  /** Some com todos os ouvintes quando a cena reinicia (os elementos HTML são os mesmos). */
  private readonly abort = new AbortController();
  private open = false;
  private readyAt = 0;

  constructor(private readonly onContinue: () => void) {
    const signal = this.abort.signal;
    this.root?.addEventListener('click', () => this.confirm(), { signal });
    document.addEventListener(
      'keydown',
      (e) => {
        if (!this.open || !['Enter', 'Space', 'Escape', 'NumpadEnter'].includes(e.code)) return;
        e.preventDefault();
        this.confirm();
      },
      { signal },
    );
    this.hide();
  }

  get isOpen(): boolean {
    return this.open;
  }

  /** Mostra o fim de `act`, com as cartas achadas nesta jogada e o próximo ato (se houver). */
  show(act: Act, lettersFound: number, next: Act | undefined): void {
    if (!this.root) return;
    this.open = true;
    this.readyAt = performance.now() + ACT_END.continueAfterSec * 1000;
    const set = (sel: string, text: string) => {
      const el = this.root?.querySelector(sel);
      if (el) el.textContent = text;
    };
    set('.end-act', `ACT ${act.number}`);
    set('.end-name', act.name);
    set('.end-letters', `LETTERS FOUND  ${lettersFound} / ${act.letters.length}`);
    set('.end-next', next ? `ACT ${next.number}  ·  ${next.playable ? next.name : 'COMING SOON'}` : '');
    this.root.style.setProperty('--continue-delay', `${ACT_END.continueAfterSec}s`);
    this.root.classList.remove('hidden');
  }

  confirm(): void {
    if (!this.open || performance.now() < this.readyAt) return;
    this.hide();
    this.onContinue();
  }

  hide(): void {
    this.open = false;
    this.root?.classList.add('hidden');
  }

  destroy(): void {
    this.abort.abort();
    this.hide();
  }
}
