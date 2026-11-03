// Caixa de diálogo das falas da Mary, em HTML por cima do canvas (como a do Stardew Valley): o retrato à
// esquerda com o nome embaixo e o texto aparecendo letra por letra à direita. Elemento #dialogue em
// index.html. Spec: docs/features/dialogue.md
import { DIALOGUE } from '../config';
import { buildPortrait } from '../art/portraitArt';
import { type DialogueLine, DialogueRun, type Mood } from '../systems/dialogue';

/** Os retratos são gerados uma vez só, um por humor. */
const portraits = new Map<Mood, HTMLCanvasElement>();

function portrait(mood: Mood): HTMLCanvasElement {
  let c = portraits.get(mood);
  if (!c) {
    c = buildPortrait(mood).toCanvas();
    c.className = 'dlg-face';
    portraits.set(mood, c);
  }
  return c;
}

export class DialogueBox {
  private readonly root = document.getElementById('dialogue');
  private readonly face = document.querySelector<HTMLElement>('#dialogue .dlg-portrait');
  private readonly text = document.querySelector<HTMLElement>('#dialogue .dlg-text');
  private readonly next = document.querySelector<HTMLElement>('#dialogue .dlg-next');
  /** Some com os ouvintes quando a cena reinicia (os elementos HTML são os mesmos). */
  private readonly abort = new AbortController();
  private run: DialogueRun | null = null;
  private mood: Mood | null = null;
  private openFor = 0;

  /** `onAdvance`: clique na caixa (a cena decide se avança). */
  constructor(onAdvance: () => void) {
    this.root?.addEventListener('click', () => onAdvance(), { signal: this.abort.signal });
    this.hide();
  }

  get isOpen(): boolean {
    return this.run !== null;
  }

  /** O humor da linha atual (a voz triste sai mais grave). */
  get sad(): boolean {
    const m = this.run?.line.mood;
    return m === 'sad' || m === 'cry';
  }

  open(lines: DialogueLine[]): void {
    this.run = new DialogueRun(lines);
    this.openFor = 0;
    this.mood = null;
    this.root?.classList.remove('hidden');
    this.render();
  }

  /** Avança o texto. Devolve quantas sílabas da voz tocar. */
  update(dt: number): number {
    if (!this.run) return 0;
    this.openFor += dt;
    const blips = this.run.update(dt);
    this.render();
    return blips;
  }

  /** Botão de avançar. Devolve true quando a fala terminou (a caixa fecha). */
  advance(): boolean {
    if (!this.run || this.openFor < DIALOGUE.openGraceSec) return false;
    const r = this.run.advance();
    if (r === 'done') {
      this.hide();
      return true;
    }
    this.render();
    return false;
  }

  hide(): void {
    this.run = null;
    this.root?.classList.add('hidden');
  }

  destroy(): void {
    this.abort.abort();
    this.hide();
  }

  private render(): void {
    const run = this.run;
    if (!run || run.done) return;
    if (this.mood !== run.line.mood && this.face) {
      this.mood = run.line.mood;
      this.face.querySelector('.dlg-face')?.remove();
      this.face.prepend(portrait(this.mood));
    }
    if (this.text) this.text.textContent = run.shown;
    this.next?.classList.toggle('hidden', run.typing);
  }
}
