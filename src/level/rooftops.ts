// Ato 2: a rua vista de lado, por cima dos postes. Edite o ASCII direto: cada caractere é um tile de 16 px.
// Minúscula = sólido (a aranha gruda e a teia pega), MAIÚSCULA = só fundo (luminárias, copa, vidro),
// '.' = ar, '_' = rua (encostar mata).
// Todas as linhas precisam ter o mesmo tamanho. Spec: docs/features/act2-rooftops.md

export type RooftopMaterial =
  | 'air'
  | 'street'
  | 'roof'
  | 'siding'
  | 'chimney'
  | 'pole'
  | 'arm'
  | 'lamp'
  | 'wood'
  | 'crossbar'
  | 'trunk'
  | 'branch'
  | 'foliage'
  | 'billboard'
  | 'catwalk'
  | 'shelter'
  | 'post'
  | 'glass'
  | 'signal';

export const ROOFTOP_LEGEND: Record<string, { material: RooftopMaterial; solid: boolean }> = {
  '.': { material: 'air', solid: false },
  _: { material: 'street', solid: true },
  r: { material: 'roof', solid: true },
  h: { material: 'siding', solid: true },
  c: { material: 'chimney', solid: true },
  p: { material: 'pole', solid: true },
  a: { material: 'arm', solid: true },
  L: { material: 'lamp', solid: false },
  u: { material: 'wood', solid: true },
  x: { material: 'crossbar', solid: true },
  k: { material: 'trunk', solid: true },
  b: { material: 'branch', solid: true },
  F: { material: 'foliage', solid: false },
  g: { material: 'billboard', solid: true },
  y: { material: 'catwalk', solid: true },
  s: { material: 'shelter', solid: true },
  P: { material: 'post', solid: false },
  G: { material: 'glass', solid: false },
  t: { material: 'signal', solid: true },
};

export function rooftopTile(ch: string): { material: RooftopMaterial; solid: boolean } {
  const def = ROOFTOP_LEGEND[ch];
  if (!def) throw new Error(`Mapa do ato 2: caractere desconhecido '${ch}'. Veja src/level/rooftops.ts`);
  return def;
}

export function isRooftopSolid(ch: string): boolean {
  return rooftopTile(ch).solid;
}

export const ROOFTOP_MAP: string[] = [
  '........................................................................................................................................................................................................',
  '........................................................................................................................................................................................................',
  '........................................................................................................................................................................................................',
  '........................................................................................................................................................................................................',
  '........................................................................................................................................................................................................',
  '........................................................................................................................................................................................................',
  '........................................................................................................................................................................................................',
  '........................................................................................................................................................................................................',
  '........................................................................................................................................................................................................',
  'rrrrr.........................................................................................................................................................................................cc........',
  'rrrrrr................................................................................gggggggggggggg..........................................................................................cc..rrrrrr',
  'rrrrrrr.............................................FFFFFFFF..........................gggggggggggggg..........................................................................................cc.rrrrrrr',
  'rrrrrrrr.........................................FFFFFFFFFFFFFF.......................gggggggggggggg.........xxxxxxx.........................................xxxxxxx..........................ccrrrrrrrr',
  'rrrrrrrrr............................xxxxxxx....FFFFFFFFFFFFFFFF......................gggggggggggggg............u...............................................u.............................ccrrrrrrrr',
  'rrrrrrrrrr..............................u......FFFFFFFFFFFFFFFFFF.....................gggggggggggggg............u.............aaaaaaaaaaa.......................u.............................rrrrrrrrrr',
  'rrrrrrrrrrr.............................u......FFFFFFFFFFFFFFFFFF...........aaaaa.....gggggggggggggg............u.............p......tt.........................u............................rrrrrrrrrrr',
  'rrrrrrrrrrrr............................u......FFFFFFFFFFFFFFFFFF...........L...p...............................u.............p......tt.............aaaaa.......u...........................rrrrrrrrrrrr',
  'rrrrrrrrrrrrr..........aaaaa............u......FFFFbbbbkkFFFFFFFF...............p....yyyyyyyyyyyyyyyy...........u.............p......tt.............p...L.......u..........................rrrrrrrrrrrrr',
  'rrrrrrrrrrrrrr.........L...p............u......FFFFFFFFkkFFFFFFFF...............p.......p........p..............u.............p.....................p...........u.........................rrrrrrrrrrrrrr',
  'rrrrrrrrrrrrrrr............p............u......FFFFFFFFkkFFFFFFFF...............p.......p........p..............u.............p.....................p...........u........................rrrrrrrrrrrrrrr',
  'rrrrrrrrrrrrrrrr...........p............u.......FFFFFFFkkbbbbbFF................p.......p........p..............u.............p.....................p...........u.......................rrrrrrrrrrrrrrrr',
  'hhhhhhhhhhhhhh.............p............u........FFFFFFkkFFFFFF.................p.......p........p..............u.............p.....................p...........u......................rrrrrrrrrrrrrrrrr',
  'hhhhhhhhhhhhhh.............p............u.........bbbbbkkFFF....................p.......p........p..............u.............p.....................p...........u.....................rrrrrrrrrrrrrrrrrr',
  'hhhhhhhhhhhhhh.............p............u..............kk.......................p.......p........p..............u.............p.....................p...........u.......................hhhhhhhhhhhhhhhh',
  'hhhhhhhhhhhhhh.............p............u..............kk.......................p.......p........p..............u.............p.....................p...........u...rrrrrrrr............hhhhhhhhhhhhhhhh',
  'hhhhhhhhhhhhhh.............p............u..............kk.......................p.......p........p..............u.............p.....................p...........u...rrrrrrrr............hhhhhhhhhhhhhhhh',
  'hhhhhhhhhhhhhh.............p............u..............kk.......................p.......p........p..............u.............p.....................p...........u....hhhhhh.............hhhhhhhhhhhhhhhh',
  'hhhhhhhhhhhhhh.............p............u..............kk........sssssssssss....p.......p........p..............u.............p.....................p...........u....hhhhhh.............hhhhhhhhhhhhhhhh',
  'hhhhhhhhhhhhhh.............p............u..............kk.........P.......P.....p.......p........p..............u.............p.....................p...........u....hhhhhh.............hhhhhhhhhhhhhhhh',
  'hhhhhhhhhhhhhh.............p............u..............kk.........PGGGGGGGP.....p.......p........p..............u.............p.....................p...........u....hhhhhh.............hhhhhhhhhhhhhhhh',
  'hhhhhhhhhhhhhh.............p............u..............kk.........PGGGGGGGP.....p.......p........p..............u.............p.....................p...........u....hhhhhh.............hhhhhhhhhhhhhhhh',
  'hhhhhhhhhhhhhh.............p............u..............kk.........PGGGGGGGP.....p.......p........p..............u.............p.....................p...........u....hhhhhh.............hhhhhhhhhhhhhhhh',
  'hhhhhhhhhhhhhh.............p............u..............kk.........PGGGGGGGP.....p.......p........p..............u.............p.....................p...........u....hhhhhh.............hhhhhhhhhhhhhhhh',
  'hhhhhhhhhhhhhh.............p............u..............kk.........PGGGGGGGP.....p.......p........p..............u.............p.....................p...........u....hhhhhh.............hhhhhhhhhhhhhhhh',
  'hhhhhhhhhhhhhh.............p............u..............kk.........PGGGGGGGP.....p.......p........p..............u.............p.....................p...........u....hhhhhh.............hhhhhhhhhhhhhhhh',
  'hhhhhhhhhhhhhh.............p............u..............kk.........P.......P.....p.......p........p..............u.............p.....................p...........u....hhhhhh.............hhhhhhhhhhhhhhhh',
  'hhhhhhhhhhhhhh.............p............u..............kk.........P.......P.....p.......p........p..............u.............p.....................p...........u....hhhhhh.............hhhhhhhhhhhhhhhh',
  '________________________________________________________________________________________________________________________________________________________________________________________________________',
  '________________________________________________________________________________________________________________________________________________________________________________________________________',
  '________________________________________________________________________________________________________________________________________________________________________________________________________',
];

