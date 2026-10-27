// Tela inicial em HTML/CSS por cima do canvas: só o nome do jogo e o botão Play. Elementos em index.html.
// Spec: docs/features/title-screen.md

export class TitleScreen {
  private readonly root = document.getElementById('title');
  private readonly play = document.getElementById('play');
  private open = true;
  private readonly onKey = (e: KeyboardEvent) => {
    if (e.code === 'Enter' || e.code === 'Space' || e.code === 'NumpadEnter') {
      e.preventDefault();
      this.confirm();
    }
  };

  constructor(private readonly onPlay: () => void) {
    this.play?.addEventListener('click', () => this.confirm());
    document.addEventListener('keydown', this.onKey);
    this.play?.focus();
  }

  get isOpen(): boolean {
    return this.open;
  }

  /** Confirma (botão, Enter/Espaço ou A/Start no controle). Só vale uma vez. */
  confirm(): void {
    if (!this.open) return;
    this.open = false;
    document.removeEventListener('keydown', this.onKey);
    this.play?.blur();
    this.root?.classList.add('leaving');
    window.setTimeout(() => this.root?.classList.add('hidden'), 1000);
    this.onPlay();
  }

  /** O clarão do relâmpago também ilumina o título (0..1). */
  setFlash(f: number): void {
    this.root?.style.setProperty('--flash', f.toFixed(3));
  }
}
