// Cutscene da chegada do ato 3 (MARY): a queda dentro da chaminé, a explosão de fuligem no sótão, a Mary
// acordando, o que ela vê na casa sem energia e a primeira fala, com atuação em cada linha. No fim começa o
// jogo com ela no mesmo lugar. Assistida pelo SCENES (`replay`), volta para o menu.
// Spec: docs/features/act3-cutscenes.md
import Phaser from 'phaser';
import { CHIMNEY_CUT as C, LIGHT, SPIDER, TILE, VIEW } from '../config';
import { BEAM, MARK, SHAFT } from '../art/act3CutArt';
import type { LevelArt } from '../art/levelArt';
import { PAL } from '../art/palette';
import { T3, TEX, ensureAct3CutTextures, ensureAct3Textures } from '../art/textures';
import { mixColor, shadeColor } from '../art/tilePainters';
import { getSound } from '../audio/sound';
import { Atmosphere } from '../entities/Atmosphere';
import { GooView } from '../entities/GooView';
import { LetterSprites } from '../entities/LetterSprites';
import { ACTS } from '../level/acts';
import { ARRIVAL_ACTING, type Acting, DIALOGUES } from '../level/dialogues';
import { ACT3_LETTERS } from '../level/letters';
import { ACT3_CHECKPOINTS, CHIMNEY_BREACH, WATER_DRIPS } from '../level/neighborHouse';
import { CHIMNEY_STEPS, CHIMNEY_STEP_SHOT, type ChimneyShot, burstPose, ease, hitsBetween, shaftScroll, shaftSide } from '../systems/act3Cuts';
import { spawnPoint } from '../systems/checkpoints';
import { Timeline } from '../systems/cutscene';
import { GooField } from '../systems/goo';
import { LetterLog } from '../systems/letters';
import { makeRng } from '../systems/storm';
import { DialogueBox } from './DialogueBox';
import { pollPad } from './PlayerInput';
import { fadeTo, hideChapter, showChapter } from './Transitions';
import { placeBars } from './cinema';
import { markSceneSeen } from './sceneStore';

/** O palco da chaminé fica longe do mapa: a câmera mostra um plano por vez. */
const SHAFT_AT = { x: 3000, y: 0 };
/** Ordem de desenho: a Atmosphere vai até 6, a gosma até 6,8. */
const DEPTH = { beam: 6.9, chunk: 7.1, mary: 7.2, soot: 7.3, mark: 7.4, shade: 8, bars: 20 } as const;

/** A Mary de pé e de barriga para cima (centro do sprite, acima do chão). */
const UPRIGHT = SPIDER.frameH / 2;
const BELLY_UP = 5;
/** Onde o jogo começa: a cutscene deixa a Mary aqui. */
const REST = spawnPoint(ACT3_CHECKPOINTS[0], TILE, SPIDER.half);
const FLOOR = REST.y + SPIDER.half;

/** Fuligem: pontinhos que voam, caem devagar e somem. */
interface Soot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
}

/** Pedaço de tijolo: voa, bate no chão e fica. */
interface Chunk {
  img: Phaser.GameObjects.Rectangle;
  vx: number;
  vy: number;
  resting: boolean;
}

