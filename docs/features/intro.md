# Spec: cutscene de abertura

Depois do PLAY, uma cutscene conta o começo da história. A aranha protagonista acorda dentro da parede, coberta de um líquido verde mutante, e sai pelo buraco de rato para a sala, onde o jogo começa.

Código:
- `src/scenes/IntroScene.ts`: a cena da cutscene.
- `src/systems/cutscene.ts`: linha do tempo e páginas de texto (lógica pura).
- `src/level/story.ts`: o texto.
- `src/art/introArt.ts`: palco dentro da parede, escuridão, líquido verde.
- Buraco de rato da sala: `mouseHole` em `src/art/decorArt.ts`.
- Elementos `#intro`, `#intro-text` e `#intro-skip` em `index.html`.

Testes: `tests/cutscene.test.ts`.

## Roteiro (cerca de 28 s)

| Etapa | O que acontece |
|---|---|
| `text0`, `text1` | Tela preta. O texto aparece letra por letra (`INTRO.typeCps`), fica `INTRO.holdSec` e some. No segundo trecho, um trovão distante. |
| `reveal` | Uma luz clareia a escuridão, vinda de uma junta rachada num cano. Mostra o vão dentro da parede, e a aranha deitada de barriga para cima com o líquido verde sobre ela. Uma gota verde pinga do cano de tempos em tempos ("plip"). |
| `sleep` | Ela continua desacordada. O líquido brilha no escuro. |
| `twitch` | As pernas mexem em dois espasmos. |
| `flip` | Pulinho e giro: ela desvira. O líquido espirra para os lados. |
| `shake` | Sacode o corpo. |
| `look` | Olha para trás, para a escuridão, e vira para a frente. |
| `holeLight` | À direita aparece o buraco de rato, com a luz quente da sala do outro lado. A luz escorre pelo chão até ela. |
| `walk` | Ela anda até o buraco (com os passinhos). |
| `enter` | Entra no buraco: fica menor (vai para o fundo) e some na luz. |
| `outro` | A tela escurece. |

Depois, a cena do jogo começa com a aranha **saindo do buraco de rato** da sala: ela cresce do fundo para a frente em `INTRO.emergeSec`, e só então o controle é liberado.

## Regras

1. **Pular:** `Enter`, `Esc` ou `Espaço` no teclado, `A` ou `Start` no controle. A tela escurece rápido e o jogo começa (com a saída do buraco). O aviso "ENTER / START skip" aparece no canto depois de 1,2 s.
2. **Quando passa:** a cutscene toca toda vez que se escolhe o ato 1 na seleção de atos, inclusive ao voltar pelo "Main Menu". Morrer e "Restart" **não** passam por ela: a tela escurece e a aranha volta ao início da fase (na frente do buraco).
3. **Som:**
   - a música da tela inicial vai sumindo durante o texto e a chuva continua (abafada, estamos dentro da parede);
   - toca um trovão distante no segundo trecho de texto;
   - "plip" das gotas e passinhos na caminhada.
4. **Palco:**
   - tem 160×90 px, mostrado com zoom `INTRO.zoom` (3×) para a aranha ficar grande;
   - a escuridão é uma imagem preta com alfa = 1 − luz, em faixas com pontilhado;
   - há duas versões da escuridão: só com a luz do cano, e com a luz do buraco também. Para o buraco "acender", a de cima some aos poucos.
5. **Texto:** fica em `src/level/story.ts` (em inglês, como o resto do jogo; o original em português está no comentário do arquivo). Cada item é uma "página", e `\n` quebra a linha. A duração se ajusta sozinha ao tamanho do texto.

## Como mexer

- **Mudar a história:** edite `INTRO_PAGES` em `story.ts`.
- **Mudar tempos:** `INTRO` em `config.ts`.
- **Nova etapa:** adicione na lista do `Timeline` em `IntroScene.create` e trate em `enterStep` (uma vez, ao entrar) e/ou `runStep` (todo quadro, com o `progress` 0..1).
