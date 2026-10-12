/** Generates PWA PNG icons, mail logo and favicon.ico from public/icons/*.svg. Run: npx tsx scripts/generate-icons.ts */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const ICON_DIR = path.join(process.cwd(), "public", "icons");
const FAVICON_PATH = path.join(process.cwd(), "src", "app", "favicon.ico");
const BRAND_BG = "#2b3a67";

/** Builds a multi-size ICO with embedded PNG images (valid in all modern browsers). */
function buildIco(images: { size: number; png: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const entries = images.map(({ size, png }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // palette colors
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)]);
}

async function main() {
  const svg = await readFile(path.join(ICON_DIR, "icon.svg"));
  const small = await readFile(path.join(ICON_DIR, "icon-small.svg"));
  const tiny = await readFile(path.join(ICON_DIR, "icon-16.svg"));
  const render = (src: Buffer, size: number) => sharp(src, { density: 384 }).resize(size, size).png();

  await render(svg, 192).toFile(path.join(ICON_DIR, "icon-192.png"));
  await render(svg, 512).toFile(path.join(ICON_DIR, "icon-512.png"));
  await render(svg, 180).toFile(path.join(ICON_DIR, "apple-touch-icon.png"));

  // Maskable: logo at 70% on a solid brand background so the safe zone is respected.
  const inner = Math.round(512 * 0.7);
  const logo = await render(svg, inner).toBuffer();
  await sharp({ create: { width: 512, height: 512, channels: 4, background: BRAND_BG } })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(path.join(ICON_DIR, "icon-maskable-512.png"));

  // Mail logo: rendered at 96px, displayed at 48px in emails.
  await render(small, 96).toFile(path.join(ICON_DIR, "mail-logo.png"));

  // Favicon: 16px (tiny geometry) + 32px (small geometry).
  const ico = buildIco([
    { size: 16, png: await render(tiny, 16).toBuffer() },
    { size: 32, png: await render(small, 32).toBuffer() },
  ]);
  await writeFile(FAVICON_PATH, ico);

  console.log("Icons written to public/icons and src/app/favicon.ico");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
