// Cutscene da rua: a aranha sai pelo buraco do telhado; corte para a rua com só as pernas da horda;
// a câmera sobe (com parallax) até as cabeças; relâmpago; e, no fim, a aranha na beira do telhado
// olhando a horda. É o fim do ato 1: no fim ela acorda a GameScene (que estava dormindo), que mostra
// o "END OF ACT". Spec: docs/features/street-cutscene.md
import Phaser from 'phaser';
import { HORDE, STREET } from '../config';
import { PAL } from '../art/palette';
import { GROUND_ANCHOR, HOUSES_BASE, ROOF_SHOT, STREET_SHOT, WIDE_SHOT } from '../art/streetArt';
import { TEX } from '../art/textures';
import { ZOMBIE_FRAMES, ZOMBIE_LOOKS, zombieFrameName } from '../art/zombieArt';
import { mixColor } from '../art/tilePainters';
import { getSound } from '../audio/sound';
import { pixelLine } from '../entities/Spider';
import { Timeline } from '../systems/cutscene';
import { Horde, type HordeEvent, walkFrame } from '../systems/horde';
import { Storm, boltPath } from '../systems/storm';
import { pollPad } from './PlayerInput';

type ShotName = 'roof' | 'street' | 'wide';
type Layer = 'sky' | 'houses' | 'far' | 'mid' | 'near';

/** Cada plano fica num canto do mundo, longe dos outros: a câmera mostra um por vez. */
const SHOTS: Record<ShotName, { x: number; y: number; w: number; h: number; zoom: number }> = {
  roof: { x: 0, y: 0, w: ROOF_SHOT.w, h: ROOF_SHOT.h, zoom: STREET.roofZoom },
  street: { x: 1000, y: 1000, w: STREET_SHOT.w, h: STREET_SHOT.h, zoom: STREET.streetZoom },
  wide: { x: 2000, y: 2000, w: WIDE_SHOT.w, h: WIDE_SHOT.h, zoom: STREET.streetZoom },
};

/** Em que plano fica cada etapa (assim pular `elapsed` no console também troca o plano). */
const STEP_SHOT: Record<string, ShotName> = {
  fadeIn: 'roof',
  emerge: 'roof',
  walk: 'roof',
  listen: 'roof',
  legs: 'street',
  tilt: 'street',
  heads: 'street',
  wide: 'wide',
  outro: 'wide',
};

/** Fileiras da horda (mesma ordem de HORDE.street) e a camada onde cada uma anda. */
const ROW_LAYERS = ['far', 'mid', 'near'] as const;
const GROUND_TEX: Record<'far' | 'mid' | 'near', string> = { far: TEX.farGround, mid: TEX.midGround, near: TEX.nearGround };

/** Ordem de desenho dentro de cada plano. */
const DEPTH = { sky: 0, bolt: 1, back: 2, ground: 3, crowd: 4, front: 6, spider: 7, lip: 8, rain: 20, flash: 21, bars: 30 } as const;

interface ZombieSprites {
  body: Phaser.GameObjects.Sprite;
  eyes: Phaser.GameObjects.Sprite;
  reflection: Phaser.GameObjects.Sprite | null;
}

interface Drop {
  x: number;
  y: number;
  speed: number;
}

/** Suave no começo e no fim (subida da câmera). */
const ease = (p: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, p)));

export class StreetScene extends Phaser.Scene {
  private tl!: Timeline;
  private elapsed = 0;
  private stepIndex = -1;
  /** Pulou ou acabou: o roteiro para (o mundo continua animado durante o escurecimento). */
  private done = false;
  private finished = false;
  private shot: ShotName = 'roof';
  private storm!: Storm;
  private horde!: Horde;
  private crowd!: Horde;
  private hordeSprites: ZombieSprites[] = [];
  private crowdSprites: ZombieSprites[] = [];
  private layers!: Record<Layer, Phaser.GameObjects.Container>;
  private spider!: Phaser.GameObjects.Sprite;
  private wideSpider!: Phaser.GameObjects.Sprite;
  private rain!: Phaser.GameObjects.Graphics;
  private bolts!: Record<ShotName, Phaser.GameObjects.Graphics>;
  private flashes!: Record<ShotName, Phaser.GameObjects.Rectangle>;
  private hazards: Phaser.GameObjects.Rectangle[] = [];
  private tvs: Phaser.GameObjects.Rectangle[] = [];
  private drops: Drop[] = [];
  private struck = new Set<string>();
  private boltSeed = -1;
  private rngState = 1;
  private readonly root = document.getElementById('intro');
  private readonly text = document.getElementById('intro-text');
  private readonly skipHint = document.getElementById('intro-skip');

