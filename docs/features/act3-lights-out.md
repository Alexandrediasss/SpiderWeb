# Spec: ato 3, LIGHTS OUT (a casa vizinha)

Continua de onde o ato 2 parou: a aranha entrou pela chaminé da casa vizinha. Esta casa está **sem energia** (as luminárias estão apagadas) e chove por rachaduras no teto. Aqui ela descobre que fala e que se chama **Mary**. Lê as três últimas cartas do pai e chega na cozinha, onde está um doente. O ato termina quando ela sai pelo buraco da janela da cozinha.

Código:
- `src/level/neighborHouse.ts`: o mapa ASCII (mesma legenda da casa do ato 1), cômodos, decorações, ratos, gosma, goteiras, checkpoints, o doente, o lustre e a janela de saída.
- `src/level/letters.ts`: as cartas do ato 3 (`ACT3_LETTERS`). `src/level/dialogues.ts`: as falas da Mary.
- `src/systems/sick.ts`: o doente da cozinha. `src/systems/chandelier.ts`: o lustre e a corda. `src/systems/kitchen.ts`: os dois juntos (as teias que acertam, os tapas, a queda em cima do doente ou da Mary), usado pelo jogo e pelo resumo do ato no SCENES. Lógica pura.
- `src/systems/goo.ts` e `src/systems/poison.ts`: gosma e veneno ([goo-poison.md](goo-poison.md)). `src/systems/dialogue.ts`: as falas ([dialogue.md](dialogue.md)).
- `src/art/neighborArt.ts`: o cenário (papéis de parede, decorações, a luz sem energia). `src/art/sickArt.ts`: o doente e o lustre.
- `src/entities/GooView.ts`, `src/entities/SickView.ts`: desenham a gosma, o doente e o lustre.
- `src/scenes/NeighborScene.ts`: a cena (cutscene de chegada, jogo, cartas, falas, veneno, morte, checkpoints, a briga, o fim e a pausa) e as três cenas do SCENES (`replay`).

Testes: `tests/neighborHouse.test.ts`, `tests/sick.test.ts`, `tests/kitchen.test.ts`, `tests/goo.test.ts`, `tests/dialogue.test.ts` e, no SCENES, `tests/recap.test.ts`.

## O mapa

80×44 tiles, como a casa do ato 1, mas o caminho é em zigue-zague, de cima para baixo:

| Andar | Cômodos | O que tem |
|---|---|---|
| Sótão (linhas 0–11) | sótão | A chaminé (à direita, com a abertura por onde a Mary sai), caixas, um rato, a carta **Dia 22**, rachaduras no telhado com goteira de chuva. O buraco no chão fica à esquerda. |
| 1º andar (linhas 14–26) | quarto (esquerda) e corredor (direita) | Goteiras de gosma no teto, gosma brotando do chão, um jorro, ratos. A carta **Dia 35** em cima da cama. No corredor, o **armário** (a porta aberta) com a carta **Dia 40**, com sangue. O buraco para baixo fica à direita. |
| Térreo (linhas 29–41) | sala (direita) e cozinha (esquerda) | Na sala: sofá, gosma, um jorro e um rato. Na cozinha: **o doente**, o **machado** na parede, sangue nas paredes e no chão, o **buraco do esgoto** com gosma, o **lustre** pendurado perto da janela e a **janela quebrada** (na parede da esquerda), por onde a Mary sai. |

- Os buracos no chão são vãos no piso (`.` nas linhas do `=`). Não há como voltar para cima.
- A janela de saída é um vão de 2×2 tiles na parede da esquerda (`~` no mapa), na altura da bancada. Fica acima do alcance do doente.
- **Sem energia:** as luminárias aparecem apagadas. A luz vem só do lado de fora (as janelas, um azul fraco de lua), do brilho da gosma (verde) e dos relâmpagos. Fica bem mais escuro que a casa do ato 1.
- **Goteiras de chuva:** gotas de água (azuis, inofensivas) pingam das rachaduras do teto em baldes e poças.
- **Gemidos lá de baixo:** no 1º andar, de tempos em tempos se ouve um gemido abafado vindo do térreo. No térreo, o doente geme de verdade (com a posição dele na tela).

## Cutscene de chegada

