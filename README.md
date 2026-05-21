# geo-visualization-workshop

GPU-accelerated web visualization examples using deck.gl and three.js. Built as a two-day workshop.

Live demo: https://slesaad.github.io/geo-visualization-workshop/

## Chapters

1. `01-basics` — deck.gl scatterplot
2. `02-layers` — built-in layers (geojson, arc, path, text, trips)
3. `03-extensions` — datafilter, mask, clip, brushing
4. `04-shader-injection` — custom GLSL in deck.gl shaders
5. `05-custom-layer` — custom layer from scratch with instancing
6. `06-nyc-taxi` — animated GLTF taxi on trip data
7. `07-celestial-threejs` — textured spheres with three.js
8. `08-solar-system` — orbiting planets, interactive detail panel
9. `09-particles` — GPU particle advection with ping-pong FBOs

## Run locally

```sh
./start-all.sh
```

Gallery on `:3000`, chapters on `:3001`–`:3010`.

## Deploy

Push to `main`. GitHub Actions builds and deploys to Pages automatically.
