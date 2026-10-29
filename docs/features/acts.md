# Spec: atos (seleção de atos e fim do ato)

O jogo é dividido em atos, como os episódios de *The Walking Dead* da Telltale. Depois do PLAY aparece a seleção de atos; no fim de cada ato aparece a tela "END OF ACT".

Código:
- `src/level/acts.ts`: a lista de atos (número, nome, se já dá para jogar, quais cartas tem).
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
| 2 | ??? | COMING SOON | Silhueta dos telhados do bairro na tempestade (a fuga de casa em casa da carta 2), escurecida e com um cadeado. |

## Seleção de atos

Fluxo: tela inicial → PLAY → **seleção de atos** → ato 1 → cutscene de abertura → jogo.

1. **Layout (estilo Telltale):**
   - em cima, o nome do ato (`ACT 1: AWAKENING`) entre duas setas cor de pergaminho (`LB`/`RB`, ou `◀`/`▶` no teclado);
   - no meio, a arte do ato numa moldura gasta, e pontinhos mostrando em qual ato está;
   - embaixo da arte, a situação: `COMPLETED · LETTERS 2/3` (ou nada, se nunca terminou);
   - na base, os botões: `(A) SELECT` e `(B) BACK`, ou `ENTER SELECT` e `ESC BACK` no teclado.
   - Os botões mostrados seguem o último dispositivo usado (`body.pad` no CSS).
2. **Controles:** `←`/`→`, `A`/`D`, D-pad, analógico, `LB`/`RB` trocam de ato. `Enter`/`Espaço`/clique na arte ou `A`/`Start` escolhem. `Esc`/`Backspace` ou `B` voltam para a tela inicial.
3. **Ato bloqueado:** a arte fica escura com o cadeado e `COMING SOON`. Escolher não faz nada (o botão SELECT fica apagado).
4. **Música:** continua tocando a valsa da tela inicial. Ela só some ao escolher o ato 1 (como era no PLAY).
5. **Ao escolher o ato 1:** as cartas lidas são zeradas e começa a cutscene de abertura.

## Fim do ato

1. **Gatilho do ato 1:** sair pelo buraco do telhado. A cutscene da rua ([street-cutscene.md](street-cutscene.md)) é o final do ato: quando ela acaba (ou é pulada), a tela continua preta e aparece o fim do ato. Antes, a aranha voltava para o sótão; agora não volta mais.
2. **Tela de fim:** aparece em etapas, por cima do preto:
   - `END OF` / `ACT 1` / `AWAKENING`;
   - `LETTERS FOUND 2 / 3`;
   - `ACT 2 · COMING SOON`;
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