export class ChimneyScene extends Phaser.Scene {
  private tl!: Timeline;
  private elapsed = 0;
  private stepIndex = -1;
  /** Acabou (ou está saindo): o roteiro para. */
  private done = false;
  /** Pulando: a tela está escurecendo para a fala. */
  private skipping = false;
  /** Na fala: o tempo da cutscene para até ela acabar. */
  private talking = false;
  private replay = false;
  private shot: ChimneyShot = 'black';
  private atmosphere!: Atmosphere;
  private water!: GooField;
  private gooView!: GooView;
  private letters!: LetterSprites;
  private readonly noLetters = new LetterLog();
  private art!: LevelArt;
  private mary!: Phaser.GameObjects.Sprite;
  private mark!: Phaser.GameObjects.Image;
  private markLeft = 0;
  private beam!: Phaser.GameObjects.Image;
  private shaftWalls!: Phaser.GameObjects.TileSprite;
  private shaftBack!: Phaser.GameObjects.TileSprite;
  private shaftMouth!: Phaser.GameObjects.Image;
  private shaftShade!: Phaser.GameObjects.Image;
  private sootGfx!: Phaser.GameObjects.Graphics;
  private soot: Soot[] = [];
  private chunks: Chunk[] = [];
  private bars: Phaser.GameObjects.Rectangle[] = [];
  private dialogue!: DialogueBox;
  /** Quanta fuligem ainda está nela (1 = preta, 0 = limpa). */
  private dirt = 1;
  private lastFallT = 0;
  private struck = false;
  private lateBrick = false;
  private rng: () => number = Math.random;
  /** Atuação da fala: a linha atual, há quanto tempo e para onde ela anda. */
  private actingLine = -1;
  private acting: Acting = 'tired';
  private actingT = 0;
  private maryX = REST.x;
  private zoomTarget = C.closeZoom as number;
  private readonly skipHint = document.getElementById('skip-hint');

  constructor() {
    super('chimney');
  }

  create(data: { replay?: boolean } = {}): void {
    // O Phaser reaproveita a instância da cena: todo estado volta ao início aqui.
    this.replay = !!data.replay;
    // Vista no jogo: libera no SCENES (mesmo se pular).
    if (!this.replay) markSceneSeen('act3-intro');
    this.elapsed = 0;
    this.stepIndex = -1;
    this.done = false;
    this.skipping = false;
    this.talking = false;
    this.shot = 'black';
    this.soot = [];
    this.chunks = [];
    this.dirt = 1;
    this.lastFallT = 0;
    this.struck = false;
    this.lateBrick = false;
    this.markLeft = 0;
    this.actingLine = -1;
    this.acting = 'tired';
    this.actingT = 0;
    this.maryX = REST.x;
    this.zoomTarget = C.closeZoom;
    const seed = (Date.now() & 0x7fffffff) || 1;
    this.rng = makeRng(seed);

    this.art = ensureAct3Textures(this);
    ensureAct3CutTextures(this);
    // A transição do ato deixou a tela preta: a cutscene também começa no preto.
    void fadeTo(0, 0);

    // O sótão é o do jogo: o cenário, a luz, os relâmpagos, as goteiras e a carta.
    this.add.image(0, 0, T3.level).setOrigin(0, 0);
    this.atmosphere = new Atmosphere(this, this.art, seed, { light: T3.light, flash: T3.flash, beam: TEX.beam });
    this.atmosphere.leaking = false;
    this.letters = new LetterSprites(this, ACT3_LETTERS);
    this.water = new GooField(WATER_DRIPS, []);
    this.gooView = new GooView(this, new GooField([], []), this.water);
    this.beam = this.add
      .image(REST.x - BEAM.footX, FLOOR - BEAM.h, T3.moonBeam)
      .setOrigin(0, 0)
      .setDepth(DEPTH.beam)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.7);

    this.buildShaft();

