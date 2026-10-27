// Input abstrato: o SpiderMotor não sabe de teclado nem de mouse.
import type { Vec2 } from '../physics/surfaces';

export interface SpiderInput {
  /** -1..1 em cada eixo (y negativo = para cima). */
  move: Vec2;
  run: boolean;
  /** Verdadeiro só no frame em que a tecla foi apertada. */
  jumpPressed: boolean;
  webPressed: boolean;
  webHeld: boolean;
  /** Teia de ataque (tira vida) e teia que prende, só no frame em que foram apertadas. */
  attackPressed: boolean;
  trapPressed: boolean;
  /** Ponto mirado, em coordenadas do mundo. */
  aim: Vec2;
}

export function emptyInput(): SpiderInput {
  return {
    move: { x: 0, y: 0 },
    run: false,
    jumpPressed: false,
    webPressed: false,
    webHeld: false,
    attackPressed: false,
    trapPressed: false,
    aim: { x: 0, y: 0 },
  };
}
