# Spec: cutscene da rua (a horda de zumbis)

No sótão há um buraco no telhado. Quando a aranha passa por ele, a tela escurece e começa uma cutscene: lá fora, debaixo da chuva, uma horda de zumbis está passando na rua em frente à casa. A câmera mostra primeiro só as pernas e vai subindo até as cabeças, enquanto eles andam e gemem. A referência de clima é a cena da primeira temporada de *The Walking Dead* (Telltale) em que o grupo sai e percebe que está cercado.

Código:
- `src/systems/roofHole.ts`: lógica pura. A aranha está dentro do buraco?
- `src/systems/horde.ts`: lógica pura. Fileiras de zumbis andando, quando cada um geme e quando cada pé pisa.
- `src/scenes/StreetScene.ts`: a cena (planos, câmera, chuva, relâmpagos, som).
- `src/art/zombieArt.ts`: os zumbis (formas + contorno, em vários tamanhos).
- `src/art/streetArt.ts`: o telhado visto de fora, a rua, as casas do outro lado e a beira do telhado.
- `src/audio/ZombieVoices.ts`: gemidos e passos dos zumbis, sintetizados.
- O buraco no mapa: `ROOF_HOLE` e as decorações `roofHole` e `puddle` em `src/level/houseMap.ts`.

Testes: `tests/horde.test.ts`, `tests/roofHole.test.ts` e `tests/zombieArt.test.ts`.

## O buraco no telhado

1. Fica no lado esquerdo do telhado do sótão: 2×2 tiles (`ROOF_HOLE`), com `~` no mapa, ou seja, céu.
2. **Dá para ver de dentro:** a chuva aparece no buraco e uma parte dela cai para dentro, até a poça no chão do sótão. No relâmpago, a luz também entra pelo buraco, como numa janela.
3. **Gatilho:** quando o centro da aranha entra no retângulo do buraco, a tela escurece em `STREET.exitFadeSec`. Nesse meio-tempo a aranha sobe sozinha (input "para cima"), sem pulo nem teias, e não dá para pausar.
4. **Volta:** no fim da cutscene, a aranha cai pelo buraco de volta para o sótão e o controle volta. A vida, os ratos e o resto ficam como estavam: a cena do jogo **dorme** durante a cutscene (`scene.sleep`/`wake`) e não reinicia.
5. Passar pelo buraco de novo mostra a cutscene de novo. Dá para pular.

## Roteiro (cerca de 27 s)

Faixas pretas de cinema em cima e embaixo o tempo todo.

| Etapa | Plano | O que acontece |
|---|---|---|
| `fadeIn` | 1. telhado (zoom 3) | A tela clareia: o telhado visto de fora, de cima, na chuva. Chaminé, antena e o buraco com telhas quebradas e a luz quente do sótão lá dentro. |
| `emerge` | 1 | A aranha sobe de dentro do buraco. |
| `walk` | 1 | Ela anda um pouco pelo telhado. |
| `listen` | 1 | Para. Os gemidos da rua ficam mais altos; ela se arrepia e olha para baixo, para a rua. |
| `legs` | 2. rua (zoom 2) | **Corte.** A rua molhada e só as pernas dos zumbis passando, com o reflexo delas no asfalto. Os gemidos agora estão perto. |
| `tilt` | 2 | A câmera sobe devagar (com parallax: o que está perto se move mais) e mostra os troncos e as cabeças, as casas do outro lado e o céu. |
| `heads` | 2 | Um relâmpago forte ilumina os rostos, e o trovão vem logo depois. A câmera para nas cabeças. |
| `wide` | 3. beira do telhado (zoom 2) | **Corte.** A aranha pequena na calha, de costas, olhando a horda que enche a rua. Outro relâmpago mostra o tamanho dela. |
| `outro` | 3 | A tela escurece e o jogo volta. |

## A rua

- Um bairro americano de classe média: casas de madeira com telhado de duas águas, varanda, garagem, cerca branca, caixa de correio, árvores, poste com fios e um poste de luz laranja.
- Um carro abandonado no meio da rua, com a porta aberta e o pisca-alerta piscando.
- Chuva por cima de tudo (riscos de 1 px) e respingos no chão.
- Três fileiras de zumbis, todos andando no mesmo sentido (`HORDE.rows`):
  - perto: os maiores, na calçada da frente, com reflexo no chão molhado;
  - meio: no asfalto;
  - longe: na calçada do outro lado, mais escuros (chuva e distância).
