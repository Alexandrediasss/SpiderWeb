// Tela inicial em HTML/CSS por cima do canvas: só o nome do jogo e o botão Play. Elementos em index.html.
// Spec: docs/features/title-screen.md

export class TitleScreen {
  private readonly root = document.getElementById('title');
  private readonly play = document.getElementById('play');
  /** Some com todos os ouvintes quando a cena reinicia (os elementos HTML são os mesmos). */
  private readonly abort = new AbortController();
  private open: boolean;

  /** `open = false`: começa já escondida (reinício direto no jogo). */
  constructor(
    private readonly onPlay: () => void,
    open = true,
  ) {
    this.open = open;
    const signal = this.abort.signal;
    this.play?.addEventListener('click', () => this.confirm(), { signal });
    document.addEventListener('keydown', (e) => this.onKey(e), { signal });
    this.root?.classList.remove('leaving');
    this.root?.classList.toggle('hidden', !open);
    if (open) this.play?.focus();
  }

  get isOpen(): boolean {
    return this.open;
  }

  /** Confirma (botão, Enter/Espaço ou A/Start no controle). Só vale uma vez. */
  confirm(): void {
    if (!this.open) return;
    this.open = false;
    this.play?.blur();
    this.root?.classList.add('leaving');
    window.setTimeout(() => {
      // Se a cena reiniciou (ou o título voltou) nesse meio-tempo, não mexe.
      if (!this.abort.signal.aborted && !this.open) this.root?.classList.add('hidden');
    }, 1000);
    this.onPlay();
  }

  /** Mostra a tela inicial de novo (voltando da seleção de atos). */
  reopen(): void {
    this.open = true;
    this.root?.classList.remove('leaving', 'hidden');
    this.play?.focus();
  }

  /** O clarão do relâmpago também ilumina o título (0..1). */
  setFlash(f: number): void {
    this.root?.style.setProperty('--flash', f.toFixed(3));
  }

  destroy(): void {
    this.abort.abort();
  }

  private onKey(e: KeyboardEvent): void {
    if (!this.open) return;
    if (e.code === 'Enter' || e.code === 'Space' || e.code === 'NumpadEnter') {
      e.preventDefault();
      // A seleção de atos abre agora: a mesma tecla não pode chegar nela e já escolher o ato.
      e.stopImmediatePropagation();
      this.confirm();
    }
  }
}
