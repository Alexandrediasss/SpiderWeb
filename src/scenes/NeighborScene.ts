// Ato 3, LIGHTS OUT: a casa vizinha, sem energia. As cartas, as falas, a gosma e o veneno, os ratos, o doente
// da cozinha e o lustre, os checkpoints, a morte e a pausa. A chegada e o fim são cutscenes à parte
// (ChimneyScene e WindowScene). Pelo SCENES (`replay`): o resumo do ato, e depois volta para o menu.
// Spec: docs/features/act3-lights-out.md (gosma e veneno: goo-poison.md; falas: dialogue.md; SCENES: scenes.md)
import Phaser from 'phaser';
import { ACT3, CHANDELIER, GAMEPAD, LETTER, LIGHT, PLAYER, POISON, RECAP, SHOTS, SICK, SPIDER, TILE, TITLE, VIEW, WEB, WINDOW_CUT } from '../config';
import { PAL } from '../art/palette';
import { T3, TEX, ensureAct3Textures } from '../art/textures';
import { mixColor } from '../art/tilePainters';
import { type Sound, getSound } from '../audio/sound';
import { Atmosphere } from '../entities/Atmosphere';
import { CombatView } from '../entities/CombatView';
import { GooView } from '../entities/GooView';
import { LetterSprites } from '../entities/LetterSprites';
import { SickView } from '../entities/SickView';
import { Spider } from '../entities/Spider';
import { ACTS } from '../level/acts';
import { DIALOGUES, type DialogueId } from '../level/dialogues';
import { ACT3_LETTERS, type Letter } from '../level/letters';
import {
  ACT3_CHECKPOINTS,
  ACT3_WINDOW,
  CHANDELIER_DEF,
  FLOOR_VIEWS,
  GOO,
  KITCHEN,
  NEIGHBOR_RATS,
  SICK_DEF,
  UPSTAIRS,
  WATER_DRIPS,
} from '../level/neighborHouse';
import { ACT3_RECAP } from '../level/recaps';
import { SCENES, type SceneId } from '../level/scenes';
import type { LevelGrid } from '../physics/LevelGrid';
import type { Vec2 } from '../physics/surfaces';
import { Chandelier } from '../systems/chandelier';
import { inZone, nextCheckpoint, spawnPoint } from '../systems/checkpoints';
import { Combat, type CombatEvent, aimAtTarget } from '../systems/combat';
import { Timeline } from '../systems/cutscene';
import { GooField } from '../systems/goo';
import { type SpiderInput, emptyInput } from '../systems/input';
import { Kitchen, type KitchenEvent, kitchenCues } from '../systems/kitchen';
import { LetterLog, letterCenter, nearbyLetter } from '../systems/letters';
import { Poison } from '../systems/poison';
import { recordActEnd } from '../systems/progress';
import { RecapRun } from '../systems/recap';
import { inRoofHole } from '../systems/roofHole';
import { Sick } from '../systems/sick';
import { makeRng } from '../systems/storm';
import { raycastWeb } from '../systems/webRope';
import { ActEnd } from './ActEnd';
import { achieve } from './AchievementToast';
import { DialogueBox } from './DialogueBox';
import { HeartsHud } from './HeartsHud';
import { Hud } from './Hud';
import { LetterReader } from './LetterReader';
import { type PauseAction, PauseMenu } from './PauseMenu';
import { PlayerInput } from './PlayerInput';
import { placeBars, showCaption } from './cinema';
import { fadeTo, hideChapter, showChapter } from './Transitions';
import { loadProgress, saveProgress } from './progressStore';
import { markSceneSeen } from './sceneStore';

/**
 * skipping: pulou o resumo (a tela escurece) | talking: a Mary falando | play: jogando | paused |
 * reading: lendo uma carta | dying: morreu (vira e escurece) | ending: entrou no vão da janela (escurece e vem
 * a cutscene) | actEnd: tela de fim do ato | recap: o resumo do ato (pelo SCENES).
 */
type Mode = 'skipping' | 'talking' | 'play' | 'paused' | 'reading' | 'dying' | 'ending' | 'actEnd' | 'recap';

interface Act3Data {
  /** Assistindo pelo SCENES: o resumo do ato; no fim volta para o menu. */
  replay?: SceneId;
}

const ACT = ACTS[2];
/** Faixas de cinema (px da tela). */
const BARS_PX = 22;

/** Cartas lidas na jogada do ato 3: sobrevivem a morrer e a "Restart"; zeram ao escolher o ato. */
export const act3Letters = new LetterLog();
/** Falas que a Mary já disse nesta jogada do ato (cada uma uma vez só). */
export const act3Talks = new Set<DialogueId>();

