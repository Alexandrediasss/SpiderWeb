// Efeitos curtos de combate, sintetizados: guincho do rato, chiado da aranha, "fiuu" da teia.
// Como nos mobs do Minecraft: cada dano tem um som próprio. Spec: docs/features/combat.md
import { SFX } from '../config';
import { whiteNoise } from './noise';

export type SqueakKind = 'hurt' | 'death' | 'alert';
export type ShotSound = 'attack' | 'trap' | 'rope';

export class Sfx {
  private readonly noise: AudioBuffer;
  private count = 0;

  constructor(
    private readonly ctx: BaseAudioContext,
    private readonly destination: AudioNode,
  ) {
    this.noise = whiteNoise(ctx, 1, 4711);
  }

  /**
   * Guincho de rato ("iiik!"): tom limpo e bem agudo (seno + um pouco do 2º harmônico) que sobe rápido
   * e cai, com vibrato leve e um sopro de ruído no começo. Nada de onda áspera: rato chia, não zumbe.
   */
  ratSqueak(kind: SqueakKind): void {
    const t = this.ctx.currentTime;
    const v = this.vary();
    // Tom puro agudo soa muito mais alto que ruído no mesmo volume: por isso o fator baixo.
    const vol = SFX.hurtVolume * 0.4 * (kind === 'alert' ? 0.5 : kind === 'death' ? 0.9 : 0.8);
    if (kind === 'death') {
      // Guincho longo que vai morrendo.
      this.squeak(t, [[3200 * v, 0], [4300 * v, 0.05], [3700 * v, 0.25], [1900 * v, 0.6]], vol, 0.62, 9);
      return;
    }
    if (kind === 'alert') {
      // "ik-ik": dois piados curtinhos ao avistar a aranha.
      this.squeak(t, [[3300 * v, 0], [4000 * v, 0.025], [3500 * v, 0.06]], vol, 0.07, 0);
      this.squeak(t + 0.1, [[3500 * v, 0], [4200 * v, 0.025], [3600 * v, 0.06]], vol * 0.8, 0.07, 0);
      return;
    }
    this.squeak(t, [[3000 * v, 0], [4400 * v, 0.035], [3300 * v, 0.15]], vol, 0.17, 13);
  }

  /** Aranha leva dano: chiado áspero picotado (como o "tsss" de aranha do Minecraft) e um clique. */
  spiderHurt(): void {
    const t = this.ctx.currentTime;
    this.hiss(t, 0.24, 3600 * this.vary(), 2600, SFX.hurtVolume * 0.9, 34);
    this.click(t, 950, 280, 0.08, SFX.hurtVolume * 0.5);
  }

  spiderDeath(): void {
    const t = this.ctx.currentTime;
    this.hiss(t, 0.7, 3200, 900, SFX.hurtVolume, 22);
    this.click(t, 260, 70, 0.25, SFX.hurtVolume * 0.8);
  }

  /** "Fiuu" da teia saindo: ruído com filtro descendo rápido. */
  webShot(kind: ShotSound): void {
    const t = this.ctx.currentTime;
    const [from, to, dur] = kind === 'trap' ? [1600, 380, 0.17] : kind === 'rope' ? [2000, 600, 0.12] : [2600, 800, 0.1];
    const src = this.noiseSource(t, dur + 0.05);
    const band = this.ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.Q.value = 3;
    band.frequency.setValueAtTime(from * this.vary(), t);
    band.frequency.exponentialRampToValueAtTime(to, t + dur);
    const amp = this.envelope(t, SFX.shotVolume * (kind === 'rope' ? 0.7 : 1), 0.008, dur);
    src.connect(band).connect(amp).connect(this.destination);
  }

