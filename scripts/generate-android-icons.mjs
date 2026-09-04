import sharp from "sharp";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const src = resolve(__dirname, "../public/icon-512x512.png");

const sizes = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192,
};

async function generate() {
  for (const [dir, size] of Object.entries(sizes)) {
    const out = resolve(__dirname, `../android/app/src/main/res/${dir}/ic_launcher.png`);
    await sharp(src).resize(size, size).png().toFile(out);
    console.log(`Created ${dir}/ic_launcher.png (${size}x${size})`);
  }
}

generate().catch(console.error);
