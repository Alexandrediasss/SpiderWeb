// Cartas em HTML por cima do canvas: o aviso "READ" em cima da folha e a página aberta, com as patas da
// aranha segurando. Elementos #read-prompt e #letter em index.html. Spec: docs/features/letters.md
import { LETTER } from '../config';
import { PAGE, buildParchment } from '../art/letterArt';
import type { Letter } from '../level/letters';
import { paginateLetter } from '../systems/letters';

/** As páginas são geradas uma vez só (mudam por carta, não por jogada). */
const pages = new Map<string, HTMLCanvasElement>();

function pageCanvas(letter: Letter): HTMLCanvasElement {
  let c = pages.get(letter.id);
  if (!c) {
    c = buildParchment(letter.paper).toCanvas();
    c.className = 'letter-art';
    pages.set(letter.id, c);
  }
  return c;
}

export class LetterReader {
  private readonly prompt = document.getElementById('read-prompt');
  private readonly root = document.getElementById('letter');
  private readonly page = document.querySelector<HTMLElement>('#letter .letter-page');
  private readonly heading = document.querySelector<HTMLElement>('#letter .letter-heading');
  private readonly body = document.querySelector<HTMLElement>('#letter .letter-body');
  private readonly hint = document.querySelector<HTMLElement>('#letter .letter-hint');
  /** Some com todos os ouvintes quando a cena reinicia (os elementos HTML são os mesmos). */
  private readonly abort = new AbortController();
  private letter: Letter | null = null;
  private pages: string[][] = [];
  private index = 0;

  /**
   * `onAdvance`: o clique na página (vira a página, ou fecha na última). `onTurn`: uma página foi virada
   * pelas setas do teclado (para o som).
   */
  constructor(onAdvance: () => void, onTurn: () => void) {
    const signal = this.abort.signal;
    this.root?.addEventListener('click', () => onAdvance(), { signal });
    // ← / → (e A / D) viram a página; o resto (F, Enter, Espaço, Esc, controle) vem da cena.
    document.addEventListener(
      'keydown',
      (e) => {
        if (!this.isOpen || this.root?.classList.contains('glimpse')) return;
        const delta = e.code === 'ArrowRight' || e.code === 'KeyD' ? 1 : e.code === 'ArrowLeft' || e.code === 'KeyA' ? -1 : 0;
        if (delta !== 0 && this.turn(delta)) onTurn();
      },
      { signal },
    );
    // A área do texto acompanha o desenho do papel (proporções da imagem).
    const t = PAGE.text;
    const text = document.querySelector<HTMLElement>('#letter .letter-text');
    if (text) {
      Object.assign(text.style, {
        left: `${(t.x / PAGE.w) * 100}%`,
        top: `${(t.y / PAGE.h) * 100}%`,
        width: `${(t.w / PAGE.w) * 100}%`,
        height: `${(t.h / PAGE.h) * 100}%`,
      });
    }
    this.hide();
    this.hidePrompt();
  }

  /** Aviso "READ" centrado em (x, y), em px da janela (o pé do aviso fica nesse ponto). */
  showPrompt(x: number, y: number): void {
    if (!this.prompt) return;
    this.prompt.classList.remove('hidden');
    this.prompt.style.left = `${Math.round(x)}px`;
    this.prompt.style.top = `${Math.round(y)}px`;
  }

  hidePrompt(): void {
    this.prompt?.classList.add('hidden');
  }

  get isOpen(): boolean {
    return this.letter !== null;
  }

  /** Está na última página (o próximo "avançar" fecha a carta)? */
  get onLastPage(): boolean {
    return this.index >= this.pages.length - 1;
  }

  /** `glimpse`: só um relance (resumo do ato): menor, sem o aviso de fechar e sem clique. */
  show(letter: Letter, glimpse = false): void {
    if (!this.root || !this.page || !this.body || !this.heading) return;
    this.letter = letter;
    this.pages = paginateLetter(letter.text, LETTER.pageChars, LETTER.paragraphCost, LETTER.headingCost);
    this.index = 0;
    this.page.querySelector('.letter-art')?.remove();
    this.page.prepend(pageCanvas(letter));
    this.render();
    this.root.classList.toggle('glimpse', glimpse);
    this.root.classList.remove('hidden');
    // Força o recálculo para a página subir com a transição.
    void this.root.offsetWidth;
    this.root.classList.add('open');
  }

  /** Vira a página (1 = próxima, -1 = anterior). Devolve false se não tinha para onde virar. */
  turn(delta: number): boolean {
    const next = this.index + delta;
    if (!this.letter || next < 0 || next >= this.pages.length) return false;
    this.index = next;
    this.render();
    return true;
  }

  hide(): void {
    this.letter = null;
    this.root?.classList.remove('open');
    this.root?.classList.add('hidden');
  }

  /** Mostra a página atual: cabeçalho só na primeira, os parágrafos dela e o aviso (página, próxima/fechar). */
  private render(): void {
    const letter = this.letter;
    if (!letter || !this.body || !this.heading) return;
    const first = this.index === 0;
    this.heading.textContent = letter.heading;
    this.heading.classList.toggle('hidden', !first || letter.heading === '');
    this.body.replaceChildren(
      ...(this.pages[this.index] ?? []).map((para) => {
        const p = document.createElement('p');
        p.textContent = para;
        return p;
      }),
    );
    if (this.hint) {
      const total = this.pages.length;
      const page = total > 1 ? `PAGE ${this.index + 1} / ${total}   ` : '';
      const action = this.onLastPage ? 'close' : 'next';
      this.hint.innerHTML =
        `${page}<span class="kb">F</span><span class="pad">Y</span> ${action}` +
        (this.onLastPage ? '' : '   <span class="kb">ESC</span><span class="pad">B</span> close');
    }
  }

  destroy(): void {
    this.abort.abort();
    this.hide();
    this.hidePrompt();
  }
}
