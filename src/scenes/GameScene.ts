// Cena principal: tela inicial, seleção de atos, jogo, cartas, pausa, morte e fim do ato.
// Cenário, atmosfera, aranha, ratos, câmera, mira, som e debug.
import Phaser from 'phaser';
import { GAMEPAD, INTRO, LETTER, LIGHT, PLAYER, RECAP, SHOTS, STREET, TILE, TITLE, TRANSITION, VIEW, WEB } from '../config';
import { getLevelArt } from '../art/levelArt';
import { TEX } from '../art/textures';
import { type Sound, getSound } from '../audio/sound';
import { Atmosphere } from '../entities/Atmosphere';
import { CombatView } from '../entities/CombatView';
import { LetterSprites } from '../entities/LetterSprites';
import { Spider } from '../entities/Spider';
import { type Act, ACTS } from '../level/acts';
import { RATS, ROOF_HOLE, SPAWN } from '../level/houseMap';
import { type Letter, LETTERS } from '../level/letters';
import { ACT1_RECAP } from '../level/recaps';
import { SCENES, type SceneId } from '../level/scenes';
import type { LevelGrid } from '../physics/LevelGrid';
import type { Vec2 } from '../physics/surfaces';
import { Combat, type CombatEvent, aimAtTarget } from '../systems/combat';
import { type SpiderInput, emptyInput } from '../systems/input';
import { LetterLog, letterCenter, nearbyLetter } from '../systems/letters';
import { currentActIndex, hasProgress, recordActEnd } from '../systems/progress';
import { RecapRun } from '../systems/recap';
import { inRoofHole } from '../systems/roofHole';
import { raycastWeb } from '../systems/webRope';
import { ActEnd } from './ActEnd';
import { ActsMenu } from './ActsMenu';
import { HeartsHud } from './HeartsHud';
import { Hud } from './Hud';
import { LetterReader } from './LetterReader';
import { achieve } from './AchievementToast';
import { AchievementsScreen } from './AchievementsScreen';
import { type PauseAction, PauseMenu } from './PauseMenu';
import { PlayerInput } from './PlayerInput';
import { ScenesScreen } from './ScenesScreen';
import { placeBars, showCaption } from './cinema';
import { type TitleAction, TitleScreen } from './TitleScreen';
import { type WebPullOptions, fadeTo, hideChapter, playActTransition, showChapter, webPull } from './Transitions';
import { hasSave, loadProgress, saveProgress, startNewSave } from './progressStore';
import { markSceneSeen } from './sceneStore';

/**
 * title: tela inicial (menu) | acts: seleção de atos | extras: SCENES ou ACHIEVEMENTS |
 * leaving: escurecendo para a cutscene (ou para uma cena do SCENES) |
 * emerge: aranha saindo do buraco | play: jogando | paused: menu de pausa | reading: lendo uma carta |
 * dying: tela escurecendo depois de morrer |
 * exiting: entrou no buraco do telhado, escurecendo para a cutscene da rua (depois a cena dorme) |
 * actEnd: tela de fim do ato (depois da cutscene da rua) |
 * recap: o resumo do ato 1, assistido pelo SCENES (a aranha anda sozinha; dá para pular).
 */
type Mode = 'title' | 'acts' | 'extras' | 'leaving' | 'emerge' | 'play' | 'paused' | 'reading' | 'dying' | 'exiting' | 'actEnd' | 'recap';

/** Telas do menu que abrem com a teia (além do LOAD GAME). */
type Extras = 'scenes' | 'achievements';

/** Cartas lidas na jogada atual do ato: sobrevivem a morrer e a "Restart"; zeram ao escolher o ato. */
const runLetters = new LetterLog();

/** Elemento do HTML por id (telas do menu e botões onde a teia da transição engata). */
const el = (id: string) => document.getElementById(id);

