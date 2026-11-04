// Cutscene do fim do ato 3 (THE WINDOW): a Mary no parapeito da janela quebrada, olha para trás (a cozinha como
// o jogador deixou), sai na chuva, desce pelo fio e a casa inteira apagada, com os doentes em volta. No fim
// acorda a NeighborScene (que dormia), que mostra o "END OF ACT". Assistida pelo SCENES (`replay`), volta para
// o menu. Spec: docs/features/act3-cutscenes.md
import Phaser from 'phaser';
import { RECAP, SPIDER, TILE, VIEW, WEB, WINDOW_CUT as W } from '../config';
import { HOUSE, OUTSIDE, SILL } from '../art/act3CutArt';
import type { LevelArt } from '../art/levelArt';
import { PAL } from '../art/palette';
import { T3, TEX, ensureAct3CutTextures, ensureAct3Textures } from '../art/textures';
import { mixColor } from '../art/tilePainters';
import { ZOMBIE_FRAMES, ZOMBIE_LOOKS, zombieFrameName } from '../art/zombieArt';
import { getSound } from '../audio/sound';
import { Atmosphere } from '../entities/Atmosphere';
import { GooView } from '../entities/GooView';
import { SickView } from '../entities/SickView';
import { pixelLine } from '../entities/Spider';
import { ACT3_WINDOW, CHANDELIER_DEF, GOO, SICK_DEF, WATER_DRIPS } from '../level/neighborHouse';
import { WINDOW_STEPS, WINDOW_STEP_SHOT, type WindowShot, ease, threadDrop } from '../systems/act3Cuts';
import { Chandelier } from '../systems/chandelier';
import { Timeline } from '../systems/cutscene';
import { GooField } from '../systems/goo';
import { Horde, type HordeEvent, walkFrame } from '../systems/horde';
import { Kitchen, type KitchenSnapshot } from '../systems/kitchen';
import { Sick } from '../systems/sick';
import { boltPath, makeRng } from '../systems/storm';
import { pollPad } from './PlayerInput';
import { fadeTo } from './Transitions';
import { placeBars } from './cinema';
import { markSceneSeen } from './sceneStore';

/** Cada palco fica num canto do mundo, longe do mapa: a câmera mostra um por vez. */
const AT: Record<Exclude<WindowShot, 'kitchen'>, { x: number; y: number; w: number; h: number }> = {
  sill: { x: 3000, y: 0, w: SILL.w, h: SILL.h },
  outside: { x: 3400, y: 0, w: OUTSIDE.w, h: OUTSIDE.h },
  wide: { x: 3800, y: 0, w: HOUSE.w, h: HOUSE.h },
};

/** Ordem de desenho dentro de cada palco. */
const DEPTH = { sky: 0.1, bolt: 0.2, back: 0.3, rainBehind: 0.4, crowd: 0.5, house: 0.45, front: 0.7, mary: 0.8, thread: 0.75, rain: 8, flash: 9, bars: 20 } as const;

/** Onde a Mary fica no parapeito (centro do sprite): de pé, com os pés na linha dele. */
const SILL_Y = SILL.sillY - SPIDER.frameH / 2;
const SILL_MID = SILL.x + SILL.gw / 2;
/** Por onde ela chega: subindo a parede à direita, até a beira do parapeito. */
const CLIMB_X = 140;
const OUT_Y = OUTSIDE.sillY - SPIDER.frameH / 2 + 1;
const OUT_MID = OUTSIDE.x + OUTSIDE.gw / 2;

/** Provocado, o doente fica virado para a janela, onde a Mary está. */
const AT_WINDOW = { x: (ACT3_WINDOW.tx + 0.5) * TILE, y: ACT3_WINDOW.ty * TILE, vx: 0, vy: 0, half: SPIDER.half };

interface Drop {
  x: number;
  y: number;
  speed: number;
}

interface ZombieSprites {
  body: Phaser.GameObjects.Sprite;
  eyes: Phaser.GameObjects.Sprite;
}

