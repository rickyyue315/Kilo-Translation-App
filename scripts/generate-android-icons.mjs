/**
 * 產生 Android 原生圖像資產（adaptive icon / legacy icon / splash）。
 *
 * 用法：npm run icons:android（android:sync 會自動先跑）
 *
 * 為什麼不能直接沿用 public/icons 的 maskable 圖（ANDROID_APP.md §1.2）：
 *   - maskable 已含額外留白，直接當 adaptive foreground 會讓內容縮得太小
 *   - adaptive icon 的前景層是 108dp 網格，內容必須 ≤66%（72dp），
 *     外圈 18dp 會被各家 launcher 裁掉
 *   - 深色 splash 需要 drawable-night 資源，只改 JS 設定會「白閃一下」
 *
 * 產出：
 *   mipmap-<density>/ic_launcher.png            48dp 方形（API 24–25 用）
 *   mipmap-<density>/ic_launcher_round.png      48dp 圓形
 *   mipmap-<density>/ic_launcher_foreground.png 108dp 畫布 + 72dp 內容
 *   drawable 各尺寸 splash.png                  192dp logo 居中
 *   drawable-night/splash.png                   同上，深色底 #0B1220
 */
import { mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'images', 'tokyo-tower.png.png');
const RES = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');

const LIGHT_BG = { r: 241, g: 245, b: 249, alpha: 1 }; // #F1F5F9
const DARK_BG = { r: 11, g: 18, b: 32, alpha: 1 };     // #0B1220

if (!existsSync(SRC)) {
  console.error(`[icons:android] 找不到來源圖：${SRC}`);
  process.exit(1);
}
if (!existsSync(RES)) {
  console.error('[icons:android] 找不到 android/app/src/main/res，請先執行 npx cap add android');
  process.exit(1);
}

const { default: sharp } = await import('sharp');

/** 品牌來源圖：與 web icon 相同的中心裁切（去掉右下角 AI 浮水印） */
const sourceCrop = () => sharp(SRC).extract({ left: 0, top: 0, width: 1203, height: 1203 });

const DENSITIES = [
  { name: 'mdpi', scale: 1 },
  { name: 'hdpi', scale: 1.5 },
  { name: 'xhdpi', scale: 2 },
  { name: 'xxhdpi', scale: 3 },
  { name: 'xxxhdpi', scale: 4 },
];

function roundMask(size) {
  const radius = size / 2;
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">` +
      `<circle cx="${radius}" cy="${radius}" r="${radius}" fill="#fff"/></svg>`
  );
}

function squareMask(size, radiusRatio = 0.22) {
  const r = Math.round(size * radiusRatio);
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect x="0" y="0" width="${size}" height="${size}" rx="${r}" ry="${r}" fill="#fff"/></svg>`
  );
}

/** 畫一個透明 canvas，把 logo 居中貼上 */
async function composeOnCanvas({ canvasW, canvasH, logoSize, background, out }) {
  const logo = await sourceCrop().resize(logoSize, logoSize, { fit: 'cover' }).png().toBuffer();
  const canvas = sharp({
    create: { width: canvasW, height: canvasH, channels: 4, background: background || { r: 0, g: 0, b: 0, alpha: 0 } },
  }).png();

  await canvas
    .composite([{ input: logo, left: Math.round((canvasW - logoSize) / 2), top: Math.round((canvasH - logoSize) / 2) }])
    .png()
    .toFile(out);
}

// ---------- 1. Legacy / adaptive icon ----------
for (const { name, scale } of DENSITIES) {
  const dir = path.join(RES, `mipmap-${name}`);
  mkdirSync(dir, { recursive: true });

  const legacy = Math.round(48 * scale);
  const square = await sourceCrop().resize(legacy, legacy, { fit: 'cover' }).png().toBuffer();
  await sharp(square)
    .composite([{ input: squareMask(legacy), blend: 'dest-in' }])
    .png()
    .toFile(path.join(dir, 'ic_launcher.png'));
  await sharp(square)
    .composite([{ input: roundMask(legacy), blend: 'dest-in' }])
    .png()
    .toFile(path.join(dir, 'ic_launcher_round.png'));

  // foreground：108dp 畫布，內容 72dp（66.7%），外圈留給 launcher 裁切
  const canvasSize = Math.round(108 * scale);
  const contentSize = Math.round(72 * scale);
  await composeOnCanvas({
    canvasW: canvasSize,
    canvasH: canvasSize,
    logoSize: contentSize,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
    out: path.join(dir, 'ic_launcher_foreground.png'),
  });
}

// ---------- 2. Splash ----------
const SPLASHES = [
  { dir: 'drawable', w: 480, h: 320, scale: 1 },
  { dir: 'drawable-port-mdpi', w: 320, h: 480, scale: 1 },
  { dir: 'drawable-port-hdpi', w: 480, h: 800, scale: 1.5 },
  { dir: 'drawable-port-xhdpi', w: 720, h: 1280, scale: 2 },
  { dir: 'drawable-port-xxhdpi', w: 960, h: 1600, scale: 3 },
  { dir: 'drawable-port-xxxhdpi', w: 1280, h: 1920, scale: 4 },
  { dir: 'drawable-land-hdpi', w: 800, h: 480, scale: 1.5 },
];

for (const { dir, w, h, scale } of SPLASHES) {
  // 192dp 內容、但不得超過短邊的 60%，避免小螢幕把 logo 撐爆
  const logoSize = Math.round(Math.min(192 * scale, Math.min(w, h) * 0.6));

  for (const [targetDir, background] of [
    [dir, LIGHT_BG],
    [dir.replace('drawable', 'drawable-night'), DARK_BG],
  ]) {
    const outDir = path.join(RES, targetDir);
    mkdirSync(outDir, { recursive: true });
    await composeOnCanvas({
      canvasW: w,
      canvasH: h,
      logoSize,
      background,
      out: path.join(outDir, 'splash.png'),
    });
  }
}

console.log('[icons:android] adaptive icon / legacy icon / splash（light + night）已更新');
