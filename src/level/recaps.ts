// Roteiro dos resumos de cada ato (cenas "THE HOUSE" e "ACROSS THE STREET" do SCENES): os planos, onde a
// aranha começa, o que ela faz e a legenda. Posições em px do mundo (1 tile = 16 px) ou tiles.
// Os testes (tests/recap.test.ts) rodam cada plano com a física de verdade e exigem que toda ação chegue
// no objetivo: ao mexer no mapa, rode `npm test`. Spec: docs/features/scenes.md
import type { RecapShot } from '../systems/recap';

const T = 16;

/** Ato 1, a casa: sai da parede, ratos, cartas, balanço, escalada, sótão e o buraco do telhado. */
export const ACT1_RECAP: RecapShot[] = [
  {
    name: 'walls',
    start: { tx: 8, ty: 41, facing: 1 },
    caption: 'IT CRAWLED OUT OF THE WALLS.',
    zoom: 1.6,
    actions: [
      { type: 'wait', sec: 0.8 },
      { type: 'move', move: { x: 1, y: 0 }, until: { attached: 'floor', minX: 13 * T, maxY: 39 * T }, maxSec: 6 },
    ],
    holdSec: 0.8,
  },
  {
    name: 'rat',
    start: { tx: 22, ty: 41, facing: 1 },
    caption: 'THE HOUSE WAS FULL OF RATS.',
    zoom: 1.5,
    actions: [
      { type: 'wait', sec: 0.5 },
      { type: 'shoot', kind: 'attack', rat: 0, everySec: 0.45, maxSec: 6 },
    ],
    holdSec: 1,
  },
  {
    // Da estante, balança pela sala e cai na mesa, ao lado da carta.
    name: 'letter',
    start: { tx: 5, ty: 30, facing: 1 },
    caption: 'SOMEONE HAD LEFT LETTERS BEHIND.',
    zoom: 1.3,
    actions: [
      { type: 'wait', sec: 0.4 },
      { type: 'web', anchor: { x: 16 * T, y: 29 * T - 1 }, move: { x: 1, y: -0.3 }, until: { minX: 22 * T }, maxSec: 3 },
      { type: 'move', move: { x: 1, y: 0 }, until: { attached: 'floor' }, maxSec: 2 },
      { type: 'move', move: { x: -1, y: 0 }, until: { maxX: 29 * T + 12 }, maxSec: 3 },
      { type: 'read', letter: 'table', sec: 2.8 },
    ],
    holdSec: 0.5,
  },
  {
    // Da geladeira, sobe pela teia, anda no teto e contorna o vão até o andar de cima.
    name: 'climb',
    start: { tx: 60, ty: 32, facing: 1 },
    caption: 'IT LEARNED TO CLIMB...',
    zoom: 1.3,
    actions: [
      { type: 'wait', sec: 0.3 },
      { type: 'web', anchor: { x: 60 * T + 8, y: 29 * T - 1 }, move: { x: 0, y: -1 }, until: { attached: 'ceiling' }, maxSec: 3 },
      { type: 'move', move: { x: 1, y: -1 }, until: { attached: 'floor', maxY: 27 * T }, maxSec: 6 },
      { type: 'move', move: { x: -1, y: 0 }, until: { maxX: 62 * T }, maxSec: 3 },
    ],
    holdSec: 0.6,
  },
  {
    name: 'bed',
    start: { tx: 18, ty: 23, facing: -1 },
    caption: '...AND TO FIGHT BACK.',
    zoom: 1.5,
    actions: [
      { type: 'wait', sec: 0.3 },
      { type: 'jump', move: { x: -1, y: 0 }, until: { attached: 'floor' }, maxSec: 2 },
      { type: 'shoot', kind: 'trap', rat: 2, everySec: 1, maxSec: 4 },
      { type: 'shoot', kind: 'attack', rat: 2, everySec: 0.4, maxSec: 5 },
      { type: 'move', move: { x: -1, y: 0 }, until: { maxX: 9 * T + 12 }, maxSec: 3 },
      { type: 'read', letter: 'bed', sec: 2.8 },
    ],
    holdSec: 0.5,
  },
  {
    name: 'attic',
    start: { tx: 44, ty: 11, facing: 1 },
    caption: 'NOTHING STOPPED IT.',
    zoom: 1.4,
    actions: [
      { type: 'wait', sec: 0.3 },
      { type: 'shoot', kind: 'attack', rat: 3, everySec: 0.4, maxSec: 6 },
    ],
    holdSec: 0.8,
  },
  {
    name: 'roof',
    start: { tx: 27, ty: 11, facing: -1 },
    caption: 'THE WAY OUT WAS UP.',
    zoom: 1.4,
    actions: [
      { type: 'wait', sec: 0.4 },
      { type: 'web', anchor: { x: 25 * T + 8, y: 6 * T - 1 }, move: { x: 0, y: -1 }, until: { attached: 'ceiling' }, maxSec: 3 },
      { type: 'move', move: { x: 1, y: -1 }, until: { minX: 26 * T, maxX: 28 * T, maxY: 5 * T }, maxSec: 4 },
    ],
    holdSec: 1.4,
  },
];

