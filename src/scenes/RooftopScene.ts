// Ato 2, ROOFTOPS: a travessia da rua por cima dos postes, na chuva e na ventania.
// Cutscene de abertura, jogo, checkpoints, morte pisada pelo zumbi, fim entrando pela chaminé e pausa.
// Spec: docs/features/act2-rooftops.md (ventania e obstáculos: docs/features/wind.md)
import Phaser from 'phaser';
import { ACT2, DEBRIS, GAMEPAD, LIGHT, SPIDER, TILE, TITLE, VIEW, WEB, WIRE } from '../config';
import { buildBeam, coneFactor } from '../art/lighting';
import { PAL } from '../art/palette';
import { DEBRIS_FRAME, type RooftopArt, bakeRooftops, buildDebrisSheet, buildZombieFoot } from '../art/rooftopArt';
import { buildStreetSky } from '../art/streetArt';
import { TEX } from '../art/textures';
import { mixColor } from '../art/tilePainters';
import { ZOMBIE_FRAMES, ZOMBIE_LOOKS, zombieFrameName } from '../art/zombieArt';
import { type Sound, getSound } from '../audio/sound';
import { Hazards } from '../entities/Hazards';
import { Spider } from '../entities/Spider';
import { Weather } from '../entities/Weather';
import { ACTS } from '../level/acts';
import {
  CHECKPOINTS,
  CHIMNEY,
  END_ZONE,
  FIRST_AIM,
  LOOSE_WIRES,
  ROOFTOP_MAP,
  STREET_ROW,
  WIRE_SPANS,
  isRooftopSolid,
} from '../level/rooftops';
import { LevelGrid } from '../physics/LevelGrid';
import { inZone, nextCheckpoint, spawnPoint, touchedStreet } from '../systems/checkpoints';
import { DEBRIS_KINDS, DebrisField } from '../systems/debris';
import { Horde, walkFrame } from '../systems/horde';
import { type SpiderInput, emptyInput } from '../systems/input';
import { LooseWire } from '../systems/looseWire';
import { recordActEnd } from '../systems/progress';
import { Storm } from '../systems/storm';
import { raycastWeb } from '../systems/webRope';
import { Wind } from '../systems/wind';
import { Timeline } from '../systems/cutscene';
import { ActEnd } from './ActEnd';
import { Hud } from './Hud';
import { type PauseAction, PauseMenu } from './PauseMenu';
import { PlayerInput } from './PlayerInput';
import { fadeTo } from './Transitions';
import { loadProgress, saveProgress } from './progressStore';

/**
 * intro: cutscene de abertura | play: jogando | paused: menu de pausa | dying: caiu na rua (o pé pisa) |
 * ending: cutscene da chaminé | actEnd: tela de fim do ato.
 */
type Mode = 'intro' | 'play' | 'paused' | 'dying' | 'ending' | 'actEnd';

interface Act2Data {
  /** true = começa pela cutscene de abertura (vindo da seleção de atos). */
  intro?: boolean;
}

const ACT = ACTS[1];
const T2 = { level: 'act2Level', sky: 'act2Sky', foot: 'zombieFoot', debris: 'debris', beam: (i: number) => `act2Beam${i}` } as const;
const STREET_Y = STREET_ROW * TILE;
/** Ordem de desenho: céu 0, casas do fundo 1, horda 2, cenário 3, feixes 3,5, fios 4, detritos 5, aranha 8–9. */
const DEPTH = { sky: 0, houses: 1, horde: 2, level: 3, beam: 3.5, shadow: 7.9, foot: 9.4, chimney: 9.6, soot: 9.7, bars: 20 } as const;

/** A arte da rua é pintada uma vez só (as texturas sobrevivem aos reinícios da cena). */
let art: RooftopArt | null = null;

function ensureTextures(scene: Phaser.Scene, grid: LevelGrid): RooftopArt {
  art ??= bakeRooftops();
  const tex = scene.textures;
  if (!tex.exists(T2.level)) {
    tex.addCanvas(T2.level, art.canvas.toCanvas());
    tex.addCanvas(T2.foot, buildZombieFoot().toCanvas());
    const sheet = tex.addCanvas(T2.debris, buildDebrisSheet().toCanvas());
    DEBRIS_KINDS.forEach((k, i) => sheet?.add(k, 0, i * DEBRIS_FRAME, 0, DEBRIS_FRAME, DEBRIS_FRAME));
    art.lamps.forEach((l, i) => tex.addCanvas(T2.beam(i), buildBeam(grid, l).toCanvas()));
  }
  return art;
}

