// Cutscene de abertura: texto na tela preta, a luz clareando a aranha desacordada no líquido mutante,
// ela acorda, desvira e sai pelo buraco de rato. Depois o jogo começa com ela saindo do buraco na sala.
// Assistida pelo SCENES (`replay`), no fim volta para o menu. Spec: docs/features/intro.md
import Phaser from 'phaser';
import { INTRO } from '../config';
import { STAGE } from '../art/introArt';
import { PAL } from '../art/palette';
import { TEX } from '../art/textures';
import { getSound } from '../audio/sound';
import { INTRO_PAGES } from '../level/story';
import { Timeline, textPageAt, textPageSec } from '../systems/cutscene';
import { pollPad } from './PlayerInput';
import { markSceneSeen } from './sceneStore';
import { fadeTo } from './Transitions';

interface Bit {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  /** Altura em que some (chão ou topo da bolha). */
  landY: number;
  drip: boolean;
}

const GRAVITY = 320;
/** Centro do sprite da aranha deitada de costas e em pé (os pés na última linha do quadro). */
const Y_BELLY_UP = STAGE.floorY - 5;
const Y_UPRIGHT = STAGE.floorY - 7;
const DRIP_STEPS = new Set(['reveal', 'sleep', 'twitch', 'flip', 'shake', 'look', 'holeLight', 'walk', 'enter']);

export class IntroScene extends Phaser.Scene {
  private tl!: Timeline;
  private elapsed = 0;
  private stepIndex = -1;
  private done = false;
  private spider!: Phaser.GameObjects.Sprite;
  private blob!: Phaser.GameObjects.Image;
  private glow!: Phaser.GameObjects.Image;
  private darkSpot!: Phaser.GameObjects.Image;
  private curtain!: Phaser.GameObjects.Rectangle;
  private bits: Bit[] = [];
  private dripLeft = 0;
  private flipped = false;
  /** Assistindo pelo SCENES: no fim (ou pulando) volta para o SCENES em vez de começar o jogo. */
  private replay = false;
  private readonly root = document.getElementById('intro');
  private readonly text = document.getElementById('intro-text');
  private readonly skipHint = document.getElementById('intro-skip');

  constructor() {
    super('intro');
  }

  create(data: { replay?: boolean } = {}): void {
    this.replay = !!data.replay;
    // Vista no jogo: libera no SCENES (mesmo se pular).
    if (!this.replay) markSceneSeen('act1-intro');
    this.elapsed = 0;
    this.stepIndex = -1;
    this.done = false;
    this.bits = [];
    this.flipped = false;
    this.dripLeft = 0.4;

    // A transição do ato deixou a tela preta; a cutscene também começa no preto.
    void fadeTo(0, 0);
    const cam = this.cameras.main;
    cam.setZoom(INTRO.zoom);
    cam.centerOn(STAGE.w / 2, STAGE.h / 2);
    cam.setBackgroundColor(0x000000);
    cam.setRoundPixels(true);

    const { spiderX, floorY } = STAGE;
    this.add.image(0, 0, TEX.introStage).setOrigin(0, 0);
    this.add.image(spiderX - 15, floorY - 2, TEX.gooPuddle).setOrigin(0, 0).setDepth(2);
    this.spider = this.add.sprite(spiderX, Y_BELLY_UP, TEX.spider, 'idle0').setDepth(3).setFlipY(true);
    this.blob = this.add.image(spiderX - 10, floorY - 10, TEX.gooBlob).setOrigin(0, 0).setDepth(4);
    // Escuridão: por baixo a versão com a luz do buraco; por cima, a que só tem a luz do cano.
    this.add.image(0, 0, TEX.introDarkHole).setOrigin(0, 0).setDepth(20);
    this.darkSpot = this.add.image(0, 0, TEX.introDark).setOrigin(0, 0).setDepth(21);
    // O líquido mutante brilha mesmo no escuro.
    this.glow = this.add.image(spiderX, floorY - 5, TEX.gooGlow).setDepth(22).setBlendMode(Phaser.BlendModes.ADD);
    this.curtain = this.add.rectangle(0, 0, STAGE.w, STAGE.h, 0x000000).setOrigin(0, 0).setDepth(30);

    const sound = getSound();
    this.spider.on(Phaser.Animations.Events.ANIMATION_UPDATE, (_a: unknown, f: Phaser.Animations.AnimationFrame) => {
      if (f.textureFrame === 'walk0' || f.textureFrame === 'walk2') sound.footsteps.step(false);
    });

    const walkSec = (STAGE.holeX - 8 - spiderX) / INTRO.walkSpeed;
    this.tl = new Timeline([
      ...INTRO_PAGES.map((p, i) => ({ name: `text${i}`, sec: textPageSec(p, INTRO) })),
      { name: 'reveal', sec: INTRO.revealSec },
      { name: 'sleep', sec: INTRO.sleepSec },
      { name: 'twitch', sec: INTRO.twitchSec },
      { name: 'flip', sec: INTRO.flipSec },
      { name: 'shake', sec: INTRO.shakeSec },
      { name: 'look', sec: INTRO.lookSec },
      { name: 'holeLight', sec: INTRO.holeLightSec },
      { name: 'walk', sec: walkSec },
      { name: 'enter', sec: INTRO.enterSec },
      { name: 'outro', sec: INTRO.outroSec },
    ]);

    this.root?.classList.remove('hidden');
    this.skipHint?.classList.add('hidden');
    this.time.delayedCall(1200, () => this.skipHint?.classList.remove('hidden'));
    for (const key of ['keydown-ESC', 'keydown-ENTER', 'keydown-SPACE']) this.input.keyboard?.on(key, () => this.skip());
    this.events.once('shutdown', () => {
      this.root?.classList.add('hidden');
      if (this.text) this.text.textContent = '';
    });
  }

