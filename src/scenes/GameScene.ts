// Cena principal: tela inicial, jogo, pausa e morte. Cenário, atmosfera, aranha, ratos, câmera, mira, som e debug.
import Phaser from 'phaser';
import { GAMEPAD, INTRO, LIGHT, PLAYER, SHOTS, TILE, TITLE, VIEW, WEB } from '../config';
import { getLevelArt } from '../art/levelArt';
import { TEX } from '../art/textures';
import { type Sound, getSound } from '../audio/sound';
import { Atmosphere } from '../entities/Atmosphere';
import { CombatView } from '../entities/CombatView';
import { Spider } from '../entities/Spider';
import { RATS, SPAWN } from '../level/houseMap';
import type { LevelGrid } from '../physics/LevelGrid';
import type { Vec2 } from '../physics/surfaces';
import { Combat, type CombatEvent, aimAtTarget } from '../systems/combat';
import { type SpiderInput, emptyInput } from '../systems/input';
import { raycastWeb } from '../systems/webRope';
import { HeartsHud } from './HeartsHud';
import { Hud } from './Hud';
import { type PauseAction, PauseMenu } from './PauseMenu';
import { PlayerInput } from './PlayerInput';
import { TitleScreen } from './TitleScreen';

/**
 * title: tela inicial | leaving: escurecendo para a cutscene | emerge: aranha saindo do buraco |
 * play: jogando | paused: menu de pausa | dying: tela escurecendo depois de morrer.
 */
type Mode = 'title' | 'leaving' | 'emerge' | 'play' | 'paused' | 'dying';

/**
 * Dados para `scene.start`/`restart`: `skipTitle` vai direto ao jogo (morte, Restart);
 * `emerge` (vindo da cutscene) faz a aranha sair do buraco de rato antes de liberar o controle.
 */
interface SceneData {
  skipTitle?: boolean;
  emerge?: boolean;
}

export class GameScene extends Phaser.Scene {
  private grid!: LevelGrid;
  private spider!: Spider;
  private atmosphere!: Atmosphere;
  private combat!: Combat;
  private combatView!: CombatView;
  private playerInput!: PlayerInput;
  private reticle!: Phaser.GameObjects.Image;
  private debugGfx!: Phaser.GameObjects.Graphics;
  private hud!: Hud;
  private hearts!: HeartsHud;
  private title!: TitleScreen;
  private pauseMenu!: PauseMenu;
  private sound_!: Sound;
  private mode: Mode = 'title';
  /** Depois do Play/Resume, ignora pulo e teias por um instante (a tecla do menu não vira ação). */
  private graceLeft = 0;
  /** Segundos restantes da aranha saindo do buraco. */
  private emergeLeft = 0;
  private debug = false;

  constructor() {
    super('game');
  }

  create(data: SceneData = {}): void {
    this.mode = 'title';
    this.graceLeft = 0;
    const art = getLevelArt();
    this.grid = art.grid;
    const seed = (Date.now() & 0x7fffffff) || 1;
    this.add.image(0, 0, TEX.level).setOrigin(0, 0);
    this.atmosphere = new Atmosphere(this, art, seed);

    // Som: criado uma vez e reaproveitado entre reinícios. Música só na tela inicial.
    this.sound_ = getSound();
    const { footsteps } = this.sound_;

    const spawnX = (SPAWN.tx + 0.5) * TILE;
    const spawnY = (SPAWN.ty + 0.5) * TILE;
    this.spider = new Spider(this, this.grid, spawnX, spawnY, () => {
      if (this.mode === 'play') footsteps.step(this.spider.motor.running);
    });
    this.combat = new Combat(this.grid, RATS, seed);
    this.combatView = new CombatView(this, this.combat);
    this.playerInput = new PlayerInput(this, this.grid);
    this.reticle = this.add.image(0, 0, TEX.reticle).setDepth(10).setVisible(false);
    this.debugGfx = this.add.graphics().setDepth(20);
    this.hud = new Hud();
    this.hearts = new HeartsHud(this, PLAYER.maxHp);
    this.hearts.setVisible(false);
    this.title = new TitleScreen(() => this.goToIntro(), !data.skipTitle);
    this.pauseMenu = new PauseMenu((a) => this.onPauseAction(a));
    this.events.once('shutdown', () => {
      this.title.destroy();
      this.pauseMenu.destroy();
      this.anims.resumeAll();
    });

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.grid.widthPx, this.grid.heightPx);
    cam.setRoundPixels(true);

