// Kilo Translation App - API base resolver
//
// 為什麼需要這一層：
// Capacitor 打包後頁面 origin 是 https://localhost（WebView 內建伺服器），
// `fetch('/api/translate')` 會打到 WebView 自己而回 404 —— 整站翻譯全掛。
// 所有後端端點因此必須經過同一個出口，且 base 在建置期注入（VITE_API_BASE_URL），
// 讓 CI 能斷言非空，避免「上架版打到 dev 後端」。
//
// 對應文件：ANDROID_APP.md §2.4

/**
 * 建置期注入的後端 origin，結尾斜線一律剝除。
 * 空字串代表「同源」——本機 dev（vite proxy）與既有 web 部署都靠這個行為。
 */
const RAW_BASE = (import.meta.env?.VITE_API_BASE_URL || '').trim();
export const API_BASE = RAW_BASE.replace(/\/+$/, '');

/**
 * 把 `/api/xxx` 組成可用的絕對位址。
 * @param {string} path 以 `/` 開頭的端點路徑
 * @returns {string}
 */
export function apiUrl(path) {
  const raw = String(path || '');
  const normalized = raw.startsWith('/') ? raw : `/${raw}`;
  return `${API_BASE}${normalized}`;
}

/**
 * 是否跑在 Capacitor 原生容器內（Android / iOS）。
 * 純 web（含 PWA）回傳 false，所有既有行為保持不變。
 * @returns {boolean}
 */
export function isNative() {
  try {
    return Boolean(window.Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
}

/**
 * 原生平台名稱：'android' | 'ios' | 'web'。
 * @returns {string}
 */
export function getPlatform() {
  try {
    return window.Capacitor?.getPlatform?.() || 'web';
  } catch {
    return 'web';
  }
}
