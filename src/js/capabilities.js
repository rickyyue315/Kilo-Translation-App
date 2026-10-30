// Kilo Translation App - 平台能力偵測與原生橋接
//
// 一條主路徑、兩條增強、永不硬阻擋（ANDROID_APP.md §2.3）：
//   native            → 一律走 MediaRecorder → /api/transcribe（放棄即時逐字）
//   web + Web Speech  → 保留即時逐字，失敗才降級後端
//   全不可用          → textOnly：停用麥克風，文字翻譯 / 歷史 / 朗讀照常
//
// 另含 MicPermission 原生插件的橋接（權限三態、openSettings、fontScale）。
// 插件缺失時全部回傳安全預設值，不拋錯——web 版不能因此受影響。

import { isNative, getPlatform } from './api.js';

const MIC_PLUGIN = 'MicPermission';
const FONT_SCALE_MIN = 0.85;
const FONT_SCALE_MAX = 2.0;

/** 取得原生插件；非原生或未註冊時回傳 null。 */
function micPlugin() {
  try {
    const plugins = window.Capacitor?.Plugins;
    return plugins && plugins[MIC_PLUGIN] ? plugins[MIC_PLUGIN] : null;
  } catch {
    return null;
  }
}

/**
 * 解析語音相關能力。
 * @returns {{native:boolean, asrEngine:'backend'|'web', asrFallback:'backend'|null, ttsEngine:'plugin'|'web', canRecord:boolean, level:'full'|'textOnly'}}
 */
export function resolveSpeechCapabilities() {
  const native = isNative();
  const hasWebSpeech = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  const hasRecorder =
    typeof MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);

  return {
    native,
    // 原生容器沒有 Web Speech，唯一可用路徑是後端 ASR
    asrEngine: native ? 'backend' : hasWebSpeech ? 'web' : 'backend',
    asrFallback: hasRecorder ? 'backend' : null,
    ttsEngine: native ? 'plugin' : 'web',
    canRecord: hasRecorder,
    level: hasRecorder ? 'full' : 'textOnly',
  };
}

/**
 * 能力報告：只描述缺什麼，不做任何阻擋。
 * @returns {{level:string, missing:string[], native:boolean}}
 */
export function getCapabilityReport() {
  const caps = resolveSpeechCapabilities();
  const missing = [];
  if (!caps.canRecord) missing.push('recording');
  if (caps.ttsEngine === 'web' && !window.speechSynthesis) missing.push('tts');
  return { level: caps.level, missing, native: caps.native };
}

// ========== 麥克風權限三態 ==========
//
// 為什麼不用 Permissions API：WebView 對 'microphone' 的支援不一致，
// 且「拒絕一次」與「永久拒絕」在 web 層無法區分（沒有 rationale 概念）。
// 原生插件直接讀 Android 的 shouldShowRequestPermissionRationale，才能做到
// 「先判後要」：首次出 App 內說明、拒絕一次仍可再要、永久拒絕直接 deep-link 設定頁。

/**
 * @returns {Promise<'granted'|'denied'|'prompt'|'unavailable'>}
 *   granted  = 已授權
 *   prompt   = 從未詢問，或拒絕過一次但還能再問（每次都要先出 App 內說明）
 *   denied   = 永久拒絕（Android 不會再彈系統框）
 */
export async function checkMicPermission() {
  const plugin = micPlugin();
  if (plugin?.check) {
    try {
      const res = await plugin.check();
      return normalizePermission(res?.state);
    } catch {
      return 'unavailable';
    }
  }
  // web：只能探測「已授權」，其餘一律視為尚未決定，讓 getUserMedia 自己彈框
  try {
    const status = await navigator.permissions?.query?.({ name: 'microphone' });
    if (status?.state === 'granted') return 'granted';
    if (status?.state === 'denied') return 'denied';
    return 'prompt';
  } catch {
    return 'prompt';
  }
}

/**
 * 是否應該顯示 App 內說明（首次請求前）。
 * @returns {Promise<boolean>}
 */
export async function shouldShowMicRationale() {
  const state = await checkMicPermission();
  return state === 'prompt';
}

/**
 * 請求麥克風權限；永久拒絕回傳 'blocked'，呼叫端改為引導至系統設定。
 * @returns {Promise<'granted'|'denied'|'blocked'|'unavailable'>}
 */
export async function requestMicPermission() {
  const plugin = micPlugin();
  if (plugin?.request) {
    try {
      const res = await plugin.request();
      if (res?.state === 'granted') return 'granted';
      // 原生端只會在「永久拒絕」時回 denied（拒絕一次是 prompt），
      // 所以這裡對應的是 blocked，而不是一般拒絕。
      if (res?.state === 'denied') return 'blocked';
      return 'denied';
    } catch {
      return 'unavailable';
    }
  }
  return 'unavailable';
}