export class WindowScene extends Phaser.Scene {
  private tl!: Timeline;
  private elapsed = 0;
  private stepIndex = -1;
  /** Pulou ou acabou: o roteiro para (o mundo continua animado durante o escurecimento). */
  private done = false;
  private finished = false;
  private replay = false;
  private shot: WindowShot = 'sill';
  private art!: LevelArt;
  private atmosphere!: Atmosphere;
  private kitchen!: Kitchen;
  private sickView!: SickView;
  private goo!: GooField;
  private water!: GooField;
  private gooView!: GooView;
  private mary!: Phaser.GameObjects.Sprite;
  private outMary!: Phaser.GameObjects.Sprite;
  private miniMary!: Phaser.GameObjects.Image;
  private thread!: Phaser.GameObjects.Graphics;
  private rain!: Phaser.GameObjects.Graphics;
  private bolt!: Phaser.GameObjects.Graphics;
  private flash!: Phaser.GameObjects.Rectangle;
  private bars: Phaser.GameObjects.Rectangle[] = [];
  private houseGlow!: Phaser.GameObjects.Image;
  private crowd!: Horde;
  private crowdSprites: ZombieSprites[] = [];
  private drops: Drop[] = [];
  private splats: { x: number; y: number; life: number }[] = [];
  private struck = new Set<string>();
  private groanedKitchen = false;
  private boltSeed = -1;
  private rng: () => number = Math.random;
  private readonly skipHint = document.getElementById('skip-hint');

  constructor() {
    super('window');
  }

  create(data: { replay?: boolean; kitchen?: KitchenSnapshot } = {}): void {
    // O Phaser reaproveita a instância da cena: todo estado volta ao início aqui.
    this.replay = !!data.replay;
    // Vista no jogo: libera no SCENES (mesmo se pular). Pelo SCENES a tela chega preta pelo HTML.
    if (this.replay) void fadeTo(0, 0);
    else markSceneSeen('act3-ending');
    this.elapsed = 0;
    this.stepIndex = -1;
    this.done = false;
    this.finished = false;
    this.shot = 'sill';
    this.crowdSprites = [];
    this.drops = [];
    this.splats = [];
    this.struck = new Set();
    this.groanedKitchen = false;
    this.boltSeed = -1;
    const seed = (Date.now() & 0x7fffffff) || 1;
    this.rng = makeRng(seed);

    this.art = ensureAct3Textures(this);
    ensureAct3CutTextures(this);
    this.buildKitchen(seed, data.kitchen);
    this.buildSill();
    this.buildOutside();
    this.buildWide(seed);

    this.rain = this.add.graphics().setDepth(DEPTH.rain);
    this.flash = this.add.rectangle(0, 0, 1, 1, PAL.street.flash).setOrigin(0, 0).setDepth(DEPTH.flash).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    const bar = () => this.add.rectangle(0, 0, VIEW.width, 0, 0x000000).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.bars);
    this.bars = [bar(), bar()];

    const cam = this.cameras.main;
    cam.setBackgroundColor(0x000000).setRoundPixels(true);
    this.setShot('sill');
    cam.fadeIn(W.sillInSec * 1000, 0, 0, 0);
    this.tl = new Timeline(WINDOW_STEPS);

    const sound = getSound();
    sound.storm.setOutside(false);
    sound.zombies.setDistance(1, 0.5);
    for (const m of [this.mary, this.outMary]) {
      m.on(Phaser.Animations.Events.ANIMATION_UPDATE, (_a: unknown, f: Phaser.Animations.AnimationFrame) => {
        if (f.textureFrame === 'walk0' || f.textureFrame === 'walk2') sound.footsteps.step(false);
      });
    }