/** Enquanto a tela escurece no buraco do telhado, a aranha continua subindo sozinha. */
const CLIMB_OUT: SpiderInput = { ...emptyInput(), move: { x: 0, y: -1 } };

/**
 * Dados para `scene.start`/`restart`: `skipTitle` vai direto ao jogo (morte, Restart);
 * `emerge` (vindo da cutscene) faz a aranha sair do buraco de rato antes de liberar o controle;
 * `openActs` (depois do fim do ato) abre direto na seleção de atos; `openScenes` (voltando de uma cena
 * assistida pelo SCENES) abre o SCENES com ela escolhida; `recap` roda o resumo do ato 1.
 */
interface SceneData {
  skipTitle?: boolean;
  emerge?: boolean;
  openActs?: boolean;
  openScenes?: SceneId;
  recap?: boolean;
}

/** O ato que esta cena joga (por enquanto só existe a casa do ato 1). */
const ACT = ACTS[0];

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
  private actsMenu!: ActsMenu;
  private scenesScreen!: ScenesScreen;
  private achievementsScreen!: AchievementsScreen;
  /** Qual tela do menu está aberta no modo 'extras' (para o BACK voltar da certa). */
  private extras: Extras = 'scenes';
  private actEnd!: ActEnd;
  private letters!: LetterSprites;
  private reader!: LetterReader;
  /** Carta perto da aranha neste quadro (mostra o "READ"). */
  private nearLetter: Letter | null = null;
  private sound_!: Sound;
  private mode: Mode = 'title';
  /** Depois do Play/Resume, ignora pulo e teias por um instante (a tecla do menu não vira ação). */
  private graceLeft = 0;
  /** Segundos restantes da aranha saindo do buraco. */
  private emergeLeft = 0;
  private debug = false;
  /** Uma transição de tela está em andamento (ignora outro PLAY/BACK/escolha no meio). */
  private fading = false;
  /** Resumo do ato 1 (modo 'recap'): quem pilota a aranha, as cartas "lidas" nele e as faixas de cinema. */
  private recap: RecapRun | null = null;
  private recapLetters = new LetterLog();
  private recapBars: Phaser.GameObjects.Rectangle[] = [];
  /** Cartão do começo: segundos até o primeiro plano. */
  private recapWait = 0;
  /** Já escureceu para o corte deste plano / está saindo do resumo. */
  private recapCut = false;
  private recapLeaving = false;

  constructor() {
    super('game');
  }

  create(data: SceneData = {}): void {
    // O Phaser reaproveita a mesma instância da cena ao reiniciar: todo estado precisa voltar ao início aqui.
    // (A trava da transição ficava ligada depois de escolher o ato 1 e bloqueava a seleção de atos para sempre.)
    this.mode = 'title';
    this.graceLeft = 0;
    this.fading = false;
    this.extras = 'scenes';
    this.recap = null;
    this.recapLetters = new LetterLog();
    this.recapBars = [];
    this.recapCut = false;
    this.recapLeaving = false;
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
      if (this.mode === 'play' || this.mode === 'recap') footsteps.step(this.spider.motor.running);
    });
    // O resumo é sempre o mesmo: os ratos usam a semente fixa (igual aos testes).
    this.combat = new Combat(this.grid, RATS, data.recap ? RECAP.seed : seed);
    this.combatView = new CombatView(this, this.combat);
    this.playerInput = new PlayerInput(this, this.grid);
    this.reticle = this.add.image(0, 0, TEX.reticle).setDepth(10).setVisible(false);
    this.debugGfx = this.add.graphics().setDepth(20);
    this.hud = new Hud();
    this.hearts = new HeartsHud(this, PLAYER.maxHp);
    this.hearts.setVisible(false);
    this.letters = new LetterSprites(this, LETTERS);
    this.reader = new LetterReader(() => this.closeLetter());
    this.title = new TitleScreen((a) => this.onTitleAction(a), !data.skipTitle && !data.openActs && !data.openScenes && !data.recap);
    this.title.setEnabled('load', hasSave());
    this.title.focus(hasSave() ? 'load' : 'new');
    this.scenesScreen = new ScenesScreen(
      (id) => void this.playScene(id),
      () => this.closeExtras(),
    );
    this.achievementsScreen = new AchievementsScreen(() => this.closeExtras());
    this.pauseMenu = new PauseMenu((a) => this.onPauseAction(a));
    this.actsMenu = new ActsMenu(
      (act) => void this.startAct(act),
      () => this.backToTitle(),
    );
    this.actEnd = new ActEnd(() => {
      // A tela de fim já é preta: o preto fica por cima enquanto a cena reinicia na seleção de atos.
      void fadeTo(1, 0);
      this.scene.restart({ openActs: true } satisfies SceneData);
    });
    // A cutscene da rua acorda esta cena quando acaba: é o fim do ato.
    const onWake = () => this.endAct(true);
    this.events.on('wake', onWake);
    this.events.once('shutdown', () => {
      this.title.destroy();
      this.pauseMenu.destroy();
      this.actsMenu.destroy();
      this.scenesScreen.destroy();
      showCaption(null);
      hideChapter();
      this.achievementsScreen.destroy();
      this.actEnd.destroy();
      this.reader.destroy();
      this.anims.resumeAll();
      this.events.off('wake', onWake);
    });

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.grid.widthPx, this.grid.heightPx);
    cam.setRoundPixels(true);

    if (data.recap) {
      this.startRecap();
    } else if (data.skipTitle) {
      this.startPlay();
      if (data.emerge) this.beginEmerge();
    } else {
      cam.centerOn(TITLE.cameraX, TITLE.cameraY);
      this.hud.showHelp(false);
      this.sound_.music.start();
      if (data.openActs) this.openActs(true);
      else if (data.openScenes) this.openScenes(data.openScenes);
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
    kb?.on('keydown-ENTER', () => {
      this.closeLetter();
      this.skipRecap();
    });
    kb?.on('keydown-SPACE', () => this.skipRecap());

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

  /** Uma opção do menu principal. */
  private onTitleAction(action: TitleAction): void {
    if (this.fading) return;
    switch (action) {
      case 'new':
        // Só pergunta se tem algo para perder (ato terminado ou carta achada).
        if (hasProgress(loadProgress())) this.title.askConfirm(() => this.newGame());
        else this.newGame();
        break;
      case 'load':
        this.openActs();
        break;
      case 'scenes':
      case 'achievements':
        this.openExtras(action);
        break;
    }
  }

  /** NEW GAME: troca o jogo salvo por um vazio e começa o ato 1 (gosma verde e cutscene). */
  private newGame(): void {
    startNewSave();
    void this.startAct(ACTS[0]);
  }

  /**
   * LOAD GAME: a teia puxa o menu para a direita e traz a seleção de atos, no ato mais adiantado (a
   * música continua). `fromBlack`: a tela já está preta (voltando do fim do ato), só clareia.
   */
  private openActs(fromBlack = false): void {
    this.mode = 'acts';
    const show = () => {
      const progress = loadProgress();
      this.actsMenu.show(progress, currentActIndex(progress, ACTS));
    };
    if (fromBlack) {
      this.title.hide();
      show();
      void fadeTo(0, TRANSITION.fadeInSec);
      return;
    }
    void this.withPull({ from: el('title'), to: el('acts'), hook: this.title.selectedButton, dir: 1, showTo: show, hideFrom: () => this.title.hide() });
  }

  /** SCENES (as cutscenes vistas e os resumos) ou ACHIEVEMENTS (as conquistas): a teia puxa o menu e traz a tela. */
  private openExtras(kind: Extras): void {
    if (this.fading) return;
    this.mode = 'extras';
    this.extras = kind;
    void this.withPull({
      from: el('title'),
      to: el(kind),
      hook: this.title.selectedButton,
      dir: 1,
      showTo: () => (kind === 'achievements' ? this.achievementsScreen.show() : this.scenesScreen.show()),
      hideFrom: () => this.title.hide(),
    });
  }

  /** Voltar: a teia vem da esquerda, engata no BACK e puxa a tela para a esquerda, trazendo o menu. */
  private closeExtras(): void {
    const kind = this.extras;
    void this.withPull({
      from: el(kind),
      to: el('title'),
      hook: el(`${kind}-back`),
      dir: -1,
      showTo: () => this.title.reopen(),
      hideFrom: () => {
        if (kind === 'achievements') this.achievementsScreen.hide();
        else this.scenesScreen.hide();
        this.mode = 'title';
      },
    });
  }

  /** Voltando de uma cena assistida pelo SCENES: a tela está preta; abre o SCENES nela e clareia. */
  private openScenes(focus: SceneId): void {
    this.mode = 'extras';
    this.extras = 'scenes';
    this.title.hide();
    this.scenesScreen.show(focus);
    void fadeTo(0, TRANSITION.fadeInSec);
  }

  /**
   * Assistir uma cena do SCENES: escurece e abre a cutscene (ou o resumo) em modo "replay"; no fim, ou
   * pulando, ela volta para cá com `openScenes`. A música continua só nos resumos.
   */
  private async playScene(id: SceneId): Promise<void> {
    if (this.fading) return;
    this.fading = true;
    this.mode = 'leaving';
    if (SCENES.find((s) => s.id === id)?.kind !== 'recap') this.sound_.music.stop();
    await fadeTo(1, RECAP.enterFadeSec);
    this.scenesScreen.hide();
    this.title.hide();
    switch (id) {
      case 'act1-intro':
        this.scene.start('intro', { replay: true });
        break;
      case 'act1-recap':
        this.scene.restart({ recap: true } satisfies SceneData);
        break;
      case 'act1-street':
        this.scene.start('street', { replay: true });
        break;
      default:
        this.scene.start('act2', { replay: id });
    }
  }

  private backToTitle(): void {
    void this.withPull({
      from: el('acts'),
      to: el('title'),
      hook: el('acts-back'),
      dir: -1,
      showTo: () => this.title.reopen(),
      hideFrom: () => {
        this.actsMenu.hide();
        this.mode = 'title';
      },
    });
  }

  /** Uma transição de menu por vez: teclas e botões no meio dela são ignorados. */
  private async withPull(o: WebPullOptions): Promise<void> {
    if (this.fading) return;
    this.fading = true;
    await webPull(o);
    this.fading = false;
  }

  /** Escolheu um ato: a música some e toca a transição do ato (gosma no 1, teia e vento no 2). */
  private async startAct(act: Act): Promise<void> {
    if (this.fading) return;
    this.fading = true;
    this.mode = 'leaving';
    this.sound_.music.stop();
    this.hud.showHelp(false);
    if (act.id === 'act1') {
      runLetters.clear();
      await playActTransition('goo');
    } else {
      await playActTransition('web');
    }
    // O menu (NEW GAME) ou a seleção de atos ficaram embaixo da transição: some com eles antes da cena nova.
    this.title.hide();
    this.actsMenu.hide();
    if (act.id === 'act1') this.scene.start('intro');
    else this.scene.start('act2', { intro: true });
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
    if (this.mode === 'recap') this.skipRecap();
    else if (this.mode === 'play') this.pauseGame();
    else if (this.mode === 'paused') this.resumeGame();
    else if (this.mode === 'reading') this.closeLetter();
  }

  private pauseGame(): void {
    this.mode = 'paused';
    this.reader.hidePrompt();
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

  /** Entrou no buraco do telhado: a tela escurece e a cutscene da rua começa. O jogo dorme até ela acabar. */
  goToStreet(): void {
    if (this.mode !== 'play') return;
    this.mode = 'exiting';
    this.reticle.setVisible(false);
    this.hud.showHelp(false);
    this.hud.showDebug(false);
    const cam = this.cameras.main;
    cam.fadeOut(STREET.exitFadeSec * 1000, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.launch('street');
      this.scene.sleep();
    });
  }

  /**
   * Fim do ato: salva o progresso e mostra a tela "END OF ACT" por cima do preto. Vem da cutscene da rua
   * (a tela já está preta); `__scene.endAct()` no console escurece antes.
   */
  endAct(fromStreet = false): void {
    if (this.mode === 'actEnd') return;
    this.mode = 'actEnd';
    this.reticle.setVisible(false);
    this.hearts.setVisible(false);
    this.hud.showHelp(false);
    this.reader.hidePrompt();
    saveProgress(recordActEnd(loadProgress(), ACT.id, runLetters.ids));
    achieve({ type: 'actEnd', act: ACT.id });
    // Terminar o ato libera o resumo dele no SCENES.
    markSceneSeen('act1-recap');
    const show = () => this.actEnd.show(ACT, runLetters.count(ACT.letters), ACTS[ACTS.indexOf(ACT) + 1]);
    if (fromStreet) {
      show();
      return;
    }
    const cam = this.cameras.main;
    cam.fadeOut(600, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, show);
  }

  // ---------- resumo do ato 1 (SCENES) ----------

  /**
   * O resumo: cartão "ACT 1 / THE HOUSE" no preto e depois os planos do roteiro (src/level/recaps.ts), com
   * faixas de cinema, legenda e a música do menu. A aranha anda sozinha (invencível); os ratos são de verdade.
   */
  private startRecap(): void {
    this.mode = 'recap';
    this.hud.showHelp(false);
    this.sound_.music.start();
    const motor = this.spider.motor;
    this.recap = new RecapRun(ACT1_RECAP, { motor, combat: this.combat, stepSpider: (dt, input) => this.spider.update(dt, input) }, TILE);
    const bar = () => this.add.rectangle(0, 0, VIEW.width, RECAP.letterboxPx, 0x000000).setOrigin(0, 0).setScrollFactor(0).setDepth(30);
    this.recapBars = [bar(), bar()];
    const cam = this.cameras.main;
    // Preto da câmera por baixo do cartão; o preto do HTML (de quem abriu a cena) sai.
    cam.fadeOut(1, 0, 0, 0);
    void fadeTo(0, 0);
    this.recapWait = RECAP.titleSec;
    const scene = SCENES.find((s) => s.id === 'act1-recap');
    showChapter(`ACT ${ACT.number}`, scene?.name ?? ACT.name);
  }

  /** Um quadro do resumo: cartão, diretor em passos fixos, cortes, legenda, cartas e sons. */
  private updateRecap(dt: number, time: number): void {
    const cam = this.cameras.main;
    for (const thunder of this.atmosphere.update(dt, cam.worldView)) this.sound_.storm.thunder(thunder);
    const light = (x: number, y: number) => this.atmosphere.lightAt(x, y);
    this.playerInput.read(this.spider.motor.body);
    const pad = this.playerInput.padFrame;
    if (pad?.musicPressed) this.sound_.hub.toggleMute();
    if (pad && (pad.confirmPressed || pad.pausePressed || pad.trapPressed)) this.skipRecap();
    placeBars(cam, this.recapBars, RECAP.letterboxPx);

    const rec = this.recap;
    if (!rec) return;
    if (this.recapWait > 0) {
      this.recapWait -= dt;
      this.combatView.update(dt, time, light);
      return;
    }
    const out = rec.advance(dt);
    if (out.webShots > 0) this.sound_.sfx.webShot('rope');
    this.handleCombatEvents(out.combat);
    for (const e of out.events) {
      if (e.type === 'shot') this.cutTo(e.index);
      else if (e.type === 'read') this.glimpseLetter(e.letter, e.sec);
      else this.leaveRecap();
    }
    // Fim do plano: escurece para o corte (no último, mais devagar, e a música vai junto).
    const left = rec.director.holdLeft;
    const last = rec.director.shot === ACT1_RECAP.length - 1;
    const fade = last ? RECAP.endFadeSec : RECAP.cutSec;
    if (left !== null && left <= fade && !this.recapCut) {
      this.recapCut = true;
      showCaption(null);
      cam.fadeOut(fade * 1000, 0, 0, 0);
      if (last) this.sound_.music.stop(fade);
    }
    const m = this.spider.motor;
    this.spider.setLight(light(m.body.x, m.body.y), LIGHT.spiderMinLight);
    this.spider.setDamageFx(0, PLAYER.invulnSec, false);
    this.combatView.update(dt, time, light);
    this.letters.update(time, this.recapLetters, light);
  }

  /** Corte para o plano `index`: a aranha já está no começo dele; câmera, zoom, legenda e clareia. */
  private cutTo(index: number): void {
    const shot = ACT1_RECAP[index];
    const cam = this.cameras.main;
    const b = this.spider.motor.body;
    this.spider.setDamageFx(0, PLAYER.invulnSec, false);
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
    const letter = LETTERS.find((l) => l.id === id);
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

  /** Pular o resumo (Enter/Esc/Espaço ou A/B/Start): escurece rápido e volta ao SCENES. */
  private skipRecap(): void {
    if (this.mode !== 'recap' || this.recapLeaving) return;
    this.recapLeaving = true;
    showCaption(null);
    this.reader.hide();
    const cam = this.cameras.main;
    cam.fadeOut(RECAP.cutSec * 1000, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.leaveRecap());
  }

  /** Fim do resumo: com a tela preta, volta ao SCENES com ele escolhido. */
  private leaveRecap(): void {
    this.recapLeaving = true;
    this.recap = null;
    showCaption(null);
    this.reader.hide();
    void fadeTo(1, 0);
    this.scene.restart({ openScenes: 'act1-recap' } satisfies SceneData);
  }

  /** Abre a carta (por id no console: `__scene.openLetter('table')`). O jogo pausa enquanto ela está aberta. */
  openLetter(which: Letter | string): void {
    const letter = typeof which === 'string' ? LETTERS.find((l) => l.id === which) : which;
    if (!letter || this.mode !== 'play') return;
    this.mode = 'reading';
    runLetters.markRead(letter.id);
    achieve({ type: 'letterRead', act: ACT.id, letter: letter.id });
    this.reader.hidePrompt();
    this.reader.show(letter);
    this.reticle.setVisible(false);
    this.atmosphere.setPaused(true);
    this.anims.pauseAll();
    this.sound_.sfx.paper();
  }

  private closeLetter(): void {
    if (this.mode !== 'reading') return;
    this.mode = 'play';
    this.reader.hide();
    this.reticle.setVisible(true);
    this.atmosphere.setPaused(false);
    this.anims.resumeAll();
    this.graceLeft = TITLE.inputGraceSec;
    this.sound_.sfx.paper();
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

    document.body.classList.toggle('pad', pi.device === 'gamepad');
    if (this.mode === 'recap') {
      this.updateRecap(dt, time);
      return;
    }
    if (this.mode === 'paused') {
      pi.read(m.body);
      this.handlePausedPad();
      return;
    }
    if (this.mode === 'reading') {
      // F ou Espaço no teclado; Y, B, A ou Start no controle (Esc e Enter vêm pelos eventos de tecla).
      const inp = pi.read(m.body);
      const f = pi.padFrame;
      if (f?.musicPressed) this.sound_.hub.toggleMute();
      if (inp.readPressed || inp.jumpPressed || f?.trapPressed || f?.confirmPressed || f?.pausePressed) this.closeLetter();
      return;
    }

    const cam = this.cameras.main;
    if (this.mode === 'title' || this.mode === 'acts' || this.mode === 'extras') {
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
      this.spider.update(dt, this.mode === 'exiting' ? CLIMB_OUT : emptyInput());
      this.combat.update(dt, m);
      this.combatView.update(dt, time, light);
      this.letters.update(time, runLetters, light);
      this.reader.hidePrompt();
      this.spider.setLight(light(m.body.x, m.body.y), LIGHT.spiderMinLight);
      if (this.mode === 'emerge') this.updateEmerge(dt);
      else this.spider.setDamageFx(0, PLAYER.invulnSec, this.mode === 'dying');
      return;
    }

    if (this.graceLeft > 0) {
      this.graceLeft -= dt;
      input = { ...input, jumpPressed: false, webPressed: false, webHeld: false, attackPressed: false, trapPressed: false, readPressed: false };
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
    this.letters.update(time, runLetters, light);
    this.updateLetterPrompt(input);
    if (this.mode !== 'play') return;

    const health = this.combat.health;
    this.spider.setLight(light(m.body.x, m.body.y), LIGHT.spiderMinLight);
    this.spider.setDamageFx(health.invulnLeft, PLAYER.invulnSec, false);
    this.hearts.update(health.hp, dt);
    this.updateReticle(input);

    if (this.debug) this.drawDebug();
    if (this.mode === 'play' && inRoofHole(m.body, ROOF_HOLE, TILE)) this.goToStreet();
  }

  /** "READ" em cima da carta perto (só grudada numa superfície); F / Y abre. */
  private updateLetterPrompt(input: SpiderInput): void {
    const m = this.spider.motor;
    this.nearLetter = m.surface === 'air' ? null : nearbyLetter(LETTERS, m.body, TILE, LETTER.readRadius);
    if (!this.nearLetter) {
      this.reader.hidePrompt();
      return;
    }
    if (input.readPressed) {
      this.openLetter(this.nearLetter);
      return;
    }
    // Do mundo para a janela: o canvas é escalado (Scale.FIT) e centrado.
    const c = letterCenter(this.nearLetter, TILE);
    const view = this.cameras.main.worldView;
    const rect = this.game.canvas.getBoundingClientRect();
    const k = rect.width / VIEW.width;
    this.reader.showPrompt(rect.left + (c.x - view.x) * k, rect.top + (c.y - 10 - view.y) * k);
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
          // Os ratos só voltam ao morrer ou reiniciar: matar todos numa jogada dá a conquista.
          if (this.mode !== 'recap' && this.combat.rats.every((r) => !r.alive)) achieve({ type: 'allRatsKilled', act: ACT.id });
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
      if (f.navY !== 0) this.title.move(f.navY);
      // YES e NO ficam lado a lado: ←/→ também troca.
      if (f.navX !== 0 && this.title.isAsking) this.title.move(f.navX);
      if (f.confirmPressed || f.pausePressed) this.title.confirm();
      else if (f.trapPressed) this.title.back();
      return false;
    }
    if (this.mode === 'extras') {
      if (this.extras === 'achievements') {
        if (f.trapPressed || f.confirmPressed || f.pausePressed) this.achievementsScreen.back();
        return false;
      }
      if (f.navX !== 0 || f.navY !== 0) this.scenesScreen.move(f.navX, f.navY);
      if (f.confirmPressed || f.pausePressed) this.scenesScreen.confirm();
      else if (f.trapPressed) this.scenesScreen.back();
      return false;
    }
    if (this.mode === 'acts') {
      if (f.navX !== 0) this.actsMenu.move(f.navX);
      if (f.confirmPressed || f.pausePressed) this.actsMenu.confirm();
      else if (f.trapPressed) this.actsMenu.back();
      return false;
    }
    if (this.mode === 'actEnd') {
      if (f.confirmPressed || f.pausePressed) this.actEnd.confirm();
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
