// Conquistas de cada ato (o jogo é em inglês). Spec: docs/features/achievements.md
//
// Originais (português):
//   Ato 1: "O explorador - Leia uma carta deixada por alguém misterioso."
//          "Apreciador do amor - Leia a carta de amor."
//          "Escavador de telhados - Saia da casa pelo telhado."
//          "Conquistador de ratos - Mate todos os ratos."
//   Ato 2: "Soltando teias pelos ares - Solte teias pelos postes."
//          "Pé pesado - Seja pisado por um doente." (nas cartas do pai, os zumbis são "the sick")
//   Ato 3: terminar o ato, derrotar o doente e derrotar o doente com o lustre (nomes escolhidos em inglês).

export type AchievementIcon = 'letter' | 'heart' | 'roof' | 'rat' | 'web' | 'foot' | 'window' | 'grave' | 'chandelier';

/** O que libera a conquista. `letter` vazio = qualquer carta do ato. */
export type AchievementTrigger =
  | { type: 'letterRead'; act: string; letter?: string }
  | { type: 'actEnd'; act: string }
  | { type: 'allRatsKilled'; act: string }
  | { type: 'stomped'; act: string }
  /** `byChandelier`: só vale derrotando com o lustre. */
  | { type: 'sickDefeated'; act: string; byChandelier?: boolean };

export interface Achievement {
  id: string;
  act: string;
  name: string;
  description: string;
  icon: AchievementIcon;
  trigger: AchievementTrigger;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'explorer',
    act: 'act1',
    name: 'THE EXPLORER',
    description: 'Read a letter left by someone mysterious.',
    icon: 'letter',
    trigger: { type: 'letterRead', act: 'act1' },
  },
  {
    id: 'love',
    act: 'act1',
    name: 'LOVE ADMIRER',
    description: 'Read the love letter.',
    icon: 'heart',
    trigger: { type: 'letterRead', act: 'act1', letter: 'attic' },
  },
  {
    id: 'roof',
    act: 'act1',
    name: 'ROOF DIGGER',
    description: 'Leave the house through the roof.',
    icon: 'roof',
    trigger: { type: 'actEnd', act: 'act1' },
  },
  {
    id: 'rats',
    act: 'act1',
    name: 'RAT CONQUEROR',
    description: 'Kill all the rats.',
    icon: 'rat',
    trigger: { type: 'allRatsKilled', act: 'act1' },
  },
  {
    id: 'poles',
    act: 'act2',
    name: 'WEBS THROUGH THE AIR',
    description: 'Shoot your webs across the poles.',
    icon: 'web',
    trigger: { type: 'actEnd', act: 'act2' },
  },
  {
    id: 'stomped',
    act: 'act2',
    name: 'HEAVY FOOT',
    description: 'Get stepped on by one of the sick.',
    icon: 'foot',
    trigger: { type: 'stomped', act: 'act2' },
  },
  {
    id: 'window',
    act: 'act3',
    name: 'OUT THE WINDOW',
    description: 'Leave the house through the broken window.',
    icon: 'window',
    trigger: { type: 'actEnd', act: 'act3' },
  },
  {
    id: 'rest',
    act: 'act3',
    name: 'PUT TO REST',
    description: 'Defeat the sick in the kitchen.',
    icon: 'grave',
    trigger: { type: 'sickDefeated', act: 'act3' },
  },
  {
    id: 'chandelier',
    act: 'act3',
    name: 'LIGHTS OUT',
    description: 'Drop the chandelier on the sick.',
    icon: 'chandelier',
    trigger: { type: 'sickDefeated', act: 'act3', byChandelier: true },
  },
];
