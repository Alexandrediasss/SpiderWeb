# Spec: conquistas (achievements)

Conquistas por ato, como as de console: ao conseguir uma, aparece um aviso no topo da tela com um som. No menu principal, o ACHIEVEMENTS (que antes era uma tela trancada) mostra todas, separadas por ato, com as que já foram conseguidas acesas.

Código:
- `src/level/achievements.ts`: a lista (id, ato, nome, descrição, ícone e o que libera). Texto em inglês; os originais em português ficam no comentário.
- `src/systems/achievements.ts`: lógica pura. Quais conquistas um acontecimento libera, a leitura do salvo (com validação) e o agrupamento por ato.
- `src/scenes/achievementStore.ts`: guarda no `localStorage` (chave `spiderweb.achievements`) e libera (`award`).
- `src/scenes/AchievementToast.ts`: o aviso "ACHIEVEMENT UNLOCKED" (`#achievement-toast`), em fila.
- `src/scenes/AchievementsScreen.ts`: a tela do menu (`#achievements`).
- `src/art/uiArt.ts`: os ícones em pixel art (`buildAchievementIcon`): medalha dourada com o desenho, ou cinza com cadeado quando ainda não foi conseguida.

Testes: `tests/achievements.test.ts`.

## As conquistas

| Ato | Nome (no jogo) | Descrição (no jogo) | Original | Como consegue |
|---|---|---|---|---|
| 1 | THE EXPLORER | Read a letter left by someone mysterious. | O explorador: leia uma carta deixada por alguém misterioso. | Ler a primeira carta (qualquer uma das três; no caminho natural é a da mesa da sala). |
| 1 | LOVE ADMIRER | Read the love letter. | Apreciador do amor: leia a carta de amor. | Ler a terceira carta, a extra, no canto do sótão (`attic`). |
| 1 | ROOF DIGGER | Leave the house through the roof. | Escavador de telhados: saia da casa pelo telhado. | Terminar o ato 1 (sair pelo buraco do telhado). |
| 1 | RAT CONQUEROR | Kill all the rats. | Conquistador de ratos: mate todos os ratos. | Matar os quatro ratos do ato 1 na mesma jogada (morrer ou "Restart" traz todos de volta). |
| 2 | WEBS THROUGH THE AIR | Shoot your webs across the poles. | Soltando teias pelos ares: solte teias pelos postes. | Terminar o ato 2 (entrar pela chaminé). |
| 2 | HEAVY FOOT | Get stepped on by one of the sick. | Pé pesado: seja pisado por um doente. | Cair na rua no ato 2: libera no instante em que o pé do zumbi chega no chão (o tremor e o som da pisada). |

## Regras

1. **Acontecimentos que liberam:**
   - `letterRead` (ato e id da carta): ao abrir uma carta;
   - `actEnd` (ato): ao chegar no fim do ato (mesmo momento em que o progresso é salvo);
   - `allRatsKilled` (ato): quando morre o último rato vivo do ato 1 (não vale no resumo do SCENES);
   - `stomped` (ato): na etapa `hold` da morte do ato 2, quando o pé do zumbi bate no chão.
2. **Uma vez só:** conquista conseguida fica para sempre e não avisa de novo.
3. **Salvo separado do jogo:** fica em `spiderweb.achievements`, separado do progresso. O **NEW GAME não apaga as conquistas** (ele só zera atos e cartas). Se o navegador bloquear o `localStorage`, as conquistas funcionam na jogada, só não ficam salvas. JSON estragado ou com ids desconhecidos é ignorado (não trava o jogo).
4. **Aviso:**
   - no topo, no centro: o ícone, `ACHIEVEMENT UNLOCKED` pequeno e o nome;
   - entra deslizando, fica `ACHIEVEMENTS.toastSec` e sai;
   - se duas forem conseguidas juntas, aparecem uma depois da outra;
   - toca um sininho (`Sfx.achievement`, três notas subindo).
   - Aparece por cima de qualquer coisa (carta aberta, tela de fim do ato).
5. **Tela do menu (ACHIEVEMENTS):**
   - título `ACHIEVEMENTS` e a contagem `1 / 6`;
   - um bloco por ato (`ACT 1 · AWAKENING`, `ACT 2 · ROOFTOPS`), com um cartão por conquista: ícone, nome e descrição;
   - conquistada: medalha dourada e texto claro; ainda não: medalha cinza com cadeado e texto apagado (o nome e a descrição aparecem mesmo assim, para o jogador saber o que fazer);
   - só tem o BACK: `Esc`, `Backspace`, `Enter`, `Espaço`, clique ou `B`/`A`/`Start` no controle. A transição é a teia que puxa ([transitions.md](transitions.md)).
6. **SCENES** é a outra tela do menu: rever as cutscenes e os resumos dos atos ([scenes.md](scenes.md)).

## Como mexer

- **Nova conquista:** adicione em `ACHIEVEMENTS` (`src/level/achievements.ts`) com o gatilho. Se precisar de um acontecimento novo, crie o tipo em `GameEvent` (`systems/achievements.ts`) e dispare `award(...)` na cena.
- **Novo ícone:** um caso em `buildAchievementIcon` (`uiArt.ts`).
- **Tempo do aviso:** `ACHIEVEMENTS` em `config.ts`.
- **Zerar (dev):** `localStorage.removeItem('spiderweb.achievements')` no console.
