import sharp from "sharp";

export interface PixelArea {
  startX: number;
  endX: number;
  startY: number;
  endY: number;
}

export class GrayImage {
  readonly width: number;
  readonly height: number;
  readonly #pixels: Uint8Array;
  #xProjection: number[] | null = null;
  #yProjection: number[] | null = null;

  private constructor(width: number, height: number, pixels: Uint8Array) {
    this.width = width;
    this.height = height;
    this.#pixels = pixels;
  }

  static async load(filename: string): Promise<GrayImage> {
    const { data, info } = await sharp(filename)
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    if (info.channels !== 1) {
      throw new Error(`Expected 1 channel, got ${info.channels}`);
    }

    return new GrayImage(info.width, info.height, data);
  }

  pixelAt(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
      throw new RangeError(`Pixel outside image: ${x}, ${y}`);
    }

    const pixel = this.#pixels[y * this.width + x];

    if (pixel === undefined) {
      throw new RangeError(`Wrong pixel value at the position ${x}, ${y}`);
    }

    return pixel;
  }

  darknessAt(x: number, y: number): number {
    return 255 - this.pixelAt(x, y);
  }

  xProjection(): number[] {
    this.#xProjection ??= this.#computeXProjection();
    return this.#xProjection;
  }

  yProjection(): number[] {
    this.#yProjection ??= this.#computeYProjection();
    return this.#yProjection;
  }

  averageDarknessIn(area: PixelArea): number {
    const { startX, endX, startY, endY } = area;

    let sum = 0;
    let count = 0;
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        sum += this.darknessAt(x, y);
        count++;
      }
    }

    if (count === 0) {
      throw new RangeError(`Empty pixel area: ${JSON.stringify(area)}`);
    }

    return sum / count;
  }

  #computeXProjection(): number[] {
    const result: number[] = [];
    for (let x = 0; x < this.width; x++) {
      result.push(this.#columnDarkness(x));
    }

    return result;
  }

  #computeYProjection(): number[] {
    const result: number[] = [];
    for (let y = 0; y < this.height; y++) {
      result.push(this.#rowDarkness(y));
    }

    return result;
  }

  #columnDarkness(x: number): number {
    let sum = 0;
    for (let y = 0; y < this.height; y++) {
      sum += this.darknessAt(x, y);
    }

    return sum;
  }

  #rowDarkness(y: number): number {
    let sum = 0;
    for (let x = 0; x < this.width; x++) {
      sum += this.darknessAt(x, y);
    }

    return sum;
  }
}
