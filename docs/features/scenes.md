# Spec: SCENES (rever as cenas) e os resumos dos atos

No menu principal, o **SCENES** é como o museu do *Sonic Generations*: lista todas as cenas do jogo, na ordem da história, para o jogador relembrar. Cada ato tem três cenas: a cutscene de abertura, o **resumo do ato** e a cutscene do fim. Uma cena só aparece depois de ser vista no jogo; o resumo, depois de terminar o ato.

Código:
- `src/level/scenes.ts`: a lista (id, ato, nome, descrição, `cutscene` ou `recap`). Texto em inglês.
- `src/scenes/sceneStore.ts`: quais já foram vistas, no `localStorage` (chave `spiderweb.scenes`), e `markSceneSeen`.
- `src/scenes/ScenesScreen.ts`: a tela do menu (`#scenes` em `index.html`).
- `src/art/sceneThumbs.ts`: a miniatura de cada cena, feita com a própria arte do jogo.
- `src/systems/recap.ts`: lógica pura do resumo: o diretor (`RecapDirector`) e quem roda em passos fixos (`RecapRun`).
- `src/level/recaps.ts`: o roteiro dos três resumos (planos, ações, legendas).
- `src/systems/kitchen.ts`: o doente e o lustre juntos (teias que acertam, tapas, a queda), usado pelo jogo e pelo resumo do ato 3, e as marcas que o resumo do ato 3 usa.
- `src/scenes/cinema.ts`: faixas pretas (com o zoom compensado) e a legenda (`#recap-caption`).
- Replays: `IntroScene`, `StreetScene`, `RooftopScene` e `NeighborScene` aceitam `replay`; a `GameScene` roda o resumo do ato 1 (modo `recap`), a `RooftopScene` o do ato 2 e a `NeighborScene` o do ato 3.

Testes: `tests/scenes.test.ts` (lista e salvo), `tests/recap.test.ts` (diretor e os três roteiros com a física de verdade) e `tests/kitchen.test.ts` (o doente e o lustre).

## As cenas

| Ato | Nome (no jogo) | Tipo | Libera quando |
|---|---|---|---|
| 1 | IN THE BEGINNING | cutscene de abertura ([intro.md](intro.md)) | a cutscene começa no jogo (NEW GAME ou ato 1) |
| 1 | THE HOUSE | resumo do ato 1 | termina o ato 1 (tela "END OF ACT 1") |
| 1 | THE HORDE | cutscene da rua ([street-cutscene.md](street-cutscene.md)) | a cutscene começa no jogo (buraco do telhado) |
| 2 | THE STORM | abertura do ato 2 ([act2-rooftops.md](act2-rooftops.md)) | a cutscene começa no jogo |
| 2 | ACROSS THE STREET | resumo do ato 2 | termina o ato 2 |
| 2 | THE CHIMNEY | cutscene da chaminé | a cutscene começa no jogo (telhado vizinho) |
| 3 | MARY | chegada pela chaminé, com a primeira fala ([act3-lights-out.md](act3-lights-out.md)) | a cutscene começa no jogo |
| 3 | THE HOUSE NEXT DOOR | resumo do ato 3 | termina o ato 3 |
| 3 | THE WINDOW | o fim saindo pela janela quebrada | a cutscene começa no jogo (a Mary entra no vão da janela) |

## Regras

1. **Liberar:** a cena é marcada como vista quando **começa** no jogo (pular também conta). O resumo é marcado no fim do ato, junto com o progresso salvo. Assistir pelo SCENES não marca nada.
2. **Salvo separado do jogo:** `spiderweb.scenes`, separado do progresso e das conquistas. O **NEW GAME não apaga**. Se o navegador bloquear o `localStorage`, vale só na jogada. JSON estragado ou ids desconhecidos são ignorados.
3. **Tela do menu:**
   - título `SCENES` e a contagem `4 / 9`;
   - um bloco por ato (`ACT 1 · AWAKENING`), uma linha de três cartões em quadro de filme (furinhos em cima e embaixo): miniatura, `1. NOME` e a descrição;
   - o resumo tem a etiqueta `RECAP` no canto;
   - não vista: cadeado, `???` e o que falta (`WATCH IT IN ACT 1 TO UNLOCK`, ou `FINISH ACT 1 TO UNLOCK` no resumo); `WATCH` fica apagado;
   - o cartão escolhido fica com borda dourada e um ▶.
