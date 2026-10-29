// O vento do ato 2: ruído contínuo num passa-banda que sobe com a força, mais um assobio fino na rajada.
// Quem decide a força é o Wind (src/systems/wind.ts). Spec: docs/features/wind.md
import { SFX } from '../config';
import { whiteNoise } from './noise';

export class WindSound {
  private readonly gain: GainNode;
  private readonly band: BiquadFilterNode;
  private readonly whistle: GainNode;
  private readonly whistleBand: BiquadFilterNode;
  private started = false;

  constructor(
    private readonly ctx: BaseAudioContext,
    private readonly destination: AudioNode,
  ) {
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    this.band = ctx.createBiquadFilter();
    this.band.type = 'bandpass';
    this.band.Q.value = 0.8;
    this.band.frequency.value = 400;
    this.whistle = ctx.createGain();
    this.whistle.gain.value = 0;
    this.whistleBand = ctx.createBiquadFilter();
    this.whistleBand.type = 'bandpass';
    this.whistleBand.Q.value = 9;
    this.whistleBand.frequency.value = 1300;
  }

  /** Força 0..1 (0 = mudo). Muda suave, em `rampSec`. */
  setStrength(strength: number, rampSec = 0.25): void {
    if (!this.started && strength > 0) this.start();
    const t = this.ctx.currentTime;
    const s = Math.max(0, Math.min(1, strength));
    this.gain.gain.setTargetAtTime(SFX.windVolume * (s > 0 ? 0.06 + 0.94 * s : 0), t, rampSec);
    this.band.frequency.setTargetAtTime(350 + 950 * s, t, rampSec);
    this.whistle.gain.setTargetAtTime(SFX.windVolume * 0.25 * Math.max(0, s - 0.5) * 2, t, rampSec);
    this.whistleBand.frequency.setTargetAtTime(1100 + 600 * s, t, rampSec);
  }

  private start(): void {
    this.started = true;
    const src = this.ctx.createBufferSource();
    src.buffer = whiteNoise(this.ctx, 4, 9191, 1);
    src.loop = true;
    src.connect(this.band).connect(this.gain).connect(this.destination);
    src.connect(this.whistleBand).connect(this.whistle).connect(this.destination);
    src.start();
  }
}
