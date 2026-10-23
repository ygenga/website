// Samples a Fibonacci sphere and keeps the points that fall on land.
// Output: dots.json as a flat [lat, lon, lat, lon, ...] array rounded to 0.1°.
import { readFileSync, writeFileSync } from "node:fs";
import { feature } from "topojson-client";
import { geoContains } from "d3-geo";

const topo = JSON.parse(readFileSync(new URL("./node_modules/world-atlas/land-110m.json", import.meta.url)));
const land = feature(topo, topo.objects.land);
const N = 16000;
const out = [];
const golden = Math.PI * (3 - Math.sqrt(5));
for (let i = 0; i < N; i++) {
  const y = 1 - (i / (N - 1)) * 2;
  const lat = (Math.asin(y) * 180) / Math.PI;
  const lon = ((((i * golden) * 180) / Math.PI) % 360) - 180;
  if (lat < -60) continue; // skip Antarctica
  if (geoContains(land, [lon, lat])) out.push(Math.round(lat * 10) / 10, Math.round(lon * 10) / 10);
}
writeFileSync(new URL("./src/dots.json", import.meta.url), JSON.stringify(out));
console.log("land dots:", out.length / 2);
