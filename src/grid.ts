import type { GrayImage, PixelArea } from "./gray-image.ts";

export interface GridPeak {
  start: number;
  end: number;
  center: number;
}

export interface GridIntersection {
  x: number;
  y: number;
  column: number;
  row: number;
}

// Доля шага сетки, задающая радиус области сэмплирования вокруг перекрестия.
const INTERSECTION_RADIUS_RATIO = 0.4;

export class Grid {
  readonly xPeaks: GridPeak[];
  readonly yPeaks: GridPeak[];
  readonly #image: GrayImage;
  #step: number | null = null;
  #intersections: GridIntersection[] | null = null;

  private constructor(image: GrayImage, xPeaks: GridPeak[], yPeaks: GridPeak[]) {
    this.#image = image;
    this.xPeaks = xPeaks;
    this.yPeaks = yPeaks;
  }

  static detect(image: GrayImage): Grid {
    return new Grid(image, findPeaks(image.xProjection()), findPeaks(image.yProjection()));
  }

  get step(): number {
    this.#step ??= medianPeakGap(this.xPeaks);
    return this.#step;
  }

  get intersections(): GridIntersection[] {
    this.#intersections ??= this.#computeIntersections();
    return this.#intersections;
  }

  intersectionAt(column: number, row: number): GridIntersection {
    const found = this.intersections.find(
      (intersection) => intersection.column === column && intersection.row === row,
    );

    if (found === undefined) {
      throw new RangeError(`No intersection at column ${column}, row ${row}`);
    }

    return found;
  }

  darknessAt(column: number, row: number): number {
    return this.#image.averageDarknessIn(this.#areaAround(this.intersectionAt(column, row)));
  }

  #areaAround({ x, y }: GridIntersection): PixelArea {
    const radius = Math.floor(this.step * INTERSECTION_RADIUS_RATIO);

    return {
      startX: Math.max(x - radius, 0),
      endX: Math.min(x + radius, this.#image.width - 1),
      startY: Math.max(y - radius, 0),
      endY: Math.min(y + radius, this.#image.height - 1),
    };
  }

  #computeIntersections(): GridIntersection[] {
    const result: GridIntersection[] = [];
    for (const [column, xPeak] of this.xPeaks.entries()) {
      for (const [row, yPeak] of this.yPeaks.entries()) {
        result.push({ x: xPeak.center, y: yPeak.center, column, row });
      }
    }

    return result;
  }
}

function findPeaks(projection: number[]): GridPeak[] {
  const threshold = average(projection);
  const peaks: GridPeak[] = [];

  let peakStart: number | null = null;
  for (const [index, darkness] of projection.entries()) {
    if (peakStart === null && darkness > threshold) {
      peakStart = index;
    }

    if (peakStart !== null && darkness <= threshold) {
      peaks.push(makePeak(peakStart, index - 1));
      peakStart = null;
    }
  }

  if (peakStart !== null) {
    peaks.push(makePeak(peakStart, projection.length - 1));
  }

  return peaks;
}

function makePeak(start: number, end: number): GridPeak {
  return { start, end, center: start + Math.floor((end - start) / 2) };
}

function average(values: number[]): number {
  let sum = 0;
  for (const value of values) {
    sum += value;
  }

  return sum / values.length;
}

function medianPeakGap(peaks: GridPeak[]): number {
  const gaps: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    const prev = peaks[i - 1];
    const current = peaks[i];

    if (prev === undefined || current === undefined) {
      throw new RangeError(`Missing peak at index ${i}`);
    }

    gaps.push(current.center - prev.center);
  }

  gaps.sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)];

  if (median === undefined) {
    throw new RangeError("Not enough peaks to compute the grid step");
  }

  return median;
}
