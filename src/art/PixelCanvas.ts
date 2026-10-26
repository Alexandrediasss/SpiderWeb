// Buffer de pixels RGBA com primitivas de pixel art. Não usa DOM (exceto toCanvas).

/** Cor 0xRRGGBB. */
export type RGB = number;

/** Paleta de um sprite ASCII: caractere → cor. '.' e ' ' são transparentes. */
export type Palette = Record<string, RGB>;

export class PixelCanvas {
  readonly data: Uint8ClampedArray;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.data = new Uint8ClampedArray(width * height * 4);
  }

  private inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  set(x: number, y: number, c: RGB, alpha = 1): void {
    x = Math.floor(x);
    y = Math.floor(y);
    if (!this.inside(x, y)) return;
    const i = (y * this.width + x) * 4;
    const r = (c >> 16) & 255;
    const g = (c >> 8) & 255;
    const b = c & 255;
    if (alpha >= 1 || this.data[i + 3] === 0) {
      this.data[i] = r;
      this.data[i + 1] = g;
      this.data[i + 2] = b;
      this.data[i + 3] = alpha >= 1 ? 255 : Math.round(alpha * 255);
      return;
    }
    this.data[i] += (r - this.data[i]) * alpha;
    this.data[i + 1] += (g - this.data[i + 1]) * alpha;
    this.data[i + 2] += (b - this.data[i + 2]) * alpha;
  }

  rect(x: number, y: number, w: number, h: number, c: RGB, alpha = 1): void {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, c, alpha);
  }

  /** Multiplica o brilho do pixel (fator < 1 escurece, > 1 clareia). */
  shade(x: number, y: number, factor: number): void {
    if (!this.inside(x, y)) return;
    const i = (Math.floor(y) * this.width + Math.floor(x)) * 4;
    this.data[i] *= factor;
    this.data[i + 1] *= factor;
    this.data[i + 2] *= factor;
  }

  shadeRect(x: number, y: number, w: number, h: number, factor: number): void {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.shade(xx, yy, factor);
  }

  /** Linha de Bresenham. */
  line(x0: number, y0: number, x1: number, y1: number, c: RGB, alpha = 1): void {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c, alpha);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  /** Círculo preenchido. */
  disc(cx: number, cy: number, r: number, c: RGB, alpha = 1): void {
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.8) this.set(cx + x, cy + y, c, alpha);
    }
  }

  /** Desenha um sprite ASCII. */
  stamp(rows: string[], palette: Palette, x: number, y: number, flipX = false): void {
    rows.forEach((row, yy) => {
      for (let xx = 0; xx < row.length; xx++) {
        const ch = row[xx];
        if (ch === '.' || ch === ' ') continue;
        const c = palette[ch];
        if (c === undefined) throw new Error(`Sprite: cor '${ch}' não está na paleta`);
        const px = flipX ? x + row.length - 1 - xx : x + xx;
        this.set(px, y + yy, c);
      }
    });
  }

  /** Copia outro PixelCanvas (respeitando transparência). */
  blit(src: PixelCanvas, x: number, y: number, flipX = false): void {
    for (let yy = 0; yy < src.height; yy++) {
      for (let xx = 0; xx < src.width; xx++) {
        const i = (yy * src.width + xx) * 4;
        const a = src.data[i + 3];
        if (a === 0) continue;
        const c = (src.data[i] << 16) | (src.data[i + 1] << 8) | src.data[i + 2];
        this.set(flipX ? x + src.width - 1 - xx : x + xx, y + yy, c, a / 255);
      }
    }
  }

  toCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    const ctx = canvas.getContext('2d')!;
    const img = ctx.createImageData(this.width, this.height);
    img.data.set(this.data);
    ctx.putImageData(img, 0, 0);
    return canvas;
  }
}

/** Ruído determinístico 0..1 para variar pixels sem Math.random. */
export function hash(x: number, y: number, k = 0): number {
  let h = (x * 374761393 + y * 668265263 + k * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

/** Escolhe um item do array de forma determinística. */
export function pick<T>(arr: T[], x: number, y: number, k = 0): T {
  return arr[Math.floor(hash(x, y, k) * arr.length) % arr.length];
}