| Etapa | O que acontece |
|---|---|
| `dark` | Tela preta. Barulho de algo caindo dentro da chaminé. |
| `fall` | A tela clareia na base da chaminé, com faixas de cinema. A Mary cai pela abertura da chaminé numa nuvem de fuligem e bate no chão. |
| `cough` | Ela se sacode (fuligem saindo). Aparece o cartão `ACT 3` / `LIGHTS OUT`. Cai um raio. |
| `talk` | A Mary fala pela primeira vez ([dialogue.md](dialogue.md)): descobre que fala e que se chama Mary. |

- No fim, as faixas somem e o controle volta.
- **Pular:** `Enter`, `Esc`, `Espaço`, `A` ou `Start` pulam a queda (escurece rápido e clareia com ela no chão), mas **não pulam a fala**: ela é a história. A fala passa linha por linha com o botão de avançar.

## Cartas

As três são do pai (o jogo é em inglês; os originais revisados estão em [docs/story.md](../story.md)). Abrem igual às do ato 1 ([letters.md](letters.md)).

| Id | Onde | Cabeçalho | Papel |
|---|---|---|---|
| `day22` | sótão, em cima de uma caixa | Day 22 | manchado |
| `day35` | 1º andar, em cima da cama | Day 35 | rasgado no canto |
| `day40` | 1º andar, no chão do armário | Day 40 | com respingos de sangue |

- Nenhuma é extra, mas nada fica trancado: a janela da cozinha está sempre aberta.
- Fechar a carta `day35` (a primeira vez na jogada) faz a Mary falar; fechar a `day40` também (ela chora).
- A tela de fim mostra `LETTERS FOUND n / 3`.

## O doente da cozinha

Um doente sem uma das mãos e com o corpo todo cortado. A história deixa subentendido quem ele é: o jogo nunca diz.

1. **Passivo:** os doentes não atacam animais nem insetos. Ele anda devagar de um lado para o outro da cozinha (pausas, balançando) e geme. Passar perto, por cima ou por baixo dele não faz nada.
2. **Provocado:** qualquer teia de combate que acerte nele (de ataque ou de prender) o deixa bravo **para sempre**:
   - **teia de ataque:** tira 1 de vida (`SICK.hp`) e ele pisca vermelho;
   - **teia de prender:** segura ele parado por `SICK.trapSec`.
3. **Bravo:** anda atrás da Mary pelo chão da cozinha (`SICK.chaseSpeed`, mais rápido que a Mary envenenada). Quando ela está ao alcance (na frente dele, até `SICK.reachX` px, e não mais alto que `SICK.reachUp` px acima dos pés), ele levanta o braço (`SICK.windupSec`, dá para fugir) e bate: 1 de dano e um empurrão. Grudada no teto ou alta na parede, ela está fora do alcance: ele fica embaixo, esticando o braço e gemendo.
4. **Derrotado:** com a vida zerada, ele cai e fica no chão.
5. **O lustre:** perto da janela tem um lustre pendurado numa corda.
   - Uma teia de combate que passe pela corda a corta (a teia de balanço não pega na corda: ela não é sólida).
   - O lustre cai em linha reta. Se cair em cima do doente (as caixas se cruzam), ele morre na hora.
   - Se a Mary estiver embaixo, leva o dano (ou morre, se estiver envenenada).
   - Se errar, o lustre fica quebrado no chão.
6. **Morrer na briga:** a Mary volta no checkpoint da sala. Se o doente ainda estiver vivo, ele volta ao normal (vida cheia, passivo, andando) e o lustre volta para a corda. Se já morreu, continua morto.

## Checkpoints e morte

- Três checkpoints (`ACT3_CHECKPOINTS`): o chão do sótão (ao lado da chaminé), o chão do quarto (embaixo do buraco do sótão) e o chão da sala (embaixo do buraco do 1º andar).
- Igual ao ato 2: o checkpoint vira o ativo quando a Mary **gruda** numa superfície dentro da área dele, só para frente, com o aviso `CHECKPOINT` e um som.
- **Morte** (vida zerada, veneno no fim ou dano envenenada): a Mary vira de barriga para cima, a tela escurece (`ACT3.deathFadeSec`) e ela volta no último checkpoint com a vida cheia e sem veneno. Ratos mortos continuam mortos; cartas lidas continuam lidas.

