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
};

/** Tempestade: raios, trovões e chuva. Spec: docs/features/atmosphere.md */
export const STORM = {
  /** Quando cai o primeiro raio depois de abrir o jogo (s, mín–máx). */
  firstStrikeSec: [5, 9] as const,
  /** Intervalo entre raios (s). Longo de propósito: trovão é evento, não barulho de fundo. */
  gapSec: [24, 55] as const,
  /** Chance de um raio ser perto (clarão forte, raio visível, trovão logo depois e alto). */
  closeChance: 0.35,
  thunderDelayCloseSec: [0.4, 1.3] as const,
  thunderDelayFarSec: [2.5, 6] as const,
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
};

/** Tela inicial. Spec: docs/features/title-screen.md */
export const TITLE = {
  /** Centro da câmera na tela inicial (px do mundo): o sótão e o céu. */
  cameraX: 640,
  cameraY: 135,
  /** Amplitude e velocidade do passeio lento da câmera. */
  driftPx: 70,
  driftSpeed: 0.06,
  /** Ao apertar Play a câmera desce até a aranha mais devagar que o normal. */
  introLerp: 0.045,
  introSec: 1.6,
  /** Depois do Play, ignora pulo/teia por este tempo (a mesma tecla não vira pulo). */
  inputGraceSec: 0.3,
};

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
