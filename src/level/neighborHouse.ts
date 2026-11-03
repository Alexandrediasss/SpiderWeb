// Ato 3, LIGHTS OUT: a casa vizinha, sem energia. Edite o ASCII direto: cada caractere é um tile de 16 px.
// Mesma legenda da casa do ato 1 (src/level/legend.ts: minúscula = sólido, MAIÚSCULA = fundo, ~ = lado de
// fora, . = vazio). Todas as linhas precisam ter o mesmo tamanho. Spec: docs/features/act3-lights-out.md
//
// Caminho em zigue-zague: sótão (a chaminé à direita, o buraco no chão à esquerda) -> quarto e corredor
// (o buraco à direita) -> sala e cozinha (a janela quebrada na parede da esquerda).
import type { DripDef, JetDef, PoolDef } from '../systems/goo';
import type { ChandelierDef } from '../systems/chandelier';
import type { SickDef } from '../systems/sick';
import type { TileRect } from '../systems/roofHole';
import type { Decor, RatSpawn, Room } from './houseMap';
import type { CheckpointDef } from './rooftops';

const T = 16;
/** Centro do tile `tx` em px. */
const cx = (tx: number) => tx * T + T / 2;
/** Topo do tile `ty` em px (o chão de um andar é o topo da linha do piso). */
const top = (ty: number) => ty * T;

export const NEIGHBOR_MAP: string[] = [
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~RRRRRRRRRRRRRRRR~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~RRRRRRRRRRRRRRRRRRRRRRRR~~~~~~~~~~~~##~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~RRRRRRRRRR............RRRRRRRRRR~~~~~~~~##~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~RRRRRRRRRR....................RRRRRRRRRR~~~~##~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~RRRRRRRRRR............................RRRRRRRRRR##~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~RRRRRRRRRR....................................RRRRRR##RR~~~~~~~~~~~~',
  '~~~~~~~~RRRRRRRRRR............................................RR##RRRRRR~~~~~~~~',
  '~~~~RRRRRRRRRR..................................................##RRRRRRRRRR~~~~',
  'RRRRRRRRRR..................................wwww................##....RRRRRRRRRR',
  'RRRRRR......bb..............................wwww....ww..........##........RRRRRR',
  'RR..........bb..............................wwww....ww..........##............RR',
  '##==...=======================================================================##',
  '##==...=======================================================================##',
  '##......................................##....................................##',
  '##......................................##....................................##',
  '##......................................##....................................##',
  '##......................................##................wwwwww..............##',
  '##......................................##................wWWWWw..............##',
  '##......................................##................wWWWWw..............##',
  '##........................................................wWWWWw..............##',
  '##.....w...................................................WWWWw..............##',
  '##.....w...................................................WWWWw..............##',
  '##.....wmmmmmmmmmm.........................................WWWWw..............##',
  '##.....wmmmmmmmmmm.kk......................................WWWWw..............##',
  '##.....wwwwwwwwwww.kk......................................WWWWw..............##',
  '##......W........W.kk......................................WWWWw..............##',
  '##======================================================================...===##',
  '##======================================================================...===##',
  '##......................................##....................................##',
  '##......................................##....................................##',
  '##......................................##....................................##',
  '##......................................##....................................##',
  '~~.............................ffff.....##....................................##',
  '~~.............................ffff.....##....................................##',
  '##.............................ffff...........................................##',
  '##.............................ffff...........................................##',
  '##kkkkkk.......................ffff....................CCCCCCCC...............##',
  '##kkkkkk.......................ffff...........kkkkk...cCCCCCCCCc..............##',
  '##kkkkkk.......................ffff...........kkkkk...cccccccccc..............##',
  '##kkkkkk.......................ffff...........kkkkk...cccccccccc..............##',
  '##kkkkkk.......................ffff...........kkkkk...cccccccccc..............##',
  '##============================================================================##',
  '################################################################################',
];

/** Papel de parede de cada cômodo. */
export const NEIGHBOR_ROOMS: Room[] = [
  { name: 'Sótão', style: 'attic', x0: 0, y0: 0, x1: 79, y1: 11 },
  { name: 'Quarto', style: 'guestRoom', x0: 2, y0: 14, x1: 39, y1: 26 },
  { name: 'Corredor', style: 'hallway', x0: 40, y0: 14, x1: 77, y1: 26 },
  { name: 'Sala', style: 'parlor', x0: 40, y0: 29, x1: 77, y1: 41 },
  { name: 'Cozinha', style: 'oldKitchen', x0: 2, y0: 29, x1: 39, y1: 41 },
];