    if (data.skipTitle) {
      this.startPlay();
      if (data.emerge) this.beginEmerge();
    } else {
      cam.centerOn(TITLE.cameraX, TITLE.cameraY);
      this.hud.showHelp(false);
      this.sound_.music.start();
    }

    const kb = this.input.keyboard;
    kb?.on('keydown-G', () => {
      this.debug = !this.debug;
      this.hud.showDebug(this.debug);
      if (!this.debug) this.debugGfx.clear();
    });
    kb?.on('keydown-H', () => {
      if (this.mode === 'play') this.hud.toggleHelp();
    });
    kb?.on('keydown-M', () => this.sound_.hub.toggleMute());
    kb?.on('keydown-ESC', () => this.togglePause());
    kb?.on('keydown-P', () => this.togglePause());

    if (import.meta.env.DEV) {
      Object.assign(window, {
        __spider: this.spider.motor,
        __scene: this,
        __music: this.sound_.music,
        __storm: this.atmosphere.storm,
        __audio: this.sound_.hub,
        __combat: this.combat,
      });
    }
  }

  // ---------- modos ----------

  /** PLAY na tela inicial: a música some, a tela escurece e começa a cutscene de abertura. */
  private goToIntro(): void {
    this.mode = 'leaving';
    this.sound_.music.stop();
    this.hud.showHelp(false);
    const cam = this.cameras.main;
    cam.fadeOut(TITLE.toIntroFadeSec * 1000, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('intro'));
  }

  /** Começa a jogatina com a câmera na aranha, a tela clareando (depois da cutscene, de morrer ou de Restart). */
  private startPlay(): void {
    this.mode = 'play';
    this.graceLeft = TITLE.inputGraceSec;
    this.sound_.music.stop();
    this.hud.applyHelpPreference();
    this.reticle.setVisible(true);
    this.hearts.setVisible(true);
    const cam = this.cameras.main;
    const body = this.spider.motor.body;
    cam.startFollow(body, true, VIEW.cameraLerp, VIEW.cameraLerp);
    cam.centerOn(body.x, body.y);
    cam.fadeIn(600, 0, 0, 0);
  }

  /** Vindo da cutscene: a aranha sai do buraco de rato (cresce do fundo) antes de liberar o controle. */
  private beginEmerge(): void {
    this.mode = 'emerge';
    this.emergeLeft = INTRO.emergeSec;
    this.spider.sprite.setScale(0.4).setAlpha(0);
  }

  private togglePause(): void {
    if (this.mode === 'play') this.pauseGame();
    else if (this.mode === 'paused') this.resumeGame();
  }

  private pauseGame(): void {
    this.mode = 'paused';
    this.pauseMenu.show();
    this.hud.applyHelpPreference(true);
    this.atmosphere.setPaused(true);
    this.anims.pauseAll();
  }

  private resumeGame(): void {
    this.mode = 'play';
    this.pauseMenu.hide();
    this.hud.applyHelpPreference();
    this.atmosphere.setPaused(false);
    this.anims.resumeAll();
    this.graceLeft = TITLE.inputGraceSec;
  }

  private onPauseAction(action: PauseAction): void {
    if (action === 'resume') this.resumeGame();
    else this.scene.restart({ skipTitle: action === 'restart' } satisfies SceneData);
  }

  /** Vida zerou: a aranha cai, a tela escurece e o jogo reinicia. */
  private die(): void {
    this.mode = 'dying';
    this.sound_.sfx.spiderDeath();
    this.reticle.setVisible(false);
    const cam = this.cameras.main;
    cam.fadeOut(PLAYER.deathFadeSec * 1000, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.restart({ skipTitle: true } satisfies SceneData));
  }

  // ---------- quadro a quadro ----------

  update(time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 1 / 30);
    const pi = this.playerInput;
    const m = this.spider.motor;

    if (this.mode === 'paused') {
      pi.read(m.body);
      this.handlePausedPad();
      return;
    }

    const cam = this.cameras.main;
    if (this.mode === 'title') {
      const drift = Math.sin((time / 1000) * TITLE.driftSpeed * Math.PI * 2) * TITLE.driftPx;
      cam.centerOn(TITLE.cameraX + drift, TITLE.cameraY);
    }
    for (const thunder of this.atmosphere.update(dt, cam.worldView)) this.sound_.storm.thunder(thunder);
    this.title.setFlash(this.atmosphere.storm.flash);

    let input = pi.read(m.body);
    if (this.handlePad()) return;

    const light = (x: number, y: number) => this.atmosphere.lightAt(x, y);
    if (this.mode !== 'play') {
      // Tela inicial, saída do buraco, transição e morte: o mundo continua (ratos patrulhando), sem controle.
      this.spider.update(dt, emptyInput());
      this.combat.update(dt, m);
      this.combatView.update(dt, time, light);
      this.spider.setLight(light(m.body.x, m.body.y), LIGHT.spiderMinLight);
      if (this.mode === 'emerge') this.updateEmerge(dt);
      else this.spider.setDamageFx(0, PLAYER.invulnSec, this.mode === 'dying');
      return;
    }

    if (this.graceLeft > 0) {
      this.graceLeft -= dt;
      input = { ...input, jumpPressed: false, webPressed: false, webHeld: false, attackPressed: false, trapPressed: false };
    }

    const hadRope = m.rope !== null;
    this.spider.update(dt, input);
    if (input.webPressed) this.sound_.sfx.webShot('rope');
    if (!hadRope && m.rope && pi.padFrame?.webHeld) pi.rumble();

    const events: CombatEvent[] = [];
    if (input.attackPressed) events.push(...this.combat.fire('attack', m.body, this.shotDir(input)));
    if (input.trapPressed) events.push(...this.combat.fire('trap', m.body, this.shotDir(input)));
    events.push(...this.combat.update(dt, m));
    this.handleCombatEvents(events);
    this.combatView.update(dt, time, light);

    const health = this.combat.health;
    this.spider.setLight(light(m.body.x, m.body.y), LIGHT.spiderMinLight);
    this.spider.setDamageFx(health.invulnLeft, PLAYER.invulnSec, false);
    this.hearts.update(health.hp, dt);
    this.updateReticle(input);

    if (this.debug) this.drawDebug();
  }

  private updateEmerge(dt: number): void {
    this.emergeLeft -= dt;
    const p = 1 - Math.max(0, this.emergeLeft) / INTRO.emergeSec;
    const eased = 1 - (1 - p) ** 2;
    this.spider.sprite.setScale(0.4 + 0.6 * eased).setAlpha(Math.min(1, p * 1.6));
    if (p >= 1) {
      this.spider.sprite.setScale(1).setAlpha(1);
      this.mode = 'play';
      this.graceLeft = 0.1;
    }
  }

  /** Direção das teias de combate: o mouse aponta direto; no controle, a mira gruda num rato perto dela. */
  private shotDir(input: SpiderInput): Vec2 {
    const b = this.spider.motor.body;
    const pi = this.playerInput;
    if (pi.aimDevice === 'gamepad' && pi.padFrame) {
      return aimAtTarget(this.grid, b, pi.padFrame.aimDir, this.combat.ratTargets, SHOTS.attack.range, SHOTS.aimAssistDeg);
    }
    const dx = input.aim.x - b.x;
    const dy = input.aim.y - b.y;
    const d = Math.hypot(dx, dy);
    return d > 0 ? { x: dx / d, y: dy / d } : { x: this.spider.motor.facing, y: 0 };
  }

  private handleCombatEvents(events: CombatEvent[]): void {
    const { sfx } = this.sound_;
    for (const e of events) {
      switch (e.type) {
        case 'fire':
          sfx.webShot(e.kind);
          break;
        case 'splat':
          this.combatView.addSplat(e.x, e.y, e.kind);
          sfx.splat();
          break;
        case 'ratSpotted':
          sfx.ratSqueak('alert');
          break;
        case 'ratHurt':
          sfx.ratSqueak('hurt');
          break;
        case 'ratDied':
          sfx.ratSqueak('death');
          break;
        case 'ratTrapped':
          break;
        case 'spiderHurt':
          sfx.spiderHurt();
          this.cameras.main.shake(140, 0.008);
          this.playerInput.rumble(GAMEPAD.rumbleHurt);
          break;
        case 'spiderDied':
          this.die();
          break;
      }
    }
  }

  private updateReticle(input: SpiderInput): void {
    const m = this.spider.motor;
    const pi = this.playerInput;
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
  }

  /** Botões do controle fora da pausa: confirmar na tela inicial, pausar e som. Devolve true se pausou. */
  private handlePad(): boolean {
    const f = this.playerInput.padFrame;
    if (!f) return false;
    if (f.musicPressed) this.sound_.hub.toggleMute();
    if (this.mode === 'title') {
      if (f.confirmPressed || f.pausePressed) this.title.confirm();
      return false;
    }
    if (f.pausePressed && this.mode === 'play') {
      this.pauseGame();
      return true;
    }
    return false;
  }

  /** Controle no menu de pausa: ↑/↓ escolhe, A confirma, B ou Start voltam ao jogo. */
  private handlePausedPad(): void {
    const f = this.playerInput.padFrame;
    if (!f) return;
    if (f.musicPressed) this.sound_.hub.toggleMute();
    if (f.navY !== 0) this.pauseMenu.move(f.navY);
    if (f.confirmPressed) this.pauseMenu.confirm();
    else if (f.trapPressed || f.pausePressed) this.resumeGame();
  }

  private drawDebug(): void {
    const m = this.spider.motor;
    const b = m.body;
    const g = this.debugGfx;
    const storm = this.atmosphere.storm;
    g.clear();
    g.lineStyle(1, 0x00ff66, 1).strokeRect(b.x - b.half, b.y - b.half, b.half * 2, b.half * 2);
    for (const r of this.combat.rats) {
      if (r.alive) g.lineStyle(1, 0xff3366, 1).strokeRect(r.body.x - r.body.half, r.body.y - r.body.half, r.body.half * 2, r.body.half * 2);
    }
    if (m.rope) g.lineStyle(1, 0xff3366, 1).strokeCircle(m.rope.anchor.x, m.rope.anchor.y, 3);
    this.hud.setDebug(
      [
        `surface: ${m.surface}`,
        `dir: ${m.dir}  facing: ${m.facing}`,
        `pos: ${b.x.toFixed(1)}, ${b.y.toFixed(1)}`,
        `vel: ${b.vx.toFixed(0)}, ${b.vy.toFixed(0)}`,
        `tile: ${Math.floor(b.x / TILE)}, ${Math.floor(b.y / TILE)}`,
        m.rope ? `web: ${m.rope.length.toFixed(0)}px -> ${m.rope.anchorSurface}` : 'web: -',
        `hp: ${this.combat.health.hp}/${this.combat.health.max}`,
        ...this.combat.rats.map((r, i) => `rat ${i}: ${r.state} hp ${r.hp}`),
        `next lightning: ${storm.secondsToNextStrike.toFixed(0)}s`,
      ].join('\n'),
    );
  }
}
