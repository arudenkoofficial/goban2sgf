import path from "node:path";

import {
  findGridIntersection,
  getGrayImagePixel,
  getGridIntersections,
  getGridStep,
  getIntersectionArea,
  getIntersectionAverageDarkness,
  getIntersectionPixels,
  getXPeaks,
  getYPeaks,
  loadGrayImg,
} from "./image.ts";

type StoneType = "empty" | "black" | "white";

interface BoardPoint {
  column: number;
  row: number;
}

async function main() {
  const input = process.argv[2];

  if (!input) {
    console.error("Usage: goban2sgf <image>");
    process.exitCode = 1;
    return;
  }

  const filename = path.resolve(input);

  console.log(`Loading ${filename}`);

  const image = await loadGrayImg(filename);

  console.log(`Image: ${image.width}x${image.height}`);

  const centerX = Math.floor(image.width / 2);
  const centerY = Math.floor(image.height / 2);
  const targetPixel = getGrayImagePixel(image, centerX, centerY);

  if (targetPixel !== undefined) {
    const rangeMap: Record<StoneType, number[]> = {
      empty: [],
      white: [],
      black: [],
    };
    const intersections = getGridIntersections(getXPeaks(image), getYPeaks(image));
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
        const area = getIntersectionArea(
          image,
          findGridIntersection(intersections, point.column, point.row),
          getGridStep(getXPeaks(image)),
        );

        console.log(">>>[DEBUG] area: ", area);
        const intersectionPixels = getIntersectionPixels(image, area);
        const averageDarkness = getIntersectionAverageDarkness(intersectionPixels);
        console.log(">>>[DEBUG] average darkness: ", averageDarkness);

        rangeMap[stoneType as StoneType].push(averageDarkness);
      }
    }

    console.log("\n\n>>>[DEBUG] rangeMap: ", rangeMap);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
