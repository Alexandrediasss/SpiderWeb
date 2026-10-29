# Spec: cartas (a história do pai)

Folhas escritas pelo pai da família que morava na casa estão espalhadas pela fase. Elas contam o que aconteceu: a invasão dos "doentes", a família trancada em casa e o plano de fugir pelo buraco no telhado. A aranha não entende, mas o jogador lê.

Código:
- `src/level/letters.ts`: onde fica cada carta e o texto (em inglês; o original em português fica no comentário).
- `src/systems/letters.ts`: lógica pura. Posição de cada folha, qual está perto da aranha e quais já foram lidas (`LetterLog`).
- `src/art/letterArt.ts`: a folhinha dobrada no cenário, o brilho e a página aberta com as patas da aranha segurando.
- `src/entities/LetterSprites.ts`: desenha as folhas no mundo (com a luz do lugar e o brilho).
- `src/scenes/LetterReader.ts`: o aviso `READ` e a página aberta, em HTML por cima do canvas (`#read-prompt` e `#letter` em `index.html`).

Testes: `tests/letters.test.ts`.

## As cartas

| # | Onde | Tile | Obrigatória? | Conteúdo |
|---|---|---|---|---|
| 1 | Em cima da mesa da sala | (29, 35) | sim | Dia 14: a invasão, os "doentes", a família trancada, a filha com asma. |
| 2 | Em cima da cama do quarto | (9, 22) | sim | Dia 21: sem comida e com sede, o buraco no sótão, sair pelos telhados. |
| 3 | No canto direito do sótão | (73, 11) | extra | Para a esposa, Jean Marry: a família mais unida do que nunca. |

O tile é a célula vazia logo acima da superfície: a folha fica apoiada no chão dela. As três ficam no caminho natural da fase (sala → quarto → sótão). A 3ª fica do outro lado do sótão, passando pelo rato, por isso é a extra.

## Regras

1. **No cenário:** cada carta é uma folhinha dobrada em pé (como uma tenda). Enquanto não foi lida, um brilho pisca nela a cada `LETTER.glintEverySec`. Depois de lida, o brilho some.
2. **Luz:** a folha recebe a luz do lugar, com mínimo de `LETTER.minLight`, para não sumir no escuro.
3. **Ler:** com o centro da aranha a até `LETTER.readRadius` px da folha, aparece em cima dela o aviso `READ` com a tecla: `F` no teclado ou `Y` no controle, conforme o último dispositivo usado.
4. **Página aberta:**
   - o jogo pausa (como no menu de pausa) e a página aparece no centro da tela, por cima de um fundo escuro;
   - o pergaminho é pixel art gerada por código: papel envelhecido, borda gasta, dobras, manchas de chuva e um canto rasgado. Cada carta tem as suas manchas;
   - **duas patas da aranha de cada lado** sobem da borda de baixo da tela e seguram a página pelos cantos, como se fosse ela lendo. A página balança 1 pixel de vez em quando, como uma respiração;
   - o texto é HTML numa fonte manuscrita (Caveat), cor de tinta.
5. **Fechar:** `F`, `Esc`, `Enter` ou `Espaço`, clique, ou `Y`, `B`, `A` ou `Start` no controle. Depois de fechar, pulo e teias ficam ignorados por `TITLE.inputGraceSec`.
6. **Som:** papel amassando ao abrir e ao fechar (`Sfx.paper`).
7. **Contagem:** as cartas lidas valem para o ato inteiro: morrer ou "Restart" não apagam. Começar o ato de novo pela seleção de atos zera a contagem. No fim do ato aparece quantas foram achadas (veja [acts.md](acts.md)).

## Como mexer

- **Texto:** `LETTERS` em `src/level/letters.ts`. `\n\n` separa parágrafos.
- **Nova carta:** adicione em `LETTERS` com um `id` novo. O teste confere se ela está apoiada numa superfície e se a aranha alcança.
- **Raio de leitura, brilho:** `LETTER` em `config.ts`. Cores do papel: `PAL.letter`.
- **Ver sem andar até lá (dev):** `__scene.openLetter('table')` (ou `'bed'`, `'attic'`) no console.

## Casos de borda

- **Rato por perto:** abrir a carta pausa tudo, então não dá para ser mordido lendo. Mas o rato continua lá quando ela fecha.
- **Pausa:** `Esc` com a carta aberta fecha a carta, não abre o menu.
- **Na corda ou no ar:** só dá para abrir a carta com a aranha grudada numa superfície (não no meio de um pulo).
