// 建置 Android 版 Web 資產。
//
// 與 `npm run build` 的差別只有一個：設定 VITE_TARGET=android，
// 讓 vite.config.js 對 VITE_API_BASE_URL 做 fail-fast 斷言。
// 用 Node 腳本而不是 shell 前綴（VITE_API_BASE_URL=... vite build），
// 因為 Windows 的 npm script 預設跑 cmd.exe，那種寫法會直接失敗。
//
// 用法：
//   VITE_API_BASE_URL=https://xxx.zeabur.app npm run build:android
//   （Windows PowerShell：$env:VITE_API_BASE_URL="https://xxx.zeabur.app"; npm run build:android）

process.env.VITE_TARGET = 'android';

const base = (process.env.VITE_API_BASE_URL || '').trim();
if (!base) {
  console.error('\n[build:android] 缺少 VITE_API_BASE_URL。');
  console.error('打包後頁面 origin 是 https://localhost，相對路徑 /api/* 會 404。');
  console.error('請先設定後端網址，例如：');
  console.error('  Git Bash : VITE_API_BASE_URL=https://xxx.zeabur.app npm run build:android');
  console.error('  PowerShell: $env:VITE_API_BASE_URL="https://xxx.zeabur.app"; npm run build:android\n');
  process.exit(1);
}

const { build } = await import('vite');
// sourcemap 對 APK 沒有價值（沒有 source map server），但會讓 dist 多出約 0.5MB。
// 驗收標準是 dist ≤1.5MB，所以 App 版明確關掉；web 版仍由 npm run build 產生 maps。
await build({
  mode: 'production',
  logLevel: 'info',
  build: { sourcemap: false },
});
