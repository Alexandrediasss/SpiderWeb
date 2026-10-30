// Cenas do SCENES (como o museu do Sonic Generations): as cutscenes de cada ato, na ordem da história, e o
// resumo de cada ato. Uma cena só aparece depois de vista no jogo (o resumo, depois de terminar o ato).
// O jogo é em inglês. Spec: docs/features/scenes.md

export type SceneId = 'act1-intro' | 'act1-recap' | 'act1-street' | 'act2-intro' | 'act2-recap' | 'act2-ending';

export interface SceneDef {
  id: SceneId;
  act: string;
  name: string;
  /** Uma linha para lembrar o que acontece. */
  description: string;
  /** cutscene = a mesma do jogo; recap = resumo da jogatina do ato (liberado ao terminar o ato). */
  kind: 'cutscene' | 'recap';
}

export const SCENES: SceneDef[] = [
  {
    id: 'act1-intro',
    act: 'act1',
    name: 'IN THE BEGINNING',
    description: 'A spider wakes up inside the walls, covered in green liquid.',
    kind: 'cutscene',
  },
  {
    id: 'act1-recap',
    act: 'act1',
    name: 'THE HOUSE',
    description: 'Rats, letters and walls: the way up to the roof.',
    kind: 'recap',
  },
  {
    id: 'act1-street',
    act: 'act1',
    name: 'THE HORDE',
    description: 'Out on the roof, the street is full of the sick.',
    kind: 'cutscene',
  },
  {
    id: 'act2-intro',
    act: 'act2',
    name: 'THE STORM',
    description: 'On the gutter, the wind starts to blow.',
    kind: 'cutscene',
  },
  {
    id: 'act2-recap',
    act: 'act2',
    name: 'ACROSS THE STREET',
    description: 'Pole to pole, above the horde, against the wind.',
    kind: 'recap',
  },
  {
    id: 'act2-ending',
    act: 'act2',
    name: 'THE CHIMNEY',
    description: 'The house next door has a way in.',
    kind: 'cutscene',
  },
];
