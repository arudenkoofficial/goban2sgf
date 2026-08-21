import path from "node:path";


import { getDarkness, getGrayImagePixel, loadGrayImg } from "./image.ts";

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

  console.log(
    `Image: ${image.width}x${image.height}`,
  );

  const centerX = Math.floor(image.width / 2);
  const centerY = Math.floor(image.height / 2);
  const targetPixel = getGrayImagePixel(
      image,
      centerX,
      centerY,
    );

console.log(
    `Center pixel: ${targetPixel}`,
    );
    console.log('Darkness:', getDarkness(targetPixel));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});