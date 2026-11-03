// Desenha a gosma do ato 3 (gotas, jorros, poças e o brilho verde), as goteiras de chuva, os respingos e as
// bolhinhas que saem da Mary envenenada. Lê o estado do GooField (src/systems/goo.ts).
// Spec: docs/features/goo-poison.md
import Phaser from 'phaser';
import { GOO_CFG } from '../config';
import { PAL } from '../art/palette';
import { TEX } from '../art/textures';
import { type Drip, GooField } from '../systems/goo';

/** Na frente das cartas (6,5) e atrás dos ratos (7). */
const DEPTH = { glow: 6.7, goo: 6.8 } as const;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: number;
  /** Bolha: sobe e não cai. */
  float?: boolean;
}

const G = PAL.intro;
const W = PAL.act3;

export class GooView {
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly glows: { img: Phaser.GameObjects.Image; jet: number | null; phase: number }[] = [];
  private particles: Particle[] = [];

  constructor(
    scene: Phaser.Scene,
    private readonly goo: GooField,
    private readonly water: GooField,
  ) {
    this.gfx = scene.add.graphics().setDepth(DEPTH.goo);
    const glow = (x: number, y: number, jet: number | null, scale: number) =>
      this.glows.push({
        img: scene.add.image(x, y, TEX.gooGlow).setDepth(DEPTH.glow).setBlendMode(Phaser.BlendModes.ADD).setScale(scale, scale * 0.8),
        jet,
        phase: x * 0.013,
      });
    goo.pools.forEach((p) => glow((p.x0 + p.x1) / 2, p.y - 6, null, 1.4));
    goo.jets.forEach((j, i) => glow(j.def.x, j.def.y - 10, i, 1.2));
  }

  /** Uma gota estourou em (x, y). */
  splash(x: number, y: number, isWater: boolean): void {
    for (let i = 0; i < 6; i++) {
      const a = Math.PI + (i / 5) * Math.PI;
      this.particles.push({
        x,
        y: y - 1,
        vx: Math.cos(a) * (30 + i * 6),
        vy: Math.sin(a) * (50 + (i % 2) * 25),
        life: 0.35,
        max: 0.35,
        color: isWater ? W.waterLight : G.gooLight,
      });
    }
  }

  /** Bolhinha verde subindo (a Mary envenenada). */
  bubble(x: number, y: number): void {
    this.particles.push({ x, y, vx: (Math.random() - 0.5) * 10, vy: -18 - Math.random() * 14, life: 0.7, max: 0.7, color: G.gooLight, float: true });
  }

  /** Cacos de vidro do lustre quebrado. */
  shards(x: number, y: number): void {
    for (let i = 0; i < 14; i++) {
      const a = Math.PI + (i / 13) * Math.PI;
      this.particles.push({ x, y, vx: Math.cos(a) * (40 + (i % 4) * 25), vy: Math.sin(a) * (60 + (i % 3) * 40), life: 0.8, max: 0.8, color: W.crystal });
    }
  }

