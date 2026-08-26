import path from "node:path";

import { GrayImage } from "./gray-image.ts";
import { Grid } from "./grid.ts";

type StoneType = "empty" | "black" | "white";

interface BoardPoint {
  column: number;
  row: number;
}

/** CLI: prints the average darkness of test points to help pick stone thresholds. */
async function main() {
  const input = process.argv[2];

  if (!input) {
    console.error("Usage: goban2sgf <image>");
    process.exitCode = 1;
    return;
  }

  const filename = path.resolve(input);

  console.log(`Loading ${filename}`);

  const image = await GrayImage.load(filename);

  console.log(`Image: ${image.width}x${image.height}`);

  const grid = Grid.detect(image);

  const rangeMap: Record<StoneType, number[]> = {
    empty: [],
    white: [],
    black: [],
  };

  const testIntersections: Record<StoneType, BoardPoint[]> = {
    empty: [
      { column: 6, row: 6 },
      { column: 12, row: 6 },
      { column: 6, row: 11 },
    ],

    black: [
      { column: 3, row: 3 },
      { column: 13, row: 3 },
      { column: 16, row: 11 },
    ],

    white: [
      { column: 16, row: 5 },
      { column: 16, row: 9 },
      { column: 2, row: 13 },
    ],
  };

  for (const [stoneType, points] of Object.entries(testIntersections)) {
    console.log("\n\n>>>[DEBUG] stoneType:", stoneType, points);
    for (const point of points) {
      console.log("\n>>>[DEBUG] point:", point);
      const averageDarkness = grid.darknessAt(point.column, point.row);
      console.log(">>>[DEBUG] average darkness: ", averageDarkness);

      rangeMap[stoneType as StoneType].push(averageDarkness);
    }
  }

  console.log("\n\n>>>[DEBUG] rangeMap: ", rangeMap);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
