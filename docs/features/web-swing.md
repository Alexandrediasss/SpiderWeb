# Spec: teia e balanço

Código: `src/systems/webRope.ts` (raycast + restrição de corda), orquestrado por `src/systems/SpiderMotor.ts`.
Visual: `src/entities/Spider.ts` (linha de pixels) e a mira em `src/scenes/GameScene.ts`.
Testes: `tests/webRope.test.ts`.

## Regras

1. **Mirar:** o cursor do mouse define a direção (no controle, o analógico direito; veja [gamepad.md](gamepad.md)). A mira fica branca quando um raio a partir do centro da aranha acerta sólido dentro de `WEB.range` (240 px), e cinza quando não acerta.
2. **Disparar:** ao *pressionar* o botão esquerdo:
   - acertou → cria a corda `{anchor, length = distância atual, anchorSurface}`; a aranha passa para `air` (se estava grudada, solta);
   - errou → só um risco visual rápido (`WEB.missFlashSec`), sem efeito.
3. **Segurar:** enquanto o botão está pressionado, a corda existe.
4. **Soltar o botão:** a corda some e a aranha mantém a velocidade (dá para se lançar).
5. **Com a corda presa:**
   - `W`/`S`: encurta/alonga a corda em `WEB.reelSpeed`, dentro de [`WEB.minLength`, `WEB.range`];
   - `A`/`D`: aceleração horizontal `WEB.swingAccel` (embala o pêndulo);
   - a aranha **não gruda** em superfícies ao colidir (só desliza/para);
   - `Espaço`: solta a corda com um pequeno impulso para cima.
6. **Chegar no ponto:** se `length <= SPIDER.half + WEB.attachSlack`, a aranha gruda na superfície da âncora (`anchorSurface`) e a corda some. Se a posição não for válida, continua pendurada.

## Física da corda (por frame, no ar)

1. `v += gravidade * dt` (e o input de balanço).
2. Move `v * dt` com colisão.
3. Se `dist(pos, anchor) > length`: corrige a posição para cima do círculo (o movimento de correção também passa pela colisão) e remove a componente radial **para fora** da velocidade.

## Raycast

Marcha em passos de 1 px a partir do centro. No primeiro pixel sólido:
- a normal vem da face cruzada (mudou de coluna → normal em X, senão em Y);
- `anchorSurface = surfaceWithNormal(normal)`, por exemplo bater por baixo num teto dá `ceiling`;
- `anchor` = último ponto vazio antes do sólido.

## Visual

- Linha de pixels (Bresenham) da aranha até a âncora, cor `#e8e4f0`.
- Na corda, o sprite gira para que as "costas" apontem para a âncora.
