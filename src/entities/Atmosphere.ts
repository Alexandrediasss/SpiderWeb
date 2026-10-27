// Noite chuvosa: escuro com luz das luminárias, feixes com poeira, chuva lá fora e relâmpagos.
// Desenha o estado do Storm (src/systems/storm.ts) e os mapas de luz (src/art/lighting.ts).
// Spec: docs/features/atmosphere.md
import Phaser from 'phaser';
import { LIGHT, STORM } from '../config';
import type { LevelArt } from '../art/levelArt';
import { sampleLight } from '../art/lighting';
import { PAL } from '../art/palette';
import { TEX } from '../art/textures';
import { Storm, type ThunderEvent, boltPath } from '../systems/storm';

/** Ordem de desenho: cenário 0, chuva 1, escuro 2, clarão 3, feixes 4, poeira 5, raio 6; aranha e teia vêm depois. */
export const DEPTH = { rain: 1, light: 2, flash: 3, beam: 4, dust: 5, bolt: 6 } as const;

interface Drop {
  x: number;
  y: number;
  speed: number;
}

export class Atmosphere {
  readonly storm: Storm;
  private readonly lightImg: Phaser.GameObjects.Image;
  private readonly flashImg: Phaser.GameObjects.Image;
  private readonly rainGfx: Phaser.GameObjects.Graphics;
  private readonly boltGfx: Phaser.GameObjects.Graphics;
  private readonly drops: Drop[] = [];
  private readonly W: number;
  private readonly H: number;
  private rngState = 1;
  private boltSeed = -1;
  private boltX: number | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly art: LevelArt,
    seed: number,
  ) {
    this.storm = new Storm(seed);
    this.rngState = seed || 1;
    this.W = art.canvas.width;
    this.H = art.canvas.height;

    this.rainGfx = scene.add.graphics().setDepth(DEPTH.rain);
    this.lightImg = scene.add.image(0, 0, TEX.light).setOrigin(0, 0).setDepth(DEPTH.light);
    this.lightImg.setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.flashImg = scene.add.image(0, 0, TEX.flash).setOrigin(0, 0).setDepth(DEPTH.flash).setAlpha(0);
    this.flashImg.setBlendMode(Phaser.BlendModes.ADD);
    this.boltGfx = scene.add.graphics().setDepth(DEPTH.bolt);

    art.lamps.forEach((lamp, i) => {
      scene.add.image(lamp.x, lamp.y, TEX.beam(i)).setOrigin(0.5, 0).setDepth(DEPTH.beam).setBlendMode(Phaser.BlendModes.ADD);
      this.addDust(lamp.x, lamp.y);
    });
  }

  /** Avança a tempestade e redesenha chuva/clarão. Devolve os trovões que devem tocar agora. */
  update(dt: number, view: Phaser.Geom.Rectangle): ThunderEvent[] {
    const thunders = this.storm.update(dt);
    const f = this.storm.flash;
    // No clarão, o escuro da casa diminui e a luz entra pelas janelas.
    this.lightImg.setAlpha(1 - f * LIGHT.flashBrighten);
    this.flashImg.setAlpha(f * LIGHT.flashSpill);
    this.updateRain(dt, view);
    this.drawBolt(view);
    return thunders;
  }

  /** Luz (0..1 por canal) num ponto do mundo, já com o clarão. Para "acender" a aranha. */
  lightAt(x: number, y: number): [number, number, number] {
    const f = this.storm.flash * LIGHT.flashBrighten;
    const [r, g, b] = sampleLight(this.art.light, x, y);
    return [r + (1 - r) * f, g + (1 - g) * f, b + (1 - b) * f];
  }

  /** Pixel do mundo mostra o lado de fora (céu ou vidro)? */
  private isOutside(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.W || y >= this.H) return false;
    return this.art.outside[y * this.W + x] === 1;
  }

  private addDust(x: number, y: number): void {
    const h = LIGHT.beamRadius * 0.75;
    const w = Math.tan((LIGHT.coneHalfDeg * Math.PI) / 180) * h;
    const zone = new Phaser.Geom.Triangle(x, y + 6, x - w, y + h, x + w, y + h);
    this.scene.add
      .particles(0, 0, TEX.mote, {
        emitZone: { type: 'random', source: zone, quantity: 1 } as Phaser.Types.GameObjects.Particles.EmitZoneData,
        lifespan: { min: 2600, max: 5200 },
        speedX: { min: -5, max: 5 },
        speedY: { min: -4, max: 6 },
        frequency: 260,
        maxAliveParticles: LIGHT.dustPerLamp,
        tint: PAL.light.dust,
        alpha: { onUpdate: (_p: unknown, _k: string, t: number) => Math.sin(t * Math.PI) * 0.75 },
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(DEPTH.dust);
  }

  // ---------- chuva: só aparece nos pixels "lado de fora" ----------

  private rand(): number {
    this.rngState = (Math.imul(this.rngState, 1103515245) + 12345) | 0;
    return (this.rngState >>> 0) / 4294967296;
  }

  private spawnDrop(view: Phaser.Geom.Rectangle, anywhere: boolean): Drop {
    const margin = 40;
    return {
      x: view.x - margin + this.rand() * (view.width + margin * 2),
      y: anywhere ? view.y + this.rand() * view.height : view.y - this.rand() * 60,
      speed: STORM.rainSpeed[0] + this.rand() * (STORM.rainSpeed[1] - STORM.rainSpeed[0]),
    };
  }

  private updateRain(dt: number, view: Phaser.Geom.Rectangle): void {
    while (this.drops.length < STORM.rainDrops) this.drops.push(this.spawnDrop(view, true));
    const g = this.rainGfx;
    g.clear();
    const len = STORM.rainLength;
    const slope = STORM.rainWind / STORM.rainSpeed[0];
    // Com o clarão a chuva também fica mais visível.
    g.fillStyle(PAL.light.rain, 0.55 + this.storm.flash * 0.45);
    for (let i = 0; i < this.drops.length; i++) {
      const d = this.drops[i];
      d.y += d.speed * dt;
      d.x += STORM.rainWind * dt;
      const off = d.y > view.bottom + 10 || d.y < view.y - 120 || d.x < view.x - 80 || d.x > view.right + 80;
      if (off) {
        // Câmera pulou longe (início do jogo): espalha de novo; senão, recomeça no topo.
        this.drops[i] = this.spawnDrop(view, d.y < view.y - 120 || d.x < view.x - 80 || d.x > view.right + 80);
        continue;
      }
      for (let k = 0; k < len; k++) {
        const px = Math.round(d.x - slope * k);
        const py = Math.round(d.y - k);
        if (this.isOutside(px, py)) g.fillRect(px, py, 1, 1);
      }
    }
  }

  // ---------- raio visível no céu ----------

  private drawBolt(view: Phaser.Geom.Rectangle): void {
    const g = this.boltGfx;
    g.clear();
    const bolt = this.storm.bolt;
    if (!bolt) return;
    if (this.boltSeed !== bolt.seed) {
      this.boltSeed = bolt.seed;
      this.boltX = this.findSkyColumn(view, Math.round(view.x + bolt.x * view.width));
    }
    if (this.boltX === null) return;
    const ox = this.boltX;
    const oy = Math.round(view.y - 10);
    g.fillStyle(PAL.light.bolt, Math.min(1, 0.4 + this.storm.flash));
    for (const line of boltPath(bolt.seed, view.height * 0.85)) {
      for (let i = 1; i < line.length; i++) {
        this.pixelLine(g, ox + line[i - 1].x, oy + line[i - 1].y, ox + line[i].x, oy + line[i].y);
      }
    }
  }

  /**
   * O raio só aparece onde se vê o lado de fora. Procura, a partir de `startX`, a coluna mais próxima
   * com bastante céu/vidro na tela; se não houver nenhuma (cômodo sem janela), o raio não é desenhado.
   */
  private findSkyColumn(view: Phaser.Geom.Rectangle, startX: number): number | null {
    const minOutside = 18;
    const y0 = Math.max(0, Math.floor(view.y));
    const y1 = Math.min(this.H, Math.ceil(view.bottom));
    const countAt = (x: number) => {
      let n = 0;
      for (let y = y0; y < y1; y += 2) if (this.isOutside(x, y)) n++;
      return n;
    };
    for (let off = 0; off < view.width; off += 3) {
      for (const x of [startX + off, startX - off]) {
        if (x >= view.x + 8 && x <= view.right - 8 && countAt(x) >= minOutside) return x;
      }
    }
    return null;
  }

  private pixelLine(g: Phaser.GameObjects.Graphics, x0: number, y0: number, x1: number, y1: number): void {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      if (this.isOutside(x0, y0)) g.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }
}