## Fim do ato: a janela

1. **Gatilho:** o centro da Mary entra no vão da janela (`ACT3_WINDOW`).
2. O controle trava (faixas de cinema). Ela continua andando para fora, na chuva, e some.
3. A câmera fica na janela quebrada, com a chuva e um raio. A tela escurece.
4. "END OF ACT 3" ([acts.md](acts.md)) e depois a seleção de atos.

## Pausa

`Esc`/`Start` abre o mesmo menu dos outros atos: RESUME, RESTART (volta para o sótão, sem a cutscene e sem a primeira fala; as cartas lidas continuam) e MAIN MENU. Não dá para pausar nas cutscenes, nas falas nem durante a morte.

## No SCENES

As três cenas do ato 3 ([scenes.md](scenes.md)):

| Cena | O que é | Libera quando |
|---|---|---|
| MARY | a chegada pela chaminé, com a primeira fala | a cutscene começa no jogo |
| THE HOUSE NEXT DOOR | o resumo do ato: a Mary pilotada por um roteiro (`ACT3_RECAP` em `src/level/recaps.ts`) | termina o ato 3 |
| THE WINDOW | o fim saindo pela janela | a cutscene começa no jogo (a Mary entra no vão) |

- **MARY:** igual ao jogo, e a fala aparece sempre (mesmo se a Mary já falou na jogada) e não conta como dita. `Enter`/`Esc`/`Espaço` ou `A`/`B`/`Start` na queda voltam ao SCENES; na fala, `Enter`/`Espaço`/`F` ou `A`/`Y` passam a linha e `Esc` ou `B`/`Start` saem. Depois da última linha, escurece e volta.
- **THE HOUSE NEXT DOOR:** sótão, carta do Dia 22, a descida pelo buraco, a gosma do quarto, a cama (Dia 35), o rato do corredor e o armário (Dia 40), e a cozinha: a Mary acerta o doente de cima da geladeira, sobe ao teto, anda até o lustre, espera ele parar embaixo e corta a corda. Os ratos, o doente e o lustre usam a semente fixa (`RECAP.seed`); a gosma e a cozinha andam no passo fixo do resumo, e o teste confere que a gosma nunca encosta nela. Não dá conquista.
- **THE WINDOW:** a Mary começa na bancada perto da janela (`ACT3_ENDING_START`), anda sozinha para a esquerda, sobe a parede e entra no vão (no máximo `ACT3.endApproachMaxSec`); aí roda a mesma cutscene do fim. Termina no preto e volta ao SCENES, sem a tela "END OF ACT 3" e sem salvar nada.

## Conquistas

| Nome | Descrição | Como consegue |
|---|---|---|
| OUT THE WINDOW | Leave the house through the broken window. | Terminar o ato 3. |
| PUT TO REST | Defeat the sick in the kitchen. | Derrotar o doente (com teias ou com o lustre). |
| LIGHTS OUT | Drop the chandelier on the sick. | Derrotar o doente com o lustre. |

## Como mexer

- **Mapa:** `NEIGHBOR_MAP` em `src/level/neighborHouse.ts`. Se mudar algo de lugar, confira as posições de gosma, goteiras, cartas, checkpoints, do doente, do lustre e da janela: o `tests/neighborHouse.test.ts` confere quase tudo.
- **Números:** `ACT3`, `SICK` e `CHANDELIER` em `config.ts`.
- **Mexeu no mapa, na gosma, no doente ou no lustre:** rode `npm test`; o roteiro do resumo (`ACT3_RECAP`) pode precisar de ajuste ([scenes.md](scenes.md)).
- **Dev:** `__scene3` é a cena; `__scene3.respawn()`, `__scene3.checkpoint = 2`, `__scene3.startEnding()`, `__scene3.poison.apply()`; `__sick` é o doente (`__sick.hp = 1`); `__spider.placeAt(x, y)` funciona igual. As cenas do SCENES: `__scene.game.scene.stop('game'); __scene.game.scene.start('act3', { replay: 'act3-recap' })` (ou `'act3-intro'`, `'act3-ending'`).
