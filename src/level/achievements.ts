// Conquistas de cada ato (o jogo é em inglês). Spec: docs/features/achievements.md
//
// Originais (português):
//   Ato 1: "O explorador - Leia uma carta deixada por alguém misterioso."
//          "Apreciador do amor - Leia a carta de amor."
//          "Escavador de telhados - Saia da casa pelo telhado."
//   Ato 2: "Soltando teias pelos ares - Solte teias pelos postes."

export type AchievementIcon = 'letter' | 'heart' | 'roof' | 'web';

/** O que libera a conquista. `letter` vazio = qualquer carta do ato. */
export type AchievementTrigger = { type: 'letterRead'; act: string; letter?: string } | { type: 'actEnd'; act: string };

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
    id: 'poles',
    act: 'act2',
    name: 'WEBS THROUGH THE AIR',
    description: 'Shoot your webs across the poles.',
    icon: 'web',
    trigger: { type: 'actEnd', act: 'act2' },
  },
];
