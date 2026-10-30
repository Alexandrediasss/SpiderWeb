# Spec: ventania e obstáculos (ato 2)

Inspirada na subida final do *Celeste*: de tempos em tempos vem uma rajada forte que empurra a aranha por alguns segundos. Grudada numa superfície ela não solta, mas parada no chão ou no teto é arrastada para trás (para ficar no lugar, tem que andar contra o vento); no ar ou pendurada na teia, é levada.

Código:
- `src/systems/wind.ts`: lógica pura. Ciclo das rajadas e a força agora.
- `src/systems/debris.ts`: lógica pura. Detritos voando na rajada e a colisão com a aranha.
- `src/systems/looseWire.ts`: lógica pura. Fios soltos com faísca (pêndulo que o vento balança) e o choque.
- `src/systems/SpiderMotor.ts`: aplica o vento (`motor.wind`).
- `src/entities/Weather.ts`: chuva, riscos de vento, raios. `src/entities/Hazards.ts`: detritos, fios e faíscas.
- `src/audio/WindSound.ts`: o vento (ruído que sobe e desce com a força).

Testes: `tests/wind.test.ts`.

## Ciclo da rajada

| Fase | Duração | Força |
|---|---|---|
| calma | `WIND.calmSec` (sorteado) | 0 |
| aviso | `WIND.warnSec` | sobe até `WIND.warnStrength`: poucos riscos, o som começa. Dá tempo de se agarrar. |
| rajada | `WIND.gustSec` | sobe até 1 em `WIND.rampSec` e fica |
| fim | `WIND.fadeSec` | desce até 0 |

1. A direção é sorteada no aviso: contra (para a esquerda, empurrando para trás) com chance `WIND.againstChance`; senão, a favor.
2. A primeira rajada só vem depois de `WIND.firstCalmSec`.
3. Na cutscene de abertura e no fim do ato não há rajada (o vento fica só no aviso, de enfeite).

## Efeito na aranha

1. **No ar e na teia:** aceleração horizontal de `força × WIND.gustAccel`, até a velocidade `WIND.maxAirSpeed` no sentido do vento. Na teia, o pêndulo é empurrado para o lado.
2. **Grudada:** nunca solta.
   - **Andando** no chão ou no teto, a velocidade muda conforme o vento ao longo do caminho: contra fica mais lenta (até `WIND.walkMin`), a favor mais rápida.
   - **Parada** no chão ou no teto, a rajada **arrasta** a aranha no sentido do vento a `força × WIND.idleSlide` px/s (55 px/s na rajada cheia). Ela continua grudada: desliza pela superfície, contorna cantos (na ponta de uma plataforma, vira para a lateral e fica segura ali) e as patas se mexem (`motor.sliding`, animação de andar). Para não ser levada, é preciso andar contra o vento, como no Celeste. No aviso (força baixa) ela já escorrega um pouquinho.
   - Nas paredes o vento horizontal não muda nada (nem andando, nem parada).
   - Se for arrastada para fora de uma beirada sem canto para contornar, sai voando com o vento.
3. Pular durante a rajada: o pulo é carregado pelo vento.

## Detritos (só na rajada)

1. A cada `DEBRIS.spawnEverySec` (sorteado) nasce um detrito na borda da tela de onde vem o vento, numa altura perto da aranha (± `DEBRIS.spreadY`).
2. Tipos: telha, jornal, galho e tampa de lixo. Voam com o vento (`DEBRIS.speed`), balançando e girando. Passam através de tudo.
3. **Acertou a aranha no ar ou na teia:** a teia é cortada, ela leva um empurrão no sentido do vento e para cima (`DEBRIS.knockback`), pisca e toca o chiado de dano. Grudada numa superfície, o detrito passa sem acertar.

## Fios soltos com faísca

1. Quatro fios arrebentados pendem das cruzetas dos postes de madeira (`LOOSE_WIRES` em `src/level/rooftops.ts`). Cada um é um pêndulo: balança sozinho um pouco e o vento empurra (na rajada ele fica quase deitado).
2. A ponta solta faísca (pixels amarelos e brancos) de tempos em tempos, com um estalo baixinho.
3. **Choque:** se o centro da aranha passa a até `WIRE.touchRadius` px do fio, em qualquer estado: a teia é cortada, ela é empurrada para longe do fio, pisca e toca o zap (`Sfx.zap`). Depois disso, `WIRE.shockCooldownSec` sem tomar outro choque.
4. A teia não gruda nos fios (eles não são sólidos).

## Como mexer

- **Força e tempos:** `WIND`, `DEBRIS` e `WIRE` em `config.ts`.
- **Ver uma rajada na hora (dev):** `__wind.forceGust(-1)` (contra) ou `__wind.forceGust(1)` (a favor) no console.
