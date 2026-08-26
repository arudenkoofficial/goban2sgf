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

interface GridIntersection {
  x: number;
  y: number;
  column: number;
  row: number;
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

export function getAverageProjection(projection: number[]): number {
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
  const average = getAverageProjection(projection);

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
  const average = getAverageProjection(projection);

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

export function getGridIntersections(xPeaks: GridPeak[], yPeaks: GridPeak[]): GridIntersection[] {
  const result: GridIntersection[] = [];
  for (let i = 0; i < xPeaks.length; i++) {
    const currentXPeak = xPeaks[i];
    for (let j = 0; j < yPeaks.length; j++) {
      const currentYPeak = yPeaks[j];

      if (typeof currentXPeak?.center !== "number" || typeof currentYPeak?.center !== "number") {
        throw new RangeError(
          `Wrong intersection coordinates: \n\n\txPeak[${i}]: ${currentXPeak?.center}\n\tyPeak[${j}]: ${currentYPeak?.center}`,
        );
      }

      result.push({ x: currentXPeak.center, y: currentYPeak.center, column: i, row: j });
    }
  }
  return result;
}

export function findGridIntersection(
  intersections: GridIntersection[],
  column: number,
  row: number,
): GridIntersection {
  const found = intersections.find(
    (intersection) => intersection.column === column && intersection.row === row,
  );

  if (found === undefined) {
    throw new RangeError(`No intersection at column ${column}, row ${row}`);
  }

  return found;
}

interface IntersectionArea {
  startX: number;
  endX: number;
  startY: number;
  endY: number;
}

export function getIntersectionArea(
  image: GrayImage,
  intersection: GridIntersection,
  gridStep: number,
): IntersectionArea {
  const radius = Math.floor(gridStep * 0.4);

  return {
    startX: Math.max(intersection.x - radius, 0),
    endX: Math.min(intersection.x + radius, image.width - 1),
    startY: Math.max(intersection.y - radius, 0),
    endY: Math.min(intersection.y + radius, image.height - 1),
  };
}

export function getIntersectionPixels(
  image: GrayImage,
  intersectionArea: IntersectionArea,
): number[] {
  const { startX, startY, endX, endY } = intersectionArea;
  const result: number[] = [];
  for (let y = startY; y <= endY; y++) {
    for (let x = startX; x <= endX; x++) {
      const pixel = getGrayImagePixel(image, x, y);
      if (typeof pixel !== "number") {
        throw new Error("Wrong pixel value!");
      }
      result.push(pixel);
    }
  }

  return result;
}

export function getIntersectionAverageDarkness(intersectionPixels: number[]): number {
  if (intersectionPixels.length === 0) {
    throw new RangeError(`Intersection pixel list shouldn't be zero long`);
  }
  let result = 0;
  for (let i = 0; i < intersectionPixels.length; i++) {
    const pixel = intersectionPixels[i];
    if (typeof pixel !== "number") {
      throw new Error("Wrong pixel value!");
    }
    result += getDarkness(pixel);
  }
  return result / intersectionPixels.length;
}