export class NeighborScene extends Phaser.Scene {
  private grid!: LevelGrid;
  private spider!: Spider;
  private atmosphere!: Atmosphere;
  private combat!: Combat;
  private combatView!: CombatView;
  private goo!: GooField;
  private water!: GooField;
  private gooView!: GooView;
  /** O doente da cozinha e o lustre (públicos para o console), e a lógica dos dois juntos. */
  sick!: Sick;
  chandelier!: Chandelier;
  private kitchen!: Kitchen;
  private sickView!: SickView;
  /** O veneno da gosma (público para o console: `__scene3.poison.apply()`). */
  poison = new Poison();
  private playerInput!: PlayerInput;
  private reticle!: Phaser.GameObjects.Image;
  private debugGfx!: Phaser.GameObjects.Graphics;
  private hud!: Hud;
  private hearts!: HeartsHud;
  private poisonPips: Phaser.GameObjects.Rectangle[] = [];
  private letters!: LetterSprites;
  private reader!: LetterReader;
  private dialogue!: DialogueBox;
  private pauseMenu!: PauseMenu;
  private actEnd!: ActEnd;
  private bars: Phaser.GameObjects.Rectangle[] = [];
  /** Altura atual das faixas (px da tela; animada): posta a cada quadro, compensando o zoom. */
  private barH = { h: 0 };
  private sound_!: Sound;
  private mode: Mode = 'play';
  /** Checkpoint ativo (índice em ACT3_CHECKPOINTS). Público para o console. */
  checkpoint = 0;
  private graceLeft = 0;
  /** A morte usa o próprio relógio. */
  private tl: Timeline | null = null;
  private elapsed = 0;
  private stepIndex = -1;
  /** Depois da fala: o que fazer (voltar a jogar). */
  private afterTalk: (() => void) | null = null;
  /** Carta aberta (para saber qual fala vem depois). */
  private openLetterId: string | null = null;
  private nearLetter: Letter | null = null;
  /** Segundos inteiros que faltavam do veneno no quadro anterior (o "tum" toca a cada segundo). */
  private poisonSecond = 0;
  private bubbleClock = 0;
  /** Até o próximo gemido abafado vindo de baixo (no 1º andar). */
  private moanLeft = 0;
  private rng: () => number = Math.random;
  /** Assistindo pelo SCENES (null = jogando). */
  private replay: SceneId | null = null;
  /** Resumo do ato (modo 'recap'): quem pilota a Mary, o cartão do começo, o corte do plano e as cartas "lidas". */
  private recap: RecapRun | null = null;
  private recapWait = 0;
  private recapCut = false;
  private recapLetters = new LetterLog();
  private debug = false;
  private readonly toast = document.getElementById('toast');
  private readonly skipHint = document.getElementById('skip-hint');
  private readonly poisonEl = document.getElementById('poison');

  constructor() {
    super('act3');
  }

  create(data: Act3Data = {}): void {
    // O Phaser reaproveita a instância da cena: todo estado volta ao início aqui.
    this.mode = 'play';
    this.checkpoint = 0;
    this.graceLeft = 0;
    this.tl = null;
    this.elapsed = 0;
    this.stepIndex = -1;
    this.afterTalk = null;
    this.openLetterId = null;
    this.nearLetter = null;
    this.poison = new Poison();
    this.poisonSecond = 0;
    this.bubbleClock = 0;
    this.barH = { h: 0 };
    this.poisonPips = [];
    this.replay = data.replay ?? null;
    this.recap = null;
    this.recapWait = 0;
    this.recapCut = false;
    this.recapLetters = new LetterLog();
    // O resumo é sempre igual: ratos e doente com a semente fixa (como nos testes).
    const recap = this.replay === 'act3-recap';
    const seed = (Date.now() & 0x7fffffff) || 1;
    this.rng = makeRng(seed + 99);
    this.moanLeft = this.between(ACT3.moanGapSec);

    const art = ensureAct3Textures(this);
    this.grid = art.grid;
    // A transição do ato deixou a tela preta: a cena clareia com a câmera.
    void fadeTo(0, 0);
    this.add.image(0, 0, T3.level).setOrigin(0, 0);
    this.atmosphere = new Atmosphere(this, art, seed, { light: T3.light, flash: T3.flash, beam: TEX.beam });
    this.atmosphere.leaking = false;
    this.letters = new LetterSprites(this, ACT3_LETTERS);

    this.goo = new GooField(GOO.drips, GOO.jets, GOO.pools);
    this.water = new GooField(WATER_DRIPS, []);
    this.gooView = new GooView(this, this.goo, this.water);
    this.sick = new Sick(SICK_DEF, recap ? RECAP.seed : seed + 5);
    this.chandelier = new Chandelier(CHANDELIER_DEF);
    this.kitchen = new Kitchen(this.sick, this.chandelier);
    this.sickView = new SickView(this, this.sick, this.chandelier, {
      body: T3.sick,
      eyes: T3.sickEyes,
      dead: T3.sickDead,
      chandelier: T3.chandelier,
      chandelierBroken: T3.chandelierBroken,
    });

    this.sound_ = getSound();
    const sound = this.sound_;
    const start = spawnPoint(ACT3_CHECKPOINTS[0], TILE, SPIDER.half);
    this.spider = new Spider(this, this.grid, start.x, start.y, () => {
      if (this.mode === 'play' || this.mode === 'recap') sound.footsteps.step(this.spider.motor.running);
    });
    this.spider.motor.surface = 'floor';
    this.combat = new Combat(this.grid, NEIGHBOR_RATS, recap ? RECAP.seed : seed);
    this.combat.targets = this.kitchen.targets;
    this.combatView = new CombatView(this, this.combat);

    this.playerInput = new PlayerInput(this, this.grid);
    this.reticle = this.add.image(0, 0, TEX.reticle).setDepth(10).setVisible(false);
    this.debugGfx = this.add.graphics().setDepth(21);
    this.hud = new Hud();
    this.hearts = new HeartsHud(this, PLAYER.maxHp);
    this.hearts.setVisible(false);
    // Barrinha do veneno embaixo dos corações: um quadradinho por segundo que falta.
    for (let i = 0; i < POISON.sec; i++) {
      this.poisonPips.push(
        this.add
          .rectangle(VIEW.width - 6 - (POISON.sec - i) * 6, 17, 4, 3, PAL.intro.goo)
          .setOrigin(0, 0)
          .setScrollFactor(0)
          .setDepth(30)
          .setVisible(false),
      );
    }
    this.reader = new LetterReader(
      () => this.advanceLetter(),
      () => sound.sfx.paper(),
    );
    this.dialogue = new DialogueBox(() => this.advanceDialogue());
    this.pauseMenu = new PauseMenu((a) => this.onPauseAction(a));
    this.actEnd = new ActEnd(() => {
      void fadeTo(1, 0);
      this.scene.start('game', { openActs: true });
    });
    const bar = () => this.add.rectangle(0, 0, VIEW.width, 0, 0x000000).setOrigin(0, 0).setScrollFactor(0).setDepth(20);
    this.bars = [bar(), bar()];

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.grid.widthPx, this.grid.heightPx);
    cam.setRoundPixels(true);
    cam.setBackgroundColor(0x05060d);
    // Dentro de casa: a horda lá fora, abafada.
    sound.zombies.setDistance(1, 0.5);

