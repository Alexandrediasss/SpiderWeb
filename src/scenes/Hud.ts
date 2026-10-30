// HUD em HTML/CSS por cima do canvas (texto nítido, fácil de estilizar). Elementos em index.html.

/**
 * Preferência do jogador (H): vale também depois de morrer ou reiniciar. Começa escondida: o painel de
 * controles por cima da fase incomodava. Os controles aparecem na pausa.
 */
let helpWanted = false;

export class Hud {
  private readonly help = document.getElementById('help');
  private readonly debug = document.getElementById('debug');

  /** H: liga/desliga a ajuda e lembra a escolha. */
  toggleHelp(): void {
    helpWanted = !helpWanted;
    this.showHelp(helpWanted);
  }

  /** Mostra a ajuda se o jogador quer vê-la (ou sempre, com `force`, como na pausa). */
  applyHelpPreference(force = false): void {
    this.showHelp(force || helpWanted);
  }

  showHelp(on: boolean): void {
    this.help?.classList.toggle('hidden', !on);
  }

  showDebug(on: boolean): void {
    this.debug?.classList.toggle('hidden', !on);
  }

  setDebug(text: string): void {
    if (this.debug) this.debug.textContent = text;
  }
}
