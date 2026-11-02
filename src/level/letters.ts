// Cartas do pai da família, espalhadas pela casa (o jogo é em inglês). Spec: docs/features/letters.md
// O texto original, em português e revisado, está em docs/story.md (ato 1). As páginas são calculadas
// sozinhas a partir do texto (`paginateLetter` em src/systems/letters.ts).

export interface Letter {
  id: string;
  /** Tile vazio logo acima da superfície onde a folha fica apoiada. */
  tx: number;
  ty: number;
  /** Extra: não precisa ler para a história fazer sentido. */
  extra: boolean;
  /** Cabeçalho (pode ser vazio). */
  heading: string;
  /** Texto; `\n\n` separa parágrafos. */
  text: string;
  /** Aparência da página aberta: manchas (`seed`), canto rasgado, coraçãozinho. */
  paper: { seed: number; torn?: boolean; heart?: boolean };
}

export const LETTERS: Letter[] = [
  {
    id: 'table',
    tx: 29,
    ty: 35,
    extra: false,
    heading: 'Day 14',
    paper: { seed: 11 },
    text: [
      'Two weeks have passed since the incident that threw the whole world into chaos, and all I can think about is protecting my wife and my daughter.',
      'My daughter is horrified by these things that have taken over everything. I call them "the sick", but not the usual kind: they are people who simply died, came back to life, and kill anything and anyone in their way.',
      'In the beginning, my brother Olise, who was with me, was killed and eaten right in front of me. All I could do was run and lock myself in the house with my family. Every day I see him walking on the street up the hill, and all I can feel is sadness. But I can\'t cry. I have to show strength and safety to the women in my life.',
      'Since it happened, my wife has been very sad, with sudden mood swings. She lives scared, afraid, and sometimes she is even aggressive with me. But I don\'t blame her. She saw my brother die in front of us, and she is afraid the same will happen to our daughter.',
      'I always calm her down, but since the food started running out, it is getting harder. I keep imagining the day the water runs out too. That\'s why, every day, I go up to the attic to plan escape routes and the right time for us to leave the house safely.',
    ].join('\n\n'),
  },
  {
    id: 'bed',
    tx: 9,
    ty: 22,
    extra: false,
    heading: 'Day 21',
    paper: { seed: 23, torn: true },
    text: [
      'Three weeks have passed since the incident began, and things have only gotten worse.',
      'My daughter has asthma, and her medicine is almost gone. We urgently need more. We used to buy it at the convenience store on the street up the hill, and I believe there is still plenty inside.',
      'The urgency came fast: all the food is gone, and we are drinking rainwater, saved in buckets and cleaned with the filter from our water cooler.',
      'These past days I came up with a plan to get out safely. The sick move in packs, and every early afternoon they gather on the street below, because the neighbors\' dog is still alive and runs by barking at that time. It\'s the perfect moment for us to slip out and go up to the store.',
      'My wife is very nervous. Last night, while our daughter was sleeping, she confronted me, even slapped me, and said she doesn\'t know what she would do with her life if our daughter died.',
      'That\'s why we are leaving tonight. I made a hole in the roof so we can get out from above and move through high places, where they can\'t see us or catch us.',
    ].join('\n\n'),
  },
  {
    id: 'attic',
    tx: 73,
    ty: 11,
    extra: true,
    heading: 'Day 15',
    paper: { seed: 37, heart: true },
    text: [
      'So many horrible things have happened these last days, but at least Lonnie and I are closer.',
      'Before the incident we were close to a divorce. She used to say I spent too much time working, and that when I was home I spent more time watching TV, while she took care of the house and our daughter.',
      'But since this hell began, we are together all the time: we sleep together, we play with our daughter, and we have our moments of love. Who would have thought the world had to end for me to spend more time with the woman I love.',
      'I LOVE YOU, LONNIE!',
    ].join('\n\n'),
  },
];
