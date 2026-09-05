/**
 * Kilo Translation App - Serverless Translation & ASR Function
 * v3.0.0 - Rewritten with:
 *   - Native fetch (Node 20+, no node-fetch dependency)
 *   - JWT caching (1h TTL with 5-min safety margin)
 *   - Unified SSE stream handler (merged duplicate handlers)
 *   - Consistent max_tokens (2000)
 *   - Simple in-memory rate limiting (30 req/min per IP)
 *   - Synced free models list with frontend
 */

const jwt = require('jsonwebtoken');

// ─── Constants ───────────────────────────────────────────────────────────────

const languageMap = {
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

/** Synced with frontend src/js/models.js — only these models allowed via server key */
const freeModels = [
  'nvidia/nemotron-3-super-120b-a12b:free',
  'google/gemma-4-26b-a4b-it:free',
  'google/gemma-4-31b-it:free',
  'z-ai/glm-4.5-air:free',
  'openai/gpt-oss-120b:free',
  'qwen/qwen3-coder:free',
];

const bigModelModels = [
  'glm-5.1',
  'glm-4.7-flashx',
  'glm-4.7',
  'glm-4.5-air',
  'glm-4.7-flash',
];

const translationStylePrompts = {
  normal: '',
  natural: '翻譯風格要求：讓文句更自然流暢，使用地道的表達方式，避免生硬的直譯，讓讀者感覺像是母語人士的表達。',
  formal: '翻譯風格要求：採用正式的商務用語，使用適當的敬語和專業術語，保持嚴謹的語氣，適合商務場合。',
  simple: '翻譯風格要求：風格要淺白易懂，像在跟小朋友解釋一樣，使用簡單的詞彙和短句，避免複雜的語法結構，讓任何人都能輕鬆理解。',
  academic: '翻譯風格要求：風格要適合學術人士，使用專業術語和學術表達，保持客觀、嚴謹的語氣，適合學術或專業領域的交流。',
};

const targetLanguageChecks = {
  'ja-JP': /[\u3040-\u30FF]/,
  'ko-KR': /[\uAC00-\uD7AF]/,
  'zh-TW': /[\u4E00-\u9FFF]/,
  'zh-CN': /[\u4E00-\u9FFF]/,
  'en-US': /[A-Za-z]/,
  'fr-FR': /[A-Za-z]/,
  'es-ES': /[A-Za-z]/,
  'de-DE': /[A-Za-z]/,
  'it-IT': /[A-Za-z]/,
  'pt-BR': /[A-Za-z]/,
  'ru-RU': /[\u0400-\u04FF]/,
};

// ─── JWT Cache ───────────────────────────────────────────────────────────────

let cachedJWT = null;
let cachedJWTExpiry = 0;

function generateBigModelJWT(apiKey) {
  const now = Date.now();
  // Return cached token if still valid (with 5-minute safety margin)
  if (cachedJWT && cachedJWTExpiry > now + 300000) {
    return cachedJWT;
  }

  const [id, secret] = apiKey.split('.');
  if (!id || !secret) {
    throw new Error('Invalid API Key format. Expected format: id.secret');
  }

  const expiry = now + 3600000; // 1 hour
  const payload = {
    api_key: id,
    exp: expiry,
    timestamp: now,
  };

  cachedJWT = jwt.sign(payload, secret, { algorithm: 'HS256' });
  cachedJWTExpiry = expiry;
  return cachedJWT;
}

// ─── Rate Limiting ───────────────────────────────────────────────────────────

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 30;       // 30 requests per minute per IP

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { windowStart: now, count: 1 });
    return true;
  }

  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW * 2) {
      rateLimitMap.delete(ip);
    }
  }
}, 300000);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isLikelyTargetLanguage(text, targetLang) {
  if (!text) return false;
  const checker = targetLanguageChecks[targetLang];
  if (!checker) return true;
  return checker.test(text);
}

