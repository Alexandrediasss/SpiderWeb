// Clima do ato 2, desenhado na tela (não no mundo): chuva inclinada pelo vento, riscos de vento como no
// Celeste, o clarão do relâmpago e o raio no céu. Spec: docs/features/wind.md
import Phaser from 'phaser';
import { STORM, VIEW } from '../config';
import { PAL } from '../art/palette';
import { boltPath, makeRng } from '../systems/storm';
import type { Storm } from '../systems/storm';
import { pixelLine } from './Spider';

/** Ordem: raio atrás do cenário (0,5); chuva e vento na frente de tudo (12); clarão por cima (13). */
const DEPTH = { bolt: 0.5, rain: 12, streaks: 12.1, flash: 13 } as const;
const STREAKS = 46;

interface Drop {
  x: number;
  y: number;
  speed: number;
}

interface Streak {
  x: number;
  y: number;
  len: number;
  speed: number;
}

export interface WindLook {
  dir: -1 | 1;
  strength: number;
}

export class Weather {
  private readonly rain: Phaser.GameObjects.Graphics;
  private readonly streakGfx: Phaser.GameObjects.Graphics;
  private readonly boltGfx: Phaser.GameObjects.Graphics;
  private readonly flashRect: Phaser.GameObjects.Rectangle;
  private readonly drops: Drop[] = [];
  private readonly streaks: Streak[] = [];
  private readonly rng: () => number;
  private boltSeed = -1;

  constructor(scene: Phaser.Scene, seed: number) {
    this.rng = makeRng(seed);
    const screen = <T extends Phaser.GameObjects.Components.ScrollFactor>(o: T) => o.setScrollFactor(0);
    this.rain = screen(scene.add.graphics().setDepth(DEPTH.rain));
    this.streakGfx = screen(scene.add.graphics().setDepth(DEPTH.streaks));
    this.boltGfx = screen(scene.add.graphics().setDepth(DEPTH.bolt));
    this.flashRect = screen(
      scene.add
        .rectangle(0, 0, VIEW.width, VIEW.height, PAL.street.flash)
        .setOrigin(0, 0)
        .setDepth(DEPTH.flash)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0),
    );
    for (let i = 0; i < STORM.rainDrops; i++) this.drops.push(this.drop(true));
    for (let i = 0; i < STREAKS; i++) this.streaks.push(this.streak(1, true));
  }

  /** Desenha um quadro (o mundo pausado = `dt` zero: tudo congela). */
  update(dt: number, wind: WindLook, storm: Storm): void {
    this.drawRain(dt, wind, storm.flash);
    this.drawStreaks(dt, wind);
    this.flashRect.setAlpha(storm.flash * 0.35);
    this.drawBolt(storm);
  }

  private drawRain(dt: number, wind: WindLook, flash: number): void {
    const g = this.rain;
    g.clear();
    g.fillStyle(PAL.light.rain, 0.45 + flash * 0.4);
    const windPx = STORM.rainWind + wind.dir * wind.strength * 700;
    for (let i = 0; i < this.drops.length; i++) {
      const d = this.drops[i];
      d.y += d.speed * dt;
      d.x += windPx * dt;
      if (d.y > VIEW.height || d.x < -20 || d.x > VIEW.width + 20) {
        this.drops[i] = this.drop(false, wind.dir * wind.strength);
        continue;
      }
      const slope = windPx / d.speed;
      for (let k = 0; k < STORM.rainLength; k++) g.fillRect(Math.round(d.x - slope * k), Math.round(d.y - k), 1, 1);
    }
  }

  /** Riscos de vento: mais e mais rápidos quanto mais forte, vindo do lado de onde ele sopra. */
  private drawStreaks(dt: number, wind: WindLook): void {
    const g = this.streakGfx;
    g.clear();
    const active = Math.floor(STREAKS * wind.strength);
    for (let i = 0; i < this.streaks.length; i++) {
      const s = this.streaks[i];
      s.x += wind.dir * s.speed * (0.4 + wind.strength) * dt;
      const out = wind.dir > 0 ? s.x > VIEW.width : s.x + s.len < 0;
      if (out) this.streaks[i] = this.streak(wind.dir, false);
      if (i >= active) continue;
      g.fillStyle(PAL.act2.streak, 0.25 + wind.strength * 0.45);
      g.fillRect(Math.round(s.x), Math.round(s.y), s.len, 1);
    }
  }

  private drawBolt(storm: Storm): void {
    const bolt = storm.bolt;
    if (!bolt) {
      if (this.boltSeed !== -1) this.boltGfx.clear();
      this.boltSeed = -1;
      return;
    }
    if (bolt.seed === this.boltSeed) return;
    this.boltSeed = bolt.seed;
    const g = this.boltGfx;
    g.clear();
    g.fillStyle(PAL.light.bolt, 1);
    const ox = Math.round(VIEW.width * bolt.x);
    for (const line of boltPath(bolt.seed, VIEW.height * 0.6)) {
      for (let i = 1; i < line.length; i++) pixelLine(g, ox + line[i - 1].x, line[i - 1].y, ox + line[i].x, line[i].y);
    }
  }

  private drop(anywhere: boolean, windSide = 0): Drop {
    const speed = STORM.rainSpeed[0] + this.rng() * (STORM.rainSpeed[1] - STORM.rainSpeed[0]);
    // Com vento forte, metade das gotas novas entra pelo lado de onde ele vem (senão um lado da tela esvazia).
    if (!anywhere && Math.abs(windSide) > 0.2 && this.rng() < 0.5) {
      return { x: windSide > 0 ? -5 : VIEW.width + 5, y: this.rng() * VIEW.height, speed };
    }
    return { x: this.rng() * (VIEW.width + 40) - 20, y: anywhere ? this.rng() * VIEW.height : -this.rng() * 40, speed };
  }

  private streak(dir: number, anywhere: boolean): Streak {
    const len = 10 + Math.floor(this.rng() * 34);
    return {
      x: anywhere ? this.rng() * VIEW.width : dir > 0 ? -len - this.rng() * 80 : VIEW.width + this.rng() * 80,
      y: Math.floor(this.rng() * VIEW.height),
      len,
      speed: 650 + this.rng() * 450,
    };
  }
}
