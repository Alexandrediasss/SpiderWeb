// Toca a partitura em loop, agendando as notas um pouco à frente do relógio de áudio.
// Spec: docs/features/music.md
import { MUSIC } from '../config';
import { PianoSynth } from './PianoSynth';
import { type Song, buildSong } from './score';

const TICK_MS = 100;

export class MusicPlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private synth: PianoSynth | null = null;
  private readonly song: Song = buildSong(MUSIC.bpm);
  private loopStart = 0;
  private next = 0;
  private timer: number | undefined;
  private muted = false;

  get isMuted(): boolean {
    return this.muted;
  }

  /** Precisa ser chamado a partir de um gesto do jogador (tecla/clique). */
  start(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    this.synth = new PianoSynth(ctx, this.master, MUSIC.reverbMix);

    const now = ctx.currentTime;
    this.master.gain.setValueAtTime(0, now);
    this.master.gain.linearRampToValueAtTime(this.muted ? 0 : MUSIC.volume, now + MUSIC.fadeInSec);
    this.loopStart = now + 0.3;
    this.timer = window.setInterval(() => this.schedule(), TICK_MS);
    this.schedule();
  }

  toggleMute(): void {
    this.muted = !this.muted;
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(this.muted ? 0 : MUSIC.volume, now + 0.4);
  }

  stop(): void {
    window.clearInterval(this.timer);
    void this.ctx?.close();
    this.ctx = null;
  }

  private schedule(): void {
    if (!this.ctx || !this.synth) return;
    const horizon = this.ctx.currentTime + MUSIC.lookahead;
    const { events, length } = this.song;
    while (this.loopStart + events[this.next].time < horizon) {
      const e = events[this.next];
      this.synth.play(e.midi, this.loopStart + e.time, e.duration, e.velocity);
      this.next++;
      if (this.next >= events.length) {
        this.next = 0;
        this.loopStart += length;
      }
    }
  }
}