/** 開啟本 App 的系統設定頁（永久拒絕後唯一的一步救援）。 */
export async function openAppSettings() {
  const plugin = micPlugin();
  if (plugin?.openSettings) {
    try {
      await plugin.openSettings();
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

function normalizePermission(state) {
  const value = String(state || '').toLowerCase();
  if (value === 'granted' || value === 'denied' || value === 'prompt') return value;
  return 'prompt';
}

// ========== 系統字級（fontScale） ==========
//
// Android WebView 不會套用系統字級：matchMedia 與 getComputedStyle(root).fontSize
// 都讀不到 fontScale，永遠是 16px。不自己接，「支援 200% 字體」就是假通過。
// 做法：原生回傳 Configuration.fontScale（clamp 0.85–2.0），首屏 paint 前設 root font-size。

/**
 * 讀取系統字級倍率；取不到時回 1.0。
 * @returns {Promise<number>}
 */
export async function getFontScale() {
  const plugin = micPlugin();
  if (!plugin?.getFontScale) return 1;
  try {
    const res = await plugin.getFontScale();
    return clampFontScale(Number(res?.fontScale ?? res?.value ?? 1));
  } catch {
    return 1;
  }
}

/**
 * 套用系統字級到 root。必須在首次繪製前呼叫。
 * fs > 1.3 時加上 data-compact（版面分支，不是字級分支）。
 * @returns {Promise<number>} 實際套用的倍率
 */
export async function applySystemFontScale() {
  const scale = await getFontScale();
  if (typeof document === 'undefined') return scale;
  const root = document.documentElement;
  // 1rem baseline = 16px；幾何一律用 px，只有字級 / 行高 / letter-spacing 用 rem，
  // 因此放大 root 不會把 dock、命中盒、邊距一起撐大（§3.4）
  root.style.fontSize = `${16 * scale}px`;
  if (scale > 1.3) root.setAttribute('data-compact', 'true');
  else root.removeAttribute('data-compact');
  root.setAttribute('data-font-scale', String(scale));
  return scale;
}

/** 從背景回來時使用者在系統設定改過字級，必須重讀，否則「字沒變但版面已 compact」。 */
export async function refreshFontScale() {
  return applySystemFontScale();
}

/**
 * 監聽原生字級變化（使用者在設定裡拉動字體大小、分割畫面調整）。
 * MainActivity.onConfigurationChanged 會廣播 fontScaleChanged。
 * @param {(scale:number)=>void} callback
 * @returns {Promise<() => void>} unsubscribe
 */
export async function onFontScaleChange(callback) {
  const plugin = micPlugin();
  if (!plugin?.addListener) return () => {};
  try {
    const handle = await plugin.addListener('fontScaleChanged', (event) => {
      const scale = clampFontScale(Number(event?.fontScale ?? 1));
      const root = document.documentElement;
      root.style.fontSize = `${16 * scale}px`;
      if (scale > 1.3) root.setAttribute('data-compact', 'true');
      else root.removeAttribute('data-compact');
      root.setAttribute('data-font-scale', String(scale));
      callback?.(scale);
    });
    return () => handle?.remove?.();
  } catch {
    return () => {};
  }
}

function clampFontScale(value) {
  if (!Number.isFinite(value) || value <= 0) return 1;
  // 下限不能是 1.0：Android 有 "Smaller" 0.85，拉回 1.0 等於改掉使用者的選擇
  return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, value));
}

// ========== 觸感 ==========

/** 錄音 orb 的觸感回饋；非原生或插件缺失時靜默略過。 */
export async function hapticTap() {
  if (!isNative()) return;
  try {
    const mod = await import('@capacitor/haptics');
    await mod.Haptics.impact({ style: 'MEDIUM' });
  } catch {
    // 觸感是加分項，失敗不影響功能
  }
}

// ========== 網路狀態 ==========

/**
 * 監聽離線／上線。callback 收到 boolean（true = online）。
 * 非原生時退回 window 的 online/offline 事件。
 * @param {(online:boolean)=>void} callback
 * @returns {Promise<() => void>} unsubscribe
 */
export async function watchNetwork(callback) {
  const emit = (online) => {
    try {
      callback(online);
    } catch {
      // 監聽器不得讓呼叫端崩潰
    }
  };

  if (!isNative()) {
    const on = () => emit(true);
    const off = () => emit(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }

  try {
    const mod = await import('@capacitor/network');
    const status = await mod.Network.getStatus();
    emit(Boolean(status?.connected));
    const handle = await mod.Network.addListener('networkStatusChange', (s) => emit(Boolean(s.connected)));
    return () => handle?.remove?.();
  } catch {
    return () => {};
  }
}

export const PLATFORM = {
  isNative,
  getPlatform,
};
