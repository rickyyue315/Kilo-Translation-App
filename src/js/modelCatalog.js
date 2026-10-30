/**
 * Model catalogue — the single source of truth for every model ID the app ships.
 *
 * Verified against https://openrouter.ai/api/v1/models on 2026-10-19;
 * transcription models re-checked on 2026-10-30.
 * Re-verify at any time with:  npm run check:models
 *
 * Prices are USD per 1M tokens for chat models, and USD per hour of audio for
 * transcription models, exactly as OpenRouter publishes them on each model page.
 * `iq` is Artificial Analysis' intelligence index when OpenRouter exposes it;
 * null means the model has no published benchmark, not that it is weak.
 */

export const MODEL_TIERS = {
  value: '高性價比',
  top: '頂級模型',
  free: '免費選項',
};

export const MODEL_CATALOG = {
  // ── 高性價比：日常翻譯的主力 ──────────────────────────────
  'z-ai/glm-5.3-flash': {
    name: '智譜 GLM 5.3 Flash',
    tier: 'value',
    note: '每百萬 $0.0477/$0.0701，智力 41.8，1M 上下文；輸出已降到全場最低，同價位最高分，預設首選',
    input: 0.0477,
    output: 0.0701,
    context: 1048576,
    iq: 41.8,
  },
  'xiaomi/mimo-v2.6-flash': {
    name: 'Xiaomi MiMo V2.6 Flash',
    tier: 'value',
    note: '每百萬 $0.14/$0.28，智力 37.9，支援語音與影像輸入',
    input: 0.14,
    output: 0.28,
    context: 1050000,
    iq: 37.9,
  },
  'tencent/hy-mt2-30b-a3b': {
    name: 'Tencent Hy-MT2 30B',
    tier: 'value',
    note: '翻譯專用：33 語言對＋5 種中文方言，支援術語表；8K 上下文',
    input: 0.074,
    output: 0.295,
    context: 8192,
    iq: null,
  },
  'qwen/qwen3.7-flash': {
    name: 'Qwen 3.7 Flash',
    tier: 'value',
    note: '每百萬 $0.03/$0.13，全場最低單價，適合大量批次翻譯',
    input: 0.03,
    output: 0.13,
    context: 1000000,
    iq: null,
  },

  // ── 頂級：三步精譯與長文獻用 ──────────────────────────────
  'deepseek/deepseek-v4.1-flash-1017': {
    name: 'DeepSeek V4.1 Flash 1017',
    tier: 'top',
    note: '每百萬 $0.30/$1.20，離峰（含週末）半價 $0.15/$0.60；智力 45，1M 上下文；反思品質與 GLM 5.3 同級但輸出便宜 3 倍。支援 effort=none 關閉推理，但本 app 尚未接此參數，實際會以預設 high 跑',
    input: 0.3,
    output: 1.2,
    context: 1048576,
    iq: 45,
  },
  'z-ai/glm-5.3': {
    name: '智譜 GLM 5.3',
    tier: 'top',
    note: '每百萬 $0.08/$3.60，智力 44.8；反思品質最好，但輸出單價已漲到 Flash 的 51 倍，只值得用在長文精譯',
    input: 0.08,
    output: 3.6,
    context: 1048576,
    iq: 44.8,
  },
  'xiaomi/mimo-v2.6-pro': {
    name: 'Xiaomi MiMo V2.6 Pro',
    tier: 'top',
    note: '每百萬 $0.435/$0.87，智力 46.3；本清單最高性價比旗艦',
    input: 0.435,
    output: 0.87,
    context: 1050000,
    iq: 46.3,
  },
  'tencent/hy4-preview': {
    name: 'Tencent Hy4 Preview',
    tier: 'top',
    note: '每百萬 $0.834/$2.501，1M 上下文旗艦，長文與專業領域',
    input: 0.834,
    output: 2.501,
    context: 1048576,
    iq: null,
  },
  'tencent/hy3': {
    name: 'Tencent Hy3',
    tier: 'top',
    note: '每百萬 $0.132/$0.528，262K 上下文，中英互譯穩健',
    input: 0.132,
    output: 0.528,
    context: 262144,
    iq: null,
  },
  'qwen/qwen3.8-flash': {
    name: 'Qwen 3.8 Flash',
    tier: 'top',
    note: '每百萬 $0.15/$0.47，1M 上下文，圖表與文件理解強',
    input: 0.15,
    output: 0.47,
    context: 1000000,
    iq: null,
  },

  // ── 免費：零成本備援，品質明顯低於付費層 ──────────────────
  // 注意：thinkingmachines/inkling 系列與 google/gemma-4-31b-it 雖然標示 free，
  // 但實際調用會回 403「only available on agentic harnesses」，一般應用無法使用，
  // 2026-10-19 實測後移除，勿再加回。
  // nvidia/nemotron-3-super-120b-a12b:free 於 2026-10-30 從 /api/v1/models 消失
  // （endpoints 仍回 200，但已不在公開目錄），依「下架即移除」規則剔除。
  'nvidia/nemotron-3-ultra-550b-a55b:free': {
    name: 'NVIDIA Nemotron 3 Ultra',
    tier: 'free',
    note: '免費，智力 22.9，550B MoE；實測最穩，免費層首選',
    input: 0,
    output: 0,
    context: 1000000,
    iq: 22.9,
  },
  'google/gemma-4-26b-a4b-it:free': {
    name: 'Gemma 4 26B A4B',
    tier: 'free',
    note: '免費，262K 上下文，智力 16.7；回應最快（約 2 秒）但供應不穩，列備援',
    input: 0,
    output: 0,
    context: 262144,
    iq: 16.7,
  },
  'nvidia/nemotron-3.5-super-vl:free': {
    name: 'NVIDIA Nemotron 3.5 Super VL',
    tier: 'free',
    note: '免費，智力 26.5，1M 上下文，2026-10 最新；實測可用',
    input: 0,
    output: 0,
    context: 1000000,
    iq: 26.5,
  },
  'dots-studio/dots-3-note-preview:free': {
    name: 'Dots3 Note Preview',
    tier: 'free',
    note: '免費，512K 上下文，280B MoE',
    input: 0,
    output: 0,
    context: 512000,
    iq: null,
  },

};

