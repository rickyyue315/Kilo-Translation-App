import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Kilo 即時語音翻譯器 — Android 容器設定
 *
 * 對應文件：ANDROID_APP.md §5.1
 * 前置：Node >= 22、JDK 21、Android Studio Otter 2025.2.1+、SDK 36
 *
 * 注意：本檔僅在安裝 @capacitor/core 後才會被 CLI 讀取；
 * 在此之前存在於專案根目錄不影響現有 web 建置。
 */
const config: CapacitorConfig = {
  // 上架後不可變更，否則會被視為另一個 App
  appId: 'app.kilo.translator',
  appName: 'Kilo 翻譯',

  // Vite 建置輸出（npm run build）
  webDir: 'dist',

  android: {
    // 必須為 https：getUserMedia 只在 secure context 下可用。
    // WebView 的 origin 會是 https://localhost。
    androidScheme: 'https',

    // 105：覆蓋 API 24 邊界機型。全螢幕 WebView 無網址列，
    // 100vh 與 100dvh 等效，不需要為 dvh 犧牲舊機。
    minWebViewVersion: 105,

    // Splash 之後、首次繪製前的底色。單一值無法隨主題切換，
    // 深色由 res/values-night 的 splash 資源覆蓋（見 §5.1 註記）。
    backgroundColor: '#f1f5f9',

    // 只在 debug 建置開啟：chrome://inspect
    webContentsDebuggingEnabled: false,
  },

  plugins: {
    // Capacitor 8 內建於 @capacitor/core，不需另裝套件。
    // css：注入 --safe-area-inset-* 變數，供 main.css 的 --sat/--sab 取用。
    SystemBars: {
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
      style: 'DEFAULT',
    },

    // native：由系統縮放 WebView 高度，避免 fixed 定位元素被鍵盤遮住
    Keyboard: {
      resize: 'native',
      resizeOnFullScreen: true,
    },

    SplashScreen: {
      launchShowDuration: 600,
      launchAutoHide: true,
      backgroundColor: '#f1f5f9',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;
