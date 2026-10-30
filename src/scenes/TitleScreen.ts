// Tela inicial em HTML/CSS por cima do canvas: o nome do jogo e o menu principal (NEW GAME, LOAD GAME,
// SCENES, ACHIEVEMENTS), com a confirmação do NEW GAME. Elementos em index.html.
// Spec: docs/features/title-screen.md
import { stepMenu } from '../systems/menu';

export type TitleAction = 'new' | 'load' | 'scenes' | 'achievements';

export class TitleScreen {
  private readonly root = document.getElementById('title');
  private readonly menu = document.getElementById('title-menu');
  private readonly confirmBox = document.getElementById('title-confirm');
  private readonly items = [...document.querySelectorAll<HTMLButtonElement>('#title-menu button[data-action]')];
  private readonly answers = [...document.querySelectorAll<HTMLButtonElement>('#title-confirm button[data-answer]')];
  /** Some com todos os ouvintes quando a cena reinicia (os elementos HTML são os mesmos). */
  private readonly abort = new AbortController();
  private open: boolean;
  private index = 0;
  /** Perguntando "START A NEW GAME?": o que fazer no YES, e qual resposta está selecionada. */
  private asking: (() => void) | null = null;
  private answer = 1;

  /** `open = false`: começa já escondida (reinício direto no jogo ou na seleção de atos). */
  constructor(
    private readonly onAction: (a: TitleAction) => void,
    open = true,
  ) {
    this.open = open;
    const signal = this.abort.signal;
    this.items.forEach((btn, i) => {
      btn.addEventListener('click', () => this.choose(i), { signal });
      btn.addEventListener('mouseenter', () => this.select(i), { signal });
    });
    this.answers.forEach((btn, i) => {
      btn.addEventListener('click', () => this.answerWith(i), { signal });
      btn.addEventListener('mouseenter', () => this.selectAnswer(i), { signal });
    });
    document.addEventListener('keydown', (e) => this.onKey(e), { signal });
    this.closeConfirm();
    this.root?.classList.toggle('hidden', !open);
  }

  get isOpen(): boolean {
    return this.open;
  }

  /** O botão selecionado (onde a teia da transição engata). */
  get selectedButton(): HTMLElement | null {
    return this.items[this.index] ?? null;
  }

  /** Mostrando a pergunta do NEW GAME (YES/NO lado a lado). */
  get isAsking(): boolean {
    return this.asking !== null;
  }

  /** Acende ou apaga uma opção (LOAD GAME sem jogo salvo fica apagado). */
  setEnabled(action: TitleAction, enabled: boolean): void {
    const btn = this.items.find((b) => b.dataset.action === action);
    if (btn) btn.disabled = !enabled;
    if (!enabled && this.items[this.index] === btn) this.move(1);
  }

  /** Seleciona uma opção pelo nome. */
  focus(action: TitleAction): void {
    const i = this.items.findIndex((b) => b.dataset.action === action && !b.disabled);
    if (i >= 0) this.select(i);
  }

  /** Sobe (-1) ou desce (1) no menu (ou troca entre YES e NO na pergunta), pulando o que está apagado. */
  move(delta: number): void {
    if (!this.open) return;
    if (this.asking) {
      this.selectAnswer((this.answer + 1) % 2);
      return;
    }
    this.select(stepMenu(this.enabled(), this.index, delta));
  }

  /** Confirma o item selecionado (Enter/Espaço, clique ou A/Start no controle). */
  confirm(): void {
    if (this.asking) this.answerWith(this.answer);
    else this.choose(this.index);
  }

  /** Voltar (Esc/B): na pergunta é o NO; no menu não faz nada. */
  back(): void {
    if (this.open && this.asking) this.closeConfirm();
  }

  /** Pergunta antes do NEW GAME apagar o jogo salvo. */
  askConfirm(onYes: () => void): void {
    this.asking = onYes;
    this.menu?.classList.add('hidden');
    this.confirmBox?.classList.remove('hidden');
    this.selectAnswer(1);
  }

  /** Esconde na hora (a tela já está preta, ou embaixo da transição do ato). */
  hide(): void {
    this.open = false;
    this.closeConfirm();
    this.root?.classList.add('hidden');
  }

  /** Mostra a tela inicial de novo (voltando da seleção de atos ou de uma tela trancada). */
  reopen(): void {
    this.open = true;
    this.root?.classList.remove('hidden');
  }

  /** O clarão do relâmpago também ilumina o título (0..1). */
  setFlash(f: number): void {
    this.root?.style.setProperty('--flash', f.toFixed(3));
  }

  destroy(): void {
    this.abort.abort();
    this.hide();
  }

  private enabled(): boolean[] {
    return this.items.map((b) => !b.disabled);
  }

  private select(i: number): void {
    if (this.items[i]?.disabled) return;
    this.index = i;
    this.items.forEach((b, k) => b.classList.toggle('selected', k === i));
  }

  private choose(i: number): void {
    const action = this.items[i]?.dataset.action as TitleAction | undefined;
    if (!this.open || this.asking || !action || this.items[i].disabled) return;
    this.select(i);
    this.onAction(action);
  }

  private selectAnswer(i: number): void {
    this.answer = i;
    this.answers.forEach((b, k) => b.classList.toggle('selected', k === i));
  }

  private answerWith(i: number): void {
    const onYes = this.asking;
    if (!this.open || !onYes) return;
    this.closeConfirm();
    if (this.answers[i]?.dataset.answer === 'yes') onYes();
  }

  private closeConfirm(): void {
    this.asking = null;
    this.confirmBox?.classList.add('hidden');
    this.menu?.classList.remove('hidden');
  }

  private onKey(e: KeyboardEvent): void {
    if (!this.open) return;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') this.move(-1);
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') this.move(1);
    else if (this.asking && (e.code === 'ArrowLeft' || e.code === 'ArrowRight' || e.code === 'KeyA' || e.code === 'KeyD')) this.move(1);
    else if (e.code === 'Escape' || e.code === 'Backspace') this.back();
    else if (e.code === 'Enter' || e.code === 'Space' || e.code === 'NumpadEnter') {
      // A tela que abre agora (seleção de atos, tela trancada) não pode receber a mesma tecla.
      e.stopImmediatePropagation();
      this.confirm();
    } else return;
    e.preventDefault();
  }
}
