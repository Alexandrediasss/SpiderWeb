// Todas as constantes de ajuste do jogo ficam aqui.

export const TILE = 16;

export const VIEW = {
  width: 480,
  height: 270,
  cameraLerp: 0.12,
};

export const SPIDER = {
  /** Metade do lado da hitbox quadrada (10×10). */
  half: 5,
  walkSpeed: 70,
  runSpeed: 150,
  jumpSpeed: 230,
  /** Maior passo (px) ao andar numa superfície; passos pequenos tornam os cantos confiáveis. */
  stepPx: 2,
  /** Tempo após pular em que a aranha não gruda (s). */
  stickCooldown: 0.12,
  /** Velocidade com que o ângulo do sprite segue o alvo (por segundo). */
  rotateLerp: 22,
  /** Tamanho de um quadro do sprite (os pés ficam na última linha). */
  frameW: 22,
  frameH: 14,
};

export const AIR = {
  gravity: 700,
  terminalSpeed: 420,
  accel: 380,
  maxSpeedX: 170,
};

export const MUSIC = {
  bpm: 66,
  volume: 0.7,
  reverbMix: 0.38,
  fadeInSec: 3,
  /** Ao apertar Play a música some neste tempo (s). */
  fadeOutSec: 2.5,
  /** Quanto tempo à frente as notas são agendadas (s). */
  lookahead: 1.2,
};

export const GAMEPAD = {
  /** Abaixo disso (0..1) o analógico esquerdo conta como solto. */
  moveDeadzone: 0.3,
  /** Abaixo disso o analógico direito mantém a última direção de mira. */
  aimDeadzone: 0.4,
  /**
   * Janela (ms) que lembra a maior inclinação recente do analógico direito. Ao soltar, ele volta
   * ao centro passando por inclinações menores (e às vezes tortas); essas leituras são ignoradas.
   */
  aimHoldMs: 110,
  /** Só aceita uma nova direção se a inclinação atual for pelo menos esta fração do pico recente. */
  aimReleaseRatio: 0.85,
  /** Mira assistida: se o raio errar, procura um alvo girando até este ângulo para cada lado. */
  aimAssistDeg: 14,
  aimAssistStepDeg: 1,
  /** Valor mínimo (0..1) para LT/RT contarem como apertados. */
  triggerThreshold: 0.3,
  /** Distância da retícula cinza (teia não alcança nada), em px. */
  reticleDistance: 56,
  /** Tranco quando a teia gruda (intensidades 0..1). */
  rumbleWeb: { durationMs: 70, strong: 0.25, weak: 0.6 },
  /** Tranco forte quando um rato morde. */
  rumbleHurt: { durationMs: 200, strong: 0.8, weak: 0.5 },
};

/** Vida da aranha. Spec: docs/features/combat.md */
export const PLAYER = {
  maxHp: 3,
  /** Depois de uma mordida fica invencível (piscando) por este tempo (s). */
  invulnSec: 1.2,
  /** Empurrão da mordida (px/s): para longe do rato e para cima. */
  knockbackX: 170,
  knockbackY: 170,
  /** Quanto tempo a tela leva para escurecer antes de reiniciar (s). */
  deathFadeSec: 1.4,
};

/** Teias de combate (X / B no controle). Spec: docs/features/combat.md */
export const SHOTS = {
  attack: { speed: 340, range: 230, cooldownSec: 0.3 },
  trap: { speed: 260, range: 210, cooldownSec: 1.0 },
  /** Dano da teia de ataque. */
  damage: 1,
  /** Quanto tempo um rato fica preso na teia (s). */
  trapSec: 5,
  /** Controle: a teia vira para um rato que esteja até este ângulo da mira. */
  aimAssistDeg: 12,
};

/** Ratos. Spec: docs/features/combat.md */
export const RAT = {
  /** Metade do lado da hitbox (12×12). */
  half: 6,
  hp: 3,
  patrolSpeed: 26,
  chaseSpeed: 82,
  gravity: 700,
  /** Pausa nas pontas da patrulha (s, mín–máx). */
  patrolPauseSec: [0.6, 1.8] as const,
  /** Até onde enxerga na frente dele (px) e quanto acima/abaixo. */
  sightRange: 130,
  sightHeight: 70,
  /** Perto assim ele percebe a aranha mesmo de costas (px). */
  noticeRange: 36,
  /** Sem ver a aranha por este tempo, volta a patrulhar (s). */
  forgetSec: 2.5,
  /** Quanto pode sair da área de patrulha perseguindo (px). */
  leashPx: 64,
  /** Distância (entre centros) em que consegue morder. */
  biteReachX: 16,
  biteReachY: 14,
  /** Tempo do "bote" antes da mordida (dá para fugir) e intervalo entre mordidas (s). */
  biteWindupSec: 0.28,
  biteCooldownSec: 1.0,
  /** Pulinho quando a aranha está um pouco acima (px/s). */
  jumpSpeed: 220,
  jumpCooldownSec: 1.2,
  /** Atordoado depois de levar dano (s) e o empurrão (px/s). */
  hurtSec: 0.35,
  knockbackX: 120,
  knockbackY: 110,
  /** Animação de morte (s). */
  deathSec: 0.8,
};

