import path from "node:path";

import {
  getAverageDarkness,
  getGrayImagePixel,
  getGridStep,
  getXPeaks,
  getYPeaks,
  loadGrayImg,
} from "./image.ts";

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
    console.log(`Center pixel: ${targetPixel}`);
    console.log("Average darkness: ", getAverageDarkness(image));
    console.log("X Peaks:  ", getXPeaks(image), "; Step is ", getGridStep(getXPeaks(image)));
    console.log("Y Peaks:  ", getYPeaks(image), "; Step is ", getGridStep(getYPeaks(image)));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
