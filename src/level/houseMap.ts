// O cenário da casa. Edite o ASCII direto: cada caractere é um tile de 16 px.
// Legenda em src/level/legend.ts (minúscula = sólido, MAIÚSCULA = fundo, ~ = céu, . = vazio).
// Todas as linhas precisam ter o mesmo tamanho (o jogo avisa se não tiverem).

export type RoomStyle = 'attic' | 'bedroom' | 'bathroom' | 'living' | 'kitchen';

export interface Room {
  name: string;
  style: RoomStyle;
  /** Retângulo em tiles, inclusivo. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export type DecorKind =
  | 'window'
  | 'roundWindow'
  | 'painting'
  | 'lamp'
  | 'clock'
  | 'plant'
  | 'mirror'
  | 'cobweb'
  | 'cloud';

export interface Decor {
  kind: DecorKind;
  /** Posição em tiles (canto superior esquerdo do sprite). */
  tx: number;
  ty: number;
  flipX?: boolean;
}

export const HOUSE_MAP: string[] = [
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~RRRRRRRRRRRRRRRR~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~RRRRRRRRRRRRRRRRRRRRRRRR~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~RRRRRRRRRR............RRRRRRRRRR~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~RRRRRRRRRR....................RRRRRRRRRR~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~RRRRRRRRRR............................RRRRRRRRRR~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~RRRRRRRRRR....................................RRRRRRRRRR~~~~~~~~~~~~',
  '~~~~~~~~RRRRRRRRRR............................................RRRRRRRRRR~~~~~~~~',
  '~~~~RRRRRRRRRR.www................................................RRRRRRRRRR~~~~',
  'RRRRRRRRRR....wwwww...................................................RRRRRRRRRR',
  'RRRRRR........wwwww...........www.........................wwwww...........RRRRRR',
  'RR............wwwww...........www.........................wwwww...............RR',
  '##==================...=======================================================##',
  '##==================...=======================================================##',
  '##.....................................##.....................................##',
  '##.....................................##.....................................##',
  '##............................wwwwww...##.....................................##',
  '##............................wwwwww...##.....................................##',
  '##....................bbb.....wwwwww...##.....................................##',
  '##...................wwwwww...wwwwww..........................................##',
  '##...w........................wwwwww..........................................##',
  '##...w........................wwwwww...........................tt......ttttt..##',
  '##...w........................wwwwww............t........t.....tt......ttttt..##',
  '##...wmmmmmmmmmmm.............wwwwww............t........t.....tt........T....##',
  '##...wmmmmmmmmmmm.ww..........wwwwww............t........t...tttt........T....##',
  '##...wwwwwwwwwwww.ww..........wwwwww............tttttttttt...tttt........T....##',
  '##....W.........W.ww..........wwwwww............tttttttttt...tttt........T....##',
  '##================================================================....========##',
  '##================================================================....========##',
  '##.....................................##...kkkkkkk...........................##',
  '##.....................................##...kkkkkkk...........................##',
  '##.bbbb................................##...kkkkkkk...........................##',
  '##.bbbb................................##.....................................##',
  '##.bbbb................................##.................ffff................##',
  '##.bbbb...................................................ffff................##',
  '##.bbbb.............W...............W.....................ffff................##',
  '##.bbbb....CCCCCCCC.W...wwwwwwwwww..W.....................ffff................##',
  '##.bbbb....CCCCCCCC.W....W......W...W.....................ffff........wwwwww..##',
  '##.bbbb...cCCCCCCCCcwww..W......W.www.......kkkkkkkkkkkk..ffff.........W..W...##',
  '##.bbbb...ccccccccccW.W..W......W.W.W.......kkkkkkkkkkkk..ffff.........W..W...##',
  '##.bbbb...ccccccccccW.W..W......W.W.W.......kkkkkkkkkkkk..ffff.........W..W...##',
  '##.bbbb...ccccccccccW.W..W......W.W.W.......kkkkkkkkkkkk..ffff.........W..W...##',
  '##============================================================================##',
  '################################################################################',
];

/** Onde a aranha nasce (tile). */
export const SPAWN = { tx: 8, ty: 40 };

/** Papel de parede de cada cômodo. Células '.' fora de cômodos viram "vão" escuro. */
export const ROOMS: Room[] = [
  { name: 'Sótão', style: 'attic', x0: 0, y0: 0, x1: 79, y1: 11 },
  { name: 'Quarto', style: 'bedroom', x0: 2, y0: 14, x1: 39, y1: 26 },
  { name: 'Banheiro', style: 'bathroom', x0: 40, y0: 14, x1: 77, y1: 26 },
  { name: 'Sala', style: 'living', x0: 2, y0: 29, x1: 39, y1: 41 },
  { name: 'Cozinha', style: 'kitchen', x0: 40, y0: 29, x1: 77, y1: 41 },
];

/** Decorações de fundo (não colidem). */
export const DECORATIONS: Decor[] = [
  // Céu
  { kind: 'cloud', tx: 6, ty: 2 },
  { kind: 'cloud', tx: 64, ty: 3 },
  // Sótão
  { kind: 'roundWindow', tx: 38, ty: 4 },
  { kind: 'lamp', tx: 23, ty: 6 },
  { kind: 'lamp', tx: 56, ty: 6 },
  { kind: 'cobweb', tx: 34, ty: 3 },
  { kind: 'cobweb', tx: 44, ty: 3, flipX: true },
  { kind: 'cobweb', tx: 10, ty: 9 },
  { kind: 'cobweb', tx: 68, ty: 9, flipX: true },
  // Quarto
  { kind: 'window', tx: 9, ty: 15 },
  { kind: 'painting', tx: 23, ty: 15 },
  { kind: 'lamp', tx: 18, ty: 14 },
  // Banheiro
  { kind: 'mirror', tx: 72, ty: 16 },
  { kind: 'window', tx: 51, ty: 15 },
  { kind: 'lamp', tx: 61, ty: 14 },
  // Sala
  { kind: 'window', tx: 27, ty: 30 },
  { kind: 'painting', tx: 13, ty: 32 },
  { kind: 'lamp', tx: 9, ty: 29 },
  { kind: 'clock', tx: 34, ty: 31 },
  { kind: 'plant', tx: 37, ty: 40 },
  { kind: 'cobweb', tx: 2, ty: 29 },
  // Cozinha
  { kind: 'window', tx: 64, ty: 31 },
  { kind: 'clock', tx: 53, ty: 33 },
  { kind: 'lamp', tx: 72, ty: 29 },
  { kind: 'cobweb', tx: 76, ty: 29, flipX: true },
];