const channels = (c: number): [number, number, number] => [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
const NIGHT = channels(PAL.act2.night);
const LAMP = channels(PAL.act2.lamp);
const toTint = ([r, g, b]: [number, number, number]) =>
  (Math.round(Math.min(1, r) * 255) << 16) | (Math.round(Math.min(1, g) * 255) << 8) | Math.round(Math.min(1, b) * 255);

export class RooftopScene extends Phaser.Scene {
  private grid!: LevelGrid;
  private art!: RooftopArt;
  private spider!: Spider;
  private playerInput!: PlayerInput;
  private reticle!: Phaser.GameObjects.Image;
  private storm!: Storm;
  private wind!: Wind;
  private debris!: DebrisField;
  private wires!: LooseWire[];
  private weather!: Weather;
  private hazards!: Hazards;
  private horde!: Horde;
  private hordeSprites: { body: Phaser.GameObjects.Sprite; eyes: Phaser.GameObjects.Sprite }[] = [];
  private foot!: Phaser.GameObjects.Image;
  private footShadow!: Phaser.GameObjects.Ellipse;
  private chimneyFront!: Phaser.GameObjects.Image;
  private soot!: Phaser.GameObjects.Graphics;
  private bars!: Phaser.GameObjects.Rectangle[];
  private debugGfx!: Phaser.GameObjects.Graphics;
  private hud!: Hud;
  private pauseMenu!: PauseMenu;
  private actEnd!: ActEnd;
  private sound_!: Sound;
  private mode: Mode = 'play';
  /** Checkpoint ativo (índice em CHECKPOINTS). Público para o console. */
  checkpoint = 0;
  private graceLeft = 0;
  private shockCooldown = 0;
  /** Cutscenes e a morte usam o próprio relógio. */
  private tl: Timeline | null = null;
  private elapsed = 0;
  private stepIndex = -1;
  private sootPuffs: { x: number; y: number; vy: number; life: number }[] = [];
  private debug = false;
  private readonly chapter = document.getElementById('chapter');
  private readonly toast = document.getElementById('toast');

  constructor() {
    super('act2');
  }

  create(data: Act2Data = {}): void {
    this.mode = 'play';
    this.checkpoint = 0;
    this.graceLeft = 0;
    this.shockCooldown = 0;
    this.tl = null;
    this.hordeSprites = [];
    this.sootPuffs = [];
    this.grid = LevelGrid.fromAscii(ROOFTOP_MAP, TILE, isRooftopSolid);
    this.art = ensureTextures(this, this.grid);
    const seed = (Date.now() & 0x7fffffff) || 1;
    this.storm = new Storm(seed);
    this.wind = new Wind(seed + 1);
    this.debris = new DebrisField(seed + 2);
    this.wires = LOOSE_WIRES.map((w, i) => new LooseWire(w, seed + 10 + i));
    // A transição do ato deixou a tela preta: a cena clareia com a câmera.
    void fadeTo(0, 0);

    this.buildBackground();
    this.add.image(0, 0, T2.level).setOrigin(0, 0).setDepth(DEPTH.level);
    this.art.lamps.forEach((l, i) => {
      this.add.image(l.x, l.y, T2.beam(i)).setOrigin(0.5, 0).setDepth(DEPTH.beam).setBlendMode(Phaser.BlendModes.ADD);
    });
    this.hazards = new Hazards(this, WIRE_SPANS, T2.debris, seed + 3);

    this.sound_ = getSound();
    const sound = this.sound_;
    const start = spawnPoint(CHECKPOINTS[0], TILE, SPIDER.half);
    this.spider = new Spider(this, this.grid, start.x, start.y, () => {
      if (this.mode === 'play' || this.mode === 'ending') sound.footsteps.step(this.spider.motor.running);
    });
    this.spider.motor.surface = 'floor';
    this.playerInput = new PlayerInput(this, this.grid);
    this.reticle = this.add.image(0, 0, TEX.reticle).setDepth(10).setVisible(false);

    this.footShadow = this.add.ellipse(0, 0, 10, 4, 0x000000, 0.5).setDepth(DEPTH.shadow).setVisible(false);
    this.foot = this.add.image(0, 0, T2.foot).setOrigin(0.3, 1).setDepth(DEPTH.foot).setVisible(false);
    // A frente da chaminé (do cenário) por cima da aranha, para ela "entrar" por trás.
    const c = CHIMNEY;
    this.chimneyFront = this.add
      .image(0, 0, T2.level)
      .setOrigin(0, 0)
      .setCrop(c.tx * TILE - 2, c.ty * TILE + 3, c.w * TILE + 4, c.h * TILE - 3)
      .setDepth(DEPTH.chimney)
      .setVisible(false);
    this.soot = this.add.graphics().setDepth(DEPTH.soot);
    this.weather = new Weather(this, seed + 4);
    const bar = (y: number) => this.add.rectangle(0, y, VIEW.width, 0, 0x000000).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.bars);
    this.bars = [bar(0), bar(VIEW.height)];
    this.debugGfx = this.add.graphics().setDepth(21);

    this.hud = new Hud();
    this.pauseMenu = new PauseMenu((a) => this.onPauseAction(a));
    this.actEnd = new ActEnd(() => {
      void fadeTo(1, 0);
      this.scene.start('game', { openActs: true });
    });

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.grid.widthPx, this.grid.heightPx);
    cam.setRoundPixels(true);
    cam.setBackgroundColor(0x05060d);

    sound.storm.setOutside(true, 1);
    sound.zombies.setDistance(0.6, 0.5);

    const kb = this.input.keyboard;
    kb?.on('keydown-ESC', () => this.togglePause());
    kb?.on('keydown-P', () => this.togglePause());
    kb?.on('keydown-M', () => sound.hub.toggleMute());
    kb?.on('keydown-H', () => {
      if (this.mode === 'play') this.hud.toggleHelp();
    });
    kb?.on('keydown-G', () => {
      this.debug = !this.debug;
      this.hud.showDebug(this.debug);
      if (!this.debug) this.debugGfx.clear();
    });
    for (const key of ['keydown-ENTER', 'keydown-SPACE']) kb?.on(key, () => this.skipIntro());
    kb?.on('keydown-ESC', () => this.skipIntro());

    this.events.once('shutdown', () => {
      this.pauseMenu.destroy();
      this.actEnd.destroy();
      this.hud.showHelp(false);
      this.hud.showDebug(false);
      this.chapter?.classList.remove('show');
      this.anims.resumeAll();
      sound.storm.setOutside(false);
      sound.wind.setStrength(0, 0.5);
      sound.zombies.setDistance(1, 0.5);
    });

    if (data.intro) this.startIntro();
    else this.startPlay(true);

    if (import.meta.env.DEV) Object.assign(window, { __scene2: this, __wind: this.wind, __spider: this.spider.motor });
  }

  // ---------- montagem ----------

  private buildBackground(): void {
    const W = this.grid.widthPx;
    // Céu (parallax lento) e as casas do outro lado da rua (parallax médio), escurecidas.
    const skyW = Math.ceil(VIEW.width + (W - VIEW.width) * 0.1) + 8;
    const skyH = Math.ceil(VIEW.height + (this.grid.heightPx - VIEW.height) * 0.1) + 8;
    // Céu com o mesmo desenho da cutscene da rua, no tamanho que o parallax precisa.
    if (!this.textures.exists(T2.sky)) this.textures.addCanvas(T2.sky, buildStreetSky(skyW, skyH).toCanvas());
    this.add.image(0, 0, T2.sky).setOrigin(0, 0).setScrollFactor(0.1).setDepth(DEPTH.sky);
    const housesW = 240;
    const count = Math.ceil((VIEW.width + (W - VIEW.width) * 0.35) / housesW) + 1;
    for (let i = 0; i < count; i++) {
      this.add
        .image(i * housesW, 200, TEX.houses)
        .setOrigin(0, 0)
        .setScrollFactor(0.35)
        .setDepth(DEPTH.houses)
        .setTint(0x6c749c);
    }

    // A horda na rua: fileira de trás (pequena, escura) e a da frente (grande).
    this.horde = new Horde(ACT2.horde, W, ZOMBIE_LOOKS.length, 77);
    this.horde.zombies.forEach((z) => {
      const u = ACT2.horde[z.row].u;
      const depth = DEPTH.horde + z.row * 0.1;
      const body = this.add.sprite(0, 0, TEX.zombie(u)).setOrigin(0.5, 1).setDepth(depth);
      const eyes = this.add.sprite(0, 0, TEX.zombieEyes(u)).setOrigin(0.5, 1).setDepth(depth + 0.05);
      this.hordeSprites.push({ body, eyes });
    });
  }

  // ---------- modos ----------

  /** Começa (ou volta) a jogar: câmera seguindo a aranha, sem faixas de cinema. */
  private startPlay(fadeIn = false): void {
    this.mode = 'play';
    this.tl = null;
    this.graceLeft = TITLE.inputGraceSec;
    this.wind.script(null);
    this.setBars(false);
    this.reticle.setVisible(true);
    this.hud.applyHelpPreference();
    const cam = this.cameras.main;
    const b = this.spider.motor.body;
    cam.startFollow(b, true, VIEW.cameraLerp, VIEW.cameraLerp);
    cam.setFollowOffset(0, -ACT2.cameraLookDown);
    if (fadeIn) {
      cam.centerOn(b.x, b.y + ACT2.cameraLookDown);
      cam.fadeIn(600, 0, 0, 0);
    }
  }

  private startIntro(): void {
    this.mode = 'intro';
    this.elapsed = 0;
    this.stepIndex = -1;
    this.tl = new Timeline([
      { name: 'fadeIn', sec: ACT2.introFadeSec },
      { name: 'look', sec: ACT2.introLookSec },
      { name: 'wind', sec: ACT2.introWindSec },
      { name: 'shoot', sec: ACT2.introShootSec },
      { name: 'swing', sec: ACT2.introSwingSec },
    ]);
    this.setBars(true, 0);
    this.wind.script(0);
    const b = this.spider.motor.body;
    this.cameras.main.centerOn(b.x + 90, b.y);
    this.cameras.main.fadeIn(ACT2.introFadeSec * 1000, 0, 0, 0);
  }

  /** Pular a cutscene de abertura: a aranha já aparece grudada embaixo do braço do poste 1. */
  private skipIntro(): void {
    if (this.mode !== 'intro') return;
    const m = this.spider.motor;
    m.rope = null;
    m.body.x = FIRST_AIM.x;
    m.body.y = Math.ceil(FIRST_AIM.y / TILE) * TILE + SPIDER.half;
    m.body.vx = 0;
    m.body.vy = 0;
    m.surface = 'ceiling';
    this.chapter?.classList.remove('show');
    this.startPlay();
  }

  private togglePause(): void {
    if (this.mode === 'play') {
      this.mode = 'paused';
      this.pauseMenu.show();
      this.hud.applyHelpPreference(true);
      this.anims.pauseAll();
    } else if (this.mode === 'paused') {
      this.resume();
    }
  }

  private resume(): void {
    this.mode = 'play';
    this.pauseMenu.hide();
    this.hud.applyHelpPreference();
    this.anims.resumeAll();
    this.graceLeft = TITLE.inputGraceSec;
  }

  private onPauseAction(action: PauseAction): void {
    if (action === 'resume') this.resume();
    else if (action === 'restart') this.scene.restart({ intro: false } satisfies Act2Data);
    else this.scene.start('game');
  }

  /** Caiu na rua: o controle trava, a câmera aproxima e o pé do zumbi pisa. */
  private die(): void {
    this.mode = 'dying';
    const m = this.spider.motor;
    m.rope = null;
    m.body.vx = 0;
    m.body.vy = 0;
    m.body.y = STREET_Y - SPIDER.half;
    m.surface = 'floor';
    this.spider.update(0, emptyInput());
    this.reticle.setVisible(false);
    this.debris.clear();
    this.elapsed = 0;
    this.stepIndex = -1;
    this.tl = new Timeline([
      { name: 'shadow', sec: ACT2.stompShadowSec },
      { name: 'drop', sec: ACT2.stompDropSec },
      { name: 'hold', sec: ACT2.stompHoldSec },
      { name: 'fade', sec: ACT2.deathFadeSec },
    ]);
    const cam = this.cameras.main;
    cam.stopFollow();
    cam.pan(m.body.x, m.body.y - 24, 280, 'Sine.easeOut');
    cam.zoomTo(ACT2.stompZoom, 280);
    this.footShadow.setPosition(m.body.x, STREET_Y - 1).setVisible(true).setSize(4, 2);
    this.foot.setPosition(m.body.x - 8, m.body.y - 120).setVisible(true).setTint(this.lightTint(m.body.x, m.body.y - 30));
  }

  /** Volta no último checkpoint (público para o console). */
  respawn(): void {
    const p = spawnPoint(CHECKPOINTS[this.checkpoint], TILE, SPIDER.half);
    const m = this.spider.motor;
    m.placeAt(p.x, p.y);
    this.spider.sprite.setVisible(true).setAlpha(1).setScale(1);
    this.foot.setVisible(false);
    this.footShadow.setVisible(false);
    const cam = this.cameras.main;
    cam.setZoom(1);
    this.startPlay(true);
  }

  /** Chegou no telhado da casa vizinha: cutscene da chaminé (público para o console). */
  startEnding(): void {
    if (this.mode === 'ending' || this.mode === 'actEnd') return;
    this.mode = 'ending';
    this.elapsed = 0;
    this.stepIndex = -1;
    this.spider.motor.rope = null;
    this.reticle.setVisible(false);
    this.hud.showHelp(false);
    this.wind.script(0.12, -1);
    this.debris.clear();
    this.setBars(true);
    this.tl = new Timeline([
      { name: 'walk', sec: ACT2.endWalkMaxSec },
      { name: 'peek', sec: ACT2.endPeekSec },
      { name: 'enter', sec: ACT2.endEnterSec },
      { name: 'fade', sec: ACT2.endFadeSec },
    ]);
  }

  private endAct(): void {
    this.mode = 'actEnd';
    saveProgress(recordActEnd(loadProgress(), ACT.id, []));
    this.actEnd.show(ACT, 0, ACTS[ACTS.indexOf(ACT) + 1]);
  }

  // ---------- quadro a quadro ----------

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 1 / 30);
    const pi = this.playerInput;
    const m = this.spider.motor;
    document.body.classList.toggle('pad', pi.device === 'gamepad');
    let input = pi.read(m.body);
    const pad = pi.padFrame;
    if (pad?.musicPressed) this.sound_.hub.toggleMute();

    if (this.mode === 'paused') {
      if (pad?.navY) this.pauseMenu.move(pad.navY);
      if (pad?.confirmPressed) this.pauseMenu.confirm();
      else if (pad?.trapPressed || pad?.pausePressed) this.resume();
      return;
    }
    if (this.mode === 'actEnd') {
      if (pad?.confirmPressed || pad?.pausePressed) this.actEnd.confirm();
      return;
    }
    if (this.mode === 'intro' && (pad?.confirmPressed || pad?.pausePressed)) this.skipIntro();
    if (this.mode === 'play' && pad?.pausePressed) {
      this.togglePause();
      return;
    }

    this.updateWorld(dt);

    switch (this.mode) {
      case 'intro':
        this.runTimeline(dt);
        break;
      case 'dying':
        this.runTimeline(dt);
        break;
      case 'ending':
        this.runTimeline(dt);
        break;
      case 'play': {
        if (this.graceLeft > 0) {
          this.graceLeft -= dt;
          input = { ...input, jumpPressed: false, webPressed: false, webHeld: false, attackPressed: false, trapPressed: false, readPressed: false };
        }
        this.updatePlay(dt, input);
        break;
      }
    }

    const b = m.body;
    this.spider.setLight(this.lightAt(b.x, b.y), LIGHT.spiderMinLight);
    if (this.debug) this.drawDebug();
  }

  /** O que continua andando em qualquer modo (menos pausa): tempestade, vento, horda, fios, chuva. */
  private updateWorld(dt: number): void {
    const sound = this.sound_;
    for (const thunder of this.storm.update(dt)) sound.storm.thunder(thunder);
    this.wind.update(dt);
    const wind = { phase: this.wind.phase, dir: this.wind.dir, strength: this.wind.strength };
    sound.wind.setStrength(wind.strength);

    const cam = this.cameras.main;
    const view = cam.worldView;
    const b = this.spider.motor.body;
    this.debris.update(dt, wind, view, b);
    for (const w of this.wires) {
      const near = Math.abs(w.def.x - view.centerX) < view.width;
      if (w.update(dt, this.wind.accel) && near) {
        this.hazards.sparkAt(w.tip(), 4);
        sound.sfx.spark();
      }
    }
    const tint = toTint(NIGHT.map((v) => Math.min(1, v * 1.3 + this.storm.flash * 0.5)) as [number, number, number]);
    this.hazards.update(dt, this.wires, this.debris.items, tint);
    this.weather.update(dt, wind, this.storm);
    this.updateHorde(dt);
    this.updateSoot(dt);
  }

  private updatePlay(dt: number, input: SpiderInput): void {
    const m = this.spider.motor;
    const pi = this.playerInput;
    const sfx = this.sound_.sfx;
    m.wind = this.wind.accel;
    const hadRope = m.rope !== null;
    this.spider.update(dt, input);
    m.wind = 0;
    if (input.webPressed) sfx.webShot('rope');
    if (!hadRope && m.rope && pi.padFrame?.webHeld) pi.rumble();

    // Detrito acerta só no ar ou na teia; grudada, ela está segura.
    if (m.surface === 'air') {
      const hit = this.debris.hit(m.body);
      if (hit) this.knock(this.wind.dir * DEBRIS.knockback.x, -DEBRIS.knockback.y);
    }
    // Fio solto: choque em qualquer estado.
    this.shockCooldown = Math.max(0, this.shockCooldown - dt);
    if (this.shockCooldown <= 0) {
      for (const w of this.wires) {
        const near = w.closest(m.body);
        if (near.dist > WIRE.touchRadius) continue;
        const away = Math.sign(m.body.x - near.point.x) || 1;
        this.knock(away * WIRE.knockback.x, -WIRE.knockback.y);
        this.hazards.sparkAt(near.point, 14);
        sfx.zap();
        this.shockCooldown = WIRE.shockCooldownSec;
        break;
      }
    }

    const attached = m.surface !== 'air';
    const cp = nextCheckpoint(CHECKPOINTS, this.checkpoint, m.body, attached, TILE);
    if (cp > this.checkpoint) {
      this.checkpoint = cp;
      sfx.checkpoint();
      this.showToast('CHECKPOINT');
    }
    this.updateReticle(input);

    if (touchedStreet(m.body, STREET_ROW, TILE)) this.die();
    else if (attached && inZone(m.body, END_ZONE, TILE)) this.startEnding();
  }

  /** Acertado (detrito ou choque): corta a teia, empurra, pisca e chia. */
  private knock(vx: number, vy: number): void {
    const m = this.spider.motor;
    m.rope = null;
    m.knockback(vx, vy);
    this.sound_.sfx.spiderHurt();
    this.playerInput.rumble(GAMEPAD.rumbleHurt);
    this.cameras.main.shake(120, 0.006);
    this.spider.sprite.setTintFill(0xffffff);
    this.time.delayedCall(70, () => this.spider.sprite.clearTint());
  }

  private runTimeline(dt: number): void {
    if (!this.tl) return;
    this.elapsed += dt;
    const at = this.tl.at(this.elapsed);
    if (!at) {
      this.finishTimeline();
      return;
    }
    if (at.index !== this.stepIndex) {
      this.stepIndex = at.index;
      this.enterStep(at.name);
    }
    this.runStep(at.name, at.local, at.progress, dt);
  }

  private enterStep(name: string): void {
    const m = this.spider.motor;
    const sfx = this.sound_.sfx;
    const cam = this.cameras.main;
    switch (name) {
      // Abertura.
      case 'look':
        this.showChapter();
        break;
      case 'wind':
        this.wind.script(0.32, 1);
        break;
      case 'shoot':
        this.spider.update(1 / 60, { ...emptyInput(), webPressed: true, webHeld: true, aim: FIRST_AIM });
        sfx.webShot('rope');
        cam.startFollow(m.body, true, 0.08, 0.08);
        cam.setFollowOffset(0, -ACT2.cameraLookDown / 2);
        break;
      // Morte.
      case 'drop':
        break;
      case 'hold':
        this.foot.setY(STREET_Y + 2);
        this.spider.sprite.setVisible(false);
        cam.shake(220, 0.02);
        sfx.stomp();
        this.playerInput.rumble({ durationMs: 300, strong: 1, weak: 0.8 });
        break;
      case 'fade':
        if (this.mode === 'dying') cam.fadeOut(ACT2.deathFadeSec * 1000, 0, 0, 0);
        else cam.fadeOut(ACT2.endFadeSec * 1000, 0, 0, 0);
        break;
      // Fim.
      case 'peek': {
        // Se a caminhada não chegou no topo da chaminé (algo travou), coloca a aranha lá.
        const top = CHIMNEY.ty * TILE;
        const center = (CHIMNEY.tx + CHIMNEY.w / 2) * TILE;
        if (m.surface !== 'floor' || m.body.y > top) {
          m.rope = null;
          m.body.x = center;
          m.body.y = top - SPIDER.half;
          m.surface = 'floor';
        }
        // A câmera aproxima na chaminé.
        cam.stopFollow();
        cam.pan(center, top - 6, 800, 'Sine.easeInOut');
        cam.zoomTo(ACT2.endZoom, 800, 'Sine.easeInOut');
        break;
      }
      case 'enter':
        this.chimneyFront.setVisible(true);
        sfx.webShot('trap');
        break;
    }
  }

  private runStep(name: string, local: number, p: number, dt: number): void {
    const m = this.spider.motor;
    const cam = this.cameras.main;
    const start = spawnPoint(CHECKPOINTS[0], TILE, SPIDER.half);
    switch (name) {
      case 'look': {
        // A câmera desce até a horda e volta.
        const bump = Math.sin(Math.PI * Math.min(1, p * 1.15));
        cam.centerOn(start.x + 90, start.y + (STREET_Y - 110 - start.y) * bump);
        if (local > ACT2.introLookSec * 0.55 && this.storm.strikes === 0) this.storm.strike(true);
        this.spider.update(dt, emptyInput());
        break;
      }
      case 'wind':
        this.spider.update(dt, emptyInput());
        // Ela treme no vento.
        this.spider.sprite.x += Math.round(Math.sin(local * 60)) * (p > 0.3 ? 1 : 0);
        break;
      case 'shoot':
        this.spider.update(dt, { ...emptyInput(), webHeld: true, aim: FIRST_AIM });
        break;
      case 'swing':
        m.wind = this.wind.accel;
        this.spider.update(dt, { ...emptyInput(), webHeld: true, move: { x: 0, y: local > 0.35 ? -1 : 0 }, aim: FIRST_AIM });
        m.wind = 0;
        if (m.surface !== 'air') this.startPlay();
        break;
      case 'shadow': {
        // A sombra do pé cresce em volta da aranha caída.
        const s = 6 + p * 34;
        this.footShadow.setSize(s, s * 0.32).setAlpha(0.25 + p * 0.4);
        this.foot.setY(m.body.y - 120 + p * 30);
        break;
      }
      case 'drop':
        this.foot.setY(m.body.y - 90 + (STREET_Y + 2 - (m.body.y - 90)) * p);
        break;
      case 'walk': {
        // Anda sozinha telhado acima, sobe a chaminé e para no meio do topo.
        const center = (CHIMNEY.tx + CHIMNEY.w / 2) * TILE;
        const onTop = m.surface === 'floor' && Math.floor(m.body.y / TILE) < CHIMNEY.ty && m.body.x >= center - 1;
        if (onTop) {
          this.elapsed = ACT2.endWalkMaxSec;
          this.spider.update(dt, emptyInput());
        } else this.spider.update(dt, { ...emptyInput(), move: { x: 1, y: 0 } });
        break;
      }
      case 'peek':
        this.spider.update(dt, emptyInput());
        this.spider.sprite.setAngle(Math.sin(p * Math.PI) * 25);
        break;
      case 'enter': {
        // Desce por trás da borda da chaminé, levantando fuligem.
        const top = CHIMNEY.ty * TILE;
        this.spider.sprite.setAngle(70 * p).setY(top - SPIDER.frameH / 2 + 2 + p * 22);
        if (Math.random() < 0.5) this.puffSoot(m.body.x + (Math.random() - 0.5) * 20, top);
        break;
      }
      case 'fade':
        if (this.mode === 'ending') this.spider.sprite.setVisible(false);
        break;
    }
  }

  private finishTimeline(): void {
    if (this.mode === 'intro') {
      // Passou o tempo sem grudar: coloca no braço do poste.
      this.skipIntro();
    } else if (this.mode === 'dying') {
      this.respawn();
    } else if (this.mode === 'ending') {
      this.endAct();
    }
  }

  // ---------- desenho ----------

  /** Luz num ponto (0..1 por canal): noite, as luminárias perto e o clarão do raio. */
  private lightAt(x: number, y: number): [number, number, number] {
    let f = 0;
    for (const l of this.art.lamps) {
      const dx = x - l.x;
      const dy = y - l.y;
      f = Math.max(f, coneFactor(dx, dy, LIGHT.lampRadius), Math.max(0, 1 - Math.hypot(dx, dy) / LIGHT.glowRadius) * LIGHT.glowStrength);
    }
    const flash = this.storm.flash * 0.6;
    return [0, 1, 2].map((k) => {
      const lit = NIGHT[k] * 1.25 * (1 + f * 1.7 * LAMP[k]);
      return lit + (1 - lit) * flash;
    }) as [number, number, number];
  }

  private lightTint(x: number, y: number): number {
    return toTint(this.lightAt(x, y));
  }

  private updateHorde(dt: number): void {
    const sound = this.sound_;
    const b = this.spider.motor.body;
    const view = this.cameras.main.worldView;
    // Quanto mais perto da rua, mais alto e mais claro o gemido.
    const near = Math.max(0.15, Math.min(1, 1 - (STREET_Y - b.y) / 420));
    sound.zombies.setDistance(1 - near, 0.4);
    for (const e of this.horde.update(dt)) {
      const z = e.type === 'groan' ? this.horde.zombies[e.index] : null;
      const x = z?.x ?? view.centerX;
      if (Math.abs(x - view.centerX) > view.width) continue;
      const pan = Math.max(-0.9, Math.min(0.9, (x - view.centerX) / (view.width / 2)));
      if (e.type === 'groan') sound.zombies.groan({ ...e, pan, volume: e.volume * near });
      else if (near > 0.5) sound.zombies.step(pan, e.volume * near);
    }
    const flash = this.storm.flash;
    this.horde.zombies.forEach((z, i) => {
      const sp = this.hordeSprites[i];
      const frame = zombieFrameName(z.look, walkFrame(z.phase, ZOMBIE_FRAMES));
      // Os pés ficam na calçada: o asfalto embaixo é o chão mais perto da câmera.
      const feet = z.row === 0 ? STREET_Y - 3 : STREET_Y;
      const base = z.row === 0 ? PAL.street.zombieLight[0] : PAL.street.zombieLight[2];
      const tint = mixColor(base, 0xffffff, flash * 0.7);
      sp.body.setPosition(Math.round(z.x), feet).setFrame(frame).setTint(tint);
      sp.eyes.setPosition(Math.round(z.x), feet).setFrame(frame).setTint(mixColor(PAL.street.eyeLight, 0xffffff, flash));
    });
  }

  private puffSoot(x: number, y: number): void {
    this.sootPuffs.push({ x, y, vy: -20 - Math.random() * 25, life: 0.8 });
  }

  private updateSoot(dt: number): void {
    const g = this.soot;
    g.clear();
    this.sootPuffs = this.sootPuffs.filter((s) => (s.life -= dt) > 0);
    for (const s of this.sootPuffs) {
      s.y += s.vy * dt;
      s.x += Math.sin(s.life * 9) * 6 * dt;
      g.fillStyle(PAL.act2.soot, Math.min(1, s.life * 1.4));
      g.fillRect(Math.round(s.x), Math.round(s.y), 2, 2);
    }
  }

  private updateReticle(input: SpiderInput): void {
    const m = this.spider.motor;
    const pi = this.playerInput;
    const hit = raycastWeb(this.grid, m.body, input.aim, WEB.range);
    let at = input.aim;
    if (pi.aimDevice === 'gamepad' && pi.padFrame) {
      const d = pi.padAimDir;
      at = hit ? hit.point : { x: m.body.x + d.x * GAMEPAD.reticleDistance, y: m.body.y + d.y * GAMEPAD.reticleDistance };
    }
    this.reticle.setPosition(Math.round(at.x), Math.round(at.y));
    this.reticle.setTint(hit ? 0xffffff : 0x777777).setAlpha(hit ? 1 : 0.7);
  }

  /** Faixas pretas de cinema (entram e saem deslizando). */
  private setBars(on: boolean, durationMs = 500): void {
    const h = on ? 22 : 0;
    const [top, bottom] = this.bars;
    this.tweens.add({ targets: top, height: h, duration: durationMs });
    this.tweens.add({ targets: bottom, y: VIEW.height - h, height: h, duration: durationMs });
    if (durationMs === 0) {
      top.setSize(VIEW.width, h);
      bottom.setPosition(0, VIEW.height - h).setSize(VIEW.width, h);
    }
  }

  private showChapter(): void {
    const el = this.chapter;
    if (!el) return;
    const act = el.querySelector('.chapter-act');
    const name = el.querySelector('.chapter-name');
    if (act) act.textContent = `ACT ${ACT.number}`;
    if (name) name.textContent = ACT.name;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }

  private showToast(text: string): void {
    const el = this.toast;
    if (!el) return;
    el.textContent = text;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }

  private drawDebug(): void {
    const m = this.spider.motor;
    const b = m.body;
    const g = this.debugGfx;
    g.clear();
    g.lineStyle(1, 0x00ff66, 1).strokeRect(b.x - b.half, b.y - b.half, b.half * 2, b.half * 2);
    for (const d of this.debris.items) g.lineStyle(1, 0xff3366, 1).strokeCircle(d.x, d.y, DEBRIS.radius);
    for (const w of this.wires) {
      const t = w.tip();
      g.lineStyle(1, 0xffcc00, 1).strokeCircle(t.x, t.y, WIRE.touchRadius);
    }
    this.hud.setDebug(
      [
        `surface: ${m.surface}`,
        `pos: ${b.x.toFixed(1)}, ${b.y.toFixed(1)}`,
        `tile: ${Math.floor(b.x / TILE)}, ${Math.floor(b.y / TILE)}`,
        `vel: ${b.vx.toFixed(0)}, ${b.vy.toFixed(0)}`,
        `wind: ${this.wind.phase} ${this.wind.dir > 0 ? '→' : '←'} ${this.wind.strength.toFixed(2)} (${this.wind.timeLeft.toFixed(1)}s)`,
        `checkpoint: ${this.checkpoint} (${CHECKPOINTS[this.checkpoint].name})`,
        `debris: ${this.debris.items.length}`,
      ].join('\n'),
    );
  }
}
