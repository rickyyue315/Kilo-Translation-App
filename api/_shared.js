/**
 * Shared backend logic for Kilo Voice Translator.
 *
 * Single source of truth used by:
 *   - server.js (Express, for Zeabur / Docker / local)
 *   - netlify/functions/translate.mjs (Netlify Functions, translation path)
 *   - netlify/functions/transcribe.mjs (Netlify Functions, ASR path)
 *
 * Translation goes through OpenRouter:
 *   POST https://openrouter.ai/api/v1/chat/completions
 * ASR goes through OpenRouter's unified transcription endpoint:
 *   POST https://openrouter.ai/api/v1/audio/transcriptions
 * with a JSON body { model, input_audio: { data, format }, language? }.
 * Supported models (user-selectable):
 *   mistralai/voxtral-mini-transcribe
 *   microsoft/mai-transcribe-2
 *   qwen/qwen3-asr-1.7b
 *   nvidia/nemotron-3.5-asr-streaming-multilingual-0.6b
 */

export const ASR_MODELS = {
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

export const OPENROUTER_ASR_URL = 'https://openrouter.ai/api/v1/audio/transcriptions';

const ASR_MIME_TO_FORMAT = {
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/flac': 'flac',
  'audio/x-flac': 'flac',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/m4a': 'm4a',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
  'audio/aac': 'aac',
  'audio/x-aac': 'aac',
};

export function audioFormatFromMime(mimeType = '') {
  const base = String(mimeType).split(';')[0].trim().toLowerCase();
  return ASR_MIME_TO_FORMAT[base] || null;
}

export const languageMap = {
  'zh-TW': '中文 (繁體)',
  'zh-CN': '中文 (簡體)',
  'en-US': 'English',
  'ja-JP': '日本語',
  'ko-KR': '한국어',
  'fr-FR': 'Français',
  'es-ES': 'Español',
  'de-DE': 'Deutsch',
  'it-IT': 'Italiano',
  'pt-BR': 'Português',
  'ru-RU': 'Русский',
};

export const freeModels = [
  'nvidia/nemotron-3-super-120b-a12b:free',
  'google/gemma-4-26b-a4b-it:free',
  'google/gemma-4-31b-it:free',
  'z-ai/glm-4.5-air:free',
  'openai/gpt-oss-120b:free',
  'qwen/qwen3-coder:free',
];

export const translationStylePrompts = {
  normal: '',
  natural: '翻譯風格要求：讓文句更自然流暢，使用地道的表達方式，避免生硬的直譯，讓讀者感覺像是母語人士的表達。',
  formal: '翻譯風格要求：採用正式的商務用語，使用適當的敬語和專業術語，保持嚴謹的語氣，適合商務場合。',
  simple: '翻譯風格要求：風格要淺白易懂，像在跟小朋友解釋一樣，使用簡單的詞彙和短句，避免複雜的語法結構，讓任何人都能輕鬆理解。',
  academic: '翻譯風格要求：風格要適合學術人士，使用專業術語和學術表達，保持客觀、嚴謹的語氣，適合學術或專業領域的交流。',
};

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX = 60;

export function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { windowStart: now, count: 1 });
    return true;
  }
  entry.count += 1;
  return entry.count <= RATE_LIMIT_MAX;
}

export function resetRateLimits() {
  rateLimitMap.clear();
}

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export function generateSystemPrompt(sourceLang, targetLang, style = 'normal') {
  const stylePrompt = translationStylePrompts[style] || '';
  return `你是一個專業的翻譯助手。請將${languageMap[sourceLang]}準確翻譯成${languageMap[targetLang]}。

${stylePrompt}

重要規則：
1. 必須將整段內容翻譯成目標語言：${languageMap[targetLang]}
2. 保持原文的語氣和含義
3. 只返回翻譯結果，不要添加任何解釋或額外內容
4. 專有名詞、品牌名稱、人名、地名等應根據目標語言的慣例處理
5. 輸入可能包含混合語言，請智能識別並正確翻譯

特定語言翻譯規則：
- 翻譯成日文時：請確保輸出的是正確的日文（平假名、片假名、漢字）
- 翻譯成韓文時：請確保輸出的是正確的韓文
- 翻譯成繁體中文時：請確保輸出的是繁體中文
- 翻譯成簡體中文時：請確保輸出的是簡體中文
- 翻譯成法文時：請確保輸出的是正確的法文，包含正確的變音符號
- 翻譯成西班牙文時：請確保輸出的是正確的西班牙文，包含正確的重音符號
- 翻譯成英文時：請確保輸出的是正確的英文`;
}

