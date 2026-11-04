// Falas da Mary (o jogo é em inglês). Os originais em português estão em docs/story.md (ato 3).
// Spec: docs/features/dialogue.md
import type { DialogueLine } from '../systems/dialogue';

export type DialogueId = 'arrival' | 'day35' | 'day40';

/** O que a Mary faz na cutscene da chegada, em cada linha de `arrival`. Spec: docs/features/act3-cutscenes.md */
export type Acting = 'tired' | 'startled' | 'puzzled' | 'pacing' | 'named';

export const DIALOGUES: Record<DialogueId, DialogueLine[]> = {
  // Logo depois de cair pela chaminé: ela descobre que fala e que se chama Mary.
  arrival: [
    { text: "Phew... I'm so tired.", mood: 'normal' },
    { text: "WAIT, I'M TALKING!", mood: 'surprised' },
    { text: 'Wow... is a spider even supposed to talk? How strange...', mood: 'surprised' },
    { text: 'Anyway... calling myself "spider" doesn\'t feel right.', mood: 'normal' },
    { text: 'From the bottom of my heart, I feel that Mary is the right name for me.', mood: 'normal' },
  ],
  // Ao fechar a carta do Dia 35.
  day35: [
    { text: 'Gosh... reading these letters makes me so sad and scared.', mood: 'sad' },
    { text: "But it's not just sympathy. It's like I can picture them... and feel something...", mood: 'sad' },
  ],
  // Ao fechar a carta do Dia 40: ela chora.
  day40: [
    { text: '...', mood: 'cry' },
    { text: 'I wanted them to be happy.', mood: 'cry' },
  ],
};

/** Uma atuação por linha da fala `arrival` (o teste confere). */
export const ARRIVAL_ACTING: Acting[] = ['tired', 'startled', 'puzzled', 'pacing', 'named'];
