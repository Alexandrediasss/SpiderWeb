# Spec: cutscenes do ato 3 (a chaminé e a janela)

Duas cutscenes de verdade, no nível da abertura do ato 1 e da rua: cenas próprias, com vários planos, cortes, palcos pintados em tamanho grande, faixas de cinema e atuação da Mary. Substituem a chegada e o fim curtos que eram feitos dentro do jogo. No SCENES são **MARY** e **THE WINDOW** ([scenes.md](scenes.md)).

Código:
- `src/scenes/ChimneyScene.ts`: a chegada (cena `chimney`).
- `src/scenes/WindowScene.ts`: o fim (cena `window`).
- `src/systems/act3Cuts.ts`: lógica pura. As etapas e o plano de cada uma, a queda na chaminé (paredes, velocidade), o voo pela abertura e a Mary descendo no fio.
- `src/systems/kitchen.ts`: `snapshot`/`restore`, como a cozinha ficou na jogada (a janela mostra isso).
- `src/art/act3CutArt.ts`: os palcos (dentro da chaminé, a janela por dentro e por fora, a casa inteira de frente, o feixe de lua).
- `src/level/dialogues.ts`: `ARRIVAL_ACTING`, o que a Mary faz em cada linha da primeira fala.
- `src/audio/Sfx.ts`: `thud`, `sootBurst`, `brickClack`.
- Tempos: `CHIMNEY_CUT` e `WINDOW_CUT` em `config.ts`.

Testes: `tests/act3Cuts.test.ts` (etapas, queda, voo, fio, atuação), `tests/act3CutArt.test.ts` (os palcos), `tests/kitchen.test.ts` (`snapshot`/`restore`).

## MARY (a chegada)

Vem depois da transição da luz que apaga, ao escolher o ato 3. Termina com o jogo começando no chão do sótão, no mesmo lugar onde a cutscene deixou a Mary.

| Etapa | Plano | O que acontece |
|---|---|---|
| `dark` | preto | Tela preta. Barulho de algo arranhando dentro da chaminé. |
| `fall` | chaminé (palco, zoom 3) | A boca da chaminé, com o céu e a chuva, vai embora para cima. A Mary cai girando, batendo de uma parede na outra (fuligem e "tum" a cada batida). Os tijolos passam cada vez mais rápido e a luz de cima some. |
| `burst` | abertura (mapa do jogo, zoom 3) | **Corte.** A fuligem explode da abertura da chaminé, a tela treme, voam pedaços de tijolo. A Mary sai voando, bate no chão, quica duas vezes e para de barriga para cima. |
| `settle` | abertura | Silêncio. A fuligem cai devagar. Um último tijolo cai atrasado ("toc"). Ela não se mexe, preta de fuligem. |
| `twitch` | abertura | As pernas mexem em dois espasmos. |
| `flip` | abertura | Pulinho e giro: desvira. |
| `shake` | abertura | Sacode o corpo: a fuligem voa e ela volta à cor normal. |
| `look` | sótão (mapa do jogo, zoom 1,7) | **Corte.** O que ela vê, em panorâmica lenta para a esquerda: a luminária apagada, as goteiras pingando nos baldes, a janelinha redonda. Cai um raio perto, e aparece o cartão `ACT 3` / `LIGHTS OUT`. |
| `back` | abertura | **Corte.** De volta nela, olhando para cima. |
| `talk` | abertura | A primeira fala ([dialogue.md](dialogue.md)), com a atuação abaixo. O tempo da cutscene para até a fala acabar. |
| `outro` | abertura | A tela escurece e o jogo começa. |

**Atuação na fala** (`ARRIVAL_ACTING`, uma por linha):

| Linha | Atuação | O que ela faz |
|---|---|---|
| "Phew... I'm so tired." | `tired` | Fica parada, respirando devagar e baixinha. |
| "WAIT, I'M TALKING!" | `startled` | Dá um pulo, com um `!` em cima. A câmera aproxima num tranco e ela olha para os dois lados, rápido. |
| "Wow... is a spider even supposed to talk?..." | `puzzled` | Um `?` em cima. Inclina o corpo para um lado e para o outro. |
| "Anyway... calling myself "spider"..." | `pacing` | Anda um pouco para a esquerda e volta. |
| "From the bottom of my heart..." | `named` | Para de frente. A câmera aproxima devagar e o feixe de lua clareia. |

**Pular:**
- **No jogo:** `Enter`, `Esc`, `Espaço`, `A` ou `Start` antes da fala: escurece rápido e clareia com a Mary já de pé, em `back`. **A fala não é pulada**, porque é a história: ela passa linha por linha (`F`, `Enter`, `Espaço`, clique; `A` ou `Y`).
- **Pelo SCENES:** antes da fala, `Enter`/`Esc`/`Espaço` ou `A`/`B`/`Start` voltam ao SCENES. Na fala, `Enter`/`Espaço`/`F` ou `A`/`Y` passam a linha e `Esc` ou `B`/`Start` voltam.
- O aviso "ENTER / START skip" aparece depois de `CHIMNEY_CUT.skipHintAfterSec`.

## THE WINDOW (o fim)

No jogo: a Mary entra no vão da janela, o controle trava e a tela escurece (`WINDOW_CUT.exitFadeSec`). A `NeighborScene` dorme durante a cutscene (como a `GameScene` na rua). Quando acaba, ela acorda e mostra o "END OF ACT 3".

