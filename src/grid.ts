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

/** Fraction of the grid step that sets the area radius around an intersection. */
const INTERSECTION_RADIUS_RATIO = 0.4;

export class Grid {
  readonly xPeaks: GridPeak[];
  readonly yPeaks: GridPeak[];
  readonly #image: GrayImage;
  #step: number | null = null;
  #intersections: GridIntersection[] | null = null;

  /** Use Grid.detect() to create an instance. */
  private constructor(image: GrayImage, xPeaks: GridPeak[], yPeaks: GridPeak[]) {
    this.#image = image;
    this.xPeaks = xPeaks;
    this.yPeaks = yPeaks;
  }

  /** Finds grid lines from darkness peaks in the image projections. */
  static detect(image: GrayImage): Grid {
    return new Grid(image, findPeaks(image.xProjection()), findPeaks(image.yProjection()));
  }

  /** Grid step in pixels. The first call caches the result.
   * Uses the horizontal gaps between X peaks.
   */
  get step(): number {
    this.#step ??= medianPeakGap(this.xPeaks);
    return this.#step;
  }

  /** All grid line intersections. The first call caches the result. */
  get intersections(): GridIntersection[] {
    this.#intersections ??= this.#computeIntersections();
    return this.#intersections;
  }

  /** Intersection at the given board coordinates. Throws RangeError if there is none. */
  intersectionAt(column: number, row: number): GridIntersection {
    const found = this.intersections.find(
      (intersection) => intersection.column === column && intersection.row === row,
    );

    if (found === undefined) {
      throw new RangeError(`No intersection at column ${column}, row ${row}`);
    }

    return found;
  }

  /** Average darkness around the intersection. A stone makes it higher. */
  darknessAt(column: number, row: number): number {
    return this.#image.averageDarknessIn(this.#areaAround(this.intersectionAt(column, row)));
  }

  /** Sampling square around an intersection, clipped to the image borders.
   * Stone detection reads the pixels inside it.
   */
  #areaAround({ x, y }: GridIntersection): PixelArea {
    const radius = Math.floor(this.step * INTERSECTION_RADIUS_RATIO);

    return {
      startX: Math.max(x - radius, 0),
      endX: Math.min(x + radius, this.#image.width - 1),
      startY: Math.max(y - radius, 0),
      endY: Math.min(y + radius, this.#image.height - 1),
    };
  }

  /** Pairs every X peak with every Y peak. Each pair is a line intersection. */
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

/** Finds projection ranges that are darker than average: grid line candidates.
 * A projection is an array of darkness values, one per column or row.
 */
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

/** Builds a peak from its start and end. The center is the middle point. */
function makePeak(start: number, end: number): GridPeak {
  return { start, end, center: start + Math.floor((end - start) / 2) };
}

/** Average of all values in the array. */
function average(values: number[]): number {
  let sum = 0;
  for (const value of values) {
    sum += value;
  }

  return sum / values.length;
}

/** Median distance between peak centers. Safer than the mean when some peaks are noisy. */
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