  constructor() {
    super('street');
  }

  create(): void {
    this.elapsed = 0;
    this.stepIndex = -1;
    this.done = false;
    this.finished = false;
    this.shot = 'roof';
    this.struck = new Set();
    this.boltSeed = -1;
    this.hordeSprites = [];
    this.crowdSprites = [];
    this.hazards = [];
    this.tvs = [];
    const seed = (Date.now() & 0x7fffffff) || 1;
    this.rngState = seed;
    this.storm = new Storm(seed);
    this.horde = new Horde(HORDE.street, STREET_SHOT.w, ZOMBIE_LOOKS.length, seed);
    this.crowd = new Horde(HORDE.wide, WIDE_SHOT.w, ZOMBIE_LOOKS.length, seed + 1);

    this.cameras.main.setBackgroundColor(0x000000).setRoundPixels(true);
    this.buildRoofShot();
    this.buildStreetShot();
    this.buildWideShot();
    this.rain = this.add.graphics().setDepth(DEPTH.rain);
    this.flashes = {} as Record<ShotName, Phaser.GameObjects.Rectangle>;
    for (const name of Object.keys(SHOTS) as ShotName[]) {
      const s = SHOTS[name];
      this.flashes[name] = this.add
        .rectangle(s.x, s.y, s.w, s.h, PAL.street.flash)
        .setOrigin(0, 0)
        .setDepth(DEPTH.flash)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0);
      // Faixas pretas de cinema.
      const bar = Math.round(STREET.letterboxPx / s.zoom);
      this.add.rectangle(s.x, s.y, s.w, bar, 0x000000).setOrigin(0, 0).setDepth(DEPTH.bars);
      this.add.rectangle(s.x, s.y + s.h - bar, s.w, bar, 0x000000).setOrigin(0, 0).setDepth(DEPTH.bars);
    }

    // Já no primeiro quadro: o telhado, clareando.
    this.setShot('roof');
    this.cameras.main.fadeIn(STREET.fadeInSec * 1000, 0, 0, 0);

    this.tl = new Timeline([
      { name: 'fadeIn', sec: STREET.fadeInSec },
      { name: 'emerge', sec: STREET.emergeSec },
      { name: 'walk', sec: STREET.walkSec },
      { name: 'listen', sec: STREET.listenSec },
      { name: 'legs', sec: STREET.legsSec },
      { name: 'tilt', sec: STREET.tiltSec },
      { name: 'heads', sec: STREET.headsSec },
      { name: 'wide', sec: STREET.wideSec },
      { name: 'outro', sec: STREET.outroSec },
    ]);

    const sound = getSound();
    this.spider.on(Phaser.Animations.Events.ANIMATION_UPDATE, (_a: unknown, f: Phaser.Animations.AnimationFrame) => {
      if (this.shot === 'roof' && (f.textureFrame === 'walk0' || f.textureFrame === 'walk2')) sound.footsteps.step(false);
    });

