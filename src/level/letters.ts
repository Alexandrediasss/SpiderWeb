// Cartas do pai da família, espalhadas pelas casas (o jogo é em inglês). Spec: docs/features/letters.md
// O texto original, em português e revisado, está em docs/story.md (atos 1 e 3). As páginas são calculadas
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
  /** Aparência da página aberta: manchas (`seed`), canto rasgado, coraçãozinho, sangue. */
  paper: { seed: number; torn?: boolean; heart?: boolean; blood?: boolean };
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
      'My wife is very nervous. Last night, while our daughter was sleeping, she confronted me, even slapped me, and said she wouldn\'t know what to do with her life if our daughter died.',
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

/** Ato 3: as cartas da casa vizinha (posições no mapa de src/level/neighborHouse.ts). */
export const ACT3_LETTERS: Letter[] = [
  {
    id: 'day22',
    tx: 45,
    ty: 8,
    extra: false,
    heading: 'Day 22',
    paper: { seed: 41 },
    text: [
      'We just arrived at this house, and it was the worst idea I have ever had in my life. On the way, our daughter was bitten, and we ran into this house. Unluckily, all the sick heard us, and now they are surrounding the house. I don\'t know how long we can hold out here, but we are desperate.',
      'Lonnie blames me, and every time I get close she punches me in the face. I don\'t hit back, because I am not capable of raising my hand against the woman I love.',
      'Basically, she wanted us to carry our daughter during the crossing between the houses, but I said it would slow us down and that it would be better for her to run between us. During the run, our daughter tripped, and one of the sick bit her on the belly. I killed that monster and carried my daughter, crying, all the way here. Lonnie blames me so much and says our daughter is going to die.',
    ].join('\n\n'),
  },
  {
    id: 'day35',
    tx: 12,
    ty: 22,
    extra: false,
    heading: 'Day 35',
    paper: { seed: 53, torn: true },
    text: [
      'It has been days since we got here, and I am afraid of my wife. Our daughter is extremely sick, and Lonnie won\'t let me talk to her. She always hits me and beats me, but the last time she raised a knife at me and tried to stab me, and I ran away.',
      'I miss our daughter, and I miss when Lonnie and I were so close. Since our daughter was bitten, she hates me and pushes me away from everything. I am so sad about it, especially because these last days the sick have been showing up even more.',
      'All the food I found, I gave to them, and I only drink rainwater. Luckily, there were several liters of filtered water here for them.',
    ].join('\n\n'),
  },
  {
    id: 'day40',
    tx: 61,
    ty: 26,
    extra: false,
    heading: 'Day 40',
    paper: { seed: 67, blood: true },
    text: [
      'Some really bad shit happened. Lonnie asked me to carry our daughter to the kitchen, and I slipped. Our daughter fell into a hole that led to the sewer, where there was this green liquid.',
      'Lonnie just grabbed an axe and cut off one of my hands. I ran, screaming like never before in my life, until I managed to hide inside the wardrobe to write this last letter.',
      'I, Michael Trigger, regret everything I have done in my life, but more than anything, I loved my daughter and my wife. I didn\'t want to die like this... I can hear her screams getting closer. I am going to give myself up and let her kill me...',
    ].join('\n\n'),
  },
];

/** Todas as cartas do jogo (para conferir os ids). */
export const ALL_LETTERS: Letter[] = [...LETTERS, ...ACT3_LETTERS];