function buildStrictLanguageRule(targetLang) {
  const targetName = languageMap[targetLang] || targetLang;
  return `嚴格規則：輸出必須為${targetName}，不得混入其他語言或說明。`;
}

function generateSystemPrompt(sourceLang, targetLang, style = 'normal', strict = false) {
  const stylePrompt = translationStylePrompts[style] || '';
  const strictRule = strict ? `\n\n${buildStrictLanguageRule(targetLang)}` : '';

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
- 翻譯成英文時：請確保輸出的是正確的英文${strictRule}`;
}

function buildRequestBody(text, sourceLang, targetLang, model, stream, style, strict) {
  return {
    model,
    messages: [
      { role: 'system', content: generateSystemPrompt(sourceLang, targetLang, style, strict) },
      { role: 'user', content: text },
    ],
    stream: stream || false,
    temperature: 0.3,
    max_tokens: 2000,
  };
}

/**
 * Unified SSE stream handler
 * Replaces the formerly-duplicate handleBigModelStream + handleOpenRouterStream
 */
async function handleSSEStream(response) {
  if (!response.body) {
    throw new Error('伺服器未返回流式數據');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result = '';

  while (true) {
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
          if (content) {
            result += content;
          }
        } catch {
          // Skip malformed JSON lines
        }
      }
    }
  }

  return result;
}

// ─── CORS Headers ────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ─── Main Handler ────────────────────────────────────────────────────────────

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Rate limiting
  const clientIP = event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown';
  if (!checkRateLimit(clientIP)) {
    return {
      statusCode: 429,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: '請求頻率過高，請稍後再試 (Rate limit: 30 req/min)' }),
    };
  }

  try {
    const contentType = event.headers['content-type'] || '';

    // ASR request (multipart/form-data)
    if (contentType.includes('multipart/form-data')) {
      return await handleAudioTranscription(event);
    }

    // Translation request (JSON)
    const { text, sourceLang, targetLang, model, stream, service, action, style } = JSON.parse(event.body);

    // API key request
    if (action === 'getApiKey') {
      return {
        statusCode: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          openrouterApiKey: process.env.OPENROUTER_API_KEY || null,
          bigmodelApiKey: process.env.BIGMODEL_API_KEY || null,
        }),
      };
    }

    // Validate required params
    if (!text || !sourceLang || !targetLang) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Missing required parameters: text, sourceLang, targetLang' }),
      };
    }

    // Route to appropriate service
    const translationService = service || 'openrouter';
    if (translationService === 'bigmodel') {
      return await translateWithBigModel(text, sourceLang, targetLang, model, stream, style);
    } else {
      return await translateWithOpenRouter(text, sourceLang, targetLang, model, stream, event, style);
    }
  } catch (error) {
    console.error('Function error:', error);

    let errorMessage = '服務錯誤: ';
    if (error.name === 'AbortError') {
      errorMessage += '請求超時';
    } else if (error.message?.includes('fetch')) {
      errorMessage += '網路連線錯誤';
    } else {
      errorMessage += error.message;
    }

    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: errorMessage, details: error.message }),
    };
  }
};

// ─── BigModel Translation ────────────────────────────────────────────────────

async function translateWithBigModel(text, sourceLang, targetLang, model, stream, style = 'normal') {
  const API_KEY = process.env.BIGMODEL_API_KEY;
  if (!API_KEY) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'BigModel API key not configured on server' }),
    };
  }

  const jwtToken = generateBigModelJWT(API_KEY);
  const selectedModel = model || 'glm-4.5-air';

  if (!bigModelModels.includes(selectedModel)) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: `不支持的 BigModel 模型: ${selectedModel}`,
        allowedModels: bigModelModels,
      }),
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const requestBody = buildRequestBody(text, sourceLang, targetLang, selectedModel, stream, style, false);

    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwtToken}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        statusCode: response.status,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: errorData.message || `BigModel API 錯誤: ${response.status}`,
          status: response.status,
        }),
      };
    }

    if (stream) {
      let content = await handleSSEStream(response);

      // Language verification retry
      if (!isLikelyTargetLanguage(content, targetLang)) {
        const retried = await retryWithStrictPrompt(text, sourceLang, targetLang, selectedModel, style, jwtToken, 'bigmodel');
        if (retried) content = retried;
      }

      return {
        statusCode: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
        body: content,
      };
    } else {
      const data = await response.json();
      let content = data.choices?.[0]?.message?.content;

      if (content && !isLikelyTargetLanguage(content, targetLang)) {
        const retried = await retryWithStrictPrompt(text, sourceLang, targetLang, selectedModel, style, jwtToken, 'bigmodel');
        if (retried) content = retried;
      }

      return {
        statusCode: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ choices: [{ message: { content } }] }),
      };
    }
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ─── OpenRouter Translation ──────────────────────────────────────────────────

async function translateWithOpenRouter(text, sourceLang, targetLang, model, stream, event, style = 'normal') {
  const API_KEY = process.env.OPENROUTER_API_KEY;
  if (!API_KEY) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'OpenRouter API key not configured on server' }),
    };
  }

  const selectedModel = model || 'nvidia/nemotron-3-super-120b-a12b:free';

  if (!freeModels.includes(selectedModel)) {
    return {
      statusCode: 403,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: '伺服器 API 金鑰只支援免費模型。請選擇免費選項中的模型，或切換到使用自己的 API 金鑰以存取所有模型。',
        allowedModels: freeModels,
      }),
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const modelsToTry = [selectedModel, ...freeModels.filter((item) => item !== selectedModel)];
    let lastErrorMessage = '所有可用的免費模型暫時不可用，請稍後再試';
    let lastStatus = 503;

    for (const currentModel of modelsToTry) {
      const requestBody = buildRequestBody(text, sourceLang, targetLang, currentModel, stream, style, false);

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': event.headers?.referer || 'https://kilo-translator.netlify.app',
          'X-Title': 'Kilo Voice Translator',
        },
        body: JSON.stringify(requestBody),
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

        const isRetryableModelError =
          response.status === 429 ||
          errorMessage.includes('Provider returned error') ||
          errorMessage.includes('No endpoints found') ||
          errorMessage.includes('temporarily unavailable');

        if (isRetryableModelError && currentModel !== modelsToTry[modelsToTry.length - 1]) {
          console.warn(`OpenRouter model unavailable, trying fallback model: ${currentModel}`);
          continue;
        }

        clearTimeout(timeoutId);
        return {
          statusCode: response.status,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: errorMessage, status: response.status, model: currentModel }),
        };
      }

      clearTimeout(timeoutId);

      if (stream) {
        const content = await handleSSEStream(response);
        return {
          statusCode: 200,
          headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
          body: content,
        };
      }

      const data = await response.json();
      return {
        statusCode: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      };
    }

    clearTimeout(timeoutId);
    return {
      statusCode: lastStatus,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: lastErrorMessage, status: lastStatus }),
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ─── Retry with Strict Prompt ────────────────────────────────────────────────

async function retryWithStrictPrompt(text, sourceLang, targetLang, model, style, jwtToken, service) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const retryBody = buildRequestBody(text, sourceLang, targetLang, model, false, style, true);

    const url = service === 'bigmodel'
      ? 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
      : 'https://openrouter.ai/api/v1/chat/completions';

    const headers = service === 'bigmodel'
      ? { 'Content-Type': 'application/json', Authorization: `Bearer ${jwtToken}` }
      : { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(retryBody),
      signal: controller.signal,
    });

    if (response.ok) {
      const data = await response.json();
      return data.choices?.[0]?.message?.content || null;
    }
  } catch {
    // Retry failed silently — original content will be used
  } finally {
    clearTimeout(timeoutId);
  }

  return null;
}

// ─── Audio Transcription (ASR) ───────────────────────────────────────────────

async function handleAudioTranscription(event) {
  const API_KEY = process.env.BIGMODEL_API_KEY;
  if (!API_KEY) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'BigModel API key not configured on server' }),
    };
  }

  try {
    const busboy = require('busboy');
    const bb = busboy({ headers: event.headers });

    let audioBuffer = null;
    let mimeType = null;
    let prompt = null;
    let hotwords = null;
    let streamFlag = false;

    // Parse incoming multipart form data
    await new Promise((resolve, reject) => {
      bb.on('file', (fieldname, file, info) => {
        const chunks = [];
        file.on('data', (data) => chunks.push(data));
        file.on('end', () => {
          audioBuffer = Buffer.concat(chunks);
          mimeType = info.mimeType || 'audio/wav';
        });
      });

      bb.on('field', (fieldname, val) => {
        if (fieldname === 'prompt') prompt = val;
        else if (fieldname === 'hotwords') {
          try { hotwords = JSON.parse(val); } catch { hotwords = [val]; }
        } else if (fieldname === 'stream') {
          streamFlag = val === 'true';
        }
      });

      bb.on('close', resolve);
      bb.on('error', reject);

      if (event.isBase64Encoded) {
        bb.write(Buffer.from(event.body, 'base64'));
      } else {
        bb.write(event.body);
      }
      bb.end();
    });

    if (!audioBuffer || !mimeType) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: '缺少音頻文件' }),
      };
    }

    // Validate audio format
    const supportedFormats = ['audio/wav', 'audio/mpeg', 'audio/mp3'];
    if (!supportedFormats.includes(mimeType)) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: `不支持的音頻格式: ${mimeType}。支持的格式: ${supportedFormats.join(', ')}`,
        }),
      };
    }

    // Validate file size (25 MB max)
    const maxFileSize = 25 * 1024 * 1024;
    if (audioBuffer.length > maxFileSize) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: `音頻文件過大: ${(audioBuffer.length / (1024 * 1024)).toFixed(2)} MB > 25 MB 限制`,
        }),
      };
    }

    const jwtToken = generateBigModelJWT(API_KEY);

    // Build outgoing multipart form data using native FormData + Blob (Node 20+)
    const formData = new FormData();
    formData.append('file', new Blob([audioBuffer], { type: mimeType }), 'audio.wav');
    formData.append('model', 'glm-asr-2512');
    formData.append('stream', streamFlag ? 'true' : 'false');
    if (prompt) formData.append('prompt', prompt);
    if (hotwords && Array.isArray(hotwords)) {
      formData.append('hotwords', JSON.stringify(hotwords));
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwtToken}` },
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        statusCode: response.status,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: errorData.message || `ASR API 錯誤: ${response.status}`,
          status: response.status,
        }),
      };
    }

    // Handle ASR response
    if (streamFlag) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data:')) continue;
          const data = trimmedLine.slice(5).trim();
          if (data === '[DONE]') continue;

          try {
            const evt = JSON.parse(data);
            if (evt.type === 'transcript.text.delta' && evt.delta) {
              fullText += evt.delta;
            }
          } catch {
            // Skip malformed lines
          }
        }
      }

      return {
        statusCode: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fullText, model: 'glm-asr-2512', stream: true }),
      };
    } else {
      const data = await response.json();
      return {
        statusCode: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: data.id,
          created: data.created,
          model: data.model,
          text: data.text,
        }),
      };
    }
  } catch (error) {
    console.error('Audio transcription error:', error);

    let errorMessage = '語音識別錯誤: ';
    if (error.name === 'AbortError') {
      errorMessage += '請求超時（>60秒）';
    } else if (error.message?.includes('fetch')) {
      errorMessage += '網路連線錯誤';
    } else {
      errorMessage += error.message;
    }

    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: errorMessage, details: error.message }),
    };
  }
}
