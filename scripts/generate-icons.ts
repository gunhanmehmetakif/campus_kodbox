/** Generates PWA PNG icons from public/icons/icon.svg. Run: npx tsx scripts/generate-icons.ts */
import { readFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const ICON_DIR = path.join(process.cwd(), "public", "icons");
const BRAND_BG = "#2b3a67";

async function main() {
  const svg = await readFile(path.join(ICON_DIR, "icon.svg"));
  const render = (size: number) => sharp(svg, { density: 384 }).resize(size, size).png();

  await render(192).toFile(path.join(ICON_DIR, "icon-192.png"));
  await render(512).toFile(path.join(ICON_DIR, "icon-512.png"));
  await render(180).toFile(path.join(ICON_DIR, "apple-touch-icon.png"));

  // Maskable: logo at 70% on a solid brand background so the safe zone is respected.
  const inner = Math.round(512 * 0.7);
  const logo = await render(inner).toBuffer();
  await sharp({ create: { width: 512, height: 512, channels: 4, background: BRAND_BG } })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(path.join(ICON_DIR, "icon-maskable-512.png"));

  console.log("Icons written to public/icons");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
