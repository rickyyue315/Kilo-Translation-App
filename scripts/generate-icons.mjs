/**
 * Generate PWA icons from images/tokyo-tower.png.png using sharp.
 *
 * Usage: npm run icons   (runs automatically before build)
 *
 * Outputs (into public/icons/, served from /icons/):
 *   icon-192.png, icon-512.png, maskable-512.png, apple-touch-icon.png
 */
import { mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'images', 'tokyo-tower.png.png');
const OUT_DIR = path.join(ROOT, 'public', 'icons');

if (!existsSync(SRC)) {
  console.error(`[icons] source missing: ${SRC}`);
  process.exit(1);
}

const { default: sharp } = await import('sharp');

mkdirSync(OUT_DIR, { recursive: true });

// Center-square crop first (source is square-ish; guard against the AI watermark
// strip at the bottom-right by shaving 6% off the bottom edge).
const base = sharp(SRC).extract({
  left: 0,
  top: 0,
  width: 1203,
  height: 1203,
});

await base.clone().resize(192, 192, { fit: 'cover' }).png().toFile(path.join(OUT_DIR, 'icon-192.png'));

// 512 icons: standard + maskable (maskable needs ~10% safe padding)
await base.clone().resize(512, 512, { fit: 'cover' }).png().toFile(path.join(OUT_DIR, 'icon-512.png'));
await sharp(SRC)
  .extract({ left: 0, top: 0, width: 1203, height: 1203 })
  .resize(512, 512, { fit: 'cover' })
  .extend({ top: 51, bottom: 51, left: 51, right: 51, background: { r: 125, g: 205, b: 244, alpha: 1 } })
  .resize(512, 512, { fit: 'cover' })
  .png()
  .toFile(path.join(OUT_DIR, 'maskable-512.png'));

// iOS home-screen icon (180px, no transparency issues)
await base.clone().resize(180, 180, { fit: 'cover' }).png().toFile(path.join(OUT_DIR, 'apple-touch-icon.png'));

console.log('[icons] wrote icon-192.png, icon-512.png, maskable-512.png, apple-touch-icon.png');
