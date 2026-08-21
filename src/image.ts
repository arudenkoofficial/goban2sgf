import sharp from "sharp";

export interface GrayImage {
  width: number;
  height: number;
  pixels: Uint8Array;
}

export async function loadGrayImg(
    filename: string
): Promise<GrayImage> {
    const {data, info} = await sharp(filename).grayscale().raw().toBuffer({resolveWithObject: true})

    if (info.channels !== 1) {
    throw new Error(
      `Expected 1 channel, got ${info.channels}`,
    );
  }

  return {
    width: info.width,
    height: info.height,
    pixels: data,
  };
}


export function getGrayImagePixel(
  image: GrayImage,
  x: number,
  y: number,
): number {
  if (
    x < 0 ||
    y < 0 ||
    x >= image.width ||
    y >= image.height
  ) {
    throw new RangeError(`Pixel outside image: ${x}, ${y}`);
  }

  return image.pixels[y * image.width + x];
}

export function getDarkness(pixel: number): number {
  return 255 - pixel;
}


export function getColumnDarkness(image: GrayImage, columnNumber: number): number {
    let summ = 0;
    let currentRow = 0
    // итерируемся по стркоам, то есть каждый тик это currentRow + 
    for(let currentRow = 0; currentRow <= ) {

    }

}