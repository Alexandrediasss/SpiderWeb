// Grade de colisão do cenário. Lógica pura: sem Phaser.

export class LevelGrid {
  constructor(
    readonly cols: number,
    readonly rows: number,
    readonly tileSize: number,
    private readonly solid: Uint8Array,
  ) {}

  /** Cria a grade a partir de linhas ASCII; `isSolidChar` diz quais caracteres colidem. */
  static fromAscii(rows: string[], tileSize: number, isSolidChar: (c: string) => boolean): LevelGrid {
    const cols = rows[0]?.length ?? 0;
    const solid = new Uint8Array(cols * rows.length);
    rows.forEach((line, y) => {
      if (line.length !== cols) {
        throw new Error(`Mapa: linha ${y} tem ${line.length} colunas, esperado ${cols}`);
      }
      for (let x = 0; x < cols; x++) solid[y * cols + x] = isSolidChar(line[x]) ? 1 : 0;
    });
    return new LevelGrid(cols, rows.length, tileSize, solid);
  }

  get widthPx(): number {
    return this.cols * this.tileSize;
  }

  get heightPx(): number {
    return this.rows * this.tileSize;
  }

  /** Fora do mapa conta como sólido. */
  isSolidTile(tx: number, ty: number): boolean {
    if (tx < 0 || ty < 0 || tx >= this.cols || ty >= this.rows) return true;
    return this.solid[ty * this.cols + tx] === 1;
  }

  isSolidPixel(px: number, py: number): boolean {
    return this.isSolidTile(Math.floor(px / this.tileSize), Math.floor(py / this.tileSize));
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