  update(dt: number, time: number, view: Phaser.Geom.Rectangle, flash: number): void {
    const g = this.gfx;
    g.clear();
    const t = time / 1000;
    const near = (x: number, y: number) => x > view.x - 40 && x < view.right + 40 && y > view.y - 120 && y < view.bottom + 40;

    for (const d of this.water.drips) if (near(d.def.x, d.def.y)) this.drawDrip(d, W.water, W.waterLight, 0.85);
    for (const d of this.goo.drips) if (near(d.def.x, d.def.y)) this.drawDrip(d, G.goo, G.gooLight, 1);

    for (const p of this.goo.pools) {
      if (!near(p.x0, p.y)) continue;
      const len = p.x1 - p.x0;
      for (let x = 0; x <= len; x++) {
        const k = x / len;
        const h = Math.round(2 + Math.sin(k * Math.PI) * 1.5);
        g.fillStyle(G.gooDark, 1).fillRect(p.x0 + x, p.y - h, 1, h);
        // Brilho que corre pela superfície.
        const shine = Math.sin(x * 0.5 - t * 3) > 0.85;
        g.fillStyle(shine ? 0xffffff : G.gooLight, 1).fillRect(p.x0 + x, p.y - h, 1, 1);
        if (h > 2) g.fillStyle(G.goo, 1).fillRect(p.x0 + x, p.y - h + 1, 1, h - 2);
      }
      // Uma bolha que estoura de vez em quando.
      const bx = p.x0 + ((Math.floor(t * 1.3) * 37) % Math.max(1, len));
      if ((t * 1.3) % 1 < 0.35) g.fillStyle(G.gooLight, 1).fillRect(bx, p.y - 4, 2, 1);
    }

    this.goo.jets.forEach((j) => {
      const { x, y } = j.def;
      if (!near(x, y)) return;
      if (j.state === 'warn') {
        // Bolhas no cano, cada vez mais.
        const k = j.t / GOO_CFG.jetWarnSec;
        for (let i = 0; i < 2 + Math.floor(k * 4); i++) {
          const by = y - 6 - ((t * 20 + i * 5) % (6 + k * 8));
          g.fillStyle(i % 2 ? G.gooLight : G.goo, 1).fillRect(x - 3 + ((i * 3) % 6), Math.round(by), 2, 2);
        }
        return;
      }
      const h = GooField.jetHeight(j);
      if (h <= 0) return;
      const half = GOO_CFG.jetWidth / 2;
      for (let yy = 0; yy < h; yy++) {
        const wob = Math.round(Math.sin(yy * 0.45 + t * 22) * 1.2);
        const hw = Math.max(1, Math.round(half * (0.65 + 0.35 * (1 - yy / h))));
        g.fillStyle(G.goo, 1).fillRect(x - hw + wob, y - yy, hw * 2, 1);
        g.fillStyle(G.gooLight, 1).fillRect(x - 1 + wob, y - yy, 1, 1);
        g.fillStyle(G.gooDark, 1).fillRect(x + hw - 1 + wob, y - yy, 1, 1);
      }
      // Gotas espirrando no alto.
      for (let i = 0; i < 6; i++) {
        const ph = (t * 2.4 + i * 0.17) % 1;
        const sx = x + Math.sin(i * 2.1) * (6 + ph * 8);
        const sy = y - h - Math.sin(ph * Math.PI) * 10;
        g.fillStyle(G.gooLight, 1).fillRect(Math.round(sx), Math.round(sy), 1, 2);
      }
    });

    // Brilho pulsando (mais forte no jorro jorrando); o clarão do raio apaga um pouco o brilho.
    for (const gl of this.glows) {
      const spraying = gl.jet !== null && this.goo.jets[gl.jet].state === 'spray';
      const base = gl.jet === null ? 0.75 : spraying ? 1 : 0.45;
      gl.img.setAlpha(base * (0.85 + Math.sin(t * 2 + gl.phase) * 0.15) * (1 - flash * 0.5));
    }

    this.particles = this.particles.filter((p) => (p.life -= dt) > 0);
    for (const p of this.particles) {
      if (!p.float) p.vy += 400 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      g.fillStyle(p.color, Math.min(1, (p.life / p.max) * 1.5)).fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    }
  }

  private drawDrip(d: Drip, color: number, light: number, alpha: number): void {
    const g = this.gfx;
    const { x, y } = d.def;
    if (d.state === 'form') {
      // A gota crescendo pendurada no teto.
      const k = d.t / GOO_CFG.dripFormSec;
      const h = 1 + Math.round(k * 3);
      g.fillStyle(color, alpha).fillRect(x - 1, y, 2 + (k > 0.5 ? 1 : 0), h);
      g.fillStyle(light, alpha).fillRect(x - 1, y, 1, 1);
    } else if (d.state === 'fall') {
      g.fillStyle(color, alpha).fillRect(x - 1, Math.round(d.y) - 2, 2, 4);
      g.fillStyle(light, alpha).fillRect(x - 1, Math.round(d.y) - 2, 1, 2);
    } else {
      // Molhado no teto, esperando a próxima.
      g.fillStyle(color, alpha * 0.7).fillRect(x - 1, y, 2, 1);
    }
  }
}
