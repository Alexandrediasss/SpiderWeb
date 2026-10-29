# Spec: atos (seleção de atos e fim do ato)

O jogo é dividido em atos, como os episódios de *The Walking Dead* da Telltale. O LOAD GAME do menu principal abre a seleção de atos (e o NEW GAME vai direto ao ato 1); no fim de cada ato aparece a tela "END OF ACT".

Código:
- `src/level/acts.ts`: a lista de atos (número, nome, se já existe, de qual ato depende, quais cartas tem).
- `src/systems/progress.ts`: lógica pura. O progresso salvo (atos completos e cartas achadas), lido de JSON com validação.
- `src/art/actArt.ts`: a arte de cada ato (240×135, com moldura gasta).
- `src/scenes/ActsMenu.ts`: a seleção de atos (`#acts` em `index.html`).
- `src/scenes/ActEnd.ts`: a tela de fim do ato (`#act-end`).
- `src/scenes/progressStore.ts`: guarda o progresso no `localStorage` do navegador.

Testes: `tests/progress.test.ts` e `tests/actArt.test.ts`.

## Os atos

| Ato | Nome | Situação | Arte |
|---|---|---|---|
| 1 | AWAKENING | jogável | A aranha na calha do telhado, de costas, olhando a horda na rua, com um raio no céu. |
| 2 | ROOFTOPS | jogável depois de terminar o ato 1 ([act2-rooftops.md](act2-rooftops.md)) | A aranha no meio do balanço, presa na teia de um poste de luz, com a ventania, um fio faiscando e a horda embaixo. |
| 3 | ??? | COMING SOON | Silhueta dos telhados do bairro na tempestade, escurecida e com um cadeado. |

## Seleção de atos

Fluxo: menu principal → LOAD GAME (a tela escurece e clareia já aqui, no ato mais adiantado liberado) → **seleção de atos** → transição do ato → o ato. As transições: [transitions.md](transitions.md).

1. **Layout (estilo Telltale):**
   - em cima, o nome do ato (`ACT 1: AWAKENING`) entre duas setas cor de pergaminho (`LB`/`RB`, ou `◀`/`▶` no teclado);
   - no meio, a arte do ato numa moldura gasta, e pontinhos mostrando em qual ato está;
   - embaixo da arte, a situação: `COMPLETED · LETTERS 2/3` (ou nada, se nunca terminou);
   - na base, os botões: `(A) SELECT` e `(B) BACK`, ou `ENTER SELECT` e `ESC BACK` no teclado.
   - Os botões mostrados seguem o último dispositivo usado (`body.pad` no CSS).
2. **Controles:** `←`/`→`, `A`/`D`, D-pad, analógico, `LB`/`RB` trocam de ato. `Enter`/`Espaço`/clique na arte ou `A`/`Start` escolhem. `Esc`/`Backspace` ou `B` voltam para o menu principal.
3. **Ato bloqueado:** escolher não faz nada (o botão SELECT fica apagado).
   - Ato que ainda não existe: a arte tem o cadeado e aparece `COMING SOON`.
   - Ato que depende de outro (`requires`): a arte aparece apagada e `FINISH ACT 1 TO UNLOCK`.
4. **Música:** continua tocando a valsa da tela inicial. Ela some ao escolher um ato.
5. **Ao escolher o ato 1:** as cartas lidas são zeradas, toca a transição da gosma verde e começa a cutscene de abertura.
6. **Ao escolher o ato 2:** toca a transição da teia e do vento e começa a cutscene de abertura do ato 2.

## Fim do ato

1. **Gatilhos:**
   - ato 1: sair pelo buraco do telhado;
   - ato 2: entrar pela chaminé da casa vizinha ([act2-rooftops.md](act2-rooftops.md)).

   No ato 1: A cutscene da rua ([street-cutscene.md](street-cutscene.md)) é o final do ato: quando ela acaba (ou é pulada), a tela continua preta e aparece o fim do ato. Antes, a aranha voltava para o sótão; agora não volta mais.
2. **Tela de fim:** aparece em etapas, por cima do preto:
   - `END OF` / `ACT 1` / `AWAKENING`;
   - `LETTERS FOUND 2 / 3` (só em ato com cartas);
   - o próximo ato: `ACT 2 · ROOFTOPS` ou `ACT 3 · COMING SOON`;
   - depois de `ACT_END.continueAfterSec`, o aviso `(A) / ENTER continue`.
3. **Continuar:** `Enter`, `Espaço`, `Esc`, clique ou `A`/`Start`. O jogo volta para a seleção de atos (com a música), já mostrando o ato 1 como completo.
4. **Salvar:** ao chegar no fim do ato, o progresso é salvo: o ato fica completo e as cartas achadas são somadas às de antes (fica o conjunto de todas as que já foram lidas em alguma jogada).

## Progresso salvo

- Fica no `localStorage` do navegador (chave `spiderweb.progress`), em JSON: `{ "completed": ["act1"], "letters": { "act1": ["table", "bed"] } }`.
- Se o navegador bloquear o `localStorage` (aba anônima, por exemplo), tudo funciona igual, só não fica salvo.
- JSON estragado ou de outra versão vira progresso vazio (não trava o jogo).
- **Zerar (dev):** `localStorage.removeItem('spiderweb.progress')` no console.

## Como mexer

- **Novo ato:** adicione em `ACTS` (`src/level/acts.ts`) e desenhe a arte em `buildActArt` (`actArt.ts`).
- **Tempos da tela de fim:** `ACT_END` em `config.ts`.
- **Ver o fim do ato na hora (dev):** `__scene.endAct()` no console, durante o jogo.