    // Reaproveita o aviso de "pular" da cutscene de abertura (sem texto).
    this.root?.classList.remove('hidden');
    if (this.text) this.text.textContent = '';
    this.skipHint?.classList.add('hidden');
    this.time.delayedCall(1200, () => this.skipHint?.classList.remove('hidden'));
    for (const key of ['keydown-ESC', 'keydown-ENTER', 'keydown-SPACE']) this.input.keyboard?.on(key, () => this.skip());
    this.input.keyboard?.on('keydown-M', () => sound.hub.toggleMute());
    this.events.once('shutdown', () => {
      this.root?.classList.add('hidden');
      this.skipHint?.classList.add('hidden');
    });
    if (import.meta.env.DEV) Object.assign(window, { __street: this });
  }

  // ---------- montagem dos planos ----------

  private buildRoofShot(): void {
    const { x, y } = SHOTS.roof;
    this.add.image(x, y, TEX.roofSky).setOrigin(0, 0).setDepth(DEPTH.sky);
    this.add.image(x, y, TEX.roofShot).setOrigin(0, 0).setDepth(DEPTH.back);
    this.spider = this.add.sprite(x + ROOF_SHOT.hole.x, y + ROOF_SHOT.h + 20, TEX.spider, 'idle0').setOrigin(0.5, 1).setDepth(DEPTH.spider);
    // A boca do buraco vai por cima: a aranha sobe de dentro dele.
    this.add.image(x, y, TEX.roofFront).setOrigin(0, 0).setDepth(DEPTH.lip);
    this.bolts = { roof: this.add.graphics().setDepth(DEPTH.bolt) } as Record<ShotName, Phaser.GameObjects.Graphics>;
  }

  private buildStreetShot(): void {
    const { x, y } = SHOTS.street;
    const layer = (name: Layer, depth: number) => this.add.container(x, y).setDepth(depth).setName(name);
    this.layers = {
      sky: layer('sky', DEPTH.sky),
      houses: layer('houses', DEPTH.back),
      far: layer('far', DEPTH.ground),
      mid: layer('mid', DEPTH.ground + 0.1),
      near: layer('near', DEPTH.ground + 0.2),
    };
    this.layers.sky.add(this.add.image(0, 0, TEX.streetSky).setOrigin(0, 0));
    this.bolts.street = this.add.graphics();
    this.layers.sky.add(this.bolts.street);
    this.layers.houses.add(this.add.image(0, -HOUSES_BASE, TEX.houses).setOrigin(0, 0));
    this.addHouseLights(this.layers.houses, 0, -HOUSES_BASE);

    ROW_LAYERS.forEach((name, row) => {
      const c = this.layers[name];
      c.add(this.add.image(0, -GROUND_ANCHOR[name], GROUND_TEX[name]).setOrigin(0, 0));
      const u = HORDE.street[row].u;
      this.horde.zombies.forEach((z) => {
        if (z.row !== row) return;
        // Reflexo no chão molhado (só nas fileiras de perto: de longe nem dá para ver).
        const reflection = row > 0 ? this.add.sprite(0, 0, TEX.zombie(u)).setOrigin(0.5, 0).setFlipY(true).setAlpha(0.22) : null;
        const body = this.add.sprite(0, 0, TEX.zombie(u)).setOrigin(0.5, 1);
        const eyes = this.add.sprite(0, 0, TEX.zombieEyes(u)).setOrigin(0.5, 1);
        c.add([...(reflection ? [reflection] : []), body, eyes]);
        this.hordeSprites.push({ body, eyes, reflection });
      });
    });
    this.placeLayers(0);
  }

  private buildWideShot(): void {
    const { x, y } = SHOTS.wide;
    const W = WIDE_SHOT;
    this.add.image(x, y - 40, TEX.streetSky).setOrigin(0, 0).setDepth(DEPTH.sky);
    this.bolts.wide = this.add.graphics().setDepth(DEPTH.bolt);
    const houses = this.add.container(x, y + W.housesBase - HOUSES_BASE).setDepth(DEPTH.back);
    houses.add(this.add.image(0, 0, TEX.houses).setOrigin(0, 0));
    this.addHouseLights(houses, 0, 0);
    this.add.image(x, y + W.streetTop, TEX.wideStreet).setOrigin(0, 0).setDepth(DEPTH.ground);
    this.crowd.zombies.forEach((z) => {
      const u = HORDE.wide[z.row].u;
      const body = this.add.sprite(x, y + W.rows[z.row], TEX.zombie(u)).setOrigin(0.5, 1).setDepth(DEPTH.crowd + z.row * 0.1);
      const eyes = this.add.sprite(x, y + W.rows[z.row], TEX.zombieEyes(u)).setOrigin(0.5, 1).setDepth(DEPTH.crowd + z.row * 0.1 + 0.05);
      this.crowdSprites.push({ body, eyes, reflection: null });
    });
    this.add.image(x, y + W.gutterY, TEX.roofEdge).setOrigin(0, 0).setDepth(DEPTH.front);
    this.wideSpider = this.add.sprite(x + W.spiderX, y + W.gutterY + 1, TEX.spider, 'idle0').setOrigin(0.5, 1).setDepth(DEPTH.spider);
    this.wideSpider.play('spider-idle');
  }

  /** Pisca-alerta do carro e a luz da TV na janela (animados). */
  private addHouseLights(c: Phaser.GameObjects.Container, ox: number, oy: number): void {
    for (const h of STREET_SHOT.hazards) {
      const glow = this.add.rectangle(ox + h.x, oy + h.y, 7, 4, PAL.street.hazard, 0.35).setBlendMode(Phaser.BlendModes.ADD);
      const bulb = this.add.rectangle(ox + h.x, oy + h.y, 2, 2, PAL.street.hazard);
      c.add([glow, bulb]);
      this.hazards.push(glow, bulb);
    }
    const tv = STREET_SHOT.tv;
    const flicker = this.add.rectangle(ox + tv.x, oy + tv.y, tv.w, tv.h, 0x6a8cff, 0.2).setOrigin(0, 0).setBlendMode(Phaser.BlendModes.ADD);
    c.add(flicker);
    this.tvs.push(flicker);
  }

  /** Posição das camadas da rua: 0 = só as pernas, 1 = as cabeças (cada camada com a sua velocidade). */
  private placeLayers(p: number): void {
    const e = ease(p);
    for (const name of Object.keys(this.layers) as Layer[]) {
      const [from, to] = STREET_SHOT[name];
      this.layers[name].y = Math.round(SHOTS.street.y + from + (to - from) * e);
    }
  }

  private setShot(name: ShotName): void {
    this.shot = name;
    const s = SHOTS[name];
    const cam = this.cameras.main;
    cam.setZoom(s.zoom);
    cam.centerOn(s.x + s.w / 2, s.y + s.h / 2);
    this.drops = [];
    for (let i = 0; i < STREET.rainDrops; i++) this.drops.push(this.spawnDrop(true));
  }

  // ---------- quadro a quadro ----------

  update(time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 1 / 30);
    const pad = pollPad();
    if (pad?.musicPressed) getSound().hub.toggleMute();
    if (pad && (pad.confirmPressed || pad.pausePressed)) this.skip();

    if (!this.done) {
      this.elapsed += dt;
      const at = this.tl.at(this.elapsed);
      if (!at) {
        this.finish();
        return;
      }
      if (at.index !== this.stepIndex) {
        this.stepIndex = at.index;
        this.enterStep(at.name);
      }
      this.runStep(at.name, at.local, at.progress);
    }
    this.updateWorld(dt, time);
  }

  private enterStep(name: string): void {
    const sound = getSound();
    const cam = this.cameras.main;
    const shot = STEP_SHOT[name];
    if (shot !== this.shot) {
      // Corte seco para o outro plano; a horda soa perto na rua e no meio-termo do alto do telhado.
      this.setShot(shot);
      sound.zombies.setDistance(shot === 'street' ? 0 : 0.4, 0.05);
    }
    switch (name) {
      case 'fadeIn':
        sound.storm.setOutside(true, STREET.fadeInSec);
        sound.zombies.setDistance(1, 0.01);
        break;
      case 'emerge':
        this.spider.play('spider-walk');
        break;
      case 'listen':
        this.spider.play('spider-idle');
        // Os gemidos da rua vão ficando mais altos.
        sound.zombies.setDistance(0.65, STREET.listenSec);
        break;
      case 'legs':
        this.placeLayers(0);
        break;
      case 'outro':
        cam.fadeOut(STREET.outroSec * 1000, 0, 0, 0);
        break;
    }
  }

  private runStep(name: string, local: number, p: number): void {
    const s = this.spider;
    const { x, y } = SHOTS.roof;
    const { hole, spiderFeetY, spiderEndX } = ROOF_SHOT;
    const night = PAL.street.zombieLight[2];
    switch (name) {
      case 'emerge': {
        // Sobe de dentro do buraco: começa escondida atrás da borda, iluminada pela luz do sótão.
        const e = 1 - (1 - p) ** 2;
        s.setPosition(x + hole.x, y + Phaser.Math.Linear(hole.y + hole.ry + 14, spiderFeetY, e));
        s.setAngle(-25 * (1 - e));
        s.setTint(mixColor(0xffc890, night, e));
        break;
      }
      case 'walk':
        s.setAngle(0).setTint(night);
        s.setPosition(x + Phaser.Math.Linear(hole.x, spiderEndX, p), y + spiderFeetY);
        break;
      case 'listen':
        // Um susto (pulinho), olha para trás e para a frente.
        s.setY(y + spiderFeetY - (local > 0.3 && local < 0.42 ? 2 : 0));
        s.setFlipX(p > 0.4 && p < 0.72);
        break;
      case 'tilt':
        this.placeLayers(p);
        break;
      case 'heads':
        this.placeLayers(1);
        this.strikeOnce('heads', p >= STREET.headsStrikeAt);
        break;
      case 'wide':
        this.strikeOnce('wide', p >= STREET.wideStrikeAt);
        // A aranha se encolhe um pouco quando o raio cai.
        this.wideSpider.setFlipX(p > 0.6 && p < 0.8);
        break;
    }
  }

  private strikeOnce(key: string, when: boolean): void {
    if (!when || this.struck.has(key)) return;
    this.struck.add(key);
    this.storm.strike(true);
  }

  private updateWorld(dt: number, time: number): void {
    const sound = getSound();
    for (const thunder of this.storm.update(dt)) sound.storm.thunder(thunder);
    this.handleHorde(this.horde.update(dt));
    this.crowd.update(dt);
    const flash = this.storm.flash;

    this.horde.zombies.forEach((z, i) => {
      const sp = this.hordeSprites[i];
      const frame = zombieFrameName(z.look, walkFrame(z.phase, ZOMBIE_FRAMES));
      const tint = mixColor(this.zombieLight(z.row, z.x), 0xffffff, flash * 0.8);
      sp.body.setPosition(Math.round(z.x), 0).setFrame(frame).setTint(tint);
      sp.eyes.setPosition(Math.round(z.x), 0).setFrame(frame).setTint(mixColor(PAL.street.eyeLight, 0xffffff, flash));
      sp.reflection?.setPosition(Math.round(z.x), 0).setFrame(frame).setTint(mixColor(PAL.street.reflection, tint, 0.3));
    });
    const W = SHOTS.wide;
    this.crowd.zombies.forEach((z, i) => {
      const sp = this.crowdSprites[i];
      const frame = zombieFrameName(z.look, walkFrame(z.phase, ZOMBIE_FRAMES));
      const tint = mixColor(PAL.street.crowdLight[z.row], 0xffffff, flash * 0.8);
      sp.body.setPosition(W.x + Math.round(z.x), sp.body.y).setFrame(frame).setTint(tint);
      sp.eyes.setPosition(W.x + Math.round(z.x), sp.eyes.y).setFrame(frame).setTint(mixColor(PAL.street.eyeLight, 0xffffff, flash));
    });
    this.wideSpider.setTint(mixColor(0x6a7090, 0xffffff, flash * 0.7));
    if (this.shot === 'roof' && this.stepIndex >= 2) this.spider.setTint(mixColor(PAL.street.zombieLight[2], 0xffffff, flash * 0.7));

    // Pisca-alerta e TV.
    const on = Math.floor(time / 1000 / STREET.hazardBlinkSec) % 2 === 0;
    for (const h of this.hazards) h.setVisible(on);
    if (Math.floor(time / 90) !== Math.floor((time - dt * 1000) / 90)) {
      for (const tv of this.tvs) tv.setAlpha(0.08 + this.rand() * 0.3);
    }

    for (const name of Object.keys(this.flashes) as ShotName[]) this.flashes[name].setAlpha(name === this.shot ? flash * 0.4 : 0);
    this.drawRain(dt, flash);
    this.drawBolt();
  }

  /** Luz da noite em cada fileira; perto do poste, mais quente e clara. */
  private zombieLight(row: number, x: number): number {
    const base = PAL.street.zombieLight[row];
    const f = Math.max(0, 1 - Math.abs(x - (STREET_SHOT.lampX + 12)) / 46) * 0.45;
    return mixColor(base, PAL.street.lampOnZombie, f);
  }

  private handleHorde(events: HordeEvent[]): void {
    const { zombies } = getSound();
    for (const e of events) {
      if (e.type === 'groan') zombies.groan(e);
      else zombies.step(e.pan, e.volume);
    }
  }

  // ---------- chuva e raio ----------

  private rand(): number {
    this.rngState = (Math.imul(this.rngState, 1103515245) + 12345) | 0;
    return (this.rngState >>> 0) / 4294967296;
  }

  private spawnDrop(anywhere: boolean): Drop {
    const s = SHOTS[this.shot];
    return {
      x: this.rand() * (s.w + 40),
      y: anywhere ? this.rand() * s.h : -this.rand() * 30,
      speed: STREET.rainSpeed[0] + this.rand() * (STREET.rainSpeed[1] - STREET.rainSpeed[0]),
    };
  }

  private drawRain(dt: number, flash: number): void {
    const g = this.rain;
    const s = SHOTS[this.shot];
    g.clear();
    g.fillStyle(PAL.street.rain, 0.5 + flash * 0.4);
    const slope = STREET.rainWind / STREET.rainSpeed[0];
    const len = this.shot === 'roof' ? 3 : 5;
    for (let i = 0; i < this.drops.length; i++) {
      const d = this.drops[i];
      d.y += d.speed * dt;
      d.x += STREET.rainWind * dt;
      if (d.y > s.h || d.x < -10) {
        this.drops[i] = this.spawnDrop(false);
        continue;
      }
      for (let k = 0; k < len; k++) g.fillRect(s.x + Math.round(d.x - slope * k), s.y + Math.round(d.y - k), 1, 1);
    }
    // Respingos no chão (no telhado, na calçada e no asfalto).
    const top = this.shot === 'roof' ? ROOF_SHOT.ridgeLeft + 6 : this.shot === 'wide' ? WIDE_SHOT.streetTop : this.layers.far.y - s.y - 6;
    const groundTop = Math.min(top, s.h - 10);
    for (let i = 0; i < 6; i++) {
      const sx = Math.round(this.rand() * s.w);
      const sy = Math.round(groundTop + this.rand() * (s.h - groundTop));
      g.fillRect(s.x + sx - 1, s.y + sy, 1, 1);
      g.fillRect(s.x + sx + 1, s.y + sy, 1, 1);
      g.fillRect(s.x + sx, s.y + sy - 1, 1, 1);
    }
  }

  private drawBolt(): void {
    const bolt = this.storm.bolt;
    if (!bolt) {
      if (this.boltSeed !== -1) for (const g of Object.values(this.bolts)) g.clear();
      this.boltSeed = -1;
      return;
    }
    if (bolt.seed === this.boltSeed) return;
    this.boltSeed = bolt.seed;
    const s = SHOTS[this.shot];
    // No plano da rua o raio vai dentro da camada do céu (coordenadas locais); nos outros, no mundo.
    const g = this.bolts[this.shot];
    const ox = (this.shot === 'street' ? 0 : s.x) + Math.round(s.w * bolt.x);
    const oy = this.shot === 'street' ? 0 : s.y;
    g.clear();
    g.fillStyle(PAL.street.bolt, 1);
    for (const line of boltPath(bolt.seed, s.h * 0.7)) {
      for (let i = 1; i < line.length; i++) pixelLine(g, ox + line[i - 1].x, oy + line[i - 1].y, ox + line[i].x, oy + line[i].y);
    }
  }

  // ---------- fim ----------

  /** Pular (Enter/Esc/Espaço ou A/Start): escurece rápido e vai para o fim do ato. */
  private skip(): void {
    if (this.done) return;
    this.done = true;
    const cam = this.cameras.main;
    cam.fadeOut(350, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.finish());
  }

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    this.done = true;
    const sound = getSound();
    sound.storm.setOutside(false);
    sound.zombies.setDistance(1, 0.5);
    this.scene.wake('game');
    this.scene.stop();
  }
}