- Cada fileira e cada faixa do cenário sobem com uma velocidade própria durante o `tilt`, o que dá profundidade.

## Os zumbis

Uma mistura do zumbi do Minecraft (corpo em blocos, braços esticados para a frente, andar duro) com o de Plants vs. Zombies (roupa do dia a dia rasgada, olhos grandes e diferentes um do outro, boca aberta com poucos dentes, corcunda).

1. Desenhados em blocos de `u` px (`u` = 6 perto, 4 no meio, 2 longe e 1 no plano 3). Um zumbi tem cerca de 34 `u` de altura. Vista 3/4 andando para a direita.
2. **Variações** (`ZOMBIE_LOOKS`): terno marrom com gravata, camiseta e jeans, roupão com bobes, macacão com camisa xadrez, moletom, cardigã com óculos. Muda a pele, o cabelo, a roupa e se falta um braço.
3. **Caminhada:** 6 quadros. Pernas duras em pêndulo, corpo balançando, braços tremendo um pouco. Uma das variações manca.
4. **Olhos:** ficam numa folha separada (como os do rato) e escurecem menos que o corpo. No escuro, o branco dos olhos aparece.
5. No escuro da noite, cada fileira recebe uma cor de luz (`PAL.street.zombieLight`), e quem passa embaixo do poste fica mais quente e claro. No relâmpago, todos ficam com a cor cheia.

## Som

- **Gemidos:** cada zumbi geme de tempos em tempos (`HORDE.groanGapSec`), então a horda inteira forma um coro. Cada gemido é uma "voz" sintetizada: dente de serra grave (80 a 150 Hz) que desce de tom, com aspereza (modulação rápida de volume, como voz rouca) e três filtros de formante que vão de "uh" para "ah" e voltam. Tem também um sopro de ruído. A posição na tela vira o pan, e os da frente soam mais alto.
- **Passos:** os zumbis de perto e do meio fazem um "chap" molhado quando o pé pisa.
- **Distância:** no telhado os gemidos chegam abafados (passa-baixa) e baixos; na rua ficam claros e altos; no plano aberto, no meio-termo.
- **Chuva:** durante a cutscene a chuva fica mais alta e menos abafada (estamos do lado de fora). Volta ao normal no jogo.
- **Trovões:** junto dos relâmpagos do roteiro.
- **Medido** (`OfflineAudioContext`, acima de 250 Hz): na rua, o coro de gemidos fica cerca de 1,5× mais forte que a chuva de fora; no telhado, cerca de 0,5× (abafado, só um aviso). Pico do coro em 0,63, sem clipping. Na primeira versão os gemidos ficavam 3,7× mais fracos que a chuva e sumiam atrás dela.

## Controles

- Pular: `Enter`, `Esc` ou `Espaço`, ou `A`/`Start` no controle. A tela escurece rápido e o jogo volta. O aviso "ENTER / START skip" aparece depois de 1,2 s.
- `M` / `Select`: mudo, como no jogo.

## Como mexer

- **Tempos, tamanhos e câmera:** `STREET` em `config.ts`. Fileiras, velocidades e intervalo dos gemidos: `HORDE`.
- **Novo visual de zumbi:** adicione em `ZOMBIE_LOOKS` (`zombieArt.ts`), com as cores em `PAL.zombie`.
- **Onde fica o buraco:** `ROOF_HOLE` em `houseMap.ts`. O mapa precisa de `~` nesses tiles (o teste confere), e as decorações `roofHole` e `puddle` precisam acompanhar.
- **Ver sem andar até lá (dev):** `__scene.goToStreet()` no console. Durante a cutscene, `__street.elapsed = 17` pula para as cabeças (cada etapa sabe o seu plano, então o corte acontece sozinho).
- **Ouvir a horda sem jogar:** botão na galeria (`art.html`).

## Casos de borda

- **Com a teia presa:** o gatilho vale do mesmo jeito; ao voltar, a corda já foi solta.
- **Morrer durante o escurecimento:** não acontece, porque os ratos não sobem no telhado e a vida não cai nessa hora.
- **Teclas presas:** o Phaser solta todas as teclas quando a cena dorme, e o jogo ignora pulo e teias por `TITLE.inputGraceSec` ao voltar.
