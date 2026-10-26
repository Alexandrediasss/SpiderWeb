// Legenda do mapa ASCII. Regra: minúscula = móvel sólido; MAIÚSCULA = mesmo material, só de fundo (não colide).

export type Material =
  | 'sky'
  | 'empty'
  | 'brick'
  | 'floor'
  | 'roof'
  | 'wood'
  | 'cushion'
  | 'mattress'
  | 'cabinet'
  | 'fridge'
  | 'books'
  | 'ceramic';

export interface TileDef {
  material: Material;
  solid: boolean;
  /** Paredes, pisos e telhado: não desenham contorno entre si. */
  structural?: boolean;
  /** Versão de fundo: desenhada escurecida, atrás da aranha. */
  background?: boolean;
}

const FURNITURE: Record<string, Material> = {
  w: 'wood',
  c: 'cushion',
  m: 'mattress',
  k: 'cabinet',
  f: 'fridge',
  b: 'books',
  t: 'ceramic',
};

export const LEGEND: Record<string, TileDef> = {
  '~': { material: 'sky', solid: false },
  '.': { material: 'empty', solid: false },
  '#': { material: 'brick', solid: true, structural: true },
  '=': { material: 'floor', solid: true, structural: true },
  R: { material: 'roof', solid: true, structural: true },
};

for (const [ch, material] of Object.entries(FURNITURE)) {
  LEGEND[ch] = { material, solid: true };
  LEGEND[ch.toUpperCase()] = { material, solid: false, background: true };
}

export function tileDef(ch: string): TileDef {
  const def = LEGEND[ch];
  if (!def) throw new Error(`Mapa: caractere desconhecido '${ch}'. Veja src/level/legend.ts`);
  return def;
}

export function isSolidChar(ch: string): boolean {
  return tileDef(ch).solid;
}