/** Ato 2, a rua: da calha para os postes, a ventania, os fios soltos e o telhado da casa vizinha. */
export const ACT2_RECAP: RecapShot[] = [
  {
    // Desce o telhado até a calha, olha a horda, balança no braço do poste 1 e sobe pelo poste.
    name: 'gutter',
    start: { tx: 12, ty: 16, facing: 1 },
    caption: 'THE STREET BELOW WAS FULL OF THE SICK.',
    zoom: 1,
    look: { x: 70, y: 85 },
    actions: [
      { type: 'wait', sec: 0.5 },
      { type: 'move', move: { x: 1, y: 0 }, until: { minX: 15 * T + 4 }, maxSec: 4 },
      { type: 'wait', sec: 1 },
      { type: 'web', anchor: { x: 408, y: 287 }, move: { x: 1, y: 0 }, until: { minX: 25 * T }, maxSec: 4 },
      { type: 'move', move: { x: 1, y: 0 }, until: { attached: true }, maxSec: 3 },
      { type: 'move', move: { x: 1, y: -1 }, until: { maxY: 300 }, maxSec: 4 },
    ],
    holdSec: 0.6,
  },
  {
    // Da cruzeta do poste de madeira, pula, laça o galho da árvore e cai em cima dele.
    name: 'tree',
    start: { tx: 41, ty: 12, facing: 1 },
    caption: 'IT SWUNG FROM POLE TO POLE.',
    zoom: 1.3,
    actions: [
      { type: 'wait', sec: 0.5 },
      { type: 'move', move: { x: 1, y: 0 }, until: { minX: 43 * T }, maxSec: 2 },
      { type: 'jump', move: { x: 1, y: 0 }, until: { maxY: 190 }, maxSec: 0.6 },
      { type: 'web', anchor: { x: 846, y: 289 }, move: { x: 1, y: 0 }, until: { minX: 50 * T }, maxSec: 4 },
      { type: 'move', move: { x: 1, y: 0 }, until: { attached: true }, maxSec: 3 },
      { type: 'move', move: { x: 1, y: 0 }, until: { minX: 54 * T }, maxSec: 3 },
    ],
    holdSec: 0.8,
  },
  {
    // No teto do ponto de ônibus, com a horda passando embaixo.
    name: 'bus',
    start: { tx: 67, ty: 26, facing: 1 },
    caption: 'THE SICK NEVER LOOKED UP.',
    zoom: 1.4,
    look: { x: 0, y: 70 },
    actions: [
      { type: 'wait', sec: 0.6 },
      { type: 'move', move: { x: 1, y: 0 }, until: { minX: 74 * T }, maxSec: 4 },
    ],
    holdSec: 1,
  },
  {
    // Na passarela do outdoor, andando contra a rajada (detritos voando).
    name: 'wind',
    start: { tx: 88, ty: 16, facing: 1 },
    caption: 'THE WIND TRIED TO THROW IT DOWN.',
    zoom: 1.4,
    look: { x: 30, y: 0 },
    wind: { strength: 0.9, dir: -1 },
    actions: [{ type: 'move', move: { x: 1, y: 0 }, until: { minX: 93 * T }, maxSec: 6 }],
    holdSec: 0.6,
  },
  {
    // Da ponta da passarela, balança embaixo da cruzeta dos fios soltos e sobe pelo poste.
    name: 'wires',
    start: { tx: 100, ty: 16, facing: 1 },
    caption: 'BROKEN WIRES SPARKED IN THE DARK.',
    zoom: 1.2,
    wind: { strength: 0.4, dir: -1 },
    actions: [
      { type: 'wait', sec: 0.4 },
      { type: 'web', anchor: { x: 1760, y: 209 }, move: { x: 1, y: 0 }, until: { minX: 109 * T }, maxSec: 4 },
      { type: 'move', move: { x: 1, y: 0 }, until: { attached: true }, maxSec: 3 },
      { type: 'move', move: { x: 1, y: -1 }, until: { maxY: 280 }, maxSec: 4 },
    ],
    holdSec: 0.6,
  },
  {
    // Do telhado da garagem, laça o beiral da casa vizinha e sobe o telhado até perto da chaminé.
    name: 'roof',
    start: { tx: 171, ty: 23, facing: 1 },
    caption: 'UNTIL, AT LAST, THE ROOF NEXT DOOR.',
    zoom: 1.2,
    actions: [
      { type: 'wait', sec: 0.5 },
      { type: 'web', anchor: { x: 182 * T + 8, y: 23 * T - 1 }, move: { x: 1, y: -1 }, until: { attached: true }, maxSec: 5 },
      { type: 'move', move: { x: 1, y: -1 }, until: { attached: 'floor', maxY: 22 * T }, maxSec: 4 },
      { type: 'move', move: { x: 1, y: 0 }, until: { minX: 186 * T }, maxSec: 4 },
    ],
    holdSec: 1.6,
  },
];