4. **Controles da tela:** `←`/`→` (ou `A`/`D`) troca de cartão, `↑`/`↓` troca de ato; `Enter`/`Espaço` ou `A`/`Start` assiste; `Esc`/`Backspace` ou `B` volta. Mouse: passar por cima escolhe, clique assiste. Entrar e sair da tela é a teia que puxa ([transitions.md](transitions.md)).
5. **Assistir:** a tela escurece (`RECAP.enterFadeSec`) e a cena começa como no jogo. No fim, ou pulando (`Enter`/`Esc`/`Espaço`, `A`/`B`/`Start`), escurece e volta para o SCENES com a mesma cena escolhida. A música do menu para nas cutscenes e continua nos resumos.
6. **Replays não mexem no jogo:** não salvam progresso, não dão conquista (matar todos os ratos ou derrubar o lustre no resumo não vale), não marcam cartas nem falas como lidas, e os fins (a chaminé, a janela) terminam no preto, sem a tela "END OF ACT".
7. **A chegada do ato 3 (MARY) tem fala:** no jogo a fala não é pulada, mas pelo SCENES dá para sair a qualquer hora. Durante a queda, `Enter`/`Esc`/`Espaço` ou `A`/`B`/`Start` voltam ao SCENES. Durante a fala, `Enter`/`Espaço`/`F` ou `A`/`Y` passam a linha (como no jogo) e `Esc` ou `B`/`Start` voltam ao SCENES. A fala aparece sempre, mesmo se a Mary já falou na jogada. Depois da última linha, escurece e volta.
8. **Os fins pelo SCENES começam um pouco antes:** a chaminé começa no beiral da casa vizinha (`ENDING_START`) e a janela em cima da bancada da cozinha (`ACT3_ENDING_START`); a aranha anda sozinha até o gatilho e a cutscene é a mesma do jogo.

## Os resumos dos atos

Uma montagem cinematográfica da jogatina, feita com o próprio jogo: cartão `ACT 1 / THE HOUSE` no preto, depois planos curtos separados por cortes (escurece e clareia, `RECAP.cutSec`), com faixas pretas, uma legenda por plano e a música do menu. No último plano a tela escurece devagar (`RECAP.endFadeSec`) e a música vai junto.

**A aranha anda de verdade:** um diretor pilota o `SpiderMotor` com entradas roteirizadas, como um jogador. Cada plano começa com a aranha num tile (corte), e as ações são:

| Ação | O que faz | Termina quando |
|---|---|---|
| `wait` | fica parada | o tempo acaba |
| `move` | segura uma direção (anda, sobe parede, contorna canto, ou no ar) | chega no objetivo |
| `jump` | pula e segura a direção | chega no objetivo |
| `web` | atira a teia de balanço em `anchor` e segura (x balança, y recolhe); sem `anchor` continua na mesma teia | chega no objetivo |
| `shoot` | teia de ataque ou de prender no rato (`rat`) ou numa marca (`cue`), uma a cada `everySec` | o rato morre (ou fica preso); a marca diz que acabou |
| `await` | fica parada esperando uma marca (`cue`) | a marca diz que acabou |
| `read` | lê a carta: a página aparece menor, por cima do plano | o tempo acaba |

O objetivo é uma faixa de posição e/ou "grudada" (`attached: true` ou numa superfície). Toda ação tem um tempo máximo só para nunca travar; **os testes exigem que nenhuma estoure**.

**Marcas (`cue`):** coisas do mundo que o roteiro mira ou espera, com uma posição e um "acabou". No ato 3 (`kitchenCues`):

| Marca | Onde mira | Acabou quando |
|---|---|---|
| `sick` | o peito do doente | ele ficou bravo (uma teia acertou) |
| `rope` | o meio da corda do lustre | a corda foi cortada |
| `sickUnder` | o lustre | o doente está parado embaixo do lustre (a queda acerta nele) |
| `sickDead` | o doente | ele morreu |

**O mundo anda junto:** além da aranha e dos ratos, a cena pode andar outras coisas no mesmo passo fixo (no ato 3: a gosma, as goteiras, o doente e o lustre). Assim a gosma pinga sempre no mesmo lugar do roteiro, e o teste confere que ela nunca encosta na Mary.

