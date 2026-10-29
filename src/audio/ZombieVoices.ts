// Gemidos e passos dos zumbis da cutscene da rua, sintetizados. Quem decide QUANDO cada zumbi geme
// é a Horde (src/systems/horde.ts). Spec: docs/features/street-cutscene.md
//
// Um gemido é uma "voz": duas dentes de serra graves que descem de tom, com aspereza (o volume
// pulsa rápido, como voz rouca), um sub-harmônico e três filtros de formante que vão de "uh" para
// "ah" e voltam. Os formantes (400 a 2500 Hz) são o que caixinhas de notebook conseguem tocar.
import { SFX } from '../config';
import { makeRng } from '../systems/storm';
import { whiteNoise } from './noise';

export interface GroanEvent {
  /** -1..1 */
  pan: number;
  /** 0..1 (fileiras da frente gemem mais alto). */
  volume: number;
  seed: number;
}

/** Ganho para compensar o que os filtros de formante tiram da onda. */
const FORMANT_MAKEUP = 3.2;

export class ZombieVoices {
  private readonly bus: GainNode;
  private readonly filter: BiquadFilterNode;
  private readonly noise: AudioBuffer;
  private steps = 0;

  constructor(
    private readonly ctx: BaseAudioContext,
    destination: AudioNode,
  ) {
    this.noise = whiteNoise(ctx, 1, 9091);
    this.bus = ctx.createGain();
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 12000;
    this.bus.connect(this.filter).connect(destination);
  }

  /** Distância da horda: 0 = na cara (rua), 1 = longe e abafada (de cima do telhado). */
  setDistance(d: number, rampSec = 0.3): void {
    const t = this.ctx.currentTime;
    for (const [param, value] of [
      [this.filter.frequency, 9000 * Math.pow(650 / 9000, d)],
      [this.bus.gain, 1 - 0.7 * d],
    ] as const) {
      param.cancelScheduledValues(t);
      param.setValueAtTime(param.value, t);
      param.linearRampToValueAtTime(value, t + rampSec);
    }
  }

  groan(e: GroanEvent): void {
    const ctx = this.ctx;
    const rng = makeRng(e.seed);
    const t = ctx.currentTime + 0.01;
    const dur = 0.8 + rng() * 1.2;
    const f0 = 78 + rng() * 72;
    const vol = SFX.groanVolume * e.volume;

    const pan = ctx.createStereoPanner();
    pan.pan.value = e.pan;
    pan.connect(this.bus);
    // Envelope: entra devagar, incha no meio e morre arrastado.
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(vol * 0.7, t + 0.12 + rng() * 0.15);
    amp.gain.linearRampToValueAtTime(vol, t + dur * (0.35 + rng() * 0.2));
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    amp.connect(pan);

    // Aspereza: o volume da voz pulsa a 25–45 Hz.
    const rough = ctx.createGain();
    rough.gain.value = 0.55;
    const growl = ctx.createOscillator();
    growl.type = 'triangle';
    growl.frequency.value = 25 + rng() * 20;
    const growlDepth = ctx.createGain();
    growlDepth.gain.value = 0.45;
    growl.connect(growlDepth).connect(rough.gain);

    // Tremido do tom (cents).
    const jitter = ctx.createOscillator();
    jitter.frequency.value = 4 + rng() * 3;
    const jitterDepth = ctx.createGain();
    jitterDepth.gain.value = 25 + rng() * 30;
    jitter.connect(jitterDepth);

    const oscs: OscillatorNode[] = [growl, jitter];
    for (const [type, mult, level, detune] of [
      ['sawtooth', 1, 0.6, 0],
      ['sawtooth', 1, 0.5, 14],
      ['square', 0.5, 0.22, 0],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.detune.value = detune;
      osc.frequency.setValueAtTime(f0 * mult * 1.12, t);
      osc.frequency.exponentialRampToValueAtTime(f0 * mult, t + 0.25);
      osc.frequency.exponentialRampToValueAtTime(f0 * mult * (0.78 + rng() * 0.1), t + dur);
      jitterDepth.connect(osc.detune);
      const g = ctx.createGain();
      g.gain.value = level;
      osc.connect(g).connect(rough);
      oscs.push(osc);
    }

    // Formantes: "uh" → "ah" → "uh" (cada gemido com uma boca um pouco diferente).
    const open = 0.6 + rng() * 0.4;
    for (const [from, peak, q, level] of [
      [430, 430 + 300 * open, 6, 1],
      [880, 880 + 300 * open, 7, 0.6],
      [2400, 2550, 8, 0.25],
    ]) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = q;
      bp.frequency.setValueAtTime(from, t);
      bp.frequency.linearRampToValueAtTime(peak, t + dur * 0.45);
      bp.frequency.linearRampToValueAtTime(from * 0.95, t + dur);
      const g = ctx.createGain();
      g.gain.value = level * FORMANT_MAKEUP;
      rough.connect(bp).connect(g).connect(amp);
    }
    for (const o of oscs) {
      o.start(t);
      o.stop(t + dur + 0.05);
    }

    // Sopro rouco por cima.
    const breath = this.noiseSource(t, dur);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1300 + rng() * 500;
    band.Q.value = 0.9;
    const bAmp = ctx.createGain();
    bAmp.gain.setValueAtTime(0, t);
    bAmp.gain.linearRampToValueAtTime(vol * 0.35, t + dur * 0.4);
    bAmp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    breath.connect(band).connect(bAmp).connect(pan);
  }

  /** Pé arrastado no chão molhado: um "chap" abafado e um respingo curtinho. */
  step(pan: number, volume: number): void {
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.005;
    const vol = SFX.zombieStepVolume * volume;
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    p.connect(this.bus);

    const thud = this.noiseSource(t, 0.14);
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 700 + (this.steps % 5) * 60;
    thud.connect(low).connect(this.envelope(t, vol, 0.01, 0.13)).connect(p);

    const splash = this.noiseSource(t + 0.02, 0.07);
    const high = ctx.createBiquadFilter();
    high.type = 'bandpass';
    high.frequency.value = 2800;
    high.Q.value = 1.2;
    splash.connect(high).connect(this.envelope(t + 0.02, vol * 0.45, 0.004, 0.06)).connect(p);
  }

  private noiseSource(t: number, dur: number): AudioBufferSourceNode {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.start(t, ((this.steps++ * 0.173) % 0.7) + 0.01);
    src.stop(t + dur);
    return src;
  }

  private envelope(t: number, peak: number, attack: number, dur: number): GainNode {
    const amp = this.ctx.createGain();
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(peak, t + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    return amp;
  }
}
