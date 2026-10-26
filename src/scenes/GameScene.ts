// Cena principal: cenário, aranha, câmera, mira e debug.
import Phaser from 'phaser';
import { TILE, VIEW, WEB } from '../config';
import { TEX } from '../art/textures';
import { MusicPlayer } from '../audio/MusicPlayer';
import { Spider } from '../entities/Spider';
import { HOUSE_MAP, SPAWN } from '../level/houseMap';
import { isSolidChar } from '../level/legend';
import { LevelGrid } from '../physics/LevelGrid';
import { raycastWeb } from '../systems/webRope';
import { PlayerInput } from './PlayerInput';
import { Hud } from './Hud';

export class GameScene extends Phaser.Scene {
  private grid!: LevelGrid;
  private spider!: Spider;
  private playerInput!: PlayerInput;
  private reticle!: Phaser.GameObjects.Image;
  private debugGfx!: Phaser.GameObjects.Graphics;
  private hud!: Hud;
  private debug = false;

  constructor() {
    super('game');
  }

  create(): void {
    this.grid = LevelGrid.fromAscii(HOUSE_MAP, TILE, isSolidChar);
    this.add.image(0, 0, TEX.level).setOrigin(0, 0);

    this.spider = new Spider(this, this.grid, (SPAWN.tx + 0.5) * TILE, (SPAWN.ty + 0.5) * TILE);
    this.playerInput = new PlayerInput(this);
    this.reticle = this.add.image(0, 0, TEX.reticle).setDepth(10);
    this.debugGfx = this.add.graphics().setDepth(20);
    this.hud = new Hud();

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.grid.widthPx, this.grid.heightPx);
    cam.startFollow(this.spider.motor.body, true, VIEW.cameraLerp, VIEW.cameraLerp);
    cam.setRoundPixels(true);

    this.input.keyboard?.on('keydown-G', () => {
      this.debug = !this.debug;
      this.hud.showDebug(this.debug);
    });
    this.input.keyboard?.on('keydown-H', () => this.hud.toggleHelp());

    // Navegadores só liberam áudio depois de um gesto do jogador.
    const music = new MusicPlayer();
    const startMusic = () => music.start();
    this.input.keyboard?.once('keydown', startMusic);
    this.input.once('pointerdown', startMusic);
    this.input.keyboard?.on('keydown-M', () => music.toggleMute());
    this.events.once('shutdown', () => music.stop());

    if (import.meta.env.DEV) Object.assign(window, { __spider: this.spider.motor, __scene: this, __music: music });
  }

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 1 / 30);
    const input = this.playerInput.read();
    this.spider.update(dt, input);

    // Mira: branca se a teia alcança algo, cinza se não.
    const m = this.spider.motor;
    const hit = raycastWeb(this.grid, m.body, input.aim, WEB.range);
    this.reticle.setPosition(Math.round(input.aim.x), Math.round(input.aim.y));
    this.reticle.setTint(hit ? 0xffffff : 0x777777).setAlpha(hit ? 1 : 0.7);

    if (this.debug) this.drawDebug();
  }

  private drawDebug(): void {
    const m = this.spider.motor;
    const b = m.body;
    const g = this.debugGfx;
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
        m.rope ? `teia: ${m.rope.length.toFixed(0)}px → ${m.rope.anchorSurface}` : 'teia: -',
      ].join('\n'),
    );
  }
}