/** Display order = fallback order for the server key. */
export const MODEL_ORDER = {
  value: ['z-ai/glm-5.3-flash', 'xiaomi/mimo-v2.6-flash', 'tencent/hy-mt2-30b-a3b', 'qwen/qwen3.7-flash'],
  top: ['xiaomi/mimo-v2.6-pro', 'deepseek/deepseek-v4.1-flash-1017', 'z-ai/glm-5.3', 'tencent/hy4-preview', 'tencent/hy3', 'qwen/qwen3.8-flash'],
  free: [
    'nvidia/nemotron-3-ultra-550b-a55b:free',
    'nvidia/nemotron-3.5-super-vl:free',
    'google/gemma-4-26b-a4b-it:free',
    'dots-studio/dots-3-note-preview:free',
  ],
};

/** Free models, in fallback order. Used by the server-key path. */
export const FREE_MODELS = MODEL_ORDER.free;

/**
 * Paid models the server key may spend on, only when ALLOW_PAID_MODELS=1.
 * Deliberately short: cheap, verified, and good at translation.
 * DeepSeek V4.1 Flash 1017 earns its slot as the reflection model for the
 * three-pass pipeline: same intelligence as GLM 5.3 but a third of the
 * output price, and it can run with reasoning off.
 */
export const SERVER_PAID_MODELS = [
  'z-ai/glm-5.3-flash',
  'tencent/hy-mt2-30b-a3b',
  'deepseek/deepseek-v4.1-flash-1017',
  'z-ai/glm-5.3',
];

