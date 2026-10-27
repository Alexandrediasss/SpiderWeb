// Cena principal: tela inicial, cenário, atmosfera (noite chuvosa), aranha, câmera, mira, som e debug.
import Phaser from 'phaser';
import { GAMEPAD, LIGHT, TILE, TITLE, VIEW, WEB } from '../config';
import { getLevelArt } from '../art/levelArt';
import { TEX } from '../art/textures';
import { AudioHub } from '../audio/AudioHub';
import { Footsteps } from '../audio/Footsteps';
import { MusicPlayer } from '../audio/MusicPlayer';
import { StormSounds } from '../audio/StormSounds';
import { Atmosphere } from '../entities/Atmosphere';
import { Spider } from '../entities/Spider';
import { SPAWN } from '../level/houseMap';
import type { LevelGrid } from '../physics/LevelGrid';
import { emptyInput } from '../systems/input';
import { raycastWeb } from '../systems/webRope';
import { Hud } from './Hud';
import { PlayerInput } from './PlayerInput';
import { TitleScreen } from './TitleScreen';

type Mode = 'title' | 'play';

export class GameScene extends Phaser.Scene {
  private grid!: LevelGrid;
  private spider!: Spider;
  private atmosphere!: Atmosphere;
  private playerInput!: PlayerInput;
  private reticle!: Phaser.GameObjects.Image;
  private debugGfx!: Phaser.GameObjects.Graphics;
  private hud!: Hud;
  private title!: TitleScreen;
  private audio!: AudioHub;
  private music!: MusicPlayer;
  private stormSounds!: StormSounds;
  private mode: Mode = 'title';
  /** Depois do Play, ignora pulo/teia por um instante (a tecla do Play não vira pulo). */
  private graceLeft = 0;
  private debug = false;

  constructor() {
    super('game');
  }

  create(): void {
    const art = getLevelArt();
    this.grid = art.grid;
    this.add.image(0, 0, TEX.level).setOrigin(0, 0);
    this.atmosphere = new Atmosphere(this, art, (Date.now() & 0x7fffffff) || 1);

    // Som: um contexto só. A música toca apenas na tela inicial; no jogo, chuva, trovões e passos.
    this.audio = new AudioHub();
    this.audio.unlockOnGesture();
    this.music = new MusicPlayer(this.audio.ctx, this.audio.input);
    this.stormSounds = new StormSounds(this.audio.ctx, this.audio.input);
    const footsteps = new Footsteps(this.audio.ctx, this.audio.input);
    this.music.start();
    this.stormSounds.startRain();
    this.events.once('shutdown', () => this.audio.close());

    const spawnX = (SPAWN.tx + 0.5) * TILE;
    const spawnY = (SPAWN.ty + 0.5) * TILE;
    this.spider = new Spider(this, this.grid, spawnX, spawnY, () => {
      if (this.mode === 'play') footsteps.step(this.spider.motor.running);
    });
    this.playerInput = new PlayerInput(this, this.grid);
    this.reticle = this.add.image(0, 0, TEX.reticle).setDepth(10).setVisible(false);
    this.debugGfx = this.add.graphics().setDepth(20);
    this.hud = new Hud();
    this.title = new TitleScreen(() => this.startPlay());

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.grid.widthPx, this.grid.heightPx);
    cam.setRoundPixels(true);
    cam.centerOn(TITLE.cameraX, TITLE.cameraY);

    this.input.keyboard?.on('keydown-G', () => {
      this.debug = !this.debug;
      this.hud.showDebug(this.debug);
      if (!this.debug) this.debugGfx.clear();
    });
    this.input.keyboard?.on('keydown-H', () => {
      if (this.mode === 'play') this.hud.toggleHelp();
    });
    this.input.keyboard?.on('keydown-M', () => this.audio.toggleMute());

