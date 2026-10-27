// Toca a partitura em loop, agendando as notas um pouco à frente do relógio de áudio.
// Spec: docs/features/music.md
import { MUSIC } from '../config';
import { PianoSynth } from './PianoSynth';
import { type Song, buildSong } from './score';

const TICK_MS = 100;

export class MusicPlayer {
  private readonly out: GainNode;
  private readonly synth: PianoSynth;
  private readonly song: Song = buildSong(MUSIC.bpm);
  private loopStart = 0;
  private next = 0;
  private timer: number | undefined;
  private playing = false;

  constructor(
    private readonly ctx: BaseAudioContext,
    destination: AudioNode,
  ) {
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(destination);
    this.synth = new PianoSynth(ctx, this.out, MUSIC.reverbMix);
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  /** Começa do início com fade-in. Se o contexto ainda estiver suspenso, toca quando ele for liberado. */
  start(): void {
    if (this.playing) return;
    this.playing = true;
    const now = this.ctx.currentTime;
    this.ramp(MUSIC.volume, MUSIC.fadeInSec, 0);
    this.loopStart = now + 0.3;
    this.next = 0;
    this.timer = window.setInterval(() => this.schedule(), TICK_MS);
    this.schedule();
  }

  /** Some aos poucos e para de agendar notas. */
  stop(fadeSec = MUSIC.fadeOutSec): void {
    if (!this.playing) return;
    this.playing = false;
    window.clearInterval(this.timer);
    this.ramp(0, fadeSec);
  }

  private ramp(to: number, sec: number, from?: number): void {
    const g = this.out.gain;
    const now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(from ?? g.value, now);
    g.linearRampToValueAtTime(to, now + sec);
  }

  private schedule(): void {
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
