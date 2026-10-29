// Sons da tempestade: chuva abafada (estamos dentro de casa) e trovões de vez em quando.
// Quem decide QUANDO troveja é o Storm (src/systems/storm.ts). Spec: docs/features/atmosphere.md
import { SFX } from '../config';
import { makeRng } from '../systems/storm';
import type { ThunderEvent } from '../systems/storm';
import { brownNoise, rainNoise, whiteNoise } from './noise';

const RAIN_INSIDE_HZ = 2300;
const RAIN_OUTSIDE_HZ = 6500;

export class StormSounds {
  private readonly rumble: AudioBuffer;
  private readonly crackle: AudioBuffer;
  private readonly rainGain: GainNode;
  /** Passa-baixa da chuva: abafada dentro de casa, aberta do lado de fora (cutscene da rua). */
  private readonly rainLow: BiquadFilterNode;
  private readonly softClip: Float32Array<ArrayBuffer>;
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
    this.rainLow = ctx.createBiquadFilter();
    this.rainLow.type = 'lowpass';
    this.rainLow.frequency.value = RAIN_INSIDE_HZ;
    // Saturação suave (tanh): engrossa o ronco sem estourar.
    this.softClip = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i / 1023) * 2 - 1;
      this.softClip[i] = Math.tanh(2.2 * x) / Math.tanh(2.2);
    }
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
    src.connect(high).connect(this.rainLow).connect(this.rainGain);
    const now = ctx.currentTime;
    this.rainGain.gain.setValueAtTime(0, now);
    this.rainGain.gain.linearRampToValueAtTime(SFX.rainVolume, now + 2.5);
    src.start(now);
  }

  /** Do lado de fora (cutscene da rua) a chuva fica mais alta e menos abafada. */
  setOutside(outside: boolean, rampSec = 1): void {
    const t = this.ctx.currentTime;
    for (const [param, value] of [
      [this.rainLow.frequency, outside ? RAIN_OUTSIDE_HZ : RAIN_INSIDE_HZ],
      [this.rainGain.gain, outside ? SFX.rainOutsideVolume : SFX.rainVolume],
    ] as const) {
      param.cancelScheduledValues(t);
      param.setValueAtTime(param.value, t);
      param.linearRampToValueAtTime(value, t + rampSec);
    }
  }

  /**
   * Trovão: estalo (se perto) e um ronco que rola por alguns segundos.
   * O ronco tem duas camadas: o grave (ruído marrom) e uma camada média (250–900 Hz) que é o que
   * caixinhas de notebook conseguem tocar; sem ela o trovão some atrás da chuva. Um saturador suave
   * gera harmônicos do grave, que também ajudam a ouvir.
   */
  thunder(e: ThunderEvent): void {
    const ctx = this.ctx;
    const rng = makeRng(e.seed);
    const t0 = ctx.currentTime + 0.02;
    const dur = 4 + 4 * e.strength;
    const vol = SFX.thunderVolume * (0.55 + 0.45 * e.strength);

    const pan = ctx.createStereoPanner();
    pan.pan.value = (rng() - 0.5) * 0.8;
    pan.connect(this.destination);
    const shaper = ctx.createWaveShaper();
    shaper.curve = this.softClip;
    shaper.connect(pan);

    // Envelope comum às duas camadas: o ronco "rola", subindo e descendo em ondas cada vez mais fracas.
    const amp = ctx.createGain();
    amp.connect(shaper);
    amp.gain.setValueAtTime(0, t0);
    const attack = e.close ? 0.015 : 0.35;
    amp.gain.linearRampToValueAtTime(e.close ? vol : vol * 0.8, t0 + attack);
    for (let t = attack + 0.2; t < dur; t += 0.18 + rng() * 0.45) {
      const env = Math.exp(-t / (dur * 0.4));
      amp.gain.linearRampToValueAtTime(vol * env * (0.45 + 0.55 * rng()), t0 + t);
    }
    amp.gain.linearRampToValueAtTime(0, t0 + dur + 0.6);

    const offset = () => rng() * Math.max(0, this.rumble.duration - (dur + 1) * 1.2);

    const deep = ctx.createBufferSource();
    deep.buffer = this.rumble;
    deep.playbackRate.value = 0.85 + rng() * 0.3;
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.setValueAtTime(e.close ? 1400 : 800, t0);
    low.frequency.setTargetAtTime(e.close ? 260 : 190, t0 + 0.05, dur * 0.3);
    deep.connect(low).connect(amp);
    deep.start(t0, offset());
    deep.stop(t0 + dur + 0.8);

    const mid = ctx.createBufferSource();
    mid.buffer = this.rumble;
    mid.playbackRate.value = 2.5 + rng();
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.setValueAtTime(e.close ? 700 : 480, t0);
    band.frequency.setTargetAtTime(e.close ? 380 : 300, t0 + 0.05, dur * 0.35);
    band.Q.value = 0.8;
    const midGain = ctx.createGain();
    midGain.gain.value = 2.2;
    mid.connect(band).connect(midGain).connect(amp);
    mid.start(t0, offset() / 3);
    mid.stop(t0 + dur + 0.8);

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