export function buildRequestBody(text, sourceLang, targetLang, model, stream, style) {
  return {
    model,
    messages: [
      { role: 'system', content: generateSystemPrompt(sourceLang, targetLang, style) },
      { role: 'user', content: text },
    ],
    stream: stream || false,
    temperature: 0.3,
    max_tokens: 2000,
  };
}

export async function handleSSEStream(response) {
  if (!response.body) throw new Error('伺服器未返回流式數據');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.delta?.content;
          if (content) result += content;
        } catch {
          // skip malformed SSE lines
        }
      }
    }
  }
  return result;
}

export function appOrigin(referer) {
  return referer || process.env.APP_URL || 'https://kilo-translator.zeabur.app';
}

export async function translateWithOpenRouter(text, sourceLang, targetLang, model, stream, referer, style = 'normal') {
  const API_KEY = process.env.OPENROUTER_API_KEY;
  if (!API_KEY) return { error: 'OpenRouter API key not configured on server', status: 500 };
  const selectedModel = model || 'nvidia/nemotron-3-super-120b-a12b:free';
  if (!freeModels.includes(selectedModel)) {
    return {
      error: '伺服器 API 金鑰只支援免費模型。請選擇免費選項中的模型，或切換到使用自己的 API 金鑰以存取所有模型。',
      status: 403,
      allowedModels: freeModels,
    };
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  try {
    const modelsToTry = [selectedModel, ...freeModels.filter((m) => m !== selectedModel)];
    let lastErrorMessage = '所有可用的免費模型暫時不可用，請稍後再試';
    let lastStatus = 503;
    for (const currentModel of modelsToTry) {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': appOrigin(referer),
          'X-Title': 'Kilo Voice Translator',
        },
        body: JSON.stringify(buildRequestBody(text, sourceLang, targetLang, currentModel, stream, style)),
        signal: controller.signal,
      });
      if (!response.ok) {
        let errorMessage = `API 請求失敗: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage += ` - ${errorData.error?.message || errorData.message || response.statusText}`;
        } catch {
          errorMessage += ` - ${response.statusText}`;
        }
        lastErrorMessage = errorMessage;
        lastStatus = response.status;
        const retryable =
          response.status === 429 ||
          errorMessage.includes('Provider returned error') ||
          errorMessage.includes('No endpoints found') ||
          errorMessage.includes('temporarily unavailable');
        if (retryable && currentModel !== modelsToTry[modelsToTry.length - 1]) continue;
        clearTimeout(timeoutId);
        return { error: errorMessage, status: response.status, model: currentModel };
      }
      clearTimeout(timeoutId);
      if (stream) return { stream: true, content: await handleSSEStream(response) };
      return { stream: false, data: await response.json() };
    }
    clearTimeout(timeoutId);
    return { error: lastErrorMessage, status: lastStatus };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Proxy an audio buffer to OpenRouter's transcription endpoint.
 * Accepts either server-side or user-supplied API keys.
 */
export async function transcribeWithOpenRouter({ audioBuffer, mimeType, model, language, apiKey, referer }) {
  if (model && !ASR_MODELS[model]) {
    return { error: `不支援的 ASR 模型: ${model}`, status: 400, allowedModels: Object.keys(ASR_MODELS) };
  }
  const key = apiKey || process.env.OPENROUTER_API_KEY;
  if (!key) return { error: 'OpenRouter API key not configured. 請設定伺服器端金鑰或輸入自己的金鑰。', status: 500 };
  const selectedModel = model || DEFAULT_ASR_MODEL;
  const format = audioFormatFromMime(mimeType);
  if (!format) {
    return {
      error: `不支援的音訊格式: ${mimeType || '未知'}。支援 wav / mp3 / flac / m4a / ogg / webm / aac。`,
      status: 400,
    };
  }
  const maxBytes = 25 * 1024 * 1024;
  if (!audioBuffer || audioBuffer.length === 0) return { error: '缺少音訊內容', status: 400 };
  if (audioBuffer.length > maxBytes) {
    return { error: `音訊過大: ${(audioBuffer.length / 1048576).toFixed(2)} MB > 25 MB`, status: 400 };
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);
  try {
    const body = {
      model: selectedModel,
      input_audio: { data: Buffer.from(audioBuffer).toString('base64'), format },
    };
    if (language) body.language = language;
    const response = await fetch(OPENROUTER_ASR_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': appOrigin(referer),
        'X-Title': 'Kilo Voice Translator',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData.error?.message || errorData.error || errorData.message || response.statusText;
      return { error: `語音辨識失敗 (${selectedModel}): ${msg}`, status: response.status };
    }
    const data = await response.json();
    if (!data.text) return { error: '語音辨識未返回文字結果', status: 502 };
    return {
      stream: false,
      data: {
        text: data.text,
        model: selectedModel,
        language: data.language,
        duration: data.duration,
        usage: data.usage,
      },
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') return { error: '語音辨識逾時（>90秒），請改用較短的錄音', status: 504 };
    throw error;
  }
}

function json(res, statusCode, payload, extraHeaders = {}) {
  res
    .status(statusCode)
    .set({ ...CORS_HEADERS, 'Content-Type': 'application/json', ...extraHeaders })
    .json(payload);
}

export function handleHealth(_req, res) {
  json(res, 200, {
    ok: true,
    service: 'kilo-voice-translator',
    time: new Date().toISOString(),
    asrModels: Object.keys(ASR_MODELS),
    hasOpenRouterKey: Boolean(process.env.OPENROUTER_API_KEY),
  });
}

async function runTranslate({ text, sourceLang, targetLang, model, stream, action, style, referer }) {
  if (action === 'getApiKey') {
    return {
      status: 200,
      payload: {
        openrouterApiKey: process.env.OPENROUTER_API_KEY || null,
      },
    };
  }
  if (!text || !sourceLang || !targetLang) {
    return { status: 400, payload: { error: 'Missing required parameters: text, sourceLang, targetLang' } };
  }
  const result = await translateWithOpenRouter(text, sourceLang, targetLang, model, stream, referer, style);
  if (result.error) return { status: result.status || 500, payload: { error: result.error } };
  if (result.stream) return { status: 200, raw: result.content, contentType: 'text/plain; charset=utf-8' };
  return { status: 200, payload: result.data };
}

/** Netlify-Function-shaped handler (kept for backwards compatibility). */
export async function translateHandler(event, res) {
  if (event.httpMethod === 'OPTIONS') {
    res.status(204).set(CORS_HEADERS).send('');
    return;
  }
  if (event.httpMethod !== 'POST') {
    json(res, 405, { error: 'Method not allowed' });
    return;
  }
  const clientIP = event.headers?.['x-forwarded-for'] || event.headers?.['client-ip'] || 'unknown';
  if (!checkRateLimit(clientIP)) {
    json(res, 429, { error: '請求頻率過高，請稍後再試 (Rate limit: 60 req/min)' });
    return;
  }
  try {
    const parsed = JSON.parse(event.body || '{}');
    const outcome = await runTranslate({ ...parsed, referer: event.headers?.referer });
    if (outcome.raw !== undefined) {
      res
        .status(outcome.status)
        .set({ ...CORS_HEADERS, 'Content-Type': outcome.contentType, 'Cache-Control': 'no-cache' })
        .send(outcome.raw);
      return;
    }
    json(res, outcome.status, outcome.payload);
  } catch (error) {
    console.error('Translate error:', error);
    json(res, 500, { error: `服務錯誤: ${error.message}`, details: error.message });
  }
}

export async function handleTranslate(req, res) {
  await translateHandler(
    {
      httpMethod: req.method,
      headers: req.headers,
      body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {}),
      isBase64Encoded: false,
    },
    res
  );
}

export async function handleTranscribe(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).set(CORS_HEADERS).send('');
    return;
  }
  if (req.method !== 'POST') {
    json(res, 405, { error: 'Method not allowed' });
    return;
  }
  const clientIP = req.headers?.['x-forwarded-for'] || req.ip || 'unknown';
  if (!checkRateLimit(`asr:${clientIP}`)) {
    json(res, 429, { error: '請求頻率過高，請稍後再試 (Rate limit: 60 req/min)' });
    return;
  }
  try {
    const file = req.file;
    if (!file || !file.buffer) {
      json(res, 400, { error: '缺少音訊檔案（欄位名稱 file）' });
      return;
    }
    const model = req.body?.model || DEFAULT_ASR_MODEL;
    if (!ASR_MODELS[model]) {
      json(res, 400, { error: `不支援的 ASR 模型: ${model}`, allowedModels: Object.keys(ASR_MODELS) });
      return;
    }
    const result = await transcribeWithOpenRouter({
      audioBuffer: file.buffer,
      mimeType: file.mimetype,
      model,
      language: req.body?.language || undefined,
      apiKey: req.body?.apiKey || req.headers['x-openrouter-key'] || undefined,
      referer: req.headers?.referer || req.headers?.origin,
    });
    if (result.error) {
      json(res, result.status || 500, { error: result.error });
      return;
    }
    json(res, 200, result.data);
  } catch (error) {
    console.error('Transcribe error:', error);
    json(res, 500, { error: `語音辨識錯誤: ${error.message}`, details: error.message });
  }
}