/** Decorações que já existem na casa do ato 1 (janelas, quadros, relógios, teias de aranha). */
export const NEIGHBOR_DECOR: Decor[] = [
  { kind: 'roundWindow', tx: 40, ty: 4 },
  { kind: 'cobweb', tx: 34, ty: 3 },
  { kind: 'cobweb', tx: 44, ty: 3, flipX: true },
  { kind: 'cobweb', tx: 10, ty: 9 },
  { kind: 'window', tx: 27, ty: 16 },
  { kind: 'painting', tx: 46, ty: 16 },
  { kind: 'cobweb', tx: 76, ty: 14, flipX: true },
  { kind: 'window', tx: 66, ty: 31 },
  { kind: 'painting', tx: 56, ty: 31 },
  { kind: 'clock', tx: 44, ty: 31 },
  { kind: 'clock', tx: 26, ty: 31 },
  { kind: 'cobweb', tx: 2, ty: 29 },
];

/** Decorações só desta casa (pintadas em src/art/neighborArt.ts). `w` = largura em tiles (padrão 1). */
export type NeighborDecorKind =
  | 'deadLamp'
  | 'chimneyBreach'
  | 'soot'
  | 'crack'
  | 'bucket'
  | 'bloodSplat'
  | 'bloodPool'
  | 'handprint'
  | 'axe'
  | 'sewerHole'
  | 'brokenWindow'
  | 'waterJugs'
  | 'pipe'
  | 'seep';

export interface NeighborDecor {
  kind: NeighborDecorKind;
  tx: number;
  ty: number;
  w?: number;
  flipX?: boolean;
}

/** Goteiras de chuva (água, não faz mal): a gota se forma embaixo do tile do teto. */
export const WATER_DRIPS: DripDef[] = [
  { x: cx(36), y: top(3), every: 1.3 },
  { x: cx(49), y: top(4), every: 1.9, phase: 0.6 },
  { x: cx(70), y: top(14), every: 1.5, phase: 0.2 },
  { x: cx(75), y: top(29), every: 1.4, phase: 0.9 },
  { x: cx(36), y: top(29), every: 1.8, phase: 0.4 },
];

/** A gosma verde: goteiras, jorros (canos quebrados no chão) e poças. Spec: docs/features/goo-poison.md */
export const GOO = {
  drips: [
    { x: cx(23), y: top(14), every: 1.6 },
    { x: cx(33), y: top(14), every: 2.1, phase: 1 },
    { x: cx(66), y: top(14), every: 1.8, phase: 0.5 },
    { x: cx(44), y: top(29), every: 1.7, phase: 0.3 },
    { x: cx(26), y: top(29), every: 2.3, phase: 1.2 },
  ] satisfies DripDef[],
  jets: [
    { x: cx(54), y: top(27), height: 72, idleSec: 1.8 },
    { x: cx(52), y: top(42), height: 84, idleSec: 2.2, phase: 1 },
    // O buraco do esgoto da cozinha.
    { x: cx(18), y: top(42), height: 100, idleSec: 3.2, phase: 0.5 },
  ] satisfies JetDef[],
  pools: [
    { x0: 26 * T + 2, x1: 29 * T - 2, y: top(27) },
    { x0: 66 * T + 2, x1: 70 * T - 2, y: top(42) },
    { x0: 17 * T + 2, x1: 20 * T - 2, y: top(42) },
  ] satisfies PoolDef[],
};

