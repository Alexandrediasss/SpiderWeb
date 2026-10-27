# Spec: combate (ratos, vida e teias de combate)

Ratos brancos de olhos vermelhos patrulham partes da casa. Quando veem a aranha, correm atrás e mordem. A aranha se defende com dois tipos de teia: uma que tira vida e outra que prende o rato por 5 segundos.

Código:
- `src/systems/rat.ts`: lógica pura. Comportamento do rato.
- `src/systems/combat.ts`: lógica pura. Vida da aranha (`Health`), teias voando, mira assistida e o `Combat`, que junta tudo e devolve eventos.
- `src/entities/CombatView.ts`: desenha ratos, teias e respingos.
- `src/scenes/HeartsHud.ts`: os corações da vida.
- `src/art/ratArt.ts`: pixel art do rato, do casulo de teia e dos corações.
- `src/audio/Sfx.ts`: guinchos, chiado da aranha e o "fiuu" das teias.
- Onde ficam os ratos: `RATS` em `src/level/houseMap.ts`.

Testes: `tests/combat.test.ts`.

## Controles

| Ação | Teclado / mouse | Controle |
|---|---|---|
| Teia de ataque (tira 1 de vida) | Botão direito do mouse | `X` |
| Teia que prende (5 s) | `E` | `B` |

As duas saem do centro da aranha na direção da mira (cursor do mouse ou analógico direito). A teia de balanço continua no botão esquerdo / `RB` ou `RT`.

## Aranha

1. **3 de vida** (`PLAYER.maxHp`), mostradas como corações no canto de cima à direita.
2. Cada mordida tira 1. Depois dela:
   - a aranha fica invencível por `PLAYER.invulnSec`, piscando;
   - leva um empurrão para longe do rato e para cima (solta da superfície, mas a corda continua);
   - a tela treme, o controle vibra forte e toca o chiado de dano.
3. **Vida zerada:**
   - a aranha fica vermelha e de barriga para cima, e toca o som de morte;
   - a tela escurece em `PLAYER.deathFadeSec`;
   - o jogo volta ao início da fase (na frente do buraco de rato, sem tela inicial nem cutscene), com vida cheia e todos os ratos de volta.

## Ratos

| Onde | Área de patrulha (tiles) |
|---|---|
| Embaixo da mesa da sala | x 24–33, linha 40 |
| Embaixo da mesa da cozinha | x 70–75, linha 40 |
| Em cima da cama do quarto | x 6–16, linha 22 |
| Sótão | x 34–56, linha 11 |

1. **Patrulha:** anda devagar de uma ponta à outra da área, com pausas curtas nas pontas. Nunca desce de beirada (cama, plataforma) e vira na parede.
2. **Visão:** vê a aranha se ela está:
   - na frente dele, a até `RAT.sightRange` px e `RAT.sightHeight` px de altura, **sem nada sólido no caminho**;
   - ou a até `RAT.noticeRange` px em qualquer direção (percebe de costas).
3. **Ao ver:** dá um guincho curto e persegue, mais rápido. Pode sair da área até `RAT.leashPx` px, mas não desce de beiradas. Se a aranha está logo acima (numa parede baixa), dá um pulinho.
4. **Mordida:** perto o bastante, faz um "bote" de `RAT.biteWindupSec` (quadro de boca aberta), e só então morde, se a aranha ainda estiver no alcance. Dá para fugir no bote. Entre uma mordida e outra há `RAT.biteCooldownSec`.
5. **Esquecer:** sem ver a aranha por `RAT.forgetSec`, volta a patrulhar. Ratos não sobem paredes: subir é a fuga.
6. **Vida:** `RAT.hp` = 3.
   - Cada teia de ataque tira 1: o rato pisca vermelho, guincha, é empurrado e fica atordoado por `RAT.hurtSec`. Depois vem atrás de você.
   - Com 0 de vida, dá um guincho longo, cai de barriga para cima e some.
7. **Preso na teia:** fica parado e não morde por `SHOTS.trapSec` (5 s), envolto num casulo. No último segundo ele treme, avisando que vai se soltar. Prender de novo renova o tempo. Preso, ainda leva dano (sem empurrão).
8. **No escuro:** o rato recebe a luz do lugar (mínimo de 50%), mas os olhos vermelhos ficam numa camada separada e não escurecem: brilham no escuro.

## Teias de combate

- **Ataque:** bolinha em cruz, rápida (`SHOTS.attack`), recarga de 0,3 s.
- **Prender:** rede 5×5, mais lenta (`SHOTS.trap`), recarga de 1 s.
- Andam em passos de 2 px e param no primeiro rato vivo ou sólido que tocarem, com um respingo. Somem ao chegar no alcance máximo.
- **Mira assistida (só no controle):** se um rato está a até `SHOTS.aimAssistDeg` da mira, dentro do alcance e sem parede no caminho, a teia vai direto nele. No mouse a mira é exata.

## Sons (sintetizados, como os mobs do Minecraft)

| Quando | Som |
|---|---|
| Rato vê a aranha | "ik-ik": dois piados curtos e baixos |
| Rato leva dano | "iiik!": piado agudo que sobe e cai, com vibrato leve |
| Rato morre | piado longo que vai morrendo |
| Aranha leva dano | chiado áspero picotado + clique |
| Aranha morre | chiado longo + baque |
| Teia sai (ataque, prender, balanço) | "fiuu" (ruído com filtro descendo) |
| Teia bate em algo | "pff" abafado |

Os piados do rato são tom limpo (seno + um pouco do 2º harmônico) entre 3 e 4,4 kHz, com um sopro de ruído no começo. A primeira versão usava onda dente de serra com vibrato rápido e soava como zumbido eletrônico. Tom puro agudo parece bem mais alto que ruído no mesmo volume, por isso o fator baixo em `ratSqueak`.

## Casos de borda

- **Morrer com a corda presa:** a corda continua até a tela escurecer. A aranha cai sem controle.
- **Morder durante a invencibilidade:** a mordida acontece (som do rato), mas não tira vida.
- **Ratos e a tela inicial:** os ratos já patrulham atrás do título (o do sótão aparece), mas não perseguem a aranha, que está longe.
