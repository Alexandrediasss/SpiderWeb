// Grade de colisão do cenário. Lógica pura: sem Phaser.

/**
 * O que existe fora do mapa:
 * - 'solid': tudo sólido (a casa do ato 1 é fechada; a aranha nunca sai dela).
 * - 'edge': continua o tile da borda mais próxima. No ato 2, acima do telhado é ar (não dá para subir
 *   pela borda do mapa até o céu nem prender teia no céu); a casa e a rua continuam sólidas nos lados.
 */
export type Outside = 'solid' | 'edge';

export class LevelGrid {
  constructor(
    readonly cols: number,
    readonly rows: number,
    readonly tileSize: number,
    private readonly solid: Uint8Array,
    readonly outside: Outside = 'solid',
  ) {}

  /** Cria a grade a partir de linhas ASCII; `isSolidChar` diz quais caracteres colidem. */
  static fromAscii(rows: string[], tileSize: number, isSolidChar: (c: string) => boolean, outside: Outside = 'solid'): LevelGrid {
    const cols = rows[0]?.length ?? 0;
    const solid = new Uint8Array(cols * rows.length);
    rows.forEach((line, y) => {
      if (line.length !== cols) {
        throw new Error(`Mapa: linha ${y} tem ${line.length} colunas, esperado ${cols}`);
      }
      for (let x = 0; x < cols; x++) solid[y * cols + x] = isSolidChar(line[x]) ? 1 : 0;
    });
    return new LevelGrid(cols, rows.length, tileSize, solid, outside);
  }

  get widthPx(): number {
    return this.cols * this.tileSize;
  }

  get heightPx(): number {
    return this.rows * this.tileSize;
  }

  /** Fora do mapa: sólido, ou o tile da borda mais próxima (veja `Outside`). */
  isSolidTile(tx: number, ty: number): boolean {
    if (tx < 0 || ty < 0 || tx >= this.cols || ty >= this.rows) {
      if (this.outside === 'solid') return true;
      tx = Math.max(0, Math.min(this.cols - 1, tx));
      ty = Math.max(0, Math.min(this.rows - 1, ty));
    }
    return this.solid[ty * this.cols + tx] === 1;
  }

  isSolidPixel(px: number, py: number): boolean {
    return this.isSolidTile(Math.floor(px / this.tileSize), Math.floor(py / this.tileSize));
  }

  /**
   * Distância (px) de (x0, y0) até o primeiro tile sólido no segmento até (x1, y1), ou Infinity.
   * Percorre tile a tile (DDA), então é rápido mesmo para segmentos longos. Usado pela luz.
   */
  firstSolidDistance(x0: number, y0: number, x1: number, y1: number): number {
    const t = this.tileSize;
    let tx = Math.floor(x0 / t);
    let ty = Math.floor(y0 / t);
    if (this.isSolidTile(tx, ty)) return 0;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    if (len === 0) return Infinity;
    const ux = dx / len;
    const uy = dy / len;
    const stepX = Math.sign(ux);
    const stepY = Math.sign(uy);
    let nextX = stepX > 0 ? ((tx + 1) * t - x0) / ux : stepX < 0 ? (tx * t - x0) / ux : Infinity;
    let nextY = stepY > 0 ? ((ty + 1) * t - y0) / uy : stepY < 0 ? (ty * t - y0) / uy : Infinity;
    const deltaX = stepX !== 0 ? t / Math.abs(ux) : Infinity;
    const deltaY = stepY !== 0 ? t / Math.abs(uy) : Infinity;
    for (;;) {
      let dist: number;
      if (nextX < nextY) {
        tx += stepX;
        dist = nextX;
        nextX += deltaX;
      } else {
        ty += stepY;
        dist = nextY;
        nextY += deltaY;
      }
      if (dist > len) return Infinity;
      if (this.isSolidTile(tx, ty)) return dist;
    }
  }

  /** Retângulo [left, right) × [top, bottom) encosta em algum tile sólido? */
  rectOverlapsSolid(left: number, top: number, right: number, bottom: number): boolean {
    const t = this.tileSize;
    const x0 = Math.floor(left / t);
    const x1 = Math.ceil(right / t) - 1;
    const y0 = Math.floor(top / t);
    const y1 = Math.ceil(bottom / t) - 1;
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (this.isSolidTile(tx, ty)) return true;
      }
    }
    return false;
  }
}
