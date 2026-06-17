// Generates PWA icons from "public/TruckFixr ShopOps.png".
// Crops to the square TF-monogram region (left ~42% of width), then scales to
// 192×192 and 512×512, writing public/icon-192.png and public/icon-512.png.
// Run: node scripts/generate-icons.mjs
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "..", "public");
const SRC = join(PUBLIC, "TruckFixr ShopOps.png");

const meta = await sharp(SRC).metadata();
const { width, height } = meta;

// The TF monogram occupies roughly the left 42% of the image.
// Crop to a square of that width, centred vertically.
const cropW = Math.round(width * 0.42);
const cropH = cropW;
const cropTop = Math.round((height - cropH) / 2);

for (const size of [192, 512]) {
  const out = join(PUBLIC, `icon-${size}.png`);
  await sharp(SRC)
    .extract({ left: 0, top: cropTop, width: cropW, height: cropH })
    .resize(size, size, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(out);
  console.log(`wrote ${out}`);
}

// Also write a favicon-sized copy for the browser tab
const faviconOut = join(PUBLIC, "favicon.png");
await sharp(SRC)
  .extract({ left: 0, top: cropTop, width: cropW, height: cropH })
  .resize(32, 32)
  .png()
  .toFile(faviconOut);
console.log(`wrote ${faviconOut}`);
