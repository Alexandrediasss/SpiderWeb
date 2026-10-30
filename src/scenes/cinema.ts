// Recursos de cinema das cenas feitas com o próprio jogo (resumos dos atos e cutscenes do ato 2):
// faixas pretas em cima e embaixo e a legenda (#recap-caption). Spec: docs/features/scenes.md
import type Phaser from 'phaser';
import { VIEW } from '../config';

/**
 * Põe as faixas pretas (`top`, `bottom`, com scrollFactor 0) com `h` px da tela de 480×270, qualquer que
 * seja o zoom: objetos com scrollFactor 0 também são ampliados em volta do centro, então a posição e o
 * tamanho são divididos pelo zoom.
 */
export function placeBars(cam: Phaser.Cameras.Scene2D.Camera, [top, bottom]: Phaser.GameObjects.Rectangle[], h: number): void {
  const z = cam.zoom;
  const x = VIEW.width / 2 - VIEW.width / 2 / z;
  const y = VIEW.height / 2 - VIEW.height / 2 / z;
  top?.setPosition(x, y).setSize(VIEW.width / z, h / z);
  bottom?.setPosition(x, y + (VIEW.height - h) / z).setSize(VIEW.width / z, h / z);
}

/** Legenda na faixa de baixo (null esconde, com fade do CSS). */
export function showCaption(text: string | null): void {
  const c = document.getElementById('recap-caption');
  if (!c) return;
  if (text) c.textContent = text;
  c.classList.toggle('show', text !== null);
}