/** Tempestade: raios, trovões e chuva. Spec: docs/features/atmosphere.md */
export const STORM = {
  /** Quando cai o primeiro raio depois de abrir o jogo (s, mín–máx). */
  firstStrikeSec: [5, 9] as const,
  /** Intervalo entre raios (s). Longo de propósito: trovão é evento, não barulho de fundo. */
  gapSec: [24, 55] as const,
  /** Chance de um raio ser perto (clarão forte, raio visível, trovão logo depois e alto). */
  closeChance: 0.35,
  /** Atraso entre o clarão e o trovão (s). Curto para o jogador ligar um ao outro. */
  thunderDelayCloseSec: [0.15, 0.6] as const,
  thunderDelayFarSec: [1.0, 2.6] as const,
  /** Quanto tempo o risco do raio fica no céu (s). */
  boltVisibleSec: 0.24,
  rainDrops: 170,
  rainSpeed: [300, 420] as const,
  /** Vento: deslocamento horizontal da chuva (px/s). */
  rainWind: -55,
  rainLength: 5,
};

/** Luz da casa à noite. Cores em src/art/palette.ts (PAL.light). Spec: docs/features/atmosphere.md */
export const LIGHT = {
  /** Alcance do cone de luz de cada luminária (px). */
  lampRadius: 200,
  /** Metade da abertura do cone (graus) e a largura da borda suave. */
  coneHalfDeg: 33,
  coneSoftDeg: 14,
  falloffPow: 1.25,
  /** Brilho em volta da lâmpada (ilumina a cúpula e o teto perto). */
  glowRadius: 36,
  glowStrength: 0.85,
  /** Quantos px a luz entra num sólido antes de virar sombra (acende o topo dos móveis). */
  penetration: 10,
  /** Faixas de luz (pixel art: degradê em degraus com pontilhado). */
  bands: 6,
  /** Feixe visível no ar (como poeira iluminada). */
  beamRadius: 150,
  beamAlpha: 0.12,
  dustPerLamp: 14,
  /** Alcance da luz do relâmpago que entra pelas janelas (px). */
  windowRadius: 240,
  /** Quanto o clarão clareia a casa inteira (0..1) e quanto entra pelas janelas. */
  flashBrighten: 0.55,
  flashSpill: 0.75,
  /** A aranha nunca fica mais escura que isso (para não sumir no escuro). */
  spiderMinLight: 0.6,
};

/** Volumes dos sons (0..1). Spec: docs/features/atmosphere.md */
export const SFX = {
  master: 0.9,
  rainVolume: 0.17,
  thunderVolume: 0.8,
  stepVolume: 0.24,
  /** Guinchos dos ratos e chiado da aranha ao levar dano. */
  hurtVolume: 0.45,
  shotVolume: 0.5,
  /** Cutscene da rua: gemidos e passos dos zumbis, e a chuva do lado de fora (mais alta e aberta). */
  groanVolume: 0.85,
  zombieStepVolume: 0.4,
  rainOutsideVolume: 0.22,
};

/** Tela inicial. Spec: docs/features/title-screen.md */
export const TITLE = {
  /** Centro da câmera na tela inicial (px do mundo): o sótão e o céu. */
  cameraX: 640,
  cameraY: 135,
  /** Amplitude e velocidade do passeio lento da câmera. */
  driftPx: 70,
  driftSpeed: 0.06,
  /** Ao apertar Play a tela escurece neste tempo antes da cutscene (s). */
  toIntroFadeSec: 0.9,
  /** Depois do Play/Resume, ignora pulo/teia por este tempo (a mesma tecla não vira pulo). */
  inputGraceSec: 0.3,
};