    const kb = this.input.keyboard;
    kb?.on('keydown-ESC', () => {
      if (this.mode === 'reading') this.closeLetter();
      else if (this.replay) this.exitReplay();
      else this.togglePause();
    });
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
    for (const key of ['keydown-ENTER', 'keydown-SPACE']) {
      kb?.on(key, () => {
        if (this.mode === 'talking') this.advanceDialogue();
        else if (this.mode === 'reading' && key === 'keydown-ENTER') this.advanceLetter();
        else if (this.replay && this.mode !== 'skipping') this.exitReplay();
      });
    }

    // A cutscene da janela acorda esta cena quando acaba: é o fim do ato.
    const onWake = () => this.endAct();
    this.events.on('wake', onWake);
    this.events.once('shutdown', () => {
      this.events.off('wake', onWake);
      this.pauseMenu.destroy();
      this.actEnd.destroy();
      this.reader.destroy();
      this.dialogue.destroy();
      this.hud.showHelp(false);
      this.hud.showDebug(false);
      hideChapter();
      showCaption(null);
      this.showSkipHint(false);
      this.showPoison(false);
      this.anims.resumeAll();
    });

    if (this.replay === 'act3-recap') this.startRecap();
    else this.startPlay(true);

    if (import.meta.env.DEV) {
      Object.assign(window, { __scene3: this, __spider: this.spider.motor, __sick: this.sick, __combat: this.combat, __storm: this.atmosphere.storm });
    }
  }

  // ---------- modos ----------

  /** Joga (ou volta a jogar): câmera seguindo a Mary, sem faixas de cinema. */
  private startPlay(fadeIn = false): void {
    this.mode = 'play';
    this.tl = null;
    this.graceLeft = TITLE.inputGraceSec;
    this.showSkipHint(false);
    this.setBars(false);
    this.reticle.setVisible(true);
    this.hearts.setVisible(true);
    this.hud.applyHelpPreference();
    this.atmosphere.setPaused(false);
    this.anims.resumeAll();
    const cam = this.cameras.main;
    const b = this.spider.motor.body;
    cam.setZoom(1);
    cam.startFollow(b, true, VIEW.cameraLerp, VIEW.cameraLerp);
    this.frameFloor();
    if (fadeIn) {
      cam.centerOn(b.x, b.y - cam.followOffset.y);
      cam.fadeIn(600, 0, 0, 0);
    }
  }

  /** Na vertical, a câmera fica no meio do andar da Mary (o teto e o chão aparecem juntos). */
  private frameFloor(): void {
    const y = this.spider.motor.body.y;
    const view = FLOOR_VIEWS.find((f) => y < f.belowY) ?? FLOOR_VIEWS[FLOOR_VIEWS.length - 1];
    this.cameras.main.setFollowOffset(0, y - view.centerY);
  }

  /**
   * A Mary fala (cada fala uma vez por jogada do ato); depois chama `after`. Se ela já falou isso, chama
   * `after` na hora. O mundo para enquanto a caixa está aberta.
   */
  private talk(id: DialogueId, after: () => void): void {
    if (act3Talks.has(id)) {
      after();
      return;
    }
    act3Talks.add(id);
    this.mode = 'talking';
    this.afterTalk = after;
    this.reticle.setVisible(false);
    this.reader.hidePrompt();
    this.atmosphere.setPaused(true);
    this.anims.pauseAll();
    this.dialogue.open(DIALOGUES[id]);
  }

  private advanceDialogue(): void {
    if (this.mode !== 'talking') return;
    if (!this.dialogue.advance()) return;
    const after = this.afterTalk;
    this.afterTalk = null;
    this.graceLeft = TITLE.inputGraceSec;
    after?.();
  }

  private togglePause(): void {
    if (this.mode === 'play') {
      this.mode = 'paused';
      this.reader.hidePrompt();
      this.pauseMenu.show();
      this.hud.applyHelpPreference(true);
      this.atmosphere.setPaused(true);
      this.anims.pauseAll();
    } else if (this.mode === 'paused') {
      this.resume();
    }
  }

  private resume(): void {
    this.mode = 'play';
    this.pauseMenu.hide();
    this.hud.applyHelpPreference();
    this.atmosphere.setPaused(false);
    this.anims.resumeAll();
    this.graceLeft = TITLE.inputGraceSec;
  }

  private onPauseAction(action: PauseAction): void {
    if (action === 'resume') this.resume();
    else if (action === 'restart') this.scene.restart({} satisfies Act3Data);
    else this.scene.start('game');
  }

  // ---------- cartas ----------

  /** Abre a carta (por id no console: `__scene3.openLetter('day22')`). O jogo pausa enquanto ela está aberta. */
  openLetter(which: Letter | string): void {
    const letter = typeof which === 'string' ? ACT3_LETTERS.find((l) => l.id === which) : which;
    if (!letter || this.mode !== 'play') return;
    this.mode = 'reading';
    this.openLetterId = letter.id;
    act3Letters.markRead(letter.id);
    achieve({ type: 'letterRead', act: ACT.id, letter: letter.id });
    this.reader.hidePrompt();
    this.reader.show(letter);
    this.reticle.setVisible(false);
    this.atmosphere.setPaused(true);
    this.anims.pauseAll();
    this.sound_.sfx.paper();
  }

  private advanceLetter(): void {
    if (this.mode !== 'reading') return;
    if (this.reader.turn(1)) this.sound_.sfx.paper();
    else this.closeLetter();
  }

  /** Fecha a carta. Depois do Dia 35 e do Dia 40 (a primeira vez), a Mary fala. */
  private closeLetter(): void {
    if (this.mode !== 'reading') return;
    this.reader.hide();
    this.sound_.sfx.paper();
    const id = this.openLetterId;
    this.openLetterId = null;
    const back = () => {
      this.mode = 'play';
      this.reticle.setVisible(true);
      this.atmosphere.setPaused(false);
      this.anims.resumeAll();
      this.graceLeft = TITLE.inputGraceSec;
    };
    if (id === 'day35' || id === 'day40') this.talk(id, back);
    else back();
  }

  // ---------- morte, checkpoint e fim ----------

  /** Morreu (vida zerada, veneno, dano envenenada): vira de barriga para cima, escurece e volta no checkpoint. */
  private die(): void {
    if (this.mode !== 'play') return;
    this.mode = 'dying';
    const m = this.spider.motor;
    m.rope = null;
    this.reticle.setVisible(false);
    this.reader.hidePrompt();
    this.sound_.sfx.spiderDeath();
    this.elapsed = 0;
    this.stepIndex = -1;
    this.tl = new Timeline([
      { name: 'hold', sec: ACT3.deathHoldSec },
      { name: 'fade', sec: ACT3.deathFadeSec },
    ]);
  }

  /** Volta no último checkpoint com a vida cheia e sem veneno (público para o console). */
  respawn(): void {
    const p = spawnPoint(ACT3_CHECKPOINTS[this.checkpoint], TILE, SPIDER.half);
    const m = this.spider.motor;
    m.placeAt(p.x, p.y);
    m.surface = 'floor';
    this.poison.clear();
    this.poison.applyTo(m);
    this.showPoison(false);
    const health = this.combat.health;
    health.hp = health.max;
    health.invulnLeft = PLAYER.invulnSec;
    this.combat.shots = [];
    // A briga recomeça: o doente vivo volta ao normal e o lustre volta para a corda.
    if (this.kitchen.reset()) this.sickView.resetChandelier(T3.chandelier);
    this.spider.sprite.setVisible(true).setAlpha(1).setFlipY(false);
    this.startPlay(true);
  }

  /**
   * A Mary entrou no vão da janela: o controle trava, ela segue andando, a tela escurece e começa a cutscene.
   * Esta cena dorme até ela acabar (público para o console).
   */
  startEnding(): void {
    if (this.mode === 'ending' || this.mode === 'actEnd') return;
    this.mode = 'ending';
    this.spider.motor.rope = null;
    this.reticle.setVisible(false);
    this.hearts.setVisible(false);
    for (const p of this.poisonPips) p.setVisible(false);
    this.showPoison(false);
    this.reader.hidePrompt();
    this.hud.showHelp(false);
    this.setBars(true);
    const cam = this.cameras.main;
    cam.fadeOut(WINDOW_CUT.exitFadeSec * 1000, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.launch('window', { kitchen: this.kitchen.snapshot() });
      this.scene.sleep();
    });
  }

  private endAct(): void {
    this.mode = 'actEnd';
    saveProgress(recordActEnd(loadProgress(), ACT.id, act3Letters.ids));
    achieve({ type: 'actEnd', act: ACT.id });
    // Terminar o ato libera o resumo dele no SCENES.
    markSceneSeen('act3-recap');
    this.actEnd.show(ACT, act3Letters.count(ACT.letters), ACTS[ACTS.indexOf(ACT) + 1]);
  }

  // ---------- pelo SCENES ----------

  /** Fim (ou pulo) de uma cena assistida pelo SCENES: escurece e volta para o menu. */
  private exitReplay(fadeSec: number = RECAP.cutSec): void {
    if (!this.replay || this.mode === 'skipping') return;
    this.mode = 'skipping';
    hideChapter();
    showCaption(null);
    this.showSkipHint(false);
    this.dialogue.hide();
    this.reader.hide();
    if (this.recap) this.sound_.music.stop(fadeSec);
    const cam = this.cameras.main;
    cam.fadeOut(fadeSec * 1000, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.leaveReplay());
  }

  /** Com a tela preta: volta para o SCENES com esta cena escolhida. */
  private leaveReplay(): void {
    this.recap = null;
    void fadeTo(1, 0);
    this.scene.start('game', { openScenes: this.replay ?? undefined });
  }

  /**
   * O resumo: cartão "ACT 3 / THE HOUSE NEXT DOOR" no preto e depois os planos do roteiro
   * (src/level/recaps.ts), com faixas de cinema, legenda e a música do menu. A Mary anda sozinha
   * (invencível); os ratos, a gosma, o doente e o lustre andam no mesmo passo fixo dela.
   */
  private startRecap(): void {
    this.mode = 'recap';
    this.reticle.setVisible(false);
    this.hearts.setVisible(false);
    this.hud.showHelp(false);
    this.sound_.music.start();
    const motor = this.spider.motor;
    this.recap = new RecapRun(
      ACT3_RECAP,
      {
        motor,
        combat: this.combat,
        stepSpider: (dt, input) => this.spider.update(dt, input),
        stepWorld: (dt, fired) => {
          this.updateGoo(dt);
          this.handleKitchenEvents([...this.kitchen.onCombat(fired), ...this.kitchen.update(dt, motor.body)]);
        },
        cues: () => kitchenCues(this.kitchen),
      },
      TILE,
    );
    this.setBars(true, 0, RECAP.letterboxPx);
    // Preto da câmera por baixo do cartão.
    this.cameras.main.fadeOut(1, 0, 0, 0);
    this.recapWait = RECAP.titleSec;
    showChapter(`ACT ${ACT.number}`, SCENES.find((sc) => sc.id === 'act3-recap')?.name ?? ACT.name);
    this.time.delayedCall(RECAP.skipHintAfterSec * 1000, () => {
      if (this.mode === 'recap') this.showSkipHint(true);
    });
  }

  /** Um quadro do resumo: cartão, diretor em passos fixos, cortes, legenda e cartas. */
  private updateRecap(dt: number): void {
    const rec = this.recap;
    if (!rec) return;
    if (this.recapWait > 0) {
      this.recapWait -= dt;
      return;
    }
    const out = rec.advance(dt);
    if (out.webShots > 0) this.sound_.sfx.webShot('rope');
    this.handleCombatEvents(out.combat);
    for (const e of out.events) {
      if (e.type === 'shot') this.cutTo(e.index);
      else if (e.type === 'read') this.glimpseLetter(e.letter, e.sec);
      else this.leaveReplay();
    }
    this.updateMoans(dt);
    // Fim do plano: escurece para o corte (no último, mais devagar, e a música vai junto).
    const left = rec.director.holdLeft;
    const last = rec.director.shot === ACT3_RECAP.length - 1;
    const fade = last ? RECAP.endFadeSec : RECAP.cutSec;
    if (left !== null && left <= fade && !this.recapCut) {
      this.recapCut = true;
      showCaption(null);
      this.cameras.main.fadeOut(fade * 1000, 0, 0, 0);
      if (last) this.sound_.music.stop(fade);
    }
  }

  /** Corte para o plano `index`: a Mary já está no começo dele; câmera, zoom, legenda e clareia. */
  private cutTo(index: number): void {
    const shot = ACT3_RECAP[index];
    const cam = this.cameras.main;
    const b = this.spider.motor.body;
    const look = shot.look ?? { x: 0, y: 0 };
    cam.setZoom(shot.zoom);
    cam.startFollow(b, true, VIEW.cameraLerp, VIEW.cameraLerp);
    cam.setFollowOffset(-look.x, -look.y);
    cam.centerOn(b.x + look.x, b.y + look.y);
    cam.fadeIn(RECAP.cutSec * 1000, 0, 0, 0);
    this.recapCut = false;
    showCaption(shot.caption ?? null);
  }

  /** Lendo a carta no resumo: a página aparece menor, por cima do plano, e some sozinha. */
  private glimpseLetter(id: string, sec: number): void {
    const letter = ACT3_LETTERS.find((l) => l.id === id);
    if (!letter) return;
    this.recapLetters.markRead(letter.id);
    this.reader.show(letter, true);
    this.sound_.sfx.paper();
    this.time.delayedCall(Math.max(0, sec - 0.35) * 1000, () => {
      if (this.mode !== 'recap') return;
      this.reader.hide();
      this.sound_.sfx.paper();
    });
  }

  // ---------- quadro a quadro ----------

  update(time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 1 / 30);
    const pi = this.playerInput;
    const m = this.spider.motor;
    document.body.classList.toggle('pad', pi.device === 'gamepad');
    let input = pi.read(m.body);
    const pad = pi.padFrame;
    if (pad?.musicPressed) this.sound_.hub.toggleMute();

    switch (this.mode) {
      case 'paused':
        if (pad?.navY) this.pauseMenu.move(pad.navY);
        if (pad?.confirmPressed) this.pauseMenu.confirm();
        else if (pad?.trapPressed || pad?.pausePressed) this.resume();
        return;
      case 'actEnd':
        if (pad?.confirmPressed || pad?.pausePressed) this.actEnd.confirm();
        return;
      case 'reading':
        // F, Espaço, Y ou A: próxima página (fecha na última). B ou Start: fecha. LB/RB: vira.
        if (pad?.trapPressed || pad?.pausePressed) this.closeLetter();
        else if (input.readPressed || input.jumpPressed || pad?.confirmPressed) this.advanceLetter();
        else if (pad?.navX && this.reader.turn(pad.navX)) this.sound_.sfx.paper();
        return;
      case 'talking': {
        const blips = this.dialogue.update(dt);
        for (let i = 0; i < blips; i++) this.sound_.sfx.voice(this.dialogue.sad);
        if (input.readPressed || input.jumpPressed || pad?.confirmPressed || pad?.readPressed) this.advanceDialogue();
        placeBars(this.cameras.main, this.bars, this.barH.h);
        return;
      }
    }

    // No resumo: A, B ou Start pulam.
    if (this.mode === 'recap' && (pad?.confirmPressed || pad?.pausePressed || pad?.trapPressed)) this.exitReplay();
    if (this.mode === 'play' && pad?.pausePressed) {
      this.togglePause();
      return;
    }

    const cam = this.cameras.main;
    for (const thunder of this.atmosphere.update(dt, cam.worldView)) this.sound_.storm.thunder(thunder);
    const light = (x: number, y: number) => this.atmosphere.lightAt(x, y);
    // No resumo a gosma anda no passo fixo dele (sempre igual aos testes).
    if (this.mode !== 'recap') this.updateGoo(dt);

    if (this.mode === 'play' || this.mode === 'dying') this.frameFloor();
    if (this.mode === 'play') {
      if (this.graceLeft > 0) {
        this.graceLeft -= dt;
        input = { ...input, jumpPressed: false, webPressed: false, webHeld: false, attackPressed: false, trapPressed: false, readPressed: false };
      }
      this.updatePlay(dt, input);
    } else if (this.mode === 'recap') {
      this.updateRecap(dt);
    } else {
      // Morte e saída pela janela: o mundo continua (ratos, doente), sem controle.
      if (this.mode === 'dying') this.spider.update(dt, emptyInput());
      if (this.mode === 'ending') this.spider.sprite.x -= WINDOW_CUT.exitWalkSpeed * dt;
      this.combat.update(dt, m);
      this.kitchen.update(dt, null);
      this.reader.hidePrompt();
      this.runTimeline(dt);
    }

    this.combatView.update(dt, time, light);
    this.sickView.update(time, light);
    this.gooView.update(dt, time, cam.worldView, this.atmosphere.storm.flash);
    this.letters.update(time, this.mode === 'recap' ? this.recapLetters : act3Letters, light);
    this.updateSpiderLook(time, dt);
    placeBars(cam, this.bars, this.barH.h);
    if (this.debug) this.drawDebug();
  }

  private updatePlay(dt: number, input: SpiderInput): void {
    const m = this.spider.motor;
    const pi = this.playerInput;
    const sfx = this.sound_.sfx;

    // Envenenada: lenta, pulo fraco e sem teia nenhuma.
    this.poison.applyTo(m);
    if (!this.poison.canWeb) input = { ...input, webPressed: false, webHeld: false, attackPressed: false, trapPressed: false };
    const hadRope = m.rope !== null;
    this.spider.update(dt, input);
    if (input.webPressed) sfx.webShot('rope');
    if (!hadRope && m.rope && pi.padFrame?.webHeld) pi.rumble();

    if (this.goo.touches(m.body) && this.poison.apply()) {
      m.rope = null;
      sfx.poisoned();
      this.cameras.main.shake(160, 0.006);
      pi.rumble(GAMEPAD.rumbleHurt);
      this.showPoison(true);
      this.poisonSecond = Math.ceil(this.poison.left);
    }
    if (this.poison.update(dt)) {
      this.die();
      return;
    }
    if (this.poison.active) {
      const sec = Math.ceil(this.poison.left);
      if (sec < this.poisonSecond) sfx.poisonTick();
      this.poisonSecond = sec;
    }

    const events: CombatEvent[] = [];
    if (input.attackPressed) events.push(...this.combat.fire('attack', m.body, this.shotDir(input)));
    if (input.trapPressed) events.push(...this.combat.fire('trap', m.body, this.shotDir(input)));
    events.push(...this.combat.update(dt, m));
    this.handleCombatEvents(events);
    if (this.mode !== 'play') return;

    this.handleKitchenEvents([...this.kitchen.onCombat(events), ...this.kitchen.update(dt, this.combat.health.dead ? null : m.body)]);
    if (this.mode !== 'play') return;
    this.updateMoans(dt);

    const attached = m.surface !== 'air';
    const cp = nextCheckpoint(ACT3_CHECKPOINTS, this.checkpoint, m.body, attached, TILE);
    if (cp > this.checkpoint) {
      this.checkpoint = cp;
      sfx.checkpoint();
      this.showToast('CHECKPOINT');
    }

    this.updateLetterPrompt(input);
    if (this.mode !== 'play') return;
    const health = this.combat.health;
    this.hearts.update(health.hp, dt);
    this.hearts.setTint(this.poison.active ? PAL.intro.goo : null);
    const left = Math.ceil(this.poison.left);
    this.poisonPips.forEach((p, i) => p.setVisible(this.poison.active && i >= POISON.sec - left));
    this.updateReticle(input);

    if (inRoofHole(m.body, ACT3_WINDOW, TILE)) this.startEnding();
  }

  /** Dano na Mary (rato, doente, lustre): envenenada, morre na hora. Devolve se valeu. */
  private hurt(fromX: number, knock: { x: number; y: number }): boolean {
    const health = this.combat.health;
    if (this.poison.active) {
      health.hp = 0;
      this.feelHurt();
      this.die();
      return true;
    }
    if (!health.hit()) return false;
    const m = this.spider.motor;
    m.rope = null;
    m.knockback((Math.sign(m.body.x - fromX) || 1) * knock.x, -knock.y);
    this.feelHurt();
    if (health.dead) this.die();
    return true;
  }

  private feelHurt(): void {
    this.sound_.sfx.spiderHurt();
    this.cameras.main.shake(140, 0.008);
    this.playerInput.rumble(GAMEPAD.rumbleHurt);
  }

  private handleCombatEvents(events: CombatEvent[]): void {
    const sfx = this.sound_.sfx;
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
        case 'spiderHurt':
          // O combate já tirou a vida; envenenada, a mordida mata.
          if (this.poison.active) {
            this.combat.health.hp = 0;
            this.die();
          }
          this.feelHurt();
          break;
        case 'spiderDied':
          this.die();
          break;
      }
    }
  }

  /**
   * O doente e o lustre (src/systems/kitchen.ts): gemidos, tapas, a corda, a queda (e quem estiver embaixo)
   * e as conquistas. No resumo a Mary é invencível e nada dá conquista.
   */
  private handleKitchenEvents(events: KitchenEvent[]): void {
    const sfx = this.sound_.sfx;
    const { sick, chandelier: c } = this;
    const mode = this.mode;
    for (const e of events) {
      switch (e.type) {
        case 'groan':
          this.groan(sick.x, 0.7, sick.aggro ? 0.85 : 0.6);
          break;
        case 'swing':
          sfx.swipe();
          break;
        case 'slap':
          if (mode === 'play') this.hurt(sick.x, SICK.knockback);
          break;
        case 'sickShot':
          this.groan(sick.x, 1, 0.9);
          break;
        case 'ropeCut':
          sfx.ropeSnap();
          break;
        case 'crash':
          sfx.crash();
          this.cameras.main.shake(260, 0.012);
          this.gooView.shards(c.x, c.box.bottom - 2);
          break;
        case 'sickDefeated':
          if (!this.replay) achieve({ type: 'sickDefeated', act: ACT.id, byChandelier: e.byChandelier });
          this.groan(sick.x, 1.1, 1);
          break;
        case 'maryCrushed':
          if (mode === 'play') this.hurt(c.x, CHANDELIER.knockback);
          break;
      }
      if (this.mode !== mode) return;
    }
  }

  /** Gemido do doente (ou da horda lá fora), com o lado da tela e o volume pela distância. */
  private groan(x: number, volume: number, pitchSeed: number): void {
    const view = this.cameras.main.worldView;
    const pan = Math.max(-0.9, Math.min(0.9, (x - view.centerX) / (view.width / 2)));
    this.sound_.zombies.groan({ pan, volume, seed: Math.floor(pitchSeed * 1000 + this.rng() * 1000) });
  }

  /** No 1º andar, de vez em quando um gemido abafado vem de baixo; o som abre no térreo. */
  private updateMoans(dt: number): void {
    const b = this.spider.motor.body;
    const upstairs = inZone(b, UPSTAIRS, TILE);
    const downstairs = Math.floor(b.y / TILE) >= KITCHEN.y0;
    this.sound_.zombies.setDistance(downstairs ? 0.25 : upstairs ? 0.8 : 1, 0.6);
    if (!upstairs) return;
    this.moanLeft -= dt;
    if (this.moanLeft > 0) return;
    this.moanLeft = this.between(ACT3.moanGapSec);
    this.groan(SICK_DEF.x, 0.7, 0.4);
  }

  private updateGoo(dt: number): void {
    const sfx = this.sound_.sfx;
    const view = this.cameras.main.worldView;
    const b = this.spider.motor.body;
    const near = (x: number, y: number) => Math.max(0, 1 - Math.hypot(x - b.x, y - b.y) / 260);
    const onScreen = (x: number, y: number) => x > view.x - 20 && x < view.right + 20 && y > view.y - 20 && y < view.bottom + 20;
    for (const e of this.goo.update(dt, this.grid)) {
      if (e.type === 'splash') {
        this.gooView.splash(e.x, e.y, false);
        if (onScreen(e.x, e.y)) sfx.gooPlop(near(e.x, e.y));
      } else {
        const { x, y } = e.jet.def;
        if (!onScreen(x, y)) continue;
        if (e.type === 'jetWarn') sfx.gurgle(near(x, y));
        else sfx.gooSpray(near(x, y));
      }
    }
    for (const e of this.water.update(dt, this.grid)) {
      if (e.type !== 'splash') continue;
      this.gooView.splash(e.x, e.y, true);
      if (onScreen(e.x, e.y) && near(e.x, e.y) > 0.3) sfx.drip();
    }
  }

  /** Luz do lugar, o verde do veneno (balançando e soltando bolhas) e o dano piscando. */
  private updateSpiderLook(time: number, dt: number): void {
    const m = this.spider.motor;
    const sp = this.spider.sprite;
    const [r, g, b] = this.atmosphere.lightAt(m.body.x, m.body.y);
    this.spider.setLight([r, g, b], LIGHT.spiderMinLight);
    if (this.poison.active) {
      const k = 0.45 + 0.4 * this.poison.progress;
      const ch = (v: number) => Math.round(Math.max(LIGHT.spiderMinLight, Math.min(1, v)) * 255);
      sp.setTint(mixColor((ch(r) << 16) | (ch(g) << 8) | ch(b), POISON.tint, k));
      if (this.mode === 'play') {
        sp.setAngle(sp.angle + Math.sin(time / 120) * POISON.wobbleDeg);
        this.bubbleClock += dt;
        if (this.bubbleClock > 1 / POISON.bubblesPerSec) {
          this.bubbleClock = 0;
          this.gooView.bubble(m.body.x + (this.rng() - 0.5) * 8, m.body.y - 4);
        }
      }
    }
    if (this.mode === 'dying') {
      sp.setFlipY(true);
      if (!this.poison.active) sp.setTint(0xff4040);
      return;
    }
    if (this.mode === 'play') this.spider.setDamageFx(this.combat.health.invulnLeft, PLAYER.invulnSec, false);
  }

  /** "READ" em cima da carta perto (só grudada numa superfície); F / Y abre. */
  private updateLetterPrompt(input: SpiderInput): void {
    const m = this.spider.motor;
    this.nearLetter = m.surface === 'air' ? null : nearbyLetter(ACT3_LETTERS, m.body, TILE, LETTER.readRadius);
    if (!this.nearLetter) {
      this.reader.hidePrompt();
      return;
    }
    if (input.readPressed) {
      this.openLetter(this.nearLetter);
      return;
    }
    const c = letterCenter(this.nearLetter, TILE);
    const view = this.cameras.main.worldView;
    const rect = this.game.canvas.getBoundingClientRect();
    const k = rect.width / VIEW.width;
    this.reader.showPrompt(rect.left + (c.x - view.x) * k, rect.top + (c.y - 10 - view.y) * k);
  }

  // ---------- a morte ----------

  private runTimeline(dt: number): void {
    if (!this.tl || this.mode !== 'dying') return;
    this.elapsed += dt;
    const at = this.tl.at(this.elapsed);
    if (!at) {
      this.tl = null;
      this.respawn();
      return;
    }
    if (at.index !== this.stepIndex) {
      this.stepIndex = at.index;
      if (at.name === 'fade') this.cameras.main.fadeOut(ACT3.deathFadeSec * 1000, 0, 0, 0);
    }
  }

  // ---------- desenho e ajuda ----------

  /** Direção das teias de combate: o mouse aponta direto; no controle, a mira gruda num alvo perto. */
  private shotDir(input: SpiderInput): Vec2 {
    const b = this.spider.motor.body;
    const pi = this.playerInput;
    if (pi.aimDevice === 'gamepad' && pi.padFrame) {
      const targets = [...this.combat.ratTargets];
      if (this.sick.alive) targets.push({ x: this.sick.x, y: this.sick.y - SICK.h * 0.6, vx: 0, vy: 0, half: 8 });
      if (this.chandelier.state === 'hanging') {
        const end = this.chandelier.ropeEnd;
        targets.push({ x: (end.x + CHANDELIER_DEF.x) / 2, y: (end.y + CHANDELIER_DEF.y) / 2, vx: 0, vy: 0, half: 3 });
      }
      return aimAtTarget(this.grid, b, pi.padFrame.aimDir, targets, SHOTS.attack.range, SHOTS.aimAssistDeg);
    }
    const dx = input.aim.x - b.x;
    const dy = input.aim.y - b.y;
    const d = Math.hypot(dx, dy);
    return d > 0 ? { x: dx / d, y: dy / d } : { x: this.spider.motor.facing, y: 0 };
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
    // Envenenada: sem teia, a mira fica apagada.
    const ok = hit && this.poison.canWeb;
    this.reticle.setPosition(Math.round(at.x), Math.round(at.y));
    this.reticle.setTint(ok ? 0xffffff : this.poison.active ? PAL.intro.gooDark : 0x777777).setAlpha(ok ? 1 : 0.7);
  }

  /** Faixas pretas de cinema (entram e saem deslizando; postas a cada quadro compensando o zoom). */
  private setBars(on: boolean, durationMs = 500, px = BARS_PX): void {
    const h = on ? px : 0;
    this.tweens.killTweensOf(this.barH);
    if (durationMs === 0) this.barH.h = h;
    else this.tweens.add({ targets: this.barH, h, duration: durationMs });
  }

  private showSkipHint(on: boolean): void {
    this.skipHint?.classList.toggle('hidden', !on);
  }

  private showPoison(on: boolean): void {
    this.poisonEl?.classList.toggle('on', on);
  }

  private showToast(text: string): void {
    const el = this.toast;
    if (!el) return;
    el.textContent = text;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }

  private between([min, max]: readonly [number, number]): number {
    return min + this.rng() * (max - min);
  }

  private drawDebug(): void {
    const m = this.spider.motor;
    const b = m.body;
    const g = this.debugGfx;
    g.clear();
    g.lineStyle(1, 0x00ff66, 1).strokeRect(b.x - b.half, b.y - b.half, b.half * 2, b.half * 2);
    for (const r of this.combat.rats) {
      if (r.alive) g.lineStyle(1, 0xff3366, 1).strokeRect(r.body.x - r.body.half, r.body.y - r.body.half, r.body.half * 2, r.body.half * 2);
    }
    this.sickView.drawDebug(g);
    this.hud.setDebug(
      [
        `mode: ${this.mode}  surface: ${m.surface}`,
        `pos: ${b.x.toFixed(1)}, ${b.y.toFixed(1)}`,
        `tile: ${Math.floor(b.x / TILE)}, ${Math.floor(b.y / TILE)}`,
        `hp: ${this.combat.health.hp}/${this.combat.health.max}`,
        `poison: ${this.poison.active ? this.poison.left.toFixed(1) + 's' : '-'}`,
        `checkpoint: ${this.checkpoint} (${ACT3_CHECKPOINTS[this.checkpoint].name})`,
        `sick: ${this.sick.state} hp ${this.sick.hp}${this.sick.aggro ? ' (aggro)' : ''}`,
        `chandelier: ${this.chandelier.state}`,
        ...this.combat.rats.map((r, i) => `rat ${i}: ${r.state} hp ${r.hp}`),
      ].join('\n'),
    );
  }
}

