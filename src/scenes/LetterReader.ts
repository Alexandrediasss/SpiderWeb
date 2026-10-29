// Cartas em HTML por cima do canvas: o aviso "READ" em cima da folha e a página aberta, com as patas da
// aranha segurando. Elementos #read-prompt e #letter em index.html. Spec: docs/features/letters.md
import { PAGE, buildParchment } from '../art/letterArt';
import type { Letter } from '../level/letters';

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
  /** Some com todos os ouvintes quando a cena reinicia (os elementos HTML são os mesmos). */
  private readonly abort = new AbortController();

  constructor(onClose: () => void) {
    this.root?.addEventListener('click', () => onClose(), { signal: this.abort.signal });
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

  show(letter: Letter): void {
    if (!this.root || !this.page || !this.body || !this.heading) return;
    this.page.querySelector('.letter-art')?.remove();
    this.page.prepend(pageCanvas(letter));
    this.heading.textContent = letter.heading;
    this.heading.classList.toggle('hidden', letter.heading === '');
    this.body.replaceChildren(
      ...letter.text.split('\n\n').map((para) => {
        const p = document.createElement('p');
        p.textContent = para;
        return p;
      }),
    );
    this.root.classList.remove('hidden');
    // Força o recálculo para a página subir com a transição.
    void this.root.offsetWidth;
    this.root.classList.add('open');
  }

  hide(): void {
    this.root?.classList.remove('open');
    this.root?.classList.add('hidden');
  }

  destroy(): void {
    this.abort.abort();
    this.hide();
    this.hidePrompt();
  }
}
