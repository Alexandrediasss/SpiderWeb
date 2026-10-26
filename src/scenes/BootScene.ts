// Gera todas as texturas e animações (a arte é código) e inicia o jogo.
import Phaser from 'phaser';
import { registerAnimations, registerTextures } from '../art/textures';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    registerTextures(this);
    registerAnimations(this);
    this.scene.start('game');
  }
}
