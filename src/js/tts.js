// Kilo Translation App - TTS 適配層
//
// 為什麼一定要換插件：Android WebView 的 window.speechSynthesis 實務上不可用
// ——可能 undefined，或 getVoices() 永遠回空陣列、voiceschanged 永不觸發。
// 舊版會把 speak() 掛在 voiceschanged 裡等，於是「永久掛住」、朗讀鈕卡在 disabled。
//
// 本層三條規則：
//   1. native 走 @capacitor-community/text-to-speech，web 走 speechSynthesis
//   2. 任何情況都不「等 voices」，最多等 1200ms 就強制發聲或明確失敗
//   3. 重入先 stop：新請求取代舊請求，不排隊

import { isNative } from './api.js';
import { resolveSpeechCapabilities } from './capabilities.js';

const VOICE_WAIT_MS = 1200;

let nativeTtsModule = null;
let speakToken = 0;

export function getTtsEngine() {
  return resolveSpeechCapabilities().ttsEngine;
}

/** 朗讀是否可用（UI 用來決定要不要把按鈕停在 disabled）。 */
export function isSpeechAvailable() {
  if (getTtsEngine() === 'plugin') return isNative();
  return typeof window !== 'undefined' && Boolean(window.speechSynthesis);
}

async function getNativeTts() {
  if (nativeTtsModule) return nativeTtsModule;
  const mod = await import('@capacitor-community/text-to-speech');
  nativeTtsModule = mod.TextToSpeech;
  return nativeTtsModule;
}

/**
 * 停止目前朗讀。native 與 web 都是「立即中斷」語意。
 */
export async function stopSpeaking() {
  speakToken += 1;
  if (getTtsEngine() === 'plugin') {
    try {
      const tts = await getNativeTts();
      await tts.stop();
    } catch {
      // 沒有正在朗讀時 stop 可能拋錯，忽略
    }
    return;
  }
  try {
    window.speechSynthesis?.cancel();
  } catch {
    // ignore
  }
}

/**
 * 朗讀一段文字。
 *
 * @param {string} text
 * @param {string} lang BCP-47（zh-TW / en-US …）
 * @param {object} [options]
 * @param {number} [options.rate=0.9]
 * @param {string} [options.voiceLang] 用來挑選語音的語言前綴（預設取 lang）
 * @param {() => void} [options.onStart]
 * @param {() => void} [options.onEnd]
 * @param {(message:string) => void} [options.onError]
 * @returns {Promise<{cancelled:boolean, error?:Error}>}
 */
export async function speak(text, lang, options = {}) {
  const content = String(text || '').trim();
  const { rate = 0.9, onStart, onEnd, onError } = options;
  if (!content) {
    const error = new Error('沒有可朗讀的內容');
    onError?.(error.message);
    return { cancelled: false, error };
  }

  // 重入先停：避免兩段語音疊在一起，也避免 native 端語音佇列累積
  await stopSpeaking();
  const token = speakToken;

  if (getTtsEngine() === 'plugin') {
    try {
      onStart?.();
      const tts = await getNativeTts();
      await tts.speak({
        text: content,
        lang: normalizeLang(lang),
        rate,
        pitch: 1.0,
        volume: 1.0,
        // 0 = Flush：新請求取代舊請求（與本層 stop-first 語意一致）
        queueStrategy: 0,
      });
      if (token !== speakToken) return { cancelled: true };
      onEnd?.();
      return { cancelled: false };
    } catch (error) {
      if (token !== speakToken) return { cancelled: true };
      onError?.(mapNativeError(error));
      return { cancelled: false, error };
    }
  }

  return speakOnWeb(content, lang, { rate, onStart, onEnd, onError, token, options });
}

function speakOnWeb(content, lang, { rate, onStart, onEnd, onError, token, options }) {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') {
      const error = new Error('此裝置不支援語音朗讀');
      onError?.(error.message);
      resolve({ cancelled: false, error });
      return;
    }

    const utterance = new SpeechSynthesisUtterance(content);
    utterance.lang = normalizeLang(lang);
    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = safeGetVoices(synth);
    if (voices.length) {
      const prefix = (options.voiceLang || lang || '').split('-')[0].toLowerCase();
      const voice = voices.find((v) => String(v.lang || '').toLowerCase().startsWith(prefix));
      if (voice) utterance.voice = voice;
    }

    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(guardTimer);
      resolve(result);
    };

    utterance.onstart = () => {
      if (token !== speakToken) {
        synth.cancel();
        finish({ cancelled: true });
        return;
      }
      onStart?.();
    };
    utterance.onend = () => {
      if (token !== speakToken) {
        finish({ cancelled: true });
        return;
      }
      onEnd?.();
      finish({ cancelled: false });
    };
    utterance.onerror = (event) => {
      if (token !== speakToken || event?.error === 'canceled' || event?.error === 'interrupted') {
        finish({ cancelled: true });
        return;
      }
      const message = mapWebError(event?.error);
      onError?.(message);
      finish({ cancelled: false, error: new Error(message) });
    };

    // 關鍵：不再把 speak() 掛在 voiceschanged 上等。
    // voices 為空時直接 speak()，多數平台會用系統預設語音；
    // 並設 8s 保險絲，避免某些 WebView 兩者都不回呼造成「永久掛住」。
    const guardTimer = setTimeout(() => {
      finish({ cancelled: false, error: new Error('朗讀無回應，請改用手動閱讀') });
    }, Math.max(8000, content.length * 60));

    try {
      synth.speak(utterance);
    } catch (error) {
      finish({ cancelled: false, error });
      onError?.(error?.message || '朗讀失敗');
    }
  });
}

function safeGetVoices(synth) {
  try {
    const voices = synth.getVoices();
    return Array.isArray(voices) ? voices : [];
  } catch {
    return [];
  }
}

function normalizeLang(lang) {
  const value = String(lang || 'en-US');
  return value.includes('-') ? value : `${value}-${value.toUpperCase()}`;
}

function mapNativeError(error) {
  const message = String(error?.message || error || '');
  if (/not.?available|missing|not.?found/i.test(message)) return '此裝置缺少該語言的語音資料，請在系統設定下載';
  return message || '朗讀失敗';
}

function mapWebError(code) {
  switch (code) {
    case 'network':
      return '網路錯誤，朗讀失敗';
    case 'synthesis-unavailable':
      return '語音合成服務不可用';
    case 'language-unavailable':
      return '不支援此語言的朗讀';
    case 'voice-unavailable':
      return '不支援此語音';
    case 'text-too-long':
      return '文字過長，請分段朗讀';
    case 'rate-not-supported':
      return '不支援此語速';
    default:
      return code ? `朗讀失敗：${code}` : '朗讀失敗';
  }
}

/**
 * iOS 長文分段（保留既有行為）。native 端不需要，插件自己排隊。
 * @param {string} text
 * @returns {string[]}
 */
export function splitForLongText(text) {
  return String(text || '')
    .split(/[.!?。！？]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export const VOICE_WAIT_TIMEOUT_MS = VOICE_WAIT_MS;