/** Default model for user-key mode when nothing is saved. */
export const DEFAULT_MODEL = 'z-ai/glm-5.3-flash';

// ── Speech to text ────────────────────────────────────────
// Prices are USD per hour of audio (OpenRouter bills per second; ×3600 here).
// All eight verified live on 2026-10-30 against
// https://openrouter.ai/api/v1/models?output_modalities=transcription

export const ASR_MODELS = {
  'microsoft/mai-transcribe-2': {
    name: 'MAI-Transcribe 2',
    vendor: 'Microsoft',
    pricePerHour: 0.1,
    description: 'FLEURS 多語言第 1，60 語言＋語碼混合，$0.10/小時；預設首選',
    descriptionEn: 'No.1 on FLEURS multilingual, 60 languages with code-switching, $0.10/hour',
  },
  'nvidia/nemotron-3.5-transcribe': {
    name: 'Nemotron 3.5 Transcribe',
    vendor: 'NVIDIA',
    pricePerHour: 0.12,
    description: '30B MoE，40 語言、單段最長 1 小時，支援說話人分離與詞彙／風格提示，$0.12/小時；2026-10 新模型，長對話與術語密集場景首選',
    descriptionEn: '30B MoE, 40 languages, up to 1 hour per clip, speaker attribution plus vocabulary and style prompts, $0.12/hour',
  },
  'assemblyai/universal-3-6-pro': {
    name: 'Universal-3.6 Pro',
    vendor: 'AssemblyAI',
    pricePerHour: 0.3,
    description: '短句對話錯誤率比 3.5 Pro 再低 30%，詞級時間戳，$0.30/小時；逐句翻譯最準',
    descriptionEn: '30% fewer errors than 3.5 Pro on short conversational speech, word-level timestamps, $0.30/hour',
  },
  'elevenlabs/scribe-v2': {
    name: 'Scribe v2',
    vendor: 'ElevenLabs',
    pricePerHour: 0.22,
    description: '90+ 語言，詞級時間戳、可選說話人分離與音訊事件標註，$0.22/小時；語種覆蓋最廣',
    descriptionEn: '90+ languages with word-level timestamps, optional speaker diarization and audio-event tagging, $0.22/hour',
  },
  'mistralai/voxtral-small-transcribe-3-0': {
    name: 'Voxtral Small Transcribe 3',
    vendor: 'Mistral',
    pricePerHour: 0.2412,
    description: '旗艦 STT，時間戳＋說話人分離＋領域詞彙偏置，$0.24/小時；會議與訪談逐字稿',
    descriptionEn: 'Flagship STT with timestamps, speaker diarization and context biasing, $0.24/hour — meetings and interviews',
  },
  'nvidia/nemotron-3.5-asr-streaming-multilingual-0.6b': {
    name: 'Nemotron 3.5 ASR Streaming 0.6B',
    vendor: 'NVIDIA',
    pricePerHour: 0.0108,
    description: '40+ 語言串流辨識，$0.011/小時；延遲最低、成本最低',
    descriptionEn: '40+ languages, streaming, $0.012/hour — lowest latency and cost',
  },
  'qwen/qwen3-asr-1.7b': {
    name: 'Qwen3 ASR 1.7B',
    vendor: 'Qwen',
    pricePerHour: 0.0288,
    description: '30 語言＋22 種中文方言，$0.029/小時；中文口音最穩',
    descriptionEn: '30 languages plus 22 Chinese dialects, $0.027/hour',
  },
  'mistralai/voxtral-mini-transcribe': {
    name: 'Voxtral Mini Transcribe',
    vendor: 'Mistral',
    pricePerHour: 0.18,
    description: '會議與播客轉寫，16K 上下文，$0.18/小時',
    descriptionEn: 'Meetings and podcasts, 16K context, $0.18/hour',
  },
};

/** Cheapest accurate default; override with DEFAULT_ASR_MODEL env if needed. */
export const DEFAULT_ASR_MODEL = 'microsoft/mai-transcribe-2';
