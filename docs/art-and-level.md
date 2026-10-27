# Pixel art e mapa

Toda a arte é **gerada por código** no boot (`BootScene` → `art/textures.ts`). Não há PNGs. Para conferir o resultado, abra a galeria em http://localhost:5173/art.html.

## Onde fica cada coisa

| O quê | Arquivo |
|---|---|
| Cores | `src/art/palette.ts` (mude aqui para recolorir tudo) |
| Primitivas (pixel, linha, disco, sprite ASCII) | `src/art/PixelCanvas.ts` |
| Aranha e mira | `src/art/spiderArt.ts` |
| Rato (+ folha só dos olhos), casulo de teia, corações | `src/art/ratArt.ts` (formas + contorno automático) |
| Onde os ratos patrulham | `RATS` em `src/level/houseMap.ts` |
| Cutscene: palco dentro da parede, escuridão, líquido verde | `src/art/introArt.ts` |
| Buraco de rato da sala (onde a aranha aparece) | decoração `mouseHole` (`decorArt.ts`), alinhada com `SPAWN` |
| Tiles e papéis de parede | `src/art/tilePainters.ts` |
| Janelas, quadros, luminárias, teias... | `src/art/decorArt.ts` |
| Montagem do cenário numa textura só (+ máscara do lado de fora) | `src/art/levelBaker.ts` |
| Luz da noite: mapa de luz, feixes, luz do relâmpago | `src/art/lighting.ts` (spec: [features/atmosphere.md](features/atmosphere.md)) |
| Cenário + luz calculados uma vez (cache) | `src/art/levelArt.ts` |
| Mapa, cômodos, decorações, spawn | `src/level/houseMap.ts` |
| Legenda dos caracteres | `src/level/legend.ts` |

## Editar o mapa

O mapa é ASCII em `HOUSE_MAP`: cada caractere é um tile de 16×16, e todas as linhas precisam ter o mesmo tamanho (o teste `tests/houseMap.test.ts` confere).

| Char | Material | Colide? |
|---|---|---|
| `~` | céu (fora da casa) | não |
| `.` | vazio (papel de parede do cômodo) | não |
| `#` | tijolo | sim |
| `=` | piso/laje de madeira | sim |
| `R` | telhado | sim |
| `w` / `W` | madeira (móveis) | `w` sim / `W` não |
| `c` / `C` | estofado (sofá) | `c` sim / `C` não |
| `m` / `M` | colchão | `m` sim / `M` não |
| `k` / `K` | armário de cozinha | `k` sim / `K` não |
| `f` / `F` | geladeira | `f` sim / `F` não |
| `b` / `B` | estante com livros | `b` sim / `B` não |
| `t` / `T` | cerâmica (banheiro) | `t` sim / `T` não |

- **Minúscula = sólido. MAIÚSCULA = mesma peça só de fundo**: desenhada mais escura, a aranha passa por trás.
- Uma maiúscula isolada na horizontal vira uma **haste fina** (pé de mesa, encosto de cadeira).
- Paredes e pisos (`#`, `=`, `R`) não ganham contorno entre si; móveis ganham contorno escuro onde encostam em outro material.
- O papel de parede vem de `ROOMS` (retângulos em tiles). Um `.` fora de qualquer cômodo vira "vão" escuro (buracos no piso).
- Decorações (`DECORATIONS`) não colidem; a posição é o canto superior esquerdo, em tiles.

## Adicionar arte

- **Material novo:** adicione o tipo em `Material` (legend.ts), a letra em `FURNITURE`, as cores em `palette.ts` e um `PixelFn` em `MATERIAL_PAINTERS`. Um `PixelFn` devolve a cor de um pixel a partir de `px/py` locais e do `TileCtx` (vizinhos).
- **Decoração nova:** crie a função em `decorArt.ts`, registre em `DECOR_PAINTERS` e adicione o tipo em `DecorKind`. Se ela mostrar o lado de fora (vidro), chame `mark(x, y, true)` nesses pixels e `mark(x, y, false)` no que for pintado por cima (moldura, cortina): é lá que a chuva e o relâmpago aparecem.
- **Luz nova:** cada decoração `lamp` vira uma fonte de luz automaticamente (cone, sombra, feixe e poeira). Janelas viram fonte de luz no relâmpago.
- **Quadro novo da aranha:** adicione em `SPIDER_FRAMES` e use em `registerAnimations` (textures.ts). O corpo é o ASCII `BODY` (22×14); as pernas são linhas calculadas por fase.

## Regras de estilo

- Resolução interna de 480×270 e tiles de 16 px. Nada de anti-aliasing: use `PixelCanvas.line` (Bresenham) e cores sólidas.
- Fundo mais apagado que o primeiro plano, para a aranha e os móveis se destacarem.
- **As cores da paleta são as "de dia":** o escuro da noite vem do mapa de luz, que multiplica tudo no jogo. A exceção é o lado de fora (céu, vidro), que já é pintado escuro porque a luz lá vale 1. A galeria mostra o cenário com e sem luz.
- Sombra suave (AO) embaixo e ao lado de sólidos já é automática no baker.
- Variação de textura com `hash(x, y, k)` (determinístico), nunca `Math.random`, para o cenário ficar igual a cada carregamento.