/** Cutscene de abertura. Spec: docs/features/intro.md (o texto fica em src/level/story.ts) */
export const INTRO = {
  /** Zoom da câmera na cutscene (o palco tem 160×90 px). */
  zoom: 3,
  /** Texto: letras por segundo, tempo parado depois de escrito, fade de saída e pausa até o próximo. */
  typeCps: 30,
  holdSec: 2.6,
  textFadeSec: 0.9,
  textGapSec: 0.5,
  /** A luz clareando a escuridão. */
  revealSec: 3,
  /** Aranha parada, desacordada, antes de mexer as pernas. */
  sleepSec: 1.6,
  twitchSec: 0.9,
  /** Desvira (pulinho + giro) e o tempo parada depois. */
  flipSec: 0.45,
  shakeSec: 0.7,
  /** Olha para trás e depois para o buraco. */
  lookSec: 1.6,
  /** A luz do buraco de rato aparecendo. */
  holeLightSec: 1.6,
  walkSpeed: 34,
  enterSec: 0.7,
  outroSec: 0.9,
  /** Intervalo entre as gotas do líquido verde. */
  dripEverySec: 0.9,
  /** No jogo: a aranha saindo do buraco (s). */
  emergeSec: 0.9,
};

/** Cutscene da rua (buraco no telhado). Spec: docs/features/street-cutscene.md (posições em src/art/streetArt.ts) */
export const STREET = {
  /** No jogo: a tela escurece ao entrar no buraco (s). */
  exitFadeSec: 0.9,
  /** Duração de cada etapa (s). */
  fadeInSec: 1.3,
  emergeSec: 1.5,
  walkSec: 1.7,
  listenSec: 2.4,
  legsSec: 3.4,
  tiltSec: 6.5,
  headsSec: 3.4,
  wideSec: 5.2,
  outroSec: 1.4,
  /** Zoom de cada plano: telhado (palco 160×90) e rua/beira do telhado (palco 240×135). */
  roofZoom: 3,
  streetZoom: 2,
  /** Faixas pretas de cinema, em px da tela de 480×270. */
  letterboxPx: 20,
  /** Gotas de chuva por plano e velocidade (px/s do palco). */
  rainDrops: 120,
  rainSpeed: [170, 240] as const,
  rainWind: -30,
  /** Pisca-alerta do carro abandonado (s por estado). */
  hazardBlinkSec: 0.45,
  /** Em que ponto do `heads` e do `wide` cai o relâmpago do roteiro (0..1 da etapa). */
  headsStrikeAt: 0.05,
  wideStrikeAt: 0.35,
};

/**
 * A horda da cutscene da rua. Cada fileira: `u` = tamanho do bloco do zumbi (px do palco), quantos,
 * velocidade (px/s, mín–máx) e volume dos gemidos e passos (0 = mudo). Spec: docs/features/street-cutscene.md
 */
export const HORDE = {
  street: [
    { u: 2, count: 8, speed: [7, 10], voice: 0.35, steps: 0 },
    { u: 4, count: 5, speed: [11, 15], voice: 0.65, steps: 0.4 },
    { u: 6, count: 3, speed: [15, 19], voice: 1, steps: 1 },
  ],
  wide: [
    { u: 1, count: 14, speed: [4, 6], voice: 0, steps: 0 },
    { u: 1, count: 12, speed: [5, 7], voice: 0, steps: 0 },
  ],
  /** Distância andada (em blocos `u`) em um ciclo da caminhada (dois passos). */
  strideU: 12,
  /** Intervalo entre os gemidos de um mesmo zumbi (s) e quando cada um geme a primeira vez. */
  groanGapSec: [2.8, 7.5] as const,
  firstGroanSec: [0.3, 4] as const,
} as const;

export const WEB = {
  range: 240,
  minLength: 6,
  reelSpeed: 110,
  swingAccel: 320,
  /** Folga extra para considerar que a aranha chegou na âncora. */
  attachSlack: 3,
  releaseBoost: 120,
  missFlashSec: 0.12,
  color: 0xe8e4f0,
};

/** Cartas no cenário. Spec: docs/features/letters.md (cores em PAL.letter) */
export const LETTER = {
  /** Distância (px) do centro da aranha até a folha para aparecer o "READ". */
  readRadius: 22,
  /** A folha nunca fica mais escura que isso (para dar para ver no escuro). */
  minLight: 0.6,
  /** Brilho de "tem algo aqui" enquanto a carta não foi lida: a cada quantos segundos e quanto dura. */
  glintEverySec: 2.4,
  glintSec: 0.4,
};

/** Tela de fim do ato. Spec: docs/features/acts.md */
export const ACT_END = {
  /** Espera (s) antes de aparecer o "continue". */
  continueAfterSec: 3.2,
};
