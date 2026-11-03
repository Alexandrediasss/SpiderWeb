# Spec: gosma verde e veneno (ato 3)

O líquido verde mutante (o mesmo da cutscene de abertura) vaza pela casa vizinha. Encostar nele envenena a Mary: ela fica com cara de doente, lenta, fraca nos pulos, sem conseguir soltar teia, e morre em 5 segundos. **Não tem cura.**

Código:
- `src/systems/goo.ts`: lógica pura. Goteiras, jorros e poças: quando pingam, quando jorram, onde acertam.
- `src/systems/poison.ts`: lógica pura. O veneno (tempo, efeitos).
- `src/systems/SpiderMotor.ts`: `speedScale` e `jumpScale` (o veneno deixa lenta e fraca nos pulos).
- `src/entities/GooView.ts`: desenha as gotas, os jorros, as poças e o brilho verde.
- `src/scenes/NeighborScene.ts`: liga tudo (toque, veneno, morte, efeitos na tela e no som).

Testes: `tests/goo.test.ts`.

## Gosma

Três jeitos, posições em `GOO` (em `src/level/neighborHouse.ts`):

| Tipo | Como funciona |
|---|---|
| **Goteira** (`drip`) | Uma gota se forma no teto (cresce por `GOO_CFG.dripFormSec`), cai com gravidade e estoura no primeiro sólido embaixo, respingando. Depois de `every` segundos, outra. Encostar na gota caindo envenena. |
| **Jorro** (`jet`) | Um cano quebrado no chão. Ciclo: parado (`idleSec`) → borbulhando (`GOO_CFG.jetWarnSec`, aviso: bolhas e um gorgolejo) → jorrando (`GOO_CFG.jetSpraySec`, uma coluna de `height` px). Encostar na coluna envenena. |
| **Poça** (`pool`) | Gosma brotando do chão, parada. Encostar (os pés na poça) envenena. Dá para pular por cima ou passar pelo teto. |

- A gosma brilha verde no escuro (o mapa de luz já vem com o brilho em volta das poças e dos jorros).
- Os ratos e o doente não se importam com a gosma.
- **Goteiras de chuva** usam a mesma lógica da goteira, mas a gota é de água (azul) e não faz nada: só pinga no balde ou na poça.

## Veneno

1. **Pega:** a caixa da Mary encosta numa gota, num jorro ou numa poça.
   - Toca um chiado borbulhante, a tela treme um pouco e a teia que estava presa (balanço) solta.
   - Encostar de novo não muda nada (o tempo não reinicia).
2. **Efeitos (por `POISON.sec`, 5 s):**
   - **aspecto de doente:** a Mary fica esverdeada, balança e solta bolhinhas verdes;
   - **lenta:** anda e corre a `POISON.speedScale` da velocidade (e controla menos no ar);
   - **fraca nos pulos:** pula a `POISON.jumpScale` da força;
   - **sem teia:** nem a de balanço, nem as de combate;
   - na tela: a borda fica verde pulsando e os corações ficam verdes, com uma barrinha que esvazia; um "tum" grave a cada segundo, como um coração fraco.
3. **Fim:** ao zerar o tempo, a Mary morre ([act3-lights-out.md](act3-lights-out.md): volta no checkpoint).
4. **Dano envenenada:** qualquer dano (mordida de rato, o doente, o lustre) mata na hora, não importa a vida que ainda tem.
5. **Sem cura:** nada tira o veneno, só morrer.

## Como mexer

- **Tempos e efeitos:** `POISON` e `GOO_CFG` em `config.ts`.
- **Onde tem gosma:** `GOO` em `src/level/neighborHouse.ts` (o teste confere que cada goteira fica embaixo de um teto e cada jorro e poça em cima de um chão).
- **Dev:** `__scene3.poison.apply()` envenena agora.
