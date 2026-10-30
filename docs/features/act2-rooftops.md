# Spec: ato 2, ROOFTOPS (a travessia pelos postes)

Continua de onde o ato 1 parou: a aranha está na calha do telhado, olhando a horda na rua. Agora ela atravessa a rua **por cima**, se balançando pelos postes, fios, árvore e placas, na chuva e na ventania, até o telhado da casa vizinha, onde entra pela chaminé. Não há cartas nem ratos: o perigo é cair.

Código:
- `src/level/rooftops.ts`: o mapa ASCII da rua (200×40 tiles), a legenda, o começo, a primeira mira da cutscene, os checkpoints, os fios soltos, os fios inteiros, o fim e a chaminé.
- `src/systems/checkpoints.ts`: lógica pura. Checkpoint ativo, queda na rua e a chegada no telhado do fim.
- `src/art/rooftopArt.ts`: os tiles da rua (postes, braços, luminárias, madeira, árvore, outdoor, ponto de ônibus, semáforo, telhados, rua), a luz das luminárias, as casas do fundo, o pé do zumbi e os detritos.
- `src/scenes/RooftopScene.ts`: a cena (cutscene de abertura, jogo, morte pisada, checkpoints, fim na chaminé, pausa).
- Ventania, detritos e fios: [wind.md](wind.md).

Testes: `tests/rooftops.test.ts`.

## O mapa

A rua fica embaixo (linhas 37–39) e mata ao encostar. Da esquerda para a direita:

| Coluna | O quê |
|---|---|
| 0–15 | Telhado da casa do ato 1 (começo, checkpoint 0), calha na coluna 15. |
| 27 | Poste de luz 1 (braço para a esquerda, na direção da casa). |
| 40 | Poste de madeira 1, com um fio solto. |
| 46–65 | Árvore: tronco e galhos sólidos; a copa é só fundo (a teia passa por ela). |
| 65–75 | Ponto de ônibus (checkpoint 1). |
| 80 | Poste de luz 2 (braço para a esquerda). |
| 85–100 | Outdoor com passarela (checkpoint 2). |
| 112 | Poste de madeira 2, com fios soltos dos dois lados. |
| 126 | Semáforo (luz vermelha acesa). |
| 148 | Poste de luz 3. |
| 160 | Poste de madeira 3, com um fio solto. |
| 164–171 | Garagem (checkpoint 3). |
| 182–199 | Casa vizinha: telhado subindo para a direita e a chaminé (colunas 190–191). |

- Legenda (minúscula = sólido, maiúscula = só fundo): `r` telhado, `h` parede de madeira, `c` chaminé, `p` poste de metal, `a` braço de metal, `L` luminária (fundo: a teia passa), `u` poste de madeira, `x` cruzeta, `k` tronco, `b` galho, `F` copa, `g` outdoor, `y` passarela, `s` teto do ponto, `P` haste do ponto, `G` vidro, `t` semáforo, `_` rua.
- Nenhum vão entre dois pontos de teia passa de `WEB.range` (240 px). O teste confere os mais importantes.
- **Peça sólida ocupa o tile inteiro no desenho**, porque a colisão é o tile inteiro (16×16). Postes, cruzetas, braços, galhos, a passarela e o teto do ponto de ônibus eram desenhados mais finos e a aranha ficava "flutuando" longe deles (em pé, de cabeça para baixo ou do lado). Treliças (braço, passarela) podem ser vazadas no meio, mas as bordas são cheias. O `tests/rooftops.test.ts` confere todas as faces expostas.
- **Nada flutua:** o outdoor fica em cima de duas pernas (`P`, fundo, a aranha passa) que descem até a passarela, em cima dos postes dela. O teste confere.
- Na rua, embaixo de tudo, a horda passa andando (zumbis grandes na frente e pequenos e escuros atrás) e geme. Os gemidos ficam mais altos quanto mais perto da rua a aranha está.

## Cutscene de abertura (cerca de 4,5 s)

| Etapa | O que acontece |
|---|---|
| `fadeIn` | A tela clareia na calha do telhado, com faixas de cinema. A aranha parada, de frente para a rua. |
| `look` | A câmera desce até a horda passando lá embaixo e volta. Aparece o cartão `ACT 2` / `ROOFTOPS`. Cai um raio. |
| `wind` | Começa a ventar (aviso): riscos, chuva inclinada, a aranha treme. |

No fim, as faixas somem e o **controle volta com a aranha na calha**, onde ela estava; a câmera desliza até ela. Ela **não atira a teia sozinha**: o primeiro balanço (no braço do poste de luz 1, `FIRST_AIM`, ao alcance da calha) é do jogador. Antes a cutscene terminava com a aranha atirando a teia e subindo sozinha.