    if (import.meta.env.DEV) {
      Object.assign(window, {
        __spider: this.spider.motor,
        __scene: this,
        __music: this.music,
        __storm: this.atmosphere.storm,
        __audio: this.audio,
      });
    }
  }

  /** Sai da tela inicial: a música some, a câmera desce até a aranha e o controle é liberado. */
  private startPlay(): void {
    if (this.mode === 'play') return;
    this.mode = 'play';
    this.graceLeft = TITLE.inputGraceSec;
    this.music.stop();
    this.hud.showHelp(true);
    this.reticle.setVisible(true);
    const cam = this.cameras.main;
    cam.startFollow(this.spider.motor.body, true, TITLE.introLerp, TITLE.introLerp);
    this.time.delayedCall(TITLE.introSec * 1000, () => cam.setLerp(VIEW.cameraLerp, VIEW.cameraLerp));
  }

  update(time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 1 / 30);
    const cam = this.cameras.main;
    if (this.mode === 'title') {
      const drift = Math.sin((time / 1000) * TITLE.driftSpeed * Math.PI * 2) * TITLE.driftPx;
      cam.centerOn(TITLE.cameraX + drift, TITLE.cameraY);
    }

    for (const thunder of this.atmosphere.update(dt, cam.worldView)) this.stormSounds.thunder(thunder);
    this.title.setFlash(this.atmosphere.storm.flash);

    const m = this.spider.motor;
    const pi = this.playerInput;
    let input = pi.read(m.body);
    this.handlePadButtons();

    if (this.mode === 'title') {
      this.spider.update(dt, emptyInput());
      this.spider.setLight(this.atmosphere.lightAt(m.body.x, m.body.y), LIGHT.spiderMinLight);
      return;
    }

    if (this.graceLeft > 0) {
      this.graceLeft -= dt;
      input = { ...input, jumpPressed: false, webPressed: false, webHeld: false };
    }

    const hadRope = m.rope !== null;
    this.spider.update(dt, input);
    this.spider.setLight(this.atmosphere.lightAt(m.body.x, m.body.y), LIGHT.spiderMinLight);
    if (!hadRope && m.rope && pi.padFrame?.webHeld) pi.rumble();

    // Mira: branca se a teia alcança algo, cinza se não.
    const hit = raycastWeb(this.grid, m.body, input.aim, WEB.range);
    let reticle = input.aim;
    if (pi.aimDevice === 'gamepad' && pi.padFrame) {
      // No controle a mira é uma direção: mostra onde a teia pega, ou um ponto perto da aranha.
      const d = pi.padAimDir;
      reticle = hit ? hit.point : { x: m.body.x + d.x * GAMEPAD.reticleDistance, y: m.body.y + d.y * GAMEPAD.reticleDistance };
    }
    this.reticle.setPosition(Math.round(reticle.x), Math.round(reticle.y));
    this.reticle.setTint(hit ? 0xffffff : 0x777777).setAlpha(hit ? 1 : 0.7);

    if (this.debug) this.drawDebug();
  }

  /** Botões do controle que não mexem na aranha: confirmar na tela inicial, som e ajuda. */
  private handlePadButtons(): void {
    const f = this.playerInput.padFrame;
    if (!f) return;
    if (f.musicPressed) this.audio.toggleMute();
    if (this.mode === 'title') {
      if (f.confirmPressed) this.title.confirm();
      return;
    }
    if (f.helpPressed) this.hud.toggleHelp();
  }

  private drawDebug(): void {
    const m = this.spider.motor;
    const b = m.body;
    const g = this.debugGfx;
    const storm = this.atmosphere.storm;
    g.clear();
    g.lineStyle(1, 0x00ff66, 1).strokeRect(b.x - b.half, b.y - b.half, b.half * 2, b.half * 2);
    if (m.rope) g.lineStyle(1, 0xff3366, 1).strokeCircle(m.rope.anchor.x, m.rope.anchor.y, 3);
    this.hud.setDebug(
      [
        `surface: ${m.surface}`,
        `dir: ${m.dir}  facing: ${m.facing}`,
        `pos: ${b.x.toFixed(1)}, ${b.y.toFixed(1)}`,
        `vel: ${b.vx.toFixed(0)}, ${b.vy.toFixed(0)}`,
        `tile: ${Math.floor(b.x / TILE)}, ${Math.floor(b.y / TILE)}`,
        m.rope ? `web: ${m.rope.length.toFixed(0)}px -> ${m.rope.anchorSurface}` : 'web: -',
        `next lightning: ${storm.secondsToNextStrike.toFixed(0)}s`,
      ].join('\n'),
    );
  }
}
