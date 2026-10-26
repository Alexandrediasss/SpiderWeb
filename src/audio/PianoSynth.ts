// Piano sintetizado com Web Audio (sem samples). Funciona com AudioContext e OfflineAudioContext.
// Spec: docs/features/music.md

const HARMONICS = 16;
/** Os martelos batem a ~1/7 da corda, então o 7º harmônico (e múltiplos) quase some. */
const HAMMER_NODE = 7;

export class PianoSynth {
  /** Entrada do piano: tudo que for tocado passa por aqui. */
  readonly input: GainNode;
  private readonly waves = new Map<number, PeriodicWave>();
  private readonly noise: AudioBuffer;

  constructor(
    private readonly ctx: BaseAudioContext,
    destination: AudioNode,
    reverbMix: number,
  ) {
    this.input = ctx.createGain();

    const dry = ctx.createGain();
    dry.gain.value = 1 - reverbMix * 0.5;
    const wet = ctx.createGain();
    wet.gain.value = reverbMix;
    const reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(ctx, 3.2, 2.6);

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.01;
    compressor.release.value = 0.3;

    this.input.connect(dry).connect(compressor);
    this.input.connect(reverb).connect(wet).connect(compressor);
    compressor.connect(destination);

    this.noise = makeNoise(ctx, 0.08);
  }

  /** Toca uma nota. `time` e `duration` em segundos do relógio do contexto. */
  play(midi: number, time: number, duration: number, velocity: number): void {
    const ctx = this.ctx;
    const freq = 440 * 2 ** ((midi - 69) / 12);
    // Graves soam por mais tempo; agudos morrem rápido.
    const decay = clamp(1.7 * (261.6 / freq) ** 0.6, 0.35, 4.5);
    const peak = 0.22 * velocity ** 1.3;
    const end = time + duration;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.6;
    const bright = Math.min(freq * (3 + 9 * velocity), 9000);
    filter.frequency.setValueAtTime(bright, time);
    filter.frequency.setTargetAtTime(Math.max(freq * 1.6, 250), time + 0.01, decay * 0.5);

    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0, time);
    amp.gain.linearRampToValueAtTime(peak, time + 0.004);
    amp.gain.setTargetAtTime(0, time + 0.004, decay);
    // Abafador ao soltar a tecla.
    amp.gain.setTargetAtTime(0, end, 0.09);
    filter.connect(amp).connect(this.input);

    // Duas cordas levemente desafinadas dão o "chorus" natural do piano.
    const detune = midi < 40 ? 0.5 : 1.4;
    for (const cents of [-detune, detune]) {
      const osc = ctx.createOscillator();
      osc.setPeriodicWave(this.waveFor(midi));
      osc.frequency.value = freq;
      osc.detune.value = cents;
      osc.connect(filter);
      osc.start(time);
      osc.stop(end + 0.8);
    }

    // Toque do martelo: um "tuc" curto de ruído.
    const hammer = ctx.createBufferSource();
    hammer.buffer = this.noise;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = Math.min(freq * 4, 4000);
    band.Q.value = 1.2;
    const hammerAmp = ctx.createGain();
    hammerAmp.gain.setValueAtTime(peak * 0.25, time);
    hammerAmp.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
    hammer.connect(band).connect(hammerAmp).connect(this.input);
    hammer.start(time);
    hammer.stop(time + 0.06);
  }

  /** Forma de onda por região do teclado (graves mais ricos em harmônicos). */
  private waveFor(midi: number): PeriodicWave {
    const bucket = Math.floor(midi / 6);
    const cached = this.waves.get(bucket);
    if (cached) return cached;
    const real = new Float32Array(HARMONICS + 1);
    const imag = new Float32Array(HARMONICS + 1);
    const rolloff = midi < 48 ? 1.0 : midi < 66 ? 1.3 : 1.7;
    for (let n = 1; n <= HARMONICS; n++) {
      const node = n % HAMMER_NODE === 0 ? 0.15 : 1;
      imag[n] = (node / n ** rolloff) * (n === 2 ? 0.8 : 1);
    }
    const wave = this.ctx.createPeriodicWave(real, imag);
    this.waves.set(bucket, wave);
    return wave;
  }
}

/** Resposta ao impulso estéreo: ruído com decaimento exponencial (sala grande e escura). */
function makeImpulse(ctx: BaseAudioContext, seconds: number, decay: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(2, len, rate);
  let seed = 12345;
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      seed = (Math.imul(seed, 1103515245) + 12345) | 0;
      const white = ((seed >>> 0) / 4294967295) * 2 - 1;
      // Passa-baixa simples: reverb mais "quente", sem chiado.
      lp += (white - lp) * 0.35;
      const t = i / len;
      data[i] = lp * (1 - t) ** decay * (i < rate * 0.012 ? i / (rate * 0.012) : 1);
    }
  }
  return buf;
}

function makeNoise(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buf.getChannelData(0);
  let seed = 987;
  for (let i = 0; i < data.length; i++) {
    seed = (Math.imul(seed, 1103515245) + 12345) | 0;
    data[i] = ((seed >>> 0) / 4294967295) * 2 - 1;
  }
  return buf;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
