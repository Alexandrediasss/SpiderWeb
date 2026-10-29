// Perigos do ato 2 no Phaser: os fios inteiros entre os postes (enfeite), os fios soltos balançando com faísca
// na ponta e os detritos voando na rajada. Lê LooseWire e DebrisField. Spec: docs/features/wind.md
import Phaser from 'phaser';
import { PAL } from '../art/palette';
import type { Vec2 } from '../physics/surfaces';
import type { Debris } from '../systems/debris';
import type { LooseWire } from '../systems/looseWire';
import { makeRng } from '../systems/storm';
import { pixelLine } from './Spider';

/** Ordem: fios (4), faíscas (4,2), detritos (5). O cenário fica em 3 e a aranha em 9. */
const DEPTH = { spans: 4, wires: 4.1, sparks: 4.2, debris: 5 } as const;

export interface WireSpan {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  sag: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export class Hazards {
  private readonly wireGfx: Phaser.GameObjects.Graphics;
  private readonly sparkGfx: Phaser.GameObjects.Graphics;
  private readonly debrisPool: Phaser.GameObjects.Image[] = [];
  private sparks: Spark[] = [];
  private readonly rng: () => number;

  constructor(
    private readonly scene: Phaser.Scene,
    spans: WireSpan[],
    private readonly debrisTexture: string,
    seed: number,
  ) {
    this.rng = makeRng(seed);
    // Fios inteiros: uma curva (catenária aproximada por parábola) desenhada uma vez.
    const g = scene.add.graphics().setDepth(DEPTH.spans);
    g.fillStyle(PAL.act2.wire, 1);
    for (const s of spans) {
      const steps = Math.ceil(Math.abs(s.x1 - s.x0) / 8);
      let prev = { x: s.x0, y: s.y0 };
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const p = { x: s.x0 + (s.x1 - s.x0) * t, y: s.y0 + (s.y1 - s.y0) * t + s.sag * 4 * t * (1 - t) };
        pixelLine(g, prev.x, prev.y, p.x, p.y);
        prev = p;
      }
    }
    this.wireGfx = scene.add.graphics().setDepth(DEPTH.wires);
    this.sparkGfx = scene.add.graphics().setDepth(DEPTH.sparks).setBlendMode(Phaser.BlendModes.ADD);
  }

  /** Solta faíscas num ponto (ponta do fio, ou onde a aranha levou o choque). */
  sparkAt(p: Vec2, count = 7): void {
    for (let i = 0; i < count; i++) {
      const a = this.rng() * Math.PI * 2;
      const v = 40 + this.rng() * 90;
      this.sparks.push({ x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: 0.15 + this.rng() * 0.25 });
    }
  }

  /** `tint`: cor da noite para os detritos. */
  update(dt: number, wires: LooseWire[], debris: Debris[], tint: number): void {
    const g = this.wireGfx;
    g.clear();
    g.fillStyle(PAL.act2.wire, 1);
    for (const w of wires) {
      const pts = w.points();
      for (let i = 1; i < pts.length; i++) pixelLine(g, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
      // Ponta descascada: cobre brilhando.
      const tip = pts[pts.length - 1];
      g.fillStyle(0xc87a3a, 1).fillRect(Math.round(tip.x) - 1, Math.round(tip.y), 2, 2);
      g.fillStyle(PAL.act2.wire, 1);
    }

    const s = this.sparkGfx;
    s.clear();
    this.sparks = this.sparks.filter((p) => (p.life -= dt) > 0);
    for (const p of this.sparks) {
      p.vy += 300 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      s.fillStyle(p.life > 0.12 ? PAL.act2.sparkHot : PAL.act2.spark, 1);
      s.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    }

    // Detritos: reaproveita as imagens.
    while (this.debrisPool.length < debris.length) {
      this.debrisPool.push(this.scene.add.image(0, 0, this.debrisTexture, 'shingle').setDepth(DEPTH.debris));
    }
    this.debrisPool.forEach((img, i) => {
      const d = debris[i];
      img.setVisible(!!d);
      if (d) img.setPosition(Math.round(d.x), Math.round(d.y)).setFrame(d.kind).setRotation(d.angle).setTint(tint);
    });
  }
}
