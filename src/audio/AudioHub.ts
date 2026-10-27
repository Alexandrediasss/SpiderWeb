// Um só AudioContext para o jogo todo, com volume geral (mudo) e um limitador no fim.
// O navegador cria o contexto "suspenso" até o primeiro gesto do jogador; `unlockOnGesture` cuida disso.
import { SFX } from '../config';

export class AudioHub {
  readonly ctx: AudioContext;
  /** Tudo que toca no jogo passa por aqui. */
  readonly input: GainNode;
  private readonly master: GainNode;
  private muted = false;
  private readonly unlock = () => {
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    if (this.ctx.state === 'running') this.removeUnlockListeners();
  };

  constructor() {
    this.ctx = new AudioContext();
    this.input = this.ctx.createGain();
    this.master = this.ctx.createGain();
    this.master.gain.value = SFX.master;
    const limiter = this.ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;
    this.input.connect(this.master).connect(limiter).connect(this.ctx.destination);
  }

  get isMuted(): boolean {
    return this.muted;
  }

  /** Libera o áudio no primeiro clique/tecla/toque (regra dos navegadores). */
  unlockOnGesture(): void {
    for (const type of ['pointerdown', 'keydown', 'touchend'] as const) window.addEventListener(type, this.unlock);
    this.unlock();
  }

  toggleMute(): void {
    this.muted = !this.muted;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(this.muted ? 0 : SFX.master, now + 0.3);
  }

  close(): void {
    this.removeUnlockListeners();
    void this.ctx.close();
  }

  private removeUnlockListeners(): void {
    for (const type of ['pointerdown', 'keydown', 'touchend'] as const) window.removeEventListener(type, this.unlock);
  }
}
