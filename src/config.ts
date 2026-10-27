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
  /** Quanto tempo à frente as notas são agendadas (s). */
  lookahead: 1.2,
};

export const GAMEPAD = {
  /** Abaixo disso (0..1) o analógico esquerdo conta como solto. */
  moveDeadzone: 0.3,
  /** Abaixo disso o analógico direito mantém a última direção de mira. */
  aimDeadzone: 0.4,
  /** Valor mínimo (0..1) para LT/RT contarem como apertados. */
  triggerThreshold: 0.3,
  /** Distância da retícula cinza (teia não alcança nada), em px. */
  reticleDistance: 56,
  /** Tranco quando a teia gruda (intensidades 0..1). */
  rumbleWeb: { durationMs: 70, strong: 0.25, weak: 0.6 },
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
