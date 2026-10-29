// Cartas do pai da família, espalhadas pela casa (o jogo é em inglês). Spec: docs/features/letters.md
//
// Originais (português):
//   1 (mesa da sala): "Já faz 2 semanas que essa invasão desses monstros começou, acho que vou chamá-los de
//     "doentes", nunca vi algo parecido. Pessoas morrendo e voltando logo em seguida matando a todos ao seu
//     redor. A única coisa que consegui fazer foi me trancar em casa com a minha esposa e filha, mas a comida
//     está acabando e água estamos tomando da chuva. Minha filha tem asma e logo logo terei que sair para
//     conseguir remédio para ela."
//   2 (cama): "Já se passaram 3 semanas desde o início do incidente e a comida já acabou e estamos morrendo de
//     sede. Eu fiz um buraco no sótão para a gente sair mas estou assustado com o que vi lá em cima, estamos
//     arrumando as coisas para a gente sair por cima e ir de casa em casa."
//   3 (canto do sótão, extra): "Antes desse incidente eu e a minha esposa estávamos perto do divórcio, mas agora
//     com esse sentimento de cuidar da nossa filha e se proteger estamos mais perto do que nunca. Eu te amo
//     Jean Marry."

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
    text:
      'It\'s been two weeks since this invasion of monsters began. I think I\'ll call them "the sick". ' +
      "I've never seen anything like it. People die and come back right after, killing everyone around them." +
      '\n\nThe only thing I could do was lock myself in the house with my wife and daughter. ' +
      "But the food is running out, and we're drinking rainwater." +
      "\n\nMy daughter has asthma. Soon I'll have to go out and find medicine for her.",
  },
  {
    id: 'bed',
    tx: 9,
    ty: 22,
    extra: false,
    heading: 'Day 21',
    paper: { seed: 23, torn: true },
    text:
      "It's been three weeks since the incident began. The food is gone, and we're dying of thirst." +
      "\n\nI made a hole in the attic so we can get out, but I'm scared of what I saw up there." +
      "\n\nWe're packing our things. We'll leave over the rooftops and go from house to house.",
  },
  {
    id: 'attic',
    tx: 73,
    ty: 11,
    extra: true,
    heading: '',
    paper: { seed: 37, heart: true },
    text:
      'Before all this, my wife and I were close to a divorce.' +
      "\n\nBut now, taking care of our daughter and protecting each other, we're closer than ever." +
      '\n\nI love you, Jean Marry.',
  },
];