export const NEIGHBOR_EXTRA_DECOR: NeighborDecor[] = [
  // Sótão: a chaminé por onde a Mary chega, a fuligem, as luminárias apagadas, as rachaduras com goteira.
  { kind: 'chimneyBreach', tx: 64, ty: 10 },
  { kind: 'soot', tx: 61, ty: 11, w: 3 },
  { kind: 'deadLamp', tx: 22, ty: 6 },
  { kind: 'deadLamp', tx: 56, ty: 6 },
  // 1º andar.
  { kind: 'deadLamp', tx: 14, ty: 14 },
  { kind: 'deadLamp', tx: 50, ty: 14 },
  { kind: 'seep', tx: 26, ty: 26, w: 3 },
  { kind: 'pipe', tx: 54, ty: 26 },
  { kind: 'bloodSplat', tx: 60, ty: 21 },
  { kind: 'bloodPool', tx: 59, ty: 26, w: 2 },
  { kind: 'handprint', tx: 57, ty: 22 },
  { kind: 'bucket', tx: 70, ty: 26 },
  // Térreo, sala.
  { kind: 'deadLamp', tx: 60, ty: 29 },
  { kind: 'pipe', tx: 52, ty: 41 },
  { kind: 'seep', tx: 66, ty: 41, w: 4 },
  { kind: 'bucket', tx: 75, ty: 41 },
  // Térreo, cozinha: o machado, o sangue, o esgoto, a água filtrada e a janela quebrada.
  { kind: 'axe', tx: 21, ty: 33 },
  { kind: 'bloodSplat', tx: 9, ty: 31 },
  { kind: 'bloodSplat', tx: 15, ty: 34, flipX: true },
  { kind: 'bloodSplat', tx: 23, ty: 30 },
  { kind: 'handprint', tx: 37, ty: 33 },
  { kind: 'bloodPool', tx: 10, ty: 41, w: 3 },
  { kind: 'bloodPool', tx: 22, ty: 41, w: 3 },
  { kind: 'sewerHole', tx: 17, ty: 41, w: 3 },
  { kind: 'waterJugs', tx: 3, ty: 36, w: 3 },
  { kind: 'bucket', tx: 36, ty: 41 },
  { kind: 'brokenWindow', tx: 0, ty: 32 },
  // Rachaduras no teto, em cima de cada goteira (de água e de gosma).
  ...[...WATER_DRIPS, ...GOO.drips].map((d) => ({ kind: 'crack' as const, tx: Math.floor(d.x / T), ty: d.y / T - 1 })),
  // Baldes embaixo das goteiras de água do sótão.
  { kind: 'bucket', tx: 36, ty: 11 },
  { kind: 'bucket', tx: 49, ty: 11 },
];

/** Ratos: um no sótão, um no corredor e um em cima do sofá da sala. */
export const NEIGHBOR_RATS: RatSpawn[] = [
  { name: 'Sótão', tx: 30, ty: 11, minTx: 20, maxTx: 40 },
  { name: 'Corredor', tx: 48, ty: 26, minTx: 43, maxTx: 56 },
  { name: 'Sofá da sala', tx: 58, ty: 38, minTx: 55, maxTx: 62 },
];

/** Checkpoints: o chão do sótão, o chão do quarto (embaixo do buraco) e o chão da sala (embaixo do outro). */
export const ACT3_CHECKPOINTS: CheckpointDef[] = [
  { name: 'Sótão', zone: { x0: 40, y0: 0, x1: 77, y1: 11 }, spawn: { tx: 62, ty: 11 } },
  { name: 'Quarto', zone: { x0: 2, y0: 14, x1: 7, y1: 26 }, spawn: { tx: 5, ty: 26 } },
  { name: 'Sala', zone: { x0: 64, y0: 29, x1: 77, y1: 41 }, spawn: { tx: 73, ty: 41 } },
];

/** Abertura na chaminé por onde a Mary cai no sótão (px): ela aparece aqui e cai até o chão. */
export const CHIMNEY_BREACH = { x: 64 * T - 6, y: top(10) + 6 };

/** O doente da cozinha: entre a bancada e a geladeira. */
export const SICK_DEF: SickDef = { x: 22 * T, floorY: top(42), minX: 9 * T + 8, maxX: 29 * T };

/** O lustre: gancho no teto da cozinha, perto da janela. */
export const CHANDELIER_DEF: ChandelierDef = { x: 13 * T, y: top(29), floorY: top(42) };

/** A janela quebrada da cozinha (tiles; no mapa é `~`): entrar nela termina o ato. */
export const ACT3_WINDOW: TileRect = { tx: 0, ty: 33, w: 2, h: 2 };

/**
 * Enquadramento de cada andar: a câmera segue a Mary na horizontal, mas na vertical fica no meio do andar
 * (`centerY`, px), para o teto e o chão aparecerem juntos (do teto da cozinha dá para ver o doente).
 * Vale o primeiro andar com a Mary acima de `belowY`.
 */
export const FLOOR_VIEWS = [
  { belowY: top(12), centerY: 135 },
  { belowY: top(28), centerY: (top(14) + top(27)) / 2 },
  { belowY: Infinity, centerY: (top(29) + top(42)) / 2 },
];

/** Cômodos para os sons: o 1º andar (gemidos abafados de baixo) e a cozinha (o doente). */
export const UPSTAIRS = { x0: 44, y0: 14, x1: 77, y1: 26 };
export const KITCHEN = { x0: 2, y0: 29, x1: 39, y1: 41 };
