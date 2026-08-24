import sharp from "sharp";

interface GrayImage {
  width: number;
  height: number;
  pixels: Uint8Array;
}

interface GridPeak {
  start: number | null;
  end: number | null;
  center: number | null;
}

export async function loadGrayImg(filename: string): Promise<GrayImage> {
  const { data, info } = await sharp(filename)
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.channels !== 1) {
    throw new Error(`Expected 1 channel, got ${info.channels}`);
  }

  return {
    width: info.width,
    height: info.height,
    pixels: data,
  };
}

export function getGrayImagePixel(image: GrayImage, x: number, y: number): number | undefined {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) {
    throw new RangeError(`Pixel outside image: ${x}, ${y}`);
  }

  return image.pixels[y * image.width + x];
}

export function getDarkness(pixel: number): number {
  return 255 - pixel;
}

export function getColumnDarkness(image: GrayImage, columnNumber: number): number {
  if (columnNumber < 0 || columnNumber >= image.width) {
    throw new RangeError(`Column number ${columnNumber} is outside the image`);
  }

  let sum = 0;
  for (let currentRow = 0; currentRow < image.height; currentRow++) {
    const index = currentRow * image.width + columnNumber;
    const pixel = image.pixels[index];

    if (typeof pixel === "undefined") {
      throw new RangeError(`Wrong pixel value at the position {${index}}`);
    }

    sum = sum + getDarkness(pixel);
  }

  return sum;
}

export function getRowDarkness(image: GrayImage, rowNumber: number): number {
  if (rowNumber < 0 || rowNumber >= image.height) {
    throw new RangeError(`Row number ${rowNumber} is outside the image`);
  }

  let sum = 0;

  for (let currentCol = 0; currentCol < image.width; currentCol++) {
    const index = rowNumber * image.width + currentCol;
    const pixel = image.pixels[index];

    if (typeof pixel === "undefined") {
      throw new RangeError(`Wrong pixel value at the position {${index}}`);
    }

    sum = sum + getDarkness(pixel);
  }

  return sum;
}

// TODO: мемоизировать результат!
export function getXDarknessProjection(image: GrayImage): number[] {
  const result: number[] = [];
  for (let currentCol = 0; currentCol < image.width; currentCol++) {
    const columnDarkness = getColumnDarkness(image, currentCol);
    result.push(columnDarkness);
    // console.log(`[${currentCol}]: ${columnDarkness}`);
  }

  return result;
}

// TODO: мемоизировать результат!
export function getYDarknessProjection(image: GrayImage): number[] {
  const result: number[] = [];
  for (let currentRow = 0; currentRow < image.height; currentRow++) {
    const rowDarkness = getRowDarkness(image, currentRow);
    result.push(rowDarkness);
  }

  return result;
}

export function getAverageDarkness(image: GrayImage): number {
  const projection = getXDarknessProjection(image);
  let sum = 0;
  for (let i = 0; i < projection.length; i++) {
    const columnProjection = projection[i];

    if (typeof columnProjection !== "number") {
      throw new RangeError(`Wrong column projection value ${columnProjection}`);
    }

    sum += columnProjection;
  }

  return sum / projection.length;
}

export function getXPeaks(image: GrayImage): GridPeak[] {
  const projection = getXDarknessProjection(image);
  const average = getAverageDarkness(image);

  const result = [];

  let peakStart = null;
  let peakEnd = null;
  let projectionIndex = 0;

  while (projectionIndex < projection.length) {
    const currentDarkness = projection[projectionIndex];

    if (currentDarkness === undefined) {
      throw new RangeError(`Wrong projection darkness at the index ${projectionIndex}`);
    }

    if (peakStart === null && currentDarkness > average) {
      peakStart = projectionIndex;
    }

    if (peakStart !== null && currentDarkness <= average) {
      peakEnd = projectionIndex - 1;
      result.push({
        start: peakStart,
        end: peakEnd,
        center: peakStart + Math.floor((peakEnd - peakStart) / 2),
      });
      peakEnd = null;
      peakStart = null;
    }

    projectionIndex++;
  }

  if (peakStart != null && peakEnd == null) {
    peakEnd = projection.length - 1;
    result.push({
      start: peakStart,
      end: peakEnd,
      center: peakStart + Math.floor((peakEnd - peakStart) / 2),
    });
  }

  return result;
}

export function getYPeaks(image: GrayImage): GridPeak[] {
  const projection = getYDarknessProjection(image);
  const average = getAverageDarkness(image);

  const result = [];

  let peakStart = null;
  let peakEnd = null;
  let projectionIndex = 0;

  while (projectionIndex < projection.length) {
    const currentDarkness = projection[projectionIndex];

    if (currentDarkness === undefined) {
      throw new RangeError(`Wrong projection darkness at the index ${projectionIndex}`);
    }

    if (peakStart === null && currentDarkness > average) {
      peakStart = projectionIndex;
    }

    if (peakStart !== null && currentDarkness <= average) {
      peakEnd = projectionIndex - 1;
      result.push({
        start: peakStart,
        end: peakEnd,
        center: peakStart + Math.floor((peakEnd - peakStart) / 2),
      });
      peakEnd = null;
      peakStart = null;
    }

    projectionIndex++;
  }

  if (peakStart != null && peakEnd == null) {
    peakEnd = projection.length - 1;
    result.push({
      start: peakStart,
      end: peakEnd,
      center: peakStart + Math.floor((peakEnd - peakStart) / 2),
    });
  }

  return result;
}

export function getGridStep(peaks: GridPeak[]): number {
  const result: number[] = [];

  for (let i = 1; i < peaks.length; i++) {
    const prev = peaks[i - 1];
    const current = peaks[i];

    if (typeof current?.center !== "number" || typeof prev?.center !== "number") {
      throw new RangeError(`Incorrect peak center values`);
    }
    result.push(current.center - prev.center);
  }

  result.sort((a, b) => a - b);

  const center = Math.floor(result.length / 2);

  if (typeof result[center] !== "number") {
    throw new RangeError(`Incorret grid step calculation result`);
  }
  return result[center];
}
