// HUD em HTML/CSS por cima do canvas (texto nítido, fácil de estilizar). Elementos em index.html.

export class Hud {
  private readonly help = document.getElementById('help');
  private readonly debug = document.getElementById('debug');

  toggleHelp(): void {
    this.help?.classList.toggle('hidden');
  }

  showDebug(on: boolean): void {
    this.debug?.classList.toggle('hidden', !on);
  }

  setDebug(text: string): void {
    if (this.debug) this.debug.textContent = text;
  }
}