  /** Gota caindo numa poça: "plip" (tom que cai rápido). */
  drip(): void {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1900 * this.vary(), t);
    osc.frequency.exponentialRampToValueAtTime(650, t + 0.06);
    const amp = this.envelope(t, SFX.shotVolume * 0.18, 0.003, 0.08);
    osc.connect(amp).connect(this.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  /** Teia batendo em algo: "pff" curtinho e abafado. */
  splat(): void {
    const t = this.ctx.currentTime;
    const src = this.noiseSource(t, 0.08);
    const low = this.ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 900;
    const amp = this.envelope(t, SFX.shotVolume * 0.8, 0.003, 0.05);
    src.connect(low).connect(amp).connect(this.destination);
  }

  /** Papel amassando (abrir e fechar uma carta): estalinhos de ruído agudo em sequência, com um sopro por baixo. */
  paper(): void {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const vol = SFX.shotVolume * 0.7;
    const swish = this.noiseSource(t, 0.3);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.Q.value = 0.8;
    band.frequency.setValueAtTime(1800, t);
    band.frequency.linearRampToValueAtTime(3200, t + 0.25);
    swish.connect(band).connect(this.envelope(t, vol * 0.35, 0.05, 0.28)).connect(this.destination);
    for (let i = 0; i < 7; i++) {
      const at = t + 0.02 + i * 0.035 * this.vary();
      const crack = this.noiseSource(at, 0.03);
      const high = ctx.createBiquadFilter();
      high.type = 'bandpass';
      high.Q.value = 2.5;
      high.frequency.value = 2600 + 2400 * (this.vary() - 0.94) * 8;
      crack.connect(high).connect(this.envelope(at, vol * (0.5 + (i % 3) * 0.25), 0.002, 0.025)).connect(this.destination);
    }
  }

  /** Gosma espirrando (transição do ato 1): baque molhado grave com um chiado de bolhas. */
  goo(): void {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const vol = SFX.shotVolume;
    const body = this.noiseSource(t, 0.5);
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.setValueAtTime(1400, t);
    low.frequency.exponentialRampToValueAtTime(260, t + 0.4);
    body.connect(low).connect(this.envelope(t, vol, 0.006, 0.45)).connect(this.destination);
    this.click(t, 180, 60, 0.18, vol * 0.7);
    for (let i = 0; i < 5; i++) {
      const at = t + 0.12 + i * 0.07 * this.vary();
      this.click(at, 700 + i * 140 * this.vary(), 1300, 0.04, vol * 0.18);
    }
  }

  /** Assobio de vento que passa (transição do ato 2): ruído com filtro subindo e descendo. */
  whoosh(): void {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = this.noiseSource(t, 0.95);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.Q.value = 1.2;
    band.frequency.setValueAtTime(500, t);
    band.frequency.exponentialRampToValueAtTime(2200, t + 0.45);
    band.frequency.exponentialRampToValueAtTime(700, t + 0.9);
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(SFX.shotVolume * 0.8, t + 0.35);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    src.connect(band).connect(amp).connect(this.destination);
  }

  /** Choque do fio solto: zumbido elétrico picotado e um estalo. */
  zap(): void {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const vol = SFX.zapVolume;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.linearRampToValueAtTime(70, t + 0.3);
    const chop = ctx.createGain();
    chop.gain.value = 0.5;
    const lfo = ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 38;
    const depth = ctx.createGain();
    depth.gain.value = 0.5;
    lfo.connect(depth).connect(chop.gain);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 900;
    band.Q.value = 0.7;
    osc.connect(band).connect(chop).connect(this.envelope(t, vol, 0.004, 0.32)).connect(this.destination);
    for (const o of [osc, lfo]) {
      o.start(t);
      o.stop(t + 0.36);
    }
    this.hiss(t, 0.2, 5200, 3000, vol * 0.8, 60);
  }

  /** Faísca na ponta do fio: um estalinho agudo e baixo. */
  spark(): void {
    const t = this.ctx.currentTime;
    const src = this.noiseSource(t, 0.04);
    const high = this.ctx.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = 3500;
    src.connect(high).connect(this.envelope(t, SFX.zapVolume * 0.25, 0.002, 0.035)).connect(this.destination);
  }

  /** A pisada do zumbi: baque grave, estalo seco por cima (a aranha) e um respingo. */
  stomp(): void {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const vol = SFX.stompVolume;
    this.click(t, 120, 38, 0.35, vol);
    const crunch = this.noiseSource(t, 0.12);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1700;
    band.Q.value = 1.1;
    crunch.connect(band).connect(this.envelope(t, vol * 0.6, 0.002, 0.1)).connect(this.destination);
    const splash = this.noiseSource(t + 0.02, 0.25);
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 1200;
    splash.connect(low).connect(this.envelope(t + 0.02, vol * 0.35, 0.01, 0.22)).connect(this.destination);
  }

  /** Checkpoint: duas notas suaves subindo. */
  checkpoint(): void {
    const t = this.ctx.currentTime;
    for (const [f, at] of [
      [659, 0],
      [988, 0.11],
    ]) {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = f;
      osc.connect(this.envelope(t + at, SFX.shotVolume * 0.35, 0.01, 0.35)).connect(this.destination);
      osc.start(t + at);
      osc.stop(t + at + 0.4);
    }
  }

  // ---------- peças ----------

  /** Variação determinística de ±6% no tom, para os sons não serem idênticos. */
  private vary(): number {
    const n = this.count++;
    const r = Math.sin(n * 91.345) * 47453.5453;
    return 0.94 + (r - Math.floor(r)) * 0.12;
  }

  /** Um piado: curva de tom `curve` ([Hz, segundos]), volume que cresce, sustenta e cai no fim. */
  private squeak(t: number, curve: [number, number][], vol: number, dur: number, vibratoHz: number): void {
    const ctx = this.ctx;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(vol, t + 0.012);
    amp.gain.setValueAtTime(vol, t + dur * 0.65);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    amp.connect(this.destination);

    const oscs: OscillatorNode[] = [];
    for (const [mult, level] of [
      [1, 1],
      [2, 0.18],
    ]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      for (const [f, at] of curve) {
        if (at === 0) osc.frequency.setValueAtTime(f * mult, t);
        else osc.frequency.exponentialRampToValueAtTime(f * mult, t + at);
      }
      const g = ctx.createGain();
      g.gain.value = level;
      osc.connect(g).connect(amp);
      oscs.push(osc);
    }
    if (vibratoHz > 0) {
      // Vibrato leve (em cents): dá o tremido de bicho, sem virar sirene.
      const lfo = ctx.createOscillator();
      lfo.frequency.value = vibratoHz;
      const depth = ctx.createGain();
      depth.gain.value = 45;
      lfo.connect(depth);
      for (const o of oscs) depth.connect(o.detune);
      oscs.push(lfo);
    }
    for (const o of oscs) {
      o.start(t);
      o.stop(t + dur + 0.05);
    }

    // Sopro de ar no começo do piado.
    const breath = this.noiseSource(t, 0.05);
    const high = ctx.createBiquadFilter();
    high.type = 'bandpass';
    high.frequency.value = 5500;
    high.Q.value = 1.5;
    breath.connect(high).connect(this.envelope(t, vol * 0.25, 0.004, 0.04)).connect(this.destination);
  }

  private hiss(t: number, dur: number, from: number, to: number, vol: number, chopHz: number): void {
    const ctx = this.ctx;
    const src = this.noiseSource(t, dur + 0.05);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.Q.value = 1.4;
    band.frequency.setValueAtTime(from, t);
    band.frequency.exponentialRampToValueAtTime(to, t + dur);
    // "Picotado": o volume liga e desliga rápido, dando a aspereza.
    const chop = ctx.createGain();
    chop.gain.value = 0.5;
    const lfo = ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = chopHz;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.5;
    lfo.connect(lfoDepth).connect(chop.gain);
    lfo.start(t);
    lfo.stop(t + dur + 0.05);
    const amp = this.envelope(t, vol, 0.01, dur);
    src.connect(band).connect(chop).connect(amp).connect(this.destination);
  }

  private click(t: number, from: number, to: number, dur: number, vol: number): void {
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    const amp = this.envelope(t, vol, 0.004, dur);
    osc.connect(amp).connect(this.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  private noiseSource(t: number, dur: number): AudioBufferSourceNode {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    // Em loop: sons longos (vento, gosma) não acabam no fim do buffer de 1 s.
    src.loop = true;
    src.start(t, ((this.count * 0.137) % 0.8) + 0.01);
    src.stop(t + dur);
    return src;
  }

  /** Ganho com ataque linear curto e queda exponencial até `dur`. */
  private envelope(t: number, peak: number, attack: number, dur: number): GainNode {
    const amp = this.ctx.createGain();
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(peak, t + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    return amp;
  }
}
