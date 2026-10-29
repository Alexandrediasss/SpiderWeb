import Phaser from 'phaser';
import { VIEW } from './config';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { IntroScene } from './scenes/IntroScene';
import { RooftopScene } from './scenes/RooftopScene';
import { StreetScene } from './scenes/StreetScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW.width,
  height: VIEW.height,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#1a1418',
  // O áudio é nosso (src/audio); o Phaser não precisa abrir outro AudioContext.
  audio: { noAudio: true },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, GameScene, IntroScene, StreetScene, RooftopScene],
});