    this.showSkipHint(false);
    this.time.delayedCall(W.skipHintAfterSec * 1000, () => {
      if (!this.done) this.showSkipHint(true);
    });
    for (const key of ['keydown-ESC', 'keydown-ENTER', 'keydown-SPACE']) this.input.keyboard?.on(key, () => this.skip());
    this.input.keyboard?.on('keydown-M', () => sound.hub.toggleMute());
    this.events.once('shutdown', () => this.showSkipHint(false));
    if (import.meta.env.DEV) Object.assign(window, { __cut: this });
  }

  // ---------- montagem ----------

  /** A cozinha é a do jogo, como o jogador deixou (pelo SCENES, com o doente andando). */
  private buildKitchen(seed: number, snapshot?: KitchenSnapshot): void {
    this.add.image(0, 0, T3.level).setOrigin(0, 0);
    this.atmosphere = new Atmosphere(this, this.art, seed, { light: T3.light, flash: T3.flash, beam: TEX.beam });
    this.atmosphere.leaking = false;
    this.goo = new GooField(GOO.drips, GOO.jets, GOO.pools);
    this.water = new GooField(WATER_DRIPS, []);
    this.gooView = new GooView(this, this.goo, this.water);
    this.kitchen = new Kitchen(new Sick(SICK_DEF, RECAP.seed), new Chandelier(CHANDELIER_DEF));
    if (snapshot) this.kitchen.restore(snapshot);
    this.sickView = new SickView(this, this.kitchen.sick, this.kitchen.chandelier, {
      body: T3.sick,
      eyes: T3.sickEyes,
      dead: T3.sickDead,
      chandelier: T3.chandelier,
      chandelierBroken: T3.chandelierBroken,
    });
  }

  private buildSill(): void {
    const { x, y } = AT.sill;
    this.add.image(x, y, T3.sillBack).setOrigin(0, 0).setDepth(DEPTH.back);
    this.add.image(x, y, T3.sillFront).setOrigin(0, 0).setDepth(DEPTH.front);
    this.mary = this.add.sprite(x + CLIMB_X, y + SILL.h + 12, TEX.spider, 'idle0').setDepth(DEPTH.mary).setFlipX(true);
  }

  private buildOutside(): void {
    const { x, y } = AT.outside;
    this.add.image(x, y, T3.outsideBack).setOrigin(0, 0).setDepth(DEPTH.back);
    this.add.image(x, y, T3.outsideFront).setOrigin(0, 0).setDepth(DEPTH.front);
    this.outMary = this.add.sprite(x + OUT_MID, y + OUT_Y, TEX.spider, 'idle0').setDepth(DEPTH.front - 0.05).setVisible(false);
    this.thread = this.add.graphics().setDepth(DEPTH.thread);
  }

  private buildWide(seed: number): void {
    const { x, y } = AT.wide;
    this.add.image(x, y - 10, TEX.streetSky).setOrigin(0, 0).setDepth(DEPTH.sky);
    this.bolt = this.add.graphics().setDepth(DEPTH.bolt);
    this.add.image(x, y, T3.houseFront).setOrigin(0, 0).setDepth(DEPTH.house);
    // A gosma brilhando lá dentro, na janela quebrada.
    const { win } = HOUSE;
    this.houseGlow = this.add
      .image(x + win.x + win.w * 0.6, y + win.y + win.h - 3, TEX.gooGlow)
      .setDepth(DEPTH.house + 0.01)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.32);
    this.miniMary = this.add.image(x + win.x + win.w / 2, y + win.y + win.h + 1, T3.miniMary).setOrigin(0.5, 0).setDepth(DEPTH.mary);
    // Os doentes em volta da casa: no gramado e na calçada.
    this.crowd = new Horde(W.horde, HOUSE.w, ZOMBIE_LOOKS.length, seed + 7);
    const rows = [HOUSE.lawnRow, HOUSE.walkRow];
    this.crowd.zombies.forEach((z) => {
      const u = W.horde[z.row].u;
      const depth = DEPTH.crowd + z.row * 0.02;
      const body = this.add.sprite(x, y + rows[z.row], TEX.zombie(u)).setOrigin(0.5, 1).setDepth(depth);
      const eyes = this.add.sprite(x, y + rows[z.row], TEX.zombieEyes(u)).setOrigin(0.5, 1).setDepth(depth + 0.01);
      this.crowdSprites.push({ body, eyes });
    });
  }

  private setShot(name: WindowShot): void {
    this.shot = name;
    const cam = this.cameras.main;
    this.drops = [];
    this.splats = [];
    if (name === 'kitchen') {
      cam.setZoom(W.kitchenZoom);
      cam.centerOn(W.kitchenFromX, W.kitchenY);
      this.flash.setVisible(false);
      return;
    }
    const s = AT[name];
    cam.setZoom(name === 'wide' ? W.wideZoomFrom : W.closeZoom);
    cam.centerOn(s.x + s.w / 2, s.y + s.h / 2);
    // No parapeito o clarão é mais fraco na parede: a cena soma o forte só no vão (no quadro a quadro).
    this.flash.setVisible(true).setPosition(s.x, s.y).setSize(s.w, s.h);
    const area = this.rainArea();
    for (let i = 0; i < W.rainDrops; i++) this.drops.push(this.spawnDrop(area, true));
  }

  /** Por onde a chuva cai: no parapeito, só dentro do vão da janela; nos outros, o palco inteiro. */
  private rainArea(): { x: number; y: number; w: number; h: number } {
    if (this.shot === 'sill') return { x: AT.sill.x + SILL.x, y: AT.sill.y + SILL.y, w: SILL.gw, h: SILL.gh };
    const s = this.shot === 'kitchen' ? AT.sill : AT[this.shot];
    return { x: s.x, y: s.y, w: s.w, h: s.h };
  }

  // ---------- quadro a quadro ----------

  update(time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 1 / 30);
    const pad = pollPad();
    if (pad?.musicPressed) getSound().hub.toggleMute();
    if (pad && (pad.confirmPressed || pad.pausePressed || pad.trapPressed)) this.skip();

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
    const shot = WINDOW_STEP_SHOT[name];
    if (shot !== this.shot) {
      // Corte seco para o outro plano. A chuva e os gemidos da rua mudam: lá fora é mais alto.
      this.setShot(shot);
      const outside = shot === 'outside' || shot === 'wide';
      sound.storm.setOutside(outside, 0.15);
      // Na cozinha o gemido do doente é claro; no parapeito, a rua fica abafada.
      sound.zombies.setDistance(shot === 'kitchen' ? 0.25 : shot === 'wide' ? 0.35 : outside ? 0.6 : 1, 0.15);
    }
    switch (name) {
      case 'walk':
        this.mary.play('spider-walk');
        break;
      case 'stop':
        this.mary.setPosition(AT.sill.x + SILL_MID, AT.sill.y + SILL_Y).setAngle(0).play('spider-idle');
        break;
      case 'turn':
        this.mary.setFlipX(false);
        break;
      case 'turnBack':
        this.mary.setPosition(AT.sill.x + SILL_MID, AT.sill.y + SILL_Y).setAngle(0).setFlipX(false).play('spider-idle');
        break;
      case 'leave':
        // Passa por trás dos cacos, e de costas para a câmera ela vai ficando menor.
        this.mary.setAngle(0).setFlipX(true).setDepth(DEPTH.front - 0.05).play('spider-walk');
        break;
      case 'outIn':
        this.outMary.setVisible(true).setScale(W.leaveScale).setDepth(DEPTH.front - 0.05).setFlipX(true).play('spider-walk');
        break;
      case 'rain':
        this.outMary.setVisible(true).setScale(1).setDepth(DEPTH.mary).setPosition(AT.outside.x + OUT_MID, AT.outside.y + OUT_Y).play('spider-idle');
        sound.zombies.setDistance(0.42, W.rainSec);
        break;
      case 'thread':
        this.outMary.play('spider-air');
        sound.sfx.webShot('rope');
        break;
      case 'outro':
        this.showSkipHint(false);
        cam.fadeOut(W.outroSec * 1000, 0, 0, 0);
        break;
    }
  }

  private runStep(name: string, local: number, p: number): void {
    const m = this.mary;
    const o = this.outMary;
    const { x: sx, y: sy } = AT.sill;
    const { x: ox, y: oy } = AT.outside;
    switch (name) {
      case 'walk':
        // Sobe a parede à direita, contorna a beira e anda pelo parapeito até o meio.
        if (p < 0.34) {
          const k = p / 0.34;
          m.setPosition(sx + CLIMB_X, sy + SILL.h + 12 + (SILL_Y + 6 - SILL.h - 12) * k).setAngle(90);
        } else if (p < 0.44) {
          const k = (p - 0.34) / 0.1;
          m.setPosition(sx + CLIMB_X - k * 4, sy + SILL_Y + 6 * (1 - k)).setAngle(90 * (1 - k));
        } else {
          const k = (p - 0.44) / 0.56;
          m.setPosition(sx + CLIMB_X - 4 + (SILL_MID - CLIMB_X + 4) * k, sy + SILL_Y).setAngle(0);
        }
        break;
      case 'stop':
        this.strikeOnce('stop', p >= W.stopStrikeAt);
        break;
      case 'kitchen': {
        const cam = this.cameras.main;
        cam.centerOn(W.kitchenFromX + (W.kitchenToX - W.kitchenFromX) * ease(p), W.kitchenY);
        // O doente geme (se ainda estiver vivo).
        if (p > 0.2 && !this.groanedKitchen && this.kitchen.sick.alive) {
          this.groanedKitchen = true;
          getSound().zombies.groan({ pan: 0, volume: this.kitchen.sick.aggro ? 1 : 0.75, seed: 500 });
        }
        break;
      }
      case 'leave': {
        // Para o fundo: menor e um pouco mais alto, atravessando o vão.
        const k = ease(p);
        m.setScale(1 + (W.leaveScale - 1) * k);
        m.setPosition(sx + SILL_MID, sy + SILL_Y - k * 7);
        m.setAlpha(p > 0.92 ? (1 - p) / 0.08 : 1);
        break;
      }
      case 'outIn': {
        // Vem de dentro, crescendo até a beira do parapeito.
        const k = ease(p);
        o.setScale(W.leaveScale + (1 - W.leaveScale) * k);
        o.setPosition(ox + OUT_MID, oy + OUT_Y - (1 - k) * 8);
        break;
      }
      case 'rain':
        // Sacode a chuva e olha para os dois lados.
        o.setX(ox + OUT_MID + (local < 0.5 ? (Math.floor(local / 0.05) % 2 ? 1 : -1) : 0));
        o.setFlipX(p < 0.5);
        if (local < 0.4 && this.rng() < 0.6) this.splats.push({ x: o.x + (this.rng() - 0.5) * 16, y: o.y + (this.rng() - 0.5) * 8, life: 0.2 });
        break;
      case 'thread': {
        // Salta da beira e desce pelo fio preso no parapeito, saindo por baixo do quadro.
        const k = Math.min(1, local / 0.3);
        const y = oy + OUT_Y + local * W.threadSpeed * (0.4 + p * 1.4);
        o.setPosition(ox + OUT_MID + k * 3, y).setFlipX(false);
        const g = this.thread;
        g.clear();
        g.fillStyle(WEB.color, 0.9);
        pixelLine(g, ox + OUT_MID + 3, oy + OUTSIDE.sillY, o.x, y - 3);
        break;
      }
      case 'wide':
      case 'outro': {
        const q = name === 'wide' ? p : 1;
        this.runWide(q);
        break;
      }
    }
  }

  /** A casa inteira: a câmera abre devagar, a Mary desce no fio e cai o raio. */
  private runWide(p: number): void {
    const s = AT.wide;
    const k = ease(Math.min(1, p / 0.8));
    const cam = this.cameras.main;
    cam.setZoom(W.wideZoomFrom + (W.wideZoomTo - W.wideZoomFrom) * k);
    const from = { x: s.x + HOUSE.win.x + 36, y: s.y + HOUSE.win.y - 2 };
    cam.centerOn(from.x + (s.x + s.w / 2 - from.x) * k, from.y + (s.y + s.h / 2 - from.y) * k);
    this.strikeOnce('wide', p >= W.wideStrikeAt);
    const { win, base } = HOUSE;
    const top = s.y + win.y + win.h + 1;
    const drop = threadDrop(p, W.threadEndAt);
    const y = top + (s.y + base - 3 - top) * drop;
    this.miniMary.setPosition(s.x + win.x + win.w / 2, y).setVisible(drop < 1);
    this.thread.clear();
    if (drop < 1) {
      this.thread.fillStyle(WEB.color, 0.75);
      this.thread.fillRect(this.miniMary.x, top, 1, y - top);
    }
    this.thread.setDepth(DEPTH.mary - 0.01);
  }

  private strikeOnce(key: string, when: boolean): void {
    if (!when || this.struck.has(key)) return;
    this.struck.add(key);
    this.atmosphere.storm.strike(true);
  }

  private updateWorld(dt: number, time: number): void {
    const sound = getSound();
    const cam = this.cameras.main;
    for (const thunder of this.atmosphere.update(dt, cam.worldView)) sound.storm.thunder(thunder);
    const flash = this.atmosphere.storm.flash;
    const light = (x: number, y: number) => this.atmosphere.lightAt(x, y);

    // A cozinha: o doente, a gosma e as goteiras, como no jogo.
    this.kitchen.update(dt, this.kitchen.sick.aggro ? AT_WINDOW : null);
    for (const e of this.goo.update(dt, this.art.grid)) if (e.type === 'splash') this.gooView.splash(e.x, e.y, false);
    for (const e of this.water.update(dt, this.art.grid)) if (e.type === 'splash') this.gooView.splash(e.x, e.y, true);
    this.sickView.update(time, light);
    this.gooView.update(dt, time, cam.worldView, flash);

    this.handleCrowd(this.crowd.update(dt));
    if (this.shot === 'wide') {
      this.crowd.zombies.forEach((z, i) => {
        const sp = this.crowdSprites[i];
        const frame = zombieFrameName(z.look, walkFrame(z.phase, ZOMBIE_FRAMES));
        const tint = mixColor(PAL.street.crowdLight[z.row], 0xffffff, flash * 0.8);
        sp.body.setPosition(AT.wide.x + Math.round(z.x), sp.body.y).setFrame(frame).setTint(tint);
        sp.eyes.setPosition(AT.wide.x + Math.round(z.x), sp.eyes.y).setFrame(frame).setTint(mixColor(PAL.street.eyeLight, 0xffffff, flash));
      });
      this.houseGlow.setAlpha(0.45 + Math.sin(time / 500) * 0.2);
      this.miniMary.setTint(mixColor(0xc0c8e0, 0xffffff, flash));
    }

    // A Mary: recortada contra o céu por dentro, com a luz do luar por fora.
    this.mary.setTint(PAL.act3Cut.marySilhouette);
    this.outMary.setTint(mixColor(PAL.act3Cut.maryOutside, 0xffffff, flash * 0.7));

    // O clarão: na parede do parapeito é fraco; fora, é o quadro todo.
    if (this.shot !== 'kitchen') this.flash.setAlpha(flash * (this.shot === 'sill' ? 0.5 : 0.4));

    this.drawRain(dt, flash);
    this.drawBolt();
    placeBars(cam, this.bars, W.letterboxPx);
  }

  private handleCrowd(events: HordeEvent[]): void {
    if (this.shot !== 'wide') return;
    const { zombies } = getSound();
    for (const e of events) {
      if (e.type === 'groan') zombies.groan(e);
      else zombies.step(e.pan, e.volume);
    }
  }

  // ---------- chuva e raio ----------

  private spawnDrop(a: { x: number; y: number; w: number; h: number }, anywhere: boolean): Drop {
    return {
      x: a.x + this.rng() * (a.w + 30),
      y: anywhere ? a.y + this.rng() * a.h : a.y - this.rng() * 30,
      speed: W.rainSpeed[0] + this.rng() * (W.rainSpeed[1] - W.rainSpeed[0]),
    };
  }

  private drawRain(dt: number, flash: number): void {
    const g = this.rain;
    g.clear();
    if (this.shot === 'kitchen') return;
    const a = this.rainArea();
    const inSill = this.shot === 'sill';
    // No parapeito a chuva fica atrás dos cacos e da Mary; fora, por cima de tudo.
    g.setDepth(inSill ? DEPTH.rainBehind : DEPTH.rain);
    g.fillStyle(PAL.street.rain, 0.5 + flash * 0.4);
    const slope = W.rainWind / W.rainSpeed[0];
    const len = this.shot === 'wide' ? 4 : 5;
    for (let i = 0; i < this.drops.length; i++) {
      const d = this.drops[i];
      d.y += d.speed * dt;
      d.x += W.rainWind * dt;
      if (d.y > a.y + a.h || d.x < a.x - 10) {
        this.drops[i] = this.spawnDrop(a, false);
        continue;
      }
      for (let k = 0; k < len; k++) {
        const px = Math.round(d.x - slope * k);
        const py = Math.round(d.y - k);
        if (inSill && (px < a.x || px >= a.x + a.w || py < a.y || py >= a.y + a.h)) continue;
        g.fillRect(px, py, 1, 1);
      }
    }
    // Respingos: no parapeito e, fora, onde a chuva bate.
    const splash = (x: number, y: number) => {
      g.fillRect(x - 1, y, 1, 1);
      g.fillRect(x + 1, y, 1, 1);
      g.fillRect(x, y - 1, 1, 1);
    };
    if (inSill) {
      for (let i = 0; i < 3; i++) splash(a.x + Math.round(this.rng() * a.w), AT.sill.y + SILL.sillY);
    } else if (this.shot === 'outside') {
      for (let i = 0; i < 4; i++) splash(a.x + OUTSIDE.x + Math.round(this.rng() * OUTSIDE.gw), AT.outside.y + OUTSIDE.sillY);
    } else {
      for (let i = 0; i < 6; i++) splash(a.x + Math.round(this.rng() * a.w), a.y + HOUSE.base + Math.round(this.rng() * (a.h - HOUSE.base)));
    }
    this.splats = this.splats.filter((s) => (s.life -= dt) > 0);
    for (const s of this.splats) g.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
  }

  /** O raio só aparece no céu do plano da casa inteira. */
  private drawBolt(): void {
    const bolt = this.atmosphere.storm.bolt;
    if (!bolt || this.shot !== 'wide') {
      if (this.boltSeed !== -1) this.bolt.clear();
      this.boltSeed = -1;
      return;
    }
    if (bolt.seed === this.boltSeed) return;
    this.boltSeed = bolt.seed;
    const s = AT.wide;
    const g = this.bolt;
    const ox = s.x + Math.round(s.w * bolt.x);
    g.clear();
    g.fillStyle(PAL.street.bolt, 1);
    for (const line of boltPath(bolt.seed, s.h * 0.7)) {
      for (let i = 1; i < line.length; i++) pixelLine(g, ox + line[i - 1].x, s.y + line[i - 1].y, ox + line[i].x, s.y + line[i].y);
    }
  }

  // ---------- fim ----------

  /** Pular: escurece rápido e vai para o fim do ato (pelo SCENES, de volta ao menu). */
  private skip(): void {
    if (this.done) return;
    this.done = true;
    this.showSkipHint(false);
    const cam = this.cameras.main;
    cam.fadeOut(W.skipFadeSec * 1000, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.finish());
  }

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    this.done = true;
    const sound = getSound();
    sound.storm.setOutside(false);
    sound.zombies.setDistance(1, 0.5);
    if (this.replay) {
      void fadeTo(1, 0);
      this.scene.start('game', { openScenes: 'act3-ending' });
      return;
    }
    this.scene.wake('act3');
    this.scene.stop();
  }

  private showSkipHint(on: boolean): void {
    this.skipHint?.classList.toggle('hidden', !on);
  }
}
