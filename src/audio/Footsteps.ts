// Passinhos da aranha: estalos curtíssimos e baixos ("tic"), cada um um pouco diferente.
// Spec: docs/features/atmosphere.md
import { SFX } from '../config';
import { whiteNoise } from './noise';

export class Footsteps {
  private readonly noise: AudioBuffer;
  private count = 0;

  constructor(
    private readonly ctx: BaseAudioContext,
    private readonly destination: AudioNode,
  ) {
    this.noise = whiteNoise(ctx, 0.06, 31337);
  }

  step(running: boolean): void {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const n = this.count++;
    // Variação determinística (sem Math.random), alternando "pés".
    const v1 = fract(Math.sin(n * 12.9898) * 43758.5453);
    const v2 = fract(Math.sin(n * 78.233) * 12345.678);
    const peak = SFX.stepVolume * (0.65 + 0.35 * v2) * (running ? 1.15 : 1) * (n % 2 ? 0.8 : 1);

    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.9 + v1 * 0.3;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 2300 + v1 * 2200;
    band.Q.value = 3.5;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(peak, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
    src.connect(band).connect(amp).connect(this.destination);
    src.start(t);
    src.stop(t + 0.05);

    // Um "toc" grave bem fraquinho dá corpo ao passo.
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 170 + v2 * 90;
    const tap = ctx.createGain();
    tap.gain.setValueAtTime(peak * 0.45, t);
    tap.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    osc.connect(tap).connect(this.destination);
    osc.start(t);
    osc.stop(t + 0.04);
  }
}

function fract(v: number): number {
  return v - Math.floor(v);
}
