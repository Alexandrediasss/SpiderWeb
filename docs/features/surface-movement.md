# Spec: movimento em superfícies

Código: `src/physics/surfaces.ts`, `src/physics/collide.ts`, `src/systems/surfaceMovement.ts`, `src/systems/SpiderMotor.ts`.
Testes: `tests/surfaceMovement.test.ts`.

## Modelo

- A aranha é uma **AABB quadrada** de `SPIDER.half * 2` px (10×10). O sprite é só visual.
- O mundo é uma grade de tiles sólidos/vazios (`LevelGrid`). Fora do mapa conta como sólido.
- Estado `surface`: `floor | ceiling | wallLeft | wallRight | air`.
  - `wallLeft` = a parede está à **esquerda** da aranha; `wallRight` = à direita.

## Convenção de tangente (importante)

Cada superfície tem uma `normal` (aponta para fora do sólido) e uma `tangent`. `dir = +1` anda no sentido da tangente.

| Superfície | normal | tangent (+1) | ângulo do sprite |
|---|---|---|---|
| floor | (0,-1) | (1,0) → direita | 0° |
| wallRight | (-1,0) | (0,-1) → sobe | -90° |
| ceiling | (0,1) | (-1,0) → esquerda | 180° |
| wallLeft | (1,0) | (0,1) → desce | 90° |

Essa tabela foi escolhida para que **o sinal de `dir` se mantenha ao virar qualquer canto**, interno ou externo. Exemplo: andando para a direita no chão (`+1`), ao bater na parede vira `wallRight` e continua `+1` (subindo). Por isso `flipX = dir < 0` funciona igual em todas as superfícies.

## Input → dir

1. Se há uma **trava** ativa e o input é o mesmo de quando ela foi criada, usa o `dir` travado.
2. Senão, `dir = sign(dot(input, tangent))`.
3. Se deu 0 numa parede e o input é horizontal: apertar **em direção à parede = subir**, **para fora = descer**.
4. Ao virar um canto, cria a trava com o `dir` atual e o input atual. Ela some quando o input muda.

Resultado: segurando `D` a aranha sobe a parede e segue pelo teto sem precisar trocar de tecla.

## Andar (por frame)

O deslocamento `speed * dt` é aplicado em passos de no máximo `SPIDER.stepPx` (2 px). Em cada passo:

1. Move ao longo de `tangent * dir` com colisão.
2. **Canto interno:** se bateu na direção do movimento, a nova superfície é a do sólido atingido (`surfaceFacing(dirDoMovimento)`).
3. **Canto externo:** se não há mais sólido encostado do lado dos pés (`hasSupport` falso, checa uma faixa de 1 px em todo o lado dos pés):
   - encaixa a borda de trás da caixa na linha do tile (o canto);
   - desloca a caixa `2*half` na direção dos pés (dá a volta no canto);
   - nova superfície = aquela cuja normal é igual ao vetor de movimento antigo.
   - Se a nova posição colidir ou não tiver apoio, a aranha cai (`air`).

## Pular / ar

- `Espaço` grudada: `v = normal * jumpSpeed + tangent * dir * velocidadeAtual`, estado `air`, e um `stickCooldown` curto (0,12 s).
- No ar: gravidade, controle horizontal leve, velocidade terminal.
- No ar, ao colidir e sem cooldown, gruda na superfície atingida (o eixo Y tem prioridade). **Exceção:** com a teia presa ela não gruda (veja a spec da teia).

## Visual

- Ângulo alvo pela tabela; o ângulo exibido interpola pelo caminho mais curto (`SPIDER.rotateLerp`).
- O sprite é deslocado `spriteFeetOffset` px na direção dos pés para os pés encostarem na superfície.
- Animações: `idle` (parada), `walk` (andando, mais rápida correndo), `air` (no ar e na teia).

## Casos de borda conhecidos

- Escadas de tiles 1×1 fazem a aranha alternar chão e parede a cada 16 px. Isso é aceito; a interpolação do ângulo suaviza.
- Vãos de 1 tile são atravessados contornando, sem pular.
