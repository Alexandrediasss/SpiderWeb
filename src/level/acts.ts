// Atos do jogo, como os episódios da Telltale. Spec: docs/features/acts.md

export interface Act {
  id: string;
  number: number;
  /** Nome na seleção de atos ("???" enquanto não existe). */
  name: string;
  /** Falso = aparece bloqueado, com "COMING SOON". */
  playable: boolean;
  /** Só libera depois de terminar este ato. */
  requires?: string;
  /** Ids das cartas deste ato (`LETTERS` em letters.ts). */
  letters: string[];
}

export const ACTS: Act[] = [
  { id: 'act1', number: 1, name: 'AWAKENING', playable: true, letters: ['table', 'bed', 'attic'] },
  { id: 'act2', number: 2, name: 'ROOFTOPS', playable: true, requires: 'act1', letters: [] },
  { id: 'act3', number: 3, name: '???', playable: false, letters: [] },
];
