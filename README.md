# goban2sgf

Photo of a go board in, SGF out. In progress: grid detection and stone sampling work, SGF output does not exist yet.

## How

1. `GrayImage` loads the photo as 8-bit grayscale.
2. Darkness sums per column and row: grid lines show up as peaks.
3. `Grid` pairs X and Y peaks into intersections.
4. Darkness around an intersection tells a stone from an empty point.

## Run

```sh
npm install
npm run dev samples/ex1.jpg   # prints darkness of test points
```

Node 22+. No build step: Node runs the `.ts` files.

## Dev

```sh
npm run verify   # biome + tsc
```