    this.mary = this.add.sprite(REST.x, FLOOR - UPRIGHT, TEX.spider, 'idle0').setDepth(DEPTH.mary).setFlipX(true).setVisible(false);
    this.mark = this.add.image(0, 0, T3.markBang).setDepth(DEPTH.mark).setVisible(false);
    this.sootGfx = this.add.graphics().setDepth(DEPTH.soot);
    const bar = () => this.add.rectangle(0, 0, VIEW.width, 0, 0x000000).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.bars);
    this.bars = [bar(), bar()];

    this.dialogue = new DialogueBox(() => this.advanceDialogue());

    const cam = this.cameras.main;
    cam.setBackgroundColor(0x000000).setRoundPixels(true).setZoom(C.closeZoom);
    this.tl = new Timeline(CHIMNEY_STEPS);

    const sound = getSound();
    sound.storm.setOutside(false);
    sound.zombies.setDistance(1, 0.5);
    this.mary.on(Phaser.Animations.Events.ANIMATION_UPDATE, (_a: unknown, f: Phaser.Animations.AnimationFrame) => {
      if (f.textureFrame === 'walk0' || f.textureFrame === 'walk2') sound.footsteps.step(false);
    });

    this.showSkipHint(false);
    this.time.delayedCall(C.skipHintAfterSec * 1000, () => {
      if (!this.talking && !this.done) this.showSkipHint(true);
    });
    const kb = this.input.keyboard;
    for (const key of ['keydown-ENTER', 'keydown-SPACE']) kb?.on(key, () => (this.talking ? this.advanceDialogue() : this.skip()));
    kb?.on('keydown-ESC', () => (this.talking ? this.replay && this.leave() : this.skip()));
    kb?.on('keydown-F', () => {
      if (this.talking) this.advanceDialogue();
    });
    kb?.on('keydown-M', () => sound.hub.toggleMute());
    this.events.once('shutdown', () => {
      this.dialogue.destroy();
      hideChapter();
      this.showSkipHint(false);
    });
    if (import.meta.env.DEV) Object.assign(window, { __cut: this });
  }

  // ---------- montagem ----------

  private buildShaft(): void {
    const { x, y } = SHAFT_AT;
    this.add.rectangle(x, y, SHAFT.w, SHAFT.h, 0x000000).setOrigin(0, 0).setDepth(0.1);
    this.shaftBack = this.add.tileSprite(x, y, SHAFT.w, SHAFT.h, T3.shaftBack).setOrigin(0, 0).setDepth(0.2);
    this.shaftWalls = this.add.tileSprite(x, y, SHAFT.w, SHAFT.h, T3.shaftWalls).setOrigin(0, 0).setDepth(0.3);
    this.shaftMouth = this.add.image(x, y, T3.shaftMouth).setOrigin(0, 0).setDepth(0.4);
    this.shaftShade = this.add.image(x, y, T3.shaftShade).setOrigin(0, 0).setDepth(DEPTH.shade).setAlpha(0);
  }

  private setShot(name: ChimneyShot): void {
    const cam = this.cameras.main;
    // Saindo do preto do começo (ou pulando para outra etapa pelo console).
    if (this.shot === 'black' && name !== 'black') cam.fadeIn(C.firstFadeInSec * 1000, 0, 0, 0);
    this.shot = name;
    this.mary.setVisible(name === 'shaft' || name === 'breach');
    this.beam.setVisible(name === 'breach');
    this.soot = [];
    if (name === 'shaft') {
      cam.setZoom(C.closeZoom);
      cam.centerOn(SHAFT_AT.x + SHAFT.w / 2, SHAFT_AT.y + SHAFT.h / 2);
    } else if (name === 'breach') {
      cam.setZoom(C.closeZoom);
      cam.centerOn(C.breachCamX, this.floorFramedY(C.closeZoom));
    } else if (name === 'attic') {
      cam.setZoom(C.panZoom);
      cam.centerOn(C.panFromX, C.panY);
    }
  }

  /** Centro da câmera que deixa o chão do sótão a 2/3 da tela (acima da caixa de diálogo), em qualquer zoom. */
  private floorFramedY(zoom: number): number {
    return FLOOR - (VIEW.height * 0.18) / zoom;
  }

  // ---------- quadro a quadro ----------

  update(time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 1 / 30);
    const pad = pollPad();
    const sfx = getSound().sfx;
    if (pad?.musicPressed) getSound().hub.toggleMute();

    if (this.talking) {
      for (let i = this.dialogue.update(dt); i > 0; i--) sfx.voice(this.dialogue.sad);
      if (this.replay && (pad?.trapPressed || pad?.pausePressed)) this.leave();
      else if (pad?.confirmPressed || pad?.readPressed) this.advanceDialogue();
      this.runActing(dt);
    } else if (!this.skipping && !this.done) {
      if (pad?.confirmPressed || pad?.pausePressed || (this.replay && pad?.trapPressed)) this.skip();
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
    const cam = this.cameras.main;
    const { sfx } = getSound();
    const shot = CHIMNEY_STEP_SHOT[name];
    if (shot !== this.shot) this.setShot(shot);
    switch (name) {
      case 'dark':
        cam.fadeOut(1, 0, 0, 0);
        sfx.chimneyFall();
        break;
      case 'fall':
        this.lastFallT = 0;
        this.mary.setFlipX(false).setFlipY(false).play('spider-air');
        break;
      case 'burst':
        cam.shake(320, 0.014);
        this.mary.setFlipX(true).play('spider-air');
        sfx.sootBurst();
        this.burstSoot();
        this.burstChunks();
        break;
      case 'settle':
        this.mary.stop().setFrame('idle0');
        sfx.thud(0.7);
        break;
      case 'flip':
        this.mary.stop().setFrame('air');
        break;
      case 'shake':
        this.mary.setAngle(0).setFrame('idle0');
        sfx.thud(0.3);
        this.shakeSoot(16);
        break;
      case 'look':
        this.struck = false;
        break;
      case 'back':
        // Pulando as etapas de antes, ela chega aqui já limpa e de pé.
        this.dirt = 0;
        this.mary.setAngle(0).setFlipY(false).setFlipX(true).setPosition(REST.x, FLOOR - UPRIGHT).play('spider-idle');
        hideChapter();
        break;
      case 'talk':
        this.startTalk();
        break;
      case 'outro':
        this.showSkipHint(false);
        cam.fadeOut(C.outroSec * 1000, 0, 0, 0);
        break;
    }
  }

  private runStep(name: string, local: number, p: number): void {
    const m = this.mary;
    const cam = this.cameras.main;
    switch (name) {
      case 'fall':
        this.runFall(local);
        break;
      case 'burst': {
        const pose = burstPose(p, CHIMNEY_BREACH.x + 10, C.burstFromHeight, REST.x, C.burstArcs);
        m.setPosition(pose.x, FLOOR - pose.height - UPRIGHT).setAngle(pose.angle);
        break;
      }
      case 'settle':
        m.setPosition(REST.x, FLOOR - BELLY_UP).setAngle(180);
        // O último tijolo, atrasado.
        if (p > 0.55 && !this.lateBrick) {
          this.lateBrick = true;
          this.addChunk(CHIMNEY_BREACH.x + 6, CHIMNEY_BREACH.y - 8, -14, 10);
        }
        break;
      case 'twitch': {
        // Pernas mexendo para cima, em dois espasmos.
        const moving = p < 0.4 || p > 0.65;
        m.setPosition(REST.x, FLOOR - BELLY_UP).setAngle(180);
        m.setFrame(moving ? (Math.floor(local / 0.08) % 2 ? 'walk0' : 'walk2') : 'idle0');
        break;
      }
      case 'flip':
        m.setAngle(180 + p * 180);
        m.setPosition(REST.x, FLOOR - (BELLY_UP + (UPRIGHT - BELLY_UP) * p) - Math.sin(p * Math.PI) * 9);
        break;
      case 'shake':
        // Sacode a fuligem do corpo: ela vai limpando.
        m.setX(REST.x + (p < 0.75 ? (Math.floor(local / 0.05) % 2 ? 1 : -1) : 0));
        m.setY(FLOOR - UPRIGHT);
        this.dirt = Math.max(0, 1 - p * 1.15);
        if (p < 0.75 && this.rng() < 0.5) this.shakeSoot(1);
        break;
      case 'look': {
        cam.centerOn(C.panFromX + (C.panToX - C.panFromX) * ease(p), C.panY);
        if (p >= C.panStrikeAt && !this.struck) {
          this.struck = true;
          this.atmosphere.storm.strike(true);
          const act = ACTS[2];
          showChapter(`ACT ${act.number}`, act.name);
        }
        break;
      }
      case 'back':
        // Olhando para cima.
        m.setAngle(p < 0.3 ? 0 : 10);
        break;
    }
  }

  /** A queda: os tijolos passam cada vez mais rápido e ela bate de parede em parede, girando. */
  private runFall(t: number): void {
    const { wallHits: hits, scrollSpeed: v, scrollAccel: a } = C;
    const scroll = shaftScroll(t, v, a);
    this.shaftWalls.tilePositionY = scroll;
    this.shaftBack.tilePositionY = scroll * C.backParallax;
    this.shaftMouth.y = SHAFT_AT.y - scroll * 1.1;
    this.shaftShade.setAlpha(Math.min(1, 0.15 + t / C.fallSec));
    const half = (SHAFT.wallR - SHAFT.wallL) / 2 - SPIDER.frameW / 2 + 2;
    const cx = SHAFT_AT.x + SHAFT.w / 2;
    const side = shaftSide(t, hits);
    // Entra por cima do quadro nos primeiros instantes e fica no meio dele.
    const y = SHAFT_AT.y + Math.min(SHAFT.h * 0.46, -12 + t * 110);
    this.mary.setPosition(cx + side * half, y).setAngle(t * C.spinDegSec);
    // Quando bate na parede: fuligem saindo dali e o "tum".
    const n = hitsBetween(this.lastFallT, t, hits);
    this.lastFallT = t;
    if (n > 0) {
      getSound().sfx.thud(0.55 + (t / C.fallSec) * 0.45);
      this.cameras.main.shake(70, 0.006);
      const wallX = cx + Math.sign(side) * (half + 8);
      for (let i = 0; i < 12; i++) this.addSoot(wallX, y + (this.rng() - 0.5) * 8, -Math.sign(side) * (10 + this.rng() * 40), (this.rng() - 0.7) * 50, 0.5, 1);
    }
    // A fuligem que ela vai deixando para trás sobe no quadro.
    if (this.rng() < 0.7) this.addSoot(this.mary.x + (this.rng() - 0.5) * 14, this.mary.y, (this.rng() - 0.5) * 8, -30 - v - a * t, 0.5, 1);
  }

  // ---------- a fala ----------

  private startTalk(): void {
    this.talking = true;
    this.showSkipHint(false);
    this.dialogue.open(DIALOGUES.arrival);
    this.mary.play('spider-idle');
    this.setActing(0);
  }

  private advanceDialogue(): void {
    if (!this.talking) return;
    if (!this.dialogue.advance()) return;
    // A fala acabou: o tempo da cutscene volta a andar (o `outro`).
    this.talking = false;
    this.mark.setVisible(false);
  }

  private setActing(line: number): void {
    this.actingLine = line;
    this.acting = ARRIVAL_ACTING[line] ?? 'tired';
    this.actingT = 0;
    this.mary.setAngle(0);
    const cam = this.cameras.main;
    switch (this.acting) {
      case 'startled':
        this.showMark(T3.markBang);
        this.zoomTarget = C.startleZoom;
        cam.setZoom(C.startleZoom);
        cam.shake(120, 0.006);
        break;
      case 'puzzled':
        this.showMark(T3.markAsk);
        break;
      case 'named':
        this.zoomTarget = C.namedZoom;
        break;
    }
  }

  private showMark(key: string): void {
    this.mark.setTexture(key).setVisible(true);
    this.markLeft = C.markSec;
  }

  /** Um quadro de atuação: a linha nova muda o que ela faz; a posição anda sempre até `maryX`. */
  private runActing(dt: number): void {
    const line = this.dialogue.lineIndex;
    if (line !== this.actingLine) this.setActing(line);
    this.actingT += dt;
    const t = this.actingT;
    const m = this.mary;
    let yOff = 0;
    this.maryX = REST.x;
    switch (this.acting) {
      case 'tired':
        // Respirando devagar, baixinha.
        yOff = Math.round((Math.sin(t * 2.4) + 1) / 2);
        break;
      case 'startled':
        // O pulo, e depois olha rápido para os dois lados.
        if (t < 0.45) yOff = -Math.sin((t / 0.45) * Math.PI) * 16;
        else m.setFlipX(t < 1.5 ? Math.floor((t - 0.45) / 0.26) % 2 === 0 : true);
        break;
      case 'puzzled':
        m.setAngle(Math.sin(t * 1.7) * 13);
        break;
      case 'pacing': {
        // Anda um pouco para a esquerda e volta.
        const trip = C.paceDist / C.paceSpeed;
        if (t < trip) this.maryX = REST.x - C.paceSpeed * t;
        else if (t < trip + 0.5) this.maryX = REST.x - C.paceDist;
        else this.maryX = Math.min(REST.x, REST.x - C.paceDist + C.paceSpeed * (t - trip - 0.5));
        break;
      }
      case 'named':
        break;
    }
    // Volta ao lugar na velocidade de andar (se passou a linha com ela longe).
    const dx = this.maryX - m.x;
    const step = Math.sign(dx) * Math.min(Math.abs(dx), C.paceSpeed * 1.2 * dt);
    const walking = Math.abs(dx) > 0.5;
    if (walking) {
      m.x += step;
      m.setFlipX(dx < 0);
    }
    const anim = yOff < -2 ? 'spider-air' : walking ? 'spider-walk' : 'spider-idle';
    if (m.anims.currentAnim?.key !== anim) m.play(anim);
    m.setY(FLOOR - UPRIGHT + yOff);

    // A câmera: no último tranco ela aproxima devagar, sempre com o chão acima da caixa de diálogo.
    const cam = this.cameras.main;
    const z = cam.zoom + (this.zoomTarget - cam.zoom) * Math.min(1, dt * 0.7);
    cam.setZoom(z);
    cam.centerOn(C.breachCamX + (m.x - C.breachCamX) * Math.min(1, (z - C.closeZoom) * 1.5), this.floorFramedY(z));
    this.beam.setAlpha(this.acting === 'named' ? Math.min(1, 0.7 + t * 0.15) : 0.7);
  }

  // ---------- o mundo ----------

  private updateWorld(dt: number, time: number): void {
    const cam = this.cameras.main;
    const sound = getSound();
    for (const thunder of this.atmosphere.update(dt, cam.worldView)) sound.storm.thunder(thunder);
    for (const e of this.water.update(dt, this.art.grid)) {
      if (e.type !== 'splash') continue;
      this.gooView.splash(e.x, e.y, true);
      if (this.shot !== 'shaft' && this.shot !== 'black') {
        const v = cam.worldView;
        if (e.x > v.x && e.x < v.right) sound.sfx.drip();
      }
    }
    const light = (x: number, y: number) => this.atmosphere.lightAt(x, y);
    this.gooView.update(dt, time, cam.worldView, this.atmosphere.storm.flash);
    this.letters.update(time, this.noLetters, light);
    placeBars(cam, this.bars, this.shot === 'black' ? 0 : C.letterboxPx);
    this.updateMaryLook();
    this.updateChunks(dt);
    this.updateSoot(dt);
    // A marca em cima dela.
    if (this.markLeft > 0) {
      this.markLeft -= dt;
      this.mark.setPosition(this.mary.x, this.mary.y - SPIDER.frameH / 2 - MARK.h / 2 - 1).setVisible(this.markLeft > 0);
    }
  }

  /** A cor dela: a luz do lugar (com o feixe de lua), o relâmpago e a fuligem que ainda tem. */
  private updateMaryLook(): void {
    if (this.shot === 'shaft') {
      // Cai limpa, com a luz do céu, e vai ficando preta de fuligem.
      this.mary.setTint(mixColor(PAL.act3.moon, PAL.act3Cut.maryDirty, Math.min(1, this.lastFallT / 1.2)));
      return;
    }
    const min = Math.max(LIGHT.spiderMinLight, 0.72);
    const [r, g, b] = this.atmosphere.lightAt(this.mary.x, this.mary.y);
    const ch = (v: number) => Math.round(Math.max(min, Math.min(1, v)) * 255);
    this.mary.setTint(mixColor((ch(r) << 16) | (ch(g) << 8) | ch(b), PAL.act3Cut.maryDirty, this.dirt * 0.85));
  }

  private burstSoot(): void {
    const x = CHIMNEY_BREACH.x + 4;
    const y = FLOOR - 14;
    for (let i = 0; i < 70; i++) {
      const a = Math.PI * (0.7 + this.rng() * 0.6);
      const speed = 20 + this.rng() * 150;
      this.addSoot(x, y + (this.rng() - 0.5) * 16, Math.cos(a) * speed, Math.sin(a) * speed * 0.7, 0.9 + this.rng() * 1.6, this.rng() < 0.3 ? 3 : 2);
    }
  }

  private shakeSoot(n: number): void {
    for (let i = 0; i < n; i++) {
      const a = this.rng() * Math.PI * 2;
      const speed = 15 + this.rng() * 40;
      this.addSoot(this.mary.x + Math.cos(a) * 5, this.mary.y + Math.sin(a) * 3, Math.cos(a) * speed, Math.sin(a) * speed - 10, 0.5 + this.rng() * 0.4, 1);
    }
  }

  private addSoot(x: number, y: number, vx: number, vy: number, life: number, size: number): void {
    this.soot.push({ x, y, vx, vy, life, size });
  }

  private updateSoot(dt: number): void {
    const g = this.sootGfx;
    g.clear();
    const inShaft = this.shot === 'shaft';
    this.soot = this.soot.filter((s) => (s.life -= dt) > 0);
    for (const s of this.soot) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= 1 - Math.min(1, dt * 3.2);
      // Na chaminé a fuligem só sobe; no sótão ela freia e cai devagar.
      if (!inShaft) s.vy += (22 - s.vy) * Math.min(1, dt * 3.2);
      if (!inShaft && s.y > FLOOR - 1) {
        s.y = FLOOR - 1;
        s.vy = 0;
      }
      g.fillStyle(s.size > 1 ? PAL.act3.soot : PAL.act3.sootLight, Math.min(1, s.life * 1.4));
      g.fillRect(Math.round(s.x), Math.round(s.y), s.size, s.size);
    }
  }

  private burstChunks(): void {
    for (let i = 0; i < 6; i++) {
      this.addChunk(CHIMNEY_BREACH.x + 4, FLOOR - 10 - this.rng() * 12, -(30 + this.rng() * 90), -(20 + this.rng() * 70));
    }
  }

  private addChunk(x: number, y: number, vx: number, vy: number): void {
    const w = 2 + Math.floor(this.rng() * 3);
    const img = this.add.rectangle(x, y, w, 2, shadeColor(PAL.brick.dark, 0.5)).setOrigin(0.5, 1).setDepth(DEPTH.chunk);
    this.chunks.push({ img, vx, vy, resting: false });
  }

  private updateChunks(dt: number): void {
    const visible = this.shot === 'breach';
    for (const c of this.chunks) {
      c.img.setVisible(visible);
      if (c.resting) continue;
      c.vy += 620 * dt;
      c.img.x += c.vx * dt;
      c.img.y += c.vy * dt;
      if (c.img.y >= FLOOR) {
        c.img.y = FLOOR;
        if (c.vy > 90) {
          // Quica uma vez, e o "toc".
          getSound().sfx.brickClack(0.55);
          c.vy *= -0.35;
          c.vx *= 0.5;
        } else {
          c.resting = true;
        }
      }
    }
  }

  // ---------- fim ----------

  /** Pular: pelo SCENES volta ao menu; no jogo, vai para a fala (ela não é pulada). */
  private skip(): void {
    if (this.done || this.skipping || this.talking) return;
    if (this.replay) {
      this.leave();
      return;
    }
    if (this.tl.at(this.elapsed)?.name === 'outro') return;
    if (this.elapsed < 0.2) return;
    this.skipping = true;
    this.showSkipHint(false);
    hideChapter();
    const cam = this.cameras.main;
    cam.fadeOut(C.skipFadeSec * 1000, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.skipping = false;
      this.elapsed = this.tl.startOf('back');
      this.stepIndex = -1;
      cam.fadeIn(C.skipFadeSec * 1000, 0, 0, 0);
    });
  }

  /** Pelo SCENES: escurece e volta para o menu. */
  private leave(): void {
    if (this.done) return;
    this.done = true;
    this.talking = false;
    this.dialogue.hide();
    this.showSkipHint(false);
    hideChapter();
    const cam = this.cameras.main;
    cam.fadeOut(C.skipFadeSec * 1000, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.finish());
  }

  private finish(): void {
    this.done = true;
    if (this.replay) {
      void fadeTo(1, 0);
      this.scene.start('game', { openScenes: 'act3-intro' });
      return;
    }
    this.scene.start('act3');
  }

  private showSkipHint(on: boolean): void {
    this.skipHint?.classList.toggle('hidden', !on);
  }
}
