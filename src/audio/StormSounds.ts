// Sons da tempestade: chuva abafada (estamos dentro de casa) e trovões de vez em quando.
// Quem decide QUANDO troveja é o Storm (src/systems/storm.ts). Spec: docs/features/atmosphere.md
import { SFX } from '../config';
import { makeRng } from '../systems/storm';
import type { ThunderEvent } from '../systems/storm';
import { brownNoise, rainNoise, whiteNoise } from './noise';

export class StormSounds {
  private readonly rumble: AudioBuffer;
  private readonly crackle: AudioBuffer;
  private readonly rainGain: GainNode;
  private rainStarted = false;

  constructor(
    private readonly ctx: BaseAudioContext,
    private readonly destination: AudioNode,
  ) {
    this.rumble = brownNoise(ctx, 10, 4242);
    this.crackle = whiteNoise(ctx, 0.6, 777);
    this.rainGain = ctx.createGain();
    this.rainGain.gain.value = 0;
    this.rainGain.connect(destination);
  }

  /** Chuva contínua, entrando aos poucos. */
  startRain(): void {
    if (this.rainStarted) return;
    this.rainStarted = true;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = rainNoise(ctx, 4, 2024);
    src.loop = true;
    const high = ctx.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = 280;
    // Passa-baixa: a chuva bate lá fora, então chega abafada.
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 2300;
    src.connect(high).connect(low).connect(this.rainGain);
    const now = ctx.currentTime;
    this.rainGain.gain.setValueAtTime(0, now);
    this.rainGain.gain.linearRampToValueAtTime(SFX.rainVolume, now + 2.5);
    src.start(now);
  }

  /** Trovão: estalo (se perto) e um ronco grave que rola por alguns segundos. */
  thunder(e: ThunderEvent): void {
    const ctx = this.ctx;
    const rng = makeRng(e.seed);
    const t0 = ctx.currentTime + 0.02;
    const dur = 3.5 + 4 * e.strength;
    const vol = SFX.thunderVolume * (0.3 + 0.7 * e.strength);

    const pan = ctx.createStereoPanner();
    pan.pan.value = rng() - 0.5;
    pan.connect(this.destination);

    const src = ctx.createBufferSource();
    src.buffer = this.rumble;
    src.playbackRate.value = 0.85 + rng() * 0.3;
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.setValueAtTime(e.close ? 900 : 380, t0);
    low.frequency.setTargetAtTime(e.close ? 170 : 110, t0 + 0.05, dur * 0.3);
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0, t0);
    const attack = e.close ? 0.015 : 0.6;
    amp.gain.linearRampToValueAtTime(e.close ? vol : vol * 0.7, t0 + attack);
    // O ronco "rola": sobe e desce em ondas cada vez mais fracas.
    for (let t = attack + 0.2; t < dur; t += 0.18 + rng() * 0.45) {
      const env = Math.exp(-t / (dur * 0.38));
      amp.gain.linearRampToValueAtTime(vol * env * (0.45 + 0.55 * rng()), t0 + t);
    }
    amp.gain.linearRampToValueAtTime(0, t0 + dur + 0.6);
    src.connect(low).connect(amp).connect(pan);
    const offset = rng() * Math.max(0, this.rumble.duration - (dur + 1) * 1.2);
    src.start(t0, offset);
    src.stop(t0 + dur + 0.8);

    if (e.close) {
      const crack = ctx.createBufferSource();
      crack.buffer = this.crackle;
      const high = ctx.createBiquadFilter();
      high.type = 'highpass';
      high.frequency.value = 900;
      const cAmp = ctx.createGain();
      cAmp.gain.setValueAtTime(vol * 0.55, t0);
      cAmp.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
      crack.connect(high).connect(cAmp).connect(pan);
      crack.start(t0);
      crack.stop(t0 + 0.5);
    }
  }
}
