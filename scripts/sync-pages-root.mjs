import { copyFile, cp, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(".");
const dist = join(root, "dist");

if (!existsSync(dist)) {
  throw new Error("dist does not exist. Run vite build first.");
}

for (const entry of ["assets", "icons"]) {
  await mkdir(join(root, entry), { recursive: true });
  await cp(join(dist, entry), join(root, entry), { recursive: true });
}

for (const file of ["index.html", "manifest.webmanifest", "sw.js", ".nojekyll"]) {
  await mkdir(root, { recursive: true });
  await copyFile(join(dist, file), join(root, file));
}

console.log("Synced GitHub Pages root from dist.");