| Etapa | Plano | O que acontece |
|---|---|---|
| `sillIn` | janela por dentro (palco, zoom 3) | Clareia na janela quebrada, de perto: os cacos na moldura, a chuva lá fora, os azulejos em volta. |
| `walk` | janela por dentro | A Mary entra pela direita, andando no parapeito, e para no meio: um recorte escuro contra o céu. |
| `stop` | janela por dentro | Fica olhando a chuva. Cai um raio e ela aparece inteira contra o clarão. |
| `turn` | janela por dentro | Vira para trás, para a cozinha. |
| `kitchen` | cozinha (mapa do jogo, zoom 1,4) | **Corte.** O que ela vê, em panorâmica lenta: o machado, o sangue nas paredes, o buraco do esgoto. A cozinha está **como o jogador deixou**: veja abaixo. |
| `turnBack` | janela por dentro | **Corte.** Ela vira de novo para a chuva. |
| `leave` | janela por dentro | Anda para fora, passando por trás dos cacos: vai ficando menor. |
| `outIn` | janela por fora (palco, zoom 3) | **Corte.** Do lado de fora, na chuva forte: a parede de madeira, a janela quebrada com o brilho verde lá no fundo. A Mary vem de dentro e cresce até a beira do parapeito. |
| `rain` | janela por fora | Sacode a chuva do corpo e olha para os dois lados. Os gemidos da rua ficam mais altos. |
| `thread` | janela por fora | Prende a teia na moldura e desce pelo fio, saindo por baixo do quadro. |
| `wide` | a casa de frente (palco, zoom 2 para 2,6 no começo) | **Corte.** A casa inteira na tempestade, com **todas as janelas apagadas**, e os doentes rodeando pelo gramado e pela calçada. A Mary, um pontinho, desce no fio da janela até o chão. Um raio mostra tudo. A câmera vai abrindo devagar. |
| `outro` | a casa de frente | Escurece e vem o fim do ato. |

**A cozinha como o jogador deixou** (`Kitchen.snapshot()`, passada para a cena; pelo SCENES é sempre a primeira):

| Na jogada | No plano da cozinha |
|---|---|
| Não mexeu no doente | Ele anda devagar de um lado para o outro, gemendo. |
| Provocou e não derrotou | Ele fica virado para a janela, gemendo mais alto. |
| Derrotou com teias | Ele está caído no chão. |
| Derrubou o lustre nele | Ele está caído, com o lustre quebrado por cima. |

**Pular:** `Enter`, `Esc`, `Espaço`, `A`, `B` ou `Start` escurecem rápido e vão para o fim do ato (pelo SCENES, de volta ao SCENES com a cena escolhida). Pelo SCENES não aparece o "END OF ACT 3" nem salva nada.

## Som

- **Chegada:** sem música. Arranhar na chaminé, "tum" nas batidas, a explosão de fuligem e o "toc" do tijolo; depois só a chuva abafada e as goteiras; trovão no raio; a voz da Mary na fala.
- **Fim:** sem música. Dentro, a chuva abafada; o doente geme no plano da cozinha. Fora, a chuva fica alta (`setOutside`) e os gemidos da rua sobem (`zombies.setDistance`). A horda do plano da casa geme e pisa como na rua. Trovões nos raios. Tudo volta ao normal no fim.

## Como mexer

- **Tempos, zooms e posições:** `CHIMNEY_CUT` e `WINDOW_CUT` em `config.ts`.
- **Etapas:** `CHIMNEY_STEPS` e `WINDOW_STEPS` em `src/systems/act3Cuts.ts`, com o plano de cada uma. Para adicionar, trate em `enterStep` (uma vez) e/ou `runStep` (todo quadro) da cena.
- **Mudou as falas da chegada:** `ARRIVAL_ACTING` precisa ter uma atuação por linha (o teste confere).
- **Mudou o mapa do ato 3:** a abertura da chaminé (`CHIMNEY_BREACH`) e o lugar do jogo (`ACT3_CHECKPOINTS[0]`) posicionam a chegada; o doente e o lustre (`SICK_DEF`, `CHANDELIER_DEF`) posicionam o plano da cozinha.
- **Dev:**
  - `__scene.game.scene.stop('game'); __scene.game.scene.start('chimney')` abre a chegada e `start('window', { replay: true })` o fim (`replay` volta para o SCENES no fim; sem ele, a janela espera a cena do ato dormindo, como no jogo; `__scene3.startEnding()` faz esse caminho);
  - durante elas, `__cut` é a cena: `__cut.elapsed = __cut.tl.startOf('look')` pula para uma etapa (o plano troca sozinho);
  - a galeria (`art.html`) mostra os palcos.

## Casos de borda

- **Teclas presas:** a tecla que pulou não passa a primeira linha da fala (`DIALOGUE.openGraceSec`).
- **A marca `talk` da linha do tempo:** dura mais que o maior quadro (1/30 s), senão a cutscene pula a fala (o teste confere).
- **Pular no fim:** em `outro` ou escurecendo, pular não faz nada de novo.
- **Reinício:** "Restart" e morrer no ato 3 não passam pela chegada. A chegada só toca ao escolher o ato na seleção de atos.