  update(time: number, deltaMs: number): void {
    if (this.done) return;
    const dt = Math.min(deltaMs / 1000, 1 / 30);
    const pad = pollPad();
    if (pad && (pad.confirmPressed || pad.pausePressed)) {
      this.skip();
      return;
    }

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
    this.runStep(at.name, at.local, at.progress, time);
    this.updateBits(dt, DRIP_STEPS.has(at.name));
  }

  // ---------- etapas ----------

  private enterStep(name: string): void {
    const sound = getSound();
    // Um trovão distante enquanto o texto conta a história.
    if (name === 'text1') sound.storm.thunder({ strength: 0.35, close: false, seed: 77 });
    if (name === 'reveal' && this.text) this.text.textContent = '';
    if (name === 'flip') {
      this.tweens.add({ targets: this.blob, alpha: 0, duration: 250 });
      this.burst(10);
      sound.sfx.splat();
    }
    if (name === 'shake') {
      // Deitada de costas (flipY) + giro de 180° = de pé olhando para o outro lado.
      this.flipped = true;
      this.spider.setAngle(0).setFlipY(false).setFlipX(true).setY(Y_UPRIGHT);
      this.spider.setFrame('idle0');
      this.burst(6);
    }
    if (name === 'walk') this.spider.setFlipX(false).play('spider-walk');
    if (name === 'outro') this.cameras.main.fadeOut(INTRO.outroSec * 1000, 0, 0, 0);
  }

  private runStep(name: string, local: number, p: number, time: number): void {
    const s = this.spider;
    if (name.startsWith('text')) {
      const page = INTRO_PAGES[Number(name.slice(4))];
      const { shown, opacity } = textPageAt(page, local, INTRO);
      if (this.text) {
        this.text.textContent = shown;
        this.text.style.opacity = opacity.toFixed(2);
      }
      return;
    }
    if (this.text) this.text.style.opacity = '0';
    this.glow.setAlpha(0.45 + Math.sin(time / 400) * 0.15);
    this.curtain.setAlpha(name === 'reveal' ? 1 - p : 0);

    switch (name) {
      case 'twitch': {
        // Pernas mexendo para cima, em dois espasmos.
        const moving = p < 0.4 || p > 0.65;
        s.setFrame(moving ? (Math.floor(local / 0.08) % 2 ? 'walk0' : 'walk2') : 'idle0');
        break;
      }
      case 'flip':
        s.setAngle(p * 180);
        s.setY(Phaser.Math.Linear(Y_BELLY_UP, Y_UPRIGHT, p) - Math.sin(p * Math.PI) * 9);
        break;
      case 'shake':
        // Sacode o líquido do corpo.
        s.setX(STAGE.spiderX + (local < 0.4 ? (Math.floor(local / 0.05) % 2 ? 1 : -1) : 0));
        break;
      case 'look':
        // Olha para a escuridão de onde veio e depois vira para o buraco.
        s.setFlipX(p < 0.45);
        break;
      case 'holeLight':
        s.setFlipX(false);
        this.darkSpot.setAlpha(1 - p);
        break;
      case 'walk':
        this.darkSpot.setAlpha(0);
        s.setX(Phaser.Math.Linear(STAGE.spiderX, STAGE.holeX - 8, p));
        break;
      case 'enter':
        // Entra no buraco: vai para o fundo (fica menor) e some na luz.
        s.setX(Phaser.Math.Linear(STAGE.holeX - 8, STAGE.holeX, p));
        s.setY(Y_UPRIGHT - p * 3);
        s.setScale(1 - p * 0.5).setAlpha(1 - p);
        break;
    }
  }

  // ---------- gotas e respingos do líquido verde ----------

  private updateBits(dt: number, dripping: boolean): void {
    if (dripping) {
      this.dripLeft -= dt;
      if (this.dripLeft <= 0) {
        this.dripLeft = INTRO.dripEverySec;
        const landY = this.flipped ? STAGE.floorY - 1 : STAGE.floorY - 9;
        this.addBit(STAGE.drip.x, STAGE.drip.y + 1, 0, 0, landY, true);
      }
    }
    this.bits = this.bits.filter((b) => {
      b.vy += GRAVITY * dt;
      b.img.x += b.vx * dt;
      b.img.y += b.vy * dt;
      if (b.img.y < b.landY) return true;
      if (b.drip) getSound().sfx.drip();
      b.img.destroy();
      return false;
    });
  }

  private burst(n: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.PI + (i / (n - 1)) * Math.PI;
      const speed = 40 + (i % 3) * 18;
      this.addBit(this.spider.x, this.spider.y - 2, Math.cos(a) * speed, Math.sin(a) * speed, STAGE.floorY - 1, false);
    }
  }

  private addBit(x: number, y: number, vx: number, vy: number, landY: number, drip: boolean): void {
    const img = this.add.image(x, y, TEX.mote).setTint(PAL.intro.goo).setDepth(5);
    this.bits.push({ img, vx, vy, landY, drip });
  }

  // ---------- fim ----------

  /** Pula a cutscene (Enter/Esc/Espaço ou A/Start): escurece rápido e começa o jogo. */
  private skip(): void {
    if (this.done) return;
    this.done = true;
    const cam = this.cameras.main;
    if (this.text) this.text.textContent = '';
    cam.fadeOut(350, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.startGame());
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;
    this.startGame();
  }

  private startGame(): void {
    if (this.replay) {
      // A câmera já escureceu: o preto do HTML segura a tela enquanto o menu volta.
      void fadeTo(1, 0);
      this.scene.start('game', { openScenes: 'act1-intro' });
      return;
    }
    this.scene.start('game', { skipTitle: true, emerge: true });
  }
}