- **Sempre igual:** roda em passos fixos de 1/60 s (`RECAP.stepSec`), qualquer que seja a taxa de quadros, e os ratos usam uma semente fixa (`RECAP.seed`). Por isso o teste roda exatamente o que aparece na tela.
- **Aranha invencível:** os ratos dão o bote, mas não tiram vida nem empurram. Detritos e fios não acertam. No ato 3 a gosma não envenena e o tapa do doente não acerta (mas o roteiro nunca encosta na gosma).
- **Vento (ato 2):** um plano pode ter `wind` (força e direção constantes): a aranha sente como no jogo, e a cena mostra a chuva de lado, o som e os detritos. Nos outros planos, só uma brisa visual (`RECAP.breeze`).
- **Câmera:** segue a aranha, com o zoom do plano e `look` (para onde olhar além dela; no ato 2 o padrão é olhar um pouco para baixo, para a horda aparecer; no ato 3 os planos no chão olham para cima, para o cômodo aparecer, e a cozinha usa zoom 1 para caber do teto ao chão).
- **Cartão do começo:** `ACT N` e o nome da cena. Nome longo (como `THE HOUSE NEXT DOOR`) diminui a letra para caber numa linha.

**Ato 1 (THE HOUSE):** sai da parede e escala o sofá; mata o rato de baixo da mesa da sala; balança da estante até a mesa e lê a carta; da geladeira sobe pela teia, anda no teto e contorna o vão até o andar de cima; pula na cama, prende e mata o rato e lê a carta; mata o rato do sótão; sobe pela teia até o teto do sótão e sai pelo buraco do telhado.

**Ato 2 (ACROSS THE STREET):** desce o telhado até a calha (a horda embaixo), balança no braço do poste de luz e sobe por ele; da cruzeta do poste de madeira pula e laça o galho da árvore; anda no teto do ponto de ônibus com a horda passando; anda contra a rajada na passarela do outdoor (detritos voando); balança embaixo da cruzeta dos fios soltos; do telhado da garagem laça o beiral da casa vizinha e sobe o telhado.

**Ato 3 (THE HOUSE NEXT DOOR):** na ordem da história ([story.md](../story.md)): sai da chaminé pelo sótão escuro; sobe na caixa e lê a carta do Dia 22; desce pelo buraco do sótão até o quarto; passa pela gosma do quarto sem encostar nela; pula na cama e lê a carta do Dia 35; mata o rato do corredor e lê a carta do Dia 40 dentro do armário; na cozinha, de cima da geladeira, acerta o doente (ele fica bravo), sobe pela teia até o teto, anda até o lustre, espera o doente parar embaixo e corta a corda: o lustre cai nele. A cena usa a casa sem energia como no jogo (a luz da lua, a gosma brilhando, os relâmpagos), com as faixas, a legenda e a música do menu.

## Como mexer

- **Mudar um resumo:** edite `src/level/recaps.ts` e rode `npm test`. Se um plano não chegar no objetivo, o teste diz qual (`nome#ação`). Para achar um caminho novo, simule num teste: `new RecapRun([plano], { motor, combat: null, stepSpider: (dt, i) => motor.update(dt, i) }, TILE)` e imprima a posição da aranha a cada passo.
- **Mexeu no mapa** (`houseMap.ts`, `rooftops.ts` ou `neighborHouse.ts`) ou na gosma, no doente ou no lustre: rode `npm test`; o roteiro do resumo pode precisar de ajuste.
- **Nova cena:** adicione em `SCENES` (`src/level/scenes.ts`), a miniatura em `sceneThumbs.ts`, o `replay` na cena que toca e o caminho em `GameScene.playScene`. Marque como vista com `markSceneSeen` onde ela começa no jogo.
- **Tempos (cartão, cortes, escurecer), faixas e brisa:** `RECAP` em `config.ts`.
- **Debug:**
  - `localStorage.setItem('spiderweb.scenes', '["act1-intro","act1-recap","act1-street","act2-intro","act2-recap","act2-ending","act3-intro","act3-recap","act3-ending"]')` libera todas; `localStorage.removeItem('spiderweb.scenes')` tranca de novo;
  - `__scene.scene.restart({ openScenes: 'act1-recap' })` abre o SCENES direto (com a cena escolhida);
  - `__scene.scene.restart({ recap: true })` roda o resumo do ato 1; `__scene.game.scene.stop('game'); __scene.game.scene.start('act2', { replay: 'act2-recap' })` o do ato 2 (ou `'act2-intro'`, `'act2-ending'`); `__scene.game.scene.stop('game'); __scene.game.scene.start('act3', { replay: 'act3-recap' })` o do ato 3 (ou `'act3-intro'`, `'act3-ending'`);
  - durante o resumo, `__scene.recap.director` (ato 1), `__scene2.recap.director` (ato 2) ou `__scene3.recap.director` (ato 3) mostra o plano e a ação atuais (`shot`, `action`) e `timeouts`.