- **Pular:** `Enter`, `Esc`, `Espaço`, `A` ou `Start`, e também os botões de pular e de teia (quem aperta quer jogar). O aviso `ENTER / START skip` aparece no canto depois de `ACT2.skipHintAfterSec`.
- **Ao pular:** a tela escurece em `ACT2.skipFadeSec` (0,25 s) e clareia com a câmera já na aranha (ela continua na calha). O escurecer esconde a câmera voltando lá de baixo, da horda.
- **Duração:** curta de propósito. Com quase 10 s sem nenhum aviso parecia que o jogo tinha travado.

## Bordas do mapa

- **Fora do mapa continua a borda** (`LevelGrid` com `outside: 'edge'`): à esquerda, a casa do ato 1 e a rua continuam sólidas; **acima do telhado e acima do mapa é ar**.
- Antes, fora do mapa era tudo sólido: no topo do telhado, andando para a esquerda, a aranha subia pela borda invisível do mapa e andava de cabeça para baixo no "teto do céu" (y = 0). A teia também prendia no céu.
- **Parede invisível:** a aranha não passa das bordas da esquerda e da direita (`motor.bounds`). Ela só para; não dá para escalar.
- O `tests/rooftops.test.ts` confere: no topo do telhado ela para na borda e não sobe; a teia para cima não pega no céu; a casa e a rua continuam sólidas fora do mapa; a casa do ato 1 continua toda fechada (`outside: 'solid'`, o padrão).

## Checkpoints

1. Quatro: o telhado do começo, o teto do ponto de ônibus, o outdoor e a garagem (`CHECKPOINTS`).
2. O checkpoint vira o ativo quando a aranha **gruda** numa superfície dentro da área dele, e só para frente (voltar não desativa o mais adiantado).
3. Ao ativar um checkpoint novo: aviso `CHECKPOINT` no canto e um som curto.

## Morte: o pé do zumbi

1. **Gatilho:** a aranha encosta na rua (o pé da caixa dela chega em `STREET_Y`).
2. O controle trava, a teia some, e a câmera aproxima (`ACT2.stompZoom`) na aranha caída no asfalto molhado.
3. A sombra de um pé cresce em volta dela; o pé de um zumbi (tênis sujo e barra de calça rasgada) desce rápido e **pisa**: a tela treme, toca o baque com estalo (`Sfx.stomp`), o controle vibra e respinga.
4. A tela escurece em `ACT2.deathFadeSec` e a aranha volta no último checkpoint, com a câmera normal.
5. A ventania continua de onde estava.

## Fim do ato: a chaminé

1. **Gatilho:** a aranha gruda no telhado da casa vizinha (a partir da coluna 182).
2. O controle trava (faixas de cinema). Ela anda sozinha telhado acima até a chaminé, sobe pela lateral e para no meio do topo.
3. Olha para dentro, dá um pulinho e **entra**: desce por trás da borda da chaminé e some, com uma nuvem de fuligem.
4. A tela escurece e aparece o "END OF ACT 2" ([acts.md](acts.md)). Depois, a seleção de atos.

## Pausa

`Esc`/`Start` abre o mesmo menu do ato 1: RESUME, RESTART (volta para o começo do ato 2, sem a cutscene) e MAIN MENU. Não dá para pausar nas cutscenes nem durante a morte.

## Câmera e luz

- A câmera segue a aranha olhando um pouco para baixo (`ACT2.cameraLookDown`), para a horda aparecer quando ela desce.
- O fundo tem céu de tempestade e as casas do outro lado da rua, em parallax.
- O cenário é pintado com as cores "de dia" e escurecido para a noite (`PAL.act2.night`). As luminárias acendem um cone quente embaixo delas, com feixe visível. A aranha e os zumbis recebem a luz do lugar.
- Raios (o mesmo `Storm` do ato 1) clareiam tudo.

## Como mexer

- **Mapa:** `ROOFTOP_MAP` em `src/level/rooftops.ts`. Se mudar postes de lugar, confira `FIRST_AIM`, `CHECKPOINTS`, `LOOSE_WIRES`, `WIRE_SPANS`, `END_ZONE` e `CHIMNEY`: o `tests/rooftops.test.ts` confere quase tudo.
- **Tempos das cutscenes, câmera e morte:** `ACT2` em `config.ts`.
- **Dev:** `__scene2` é a cena; `__scene2.respawn()` volta ao checkpoint; `__scene2.checkpoint = 2` muda o checkpoint ativo; `__scene2.startEnding()` mostra o fim.