/** Linha da rua: encostar nela é ser pisada pela horda. */
export const STREET_ROW = 37;

/** Onde a aranha começa: na calha do telhado do ato 1 (tile vazio logo acima da superfície). */
export const ROOFTOP_START = { tx: 15, ty: 19 };

/** Na cutscene de abertura, a teia vai neste ponto (px): embaixo do braço do poste de luz 1. */
export const FIRST_AIM = { x: 408, y: 287 };

/** Retângulo em tiles (inclusivo). */
export interface TileZone {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface CheckpointDef {
  name: string;
  /** Grudar numa superfície com o centro dentro desta área ativa o checkpoint. */
  zone: TileZone;
  /** Tile vazio logo acima da superfície onde a aranha reaparece. */
  spawn: { tx: number; ty: number };
}

export const CHECKPOINTS: CheckpointDef[] = [
  { name: 'Telhado do começo', zone: { x0: 0, y0: 6, x1: 16, y1: 20 }, spawn: ROOFTOP_START },
  { name: 'Ponto de ônibus', zone: { x0: 65, y0: 24, x1: 75, y1: 26 }, spawn: { tx: 70, ty: 26 } },
  { name: 'Outdoor', zone: { x0: 84, y0: 6, x1: 101, y1: 16 }, spawn: { tx: 92, ty: 16 } },
  { name: 'Garagem', zone: { x0: 164, y0: 21, x1: 171, y1: 23 }, spawn: { tx: 167, ty: 23 } },
];

/** Fios arrebentados pendurados nas cruzetas (px): ponto de onde pendem e comprimento. Dão choque. */
export const LOOSE_WIRES = [
  { x: 696, y: 224, length: 72 },
  { x: 1752, y: 208, length: 64 },
  { x: 1848, y: 208, length: 96 },
  { x: 2616, y: 208, length: 80 },
];

/** Fios inteiros entre os postes de madeira (só enfeite, px): de onde a onde e quanto cedem no meio. */
export const WIRE_SPANS = [
  { x0: 616, y0: 206, x1: 1768, y1: 190, sag: 46 },
  { x0: 680, y0: 206, x1: 1832, y1: 190, sag: 52 },
  { x0: 1768, y0: 190, x1: 2536, y1: 190, sag: 34 },
  { x0: 1832, y0: 190, x1: 2600, y1: 190, sag: 30 },
];

/** Grudar no telhado da casa vizinha (estas colunas, acima da calha) começa o fim do ato. */
export const END_ZONE: TileZone = { x0: 182, y0: 0, x1: 199, y1: 22 };

/** A chaminé por onde a aranha entra (tiles). */
export const CHIMNEY = { tx: 190, ty: 9, w: 2, h: 5 };
