// Kilo Translation App - OpenRouter ASR (voice conversation transcription)
//
// Records from the microphone with MediaRecorder, sends the audio blob to the
// backend (/api/transcribe, Zeabur) and falls back to direct OpenRouter calls
// when the user supplies their own API key.
//
// Supported models (https://openrouter.ai/):
//   mistralai/voxtral-mini-transcribe
//   microsoft/mai-transcribe-2
//   qwen/qwen3-asr-1.7b
//   nvidia/nemotron-3.5-asr-streaming-multilingual-0.6b

export const OPENROUTER_ASR_MODELS = {
  'mistralai/voxtral-mini-transcribe': {
    name: 'Voxtral Mini Transcribe',
    vendor: 'Mistral',
    description: 'Mistral 輕量語音轉文字，適合會議/語音筆記/播客',
  },
  'microsoft/mai-transcribe-2': {
    name: 'MAI-Transcribe 2',
    vendor: 'Microsoft',
    description: '微軟多語言語音轉文字，FLEURS 多語言基準領先',
  },
  'qwen/qwen3-asr-1.7b': {
    name: 'Qwen3 ASR 1.7B',
    vendor: 'Qwen',
    description: 'Qwen 多語言 ASR，支援語種識別與時間戳',
  },
  'nvidia/nemotron-3.5-asr-streaming-multilingual-0.6b': {
    name: 'Nemotron 3.5 ASR Streaming 0.6B',
    vendor: 'NVIDIA',
    description: 'NVIDIA 低延遲串流 ASR，40+ 語言即時字幕/語音代理',
  },
};

export const DEFAULT_ASR_MODEL = 'mistralai/voxtral-mini-transcribe';
export const ASR_MODEL_STORAGE_KEY = 'openrouter_asr_model';
export const ASR_MODEL_LEGACY_KEY = 'selected_asr_model';

const LANG_TO_ISO639 = {
  'zh-TW': 'zh',
  'zh-CN': 'zh',
  'en-US': 'en',
  'ja-JP': 'ja',
  'ko-KR': 'ko',
  'fr-FR': 'fr',
  'es-ES': 'es',
  'de-DE': 'de',
  'it-IT': 'it',
  'pt-BR': 'pt',
  'ru-RU': 'ru',
  'ar-SA': 'ar',
  'th-TH': 'th',
  'vi-VN': 'vi',
};

export function iso639FromBcp47(bcp47) {
  return LANG_TO_ISO639[bcp47] || String(bcp47 || '').split('-')[0].toLowerCase();
}

export function getSavedAsrModel() {
  try {
    const saved = localStorage.getItem(ASR_MODEL_STORAGE_KEY) || localStorage.getItem(ASR_MODEL_LEGACY_KEY);
    if (saved && OPENROUTER_ASR_MODELS[saved]) return saved;
  } catch {
    // localStorage unavailable — fall through to default
  }
  return DEFAULT_ASR_MODEL;
}

export function setSavedAsrModel(modelId) {
  try {
    localStorage.setItem(ASR_MODEL_STORAGE_KEY, modelId);
    localStorage.setItem(ASR_MODEL_LEGACY_KEY, modelId);
  } catch {
    // ignore persistence failures
  }
}

export function getTranscribeEndpoint() {
  return '/api/transcribe';
}

/**
 * Send a recorded audio blob to the backend for transcription.
 *
 * @param {Blob} audioBlob
 * @param {object} [options]
 * @param {string} [options.model] - OpenRouter ASR model id
 * @param {string} [options.language] - BCP-47 source language (converted to ISO-639-1)
 * @param {string} [options.apiKey] - user-supplied OpenRouter key (BYOK); omit for server key
 * @param {number} [options.timeoutMs]
 * @returns {Promise<{text: string, model: string, language?: string, usage?: object}>}
 */
export async function transcribeAudio(audioBlob, options = {}) {
  const {
    model = getSavedAsrModel(),
    language,
    apiKey,
    timeoutMs = 90000,
  } = options;

  if (!audioBlob || audioBlob.size === 0) {
    throw new Error('沒有錄到聲音，請再試一次');
  }
  if (!OPENROUTER_ASR_MODELS[model]) {
    throw new Error(`不支援的 ASR 模型: ${model}`);
  }

  const buildFormData = () => {
    const fd = new FormData();
    fd.append('file', audioBlob, 'recording.webm');
    fd.append('model', model);
    if (language) fd.append('language', iso639FromBcp47(language));
    return fd;
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const endpoints = [getTranscribeEndpoint(), '/.netlify/functions/transcribe'];
  try {
    let response = null;
    for (const endpoint of endpoints) {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: apiKey ? { 'X-OpenRouter-Key': apiKey } : {},
        body: buildFormData(),
        signal: controller.signal,
      });
      if (response.status === 404 && endpoint !== endpoints[endpoints.length - 1]) continue;
      break;
    }
    if (!response || response.status === 404) {
      throw new Error('找不到語音辨識服務。若在本機開發請先啟動後端 (npm start)；Zeabur 上請確認服務已部署。');
    }
    if (!response.ok) {
      let detail = response.statusText;
      try {
        const err = await response.json();
        detail = err.error || detail;
      } catch {
        // keep statusText
      }
      throw new Error(detail);
    }
    const data = await response.json();
    if (!data.text) throw new Error('語音辨識未返回文字結果');
    return data;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('語音辨識逾時，請改用較短的錄音再試');
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Transcribe by calling OpenRouter directly (BYOK path — user key, no backend).
 */
export async function transcribeAudioDirect(audioBlob, apiKey, options = {}) {
  const { model = getSavedAsrModel(), language, timeoutMs = 90000 } = options;
  if (!apiKey) throw new Error('請輸入 OpenRouter API 金鑰');
  if (!audioBlob || audioBlob.size === 0) throw new Error('沒有錄到聲音，請再試一次');
  if (!OPENROUTER_ASR_MODELS[model]) throw new Error(`不支援的 ASR 模型: ${model}`);

  const format = mimeToFormat(audioBlob.type);
  if (!format) throw new Error(`瀏覽器錄音格式不受支援: ${audioBlob.type || '未知'}`);

  const base64 = await blobToBase64(audioBlob);
  const body = { model, input_audio: { data: base64, format } };
  if (language) body.language = iso639FromBcp47(language);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Kilo Translation App',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      let detail = response.statusText;
      try {
        const err = await response.json();
        detail = err.error?.message || err.error || detail;
      } catch {
        // keep statusText
      }
      throw new Error(`語音辨識失敗: ${detail}`);
    }
    return response.json();
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('語音辨識逾時，請改用較短的錄音再試');
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function mimeToFormat(mime = '') {
  const base = String(mime).split(';')[0].trim().toLowerCase();
  if (base.includes('webm')) return 'webm';
  if (base.includes('ogg')) return 'ogg';
  if (base.includes('mp4') || base.includes('m4a')) return 'm4a';
  if (base.includes('mpeg') || base.includes('mp3')) return 'mp3';
  if (base.includes('wav')) return 'wav';
  if (base.includes('flac')) return 'flac';
  if (base.includes('aac')) return 'aac';
  return null;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error('讀取錄音失敗'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Pick a MediaRecorder mime type the current browser supports.
 * Prefers webm/opus (small, streamable), falls back to mp4 (Safari).
 */
export function pickRecorderMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', ''];
  for (const mime of candidates) {
    try {
      if (!mime || MediaRecorder.isTypeSupported(mime)) return mime;
    } catch {
      // try next candidate
    }
  }
  return '';
}

export function isVoiceConversationSupported() {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined'
  );
}
