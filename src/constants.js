/**
 * 常量和枚舉定義
 * 統一管理所有常量、枚舉和配置值
 */

// ========== 語言配置 ==========

/**
 * 支援的語言映射
 */
export const LANGUAGES = {
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
  'ar-SA': 'العربية',
  'th-TH': 'ไทย',
  'vi-VN': 'Tiếng Việt'
};

/**
 * 語言代碼列表
 */
export const LANGUAGE_CODES = Object.keys(LANGUAGES);

// ========== 翻譯服務配置 ==========

/**
 * 翻譯服務類型
 */
export const TRANSLATION_SERVICES = {
  OPENROUTER: 'openrouter',
  BIGMODEL: 'bigmodel'
};

/**
 * OpenRouter API 配置
 */
export const OPENROUTER_CONFIG = {
  API_URL: 'https://openrouter.ai/api/v1/chat/completions',
  DEFAULT_MODEL: 'google/gemini-3.1-flash-lite',
};

/**
 * BigModel API 配置
 */
export const BIGMODEL_CONFIG = {
  API_URL: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
  DEFAULT_MODEL: 'glm-4.5-air',
  MODELS: {
    'glm-5.1': {
      name: 'GLM-5.1',
      description: '新一代旗艦模型，適合高品質翻譯',
      category: '旗艦',
      maxTokens: 128000,
      contextWindow: 128000,
      inputPrice: 0.001,
      outputPrice: 0.001,
      features: ['streaming', 'function-calling']
    },
    'glm-4.7-flashx': {
      name: 'GLM-4.7 FlashX',
      description: '極速響應版本，適合高頻即時翻譯',
      category: '極速',
      maxTokens: 128000,
      contextWindow: 128000,
      inputPrice: 0.0002,
      outputPrice: 0.0002,
      features: ['streaming', 'function-calling']
    },
    'glm-4.7': {
      name: 'GLM-4.7',
      description: '高品質版本，翻譯準確度穩定',
      category: '高品質',
      maxTokens: 128000,
      contextWindow: 128000,
      inputPrice: 0.0005,
      outputPrice: 0.0005,
      features: ['streaming', 'function-calling', 'vision']
    },
    'glm-4.5-air': {
      name: 'GLM-4.5 Air',
      description: '輕量低成本版本，適合日常使用',
      category: '輕量級',
      maxTokens: 128000,
      contextWindow: 128000,
      inputPrice: 0.00015,
      outputPrice: 0.00015,
      features: ['streaming']
    },
    'glm-4.7-flash': {
      name: 'GLM-4.7 Flash',
      description: '速度與品質平衡，適合即時翻譯',
      category: '推薦',
      maxTokens: 128000,
      contextWindow: 128000,
      inputPrice: 0.00025,
      outputPrice: 0.00025,
      features: ['streaming', 'function-calling']
    }
  },
  // ========== 語音識別（ASR）配置 ==========
  ASR_API_URL: 'https://open.bigmodel.cn/api/paas/v4/audio/transcriptions',
  ASR_MODEL: 'glm-asr-2512',
  ASR_MODELS: {
    'glm-asr-2512': {
      name: 'GLM-ASR-2512',
      description: '新一代語音識別模型，支持實時轉錄高質量文字',
      category: '語音識別',
      maxAudioDuration: 30, // 秒
      maxFileSize: 25 * 1024 * 1024, // 25 MB
      supportedFormats: ['audio/wav', 'audio/mpeg', 'audio/mp3'],
      features: ['streaming', 'multilingual', 'hotwords', 'context'],
      languages: [
        'zh-CN', // 中文（普通話、方言）
        'en-US', // 英文（多口音）
        'ja-JP', // 日文
        'ko-KR', // 韓文
        'fr-FR', // 法文
        'de-DE', // 德文
        'es-ES', // 西班牙文
        'ar-SA', // 阿拉伯文
        'pt-BR', // 葡萄牙文
        'ru-RU'  // 俄文
      ],
      characterErrorRate: '0.0717', // 字符錯誤率
      supportedDialects: {
        'zh-CN': ['普通話', '四川話', '粵語', '閩南語', '吳語']
      },
      recommendations: [
        '實時會議紀要',
        '客服質檢與工單處理',
        '視頻直播字幕',
        '辦公文檔輸入',
        '多語言溝通與翻譯',
        '醫療病歷錄入'
      ]
    }
  }
};

/**
 * BigModel 錯誤代碼
 */
export const BIGMODEL_ERROR_CODES = {
  INVALID_API_KEY: 'invalid_api_key',
  RATE_LIMIT: 'rate_limit_exceeded',
  QUOTA_EXCEEDED: 'quota_exceeded',
  INVALID_REQUEST: 'invalid_request',
  SERVER_ERROR: 'server_error'
};

/**
 * BigModel 錯誤訊息映射
 */
export const BIGMODEL_ERROR_MESSAGES = {
  invalid_api_key: {
    'zh-TW': 'API 金鑰無效',
    'en-US': 'Invalid API key',
    'ja-JP': 'APIキーが無効です',
    'ko-KR': 'API 키가 유효하지 않습니다'
  },
  rate_limit_exceeded: {
    'zh-TW': '請求過於頻繁，請稍後再試',
    'en-US': 'Rate limit exceeded, please try again later',
    'ja-JP': 'リクエストが頻繁すぎます。後でもう一度お試しください',
    'ko-KR': '요청이 너무 빈번합니다. 나중에 다시 시도해 주세요'
  },
  quota_exceeded: {
    'zh-TW': '配額已用完',
    'en-US': 'Quota exceeded',
    'ja-JP': 'クォータを超過しました',
    'ko-KR': '할당량을 초과했습니다'
  },
  invalid_request: {
    'zh-TW': '請求格式錯誤',
    'en-US': 'Invalid request',
    'ja-JP': '無効なリクエスト',
    'ko-KR': '잘못된 요청'
  },
  server_error: {
    'zh-TW': '伺服器錯誤，請稍後再試',
    'en-US': 'Server error, please try again later',
    'ja-JP': 'サーバーエラーです。後でもう一度お試しください',
    'ko-KR': '서버 오류입니다. 나중에 다시 시도해 주세요'
  }
};

// ========== 錯誤代碼 ==========

/**
 * 錯誤代碼枚舉
 */
export const ERROR_CODES = {
  NETWORK: 'NETWORK_ERROR',
  PERMISSION: 'PERMISSION_ERROR',
  API: 'API_ERROR',
  SPEECH_RECOGNITION: 'SPEECH_RECOGNITION_ERROR',
  SPEECH_SYNTHESIS: 'SPEECH_SYNTHESIS_ERROR',
  HARDWARE: 'HARDWARE_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  TIMEOUT: 'TIMEOUT_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR'
};

/**
 * 多語言錯誤訊息
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: {
    'zh-TW': '網路連線錯誤，請檢查您的網路連接',
    'en-US': 'Network error, please check your internet connection',
    'ja-JP': 'ネットワークエラーです。インターネット接続を確認してください',
    'ko-KR': '네트워크 오류입니다. 인터넷 연결을 확인해 주세요'
  },
  PERMISSION_ERROR: {
    'zh-TW': '權限錯誤，請允許麥克風存取權限',
    'en-US': 'Permission error, please allow microphone access',
    'ja-JP': '権限エラーです。マイクへのアクセスを許可してください',
    'ko-KR': '권한 오류입니다. 마이크 액세스를 허용해 주세요'
  },
  API_ERROR: {
    'zh-TW': 'API 請求錯誤，請稍後再試',
    'en-US': 'API request error, please try again later',
    'ja-JP': 'APIリクエストエラーです。後でもう一度お試しください',
    'ko-KR': 'API 요청 오류입니다. 나중에 다시 시도해 주세요'
  },
  SPEECH_RECOGNITION_ERROR: {
    'zh-TW': '語音辨識錯誤，請再試一次',
    'en-US': 'Speech recognition error, please try again',
    'ja-JP': '音声認識エラーです。もう一度お試しください',
    'ko-KR': '음성 인식 오류입니다. 다시 시도해 주세요'
  },
  SPEECH_SYNTHESIS_ERROR: {
    'zh-TW': '語音合成錯誤，請再試一次',
    'en-US': 'Speech synthesis error, please try again',
    'ja-JP': '音声合成エラーです。もう一度お試しください',
    'ko-KR': '음성 합성 오류입니다. 다시 시도해 주세요'
  },
  HARDWARE_ERROR: {
    'zh-TW': '硬體錯誤，請檢查您的設備',
    'en-US': 'Hardware error, please check your device',
    'ja-JP': 'ハードウェアエラーです。デバイスを確認してください',
    'ko-KR': '하드웨어 오류입니다. 장치를 확인해 주세요'
  },
  VALIDATION_ERROR: {
    'zh-TW': '輸入驗證錯誤，請檢查您的輸入',
    'en-US': 'Input validation error, please check your input',
    'ja-JP': '入力検証エラーです。入力を確認してください',
    'ko-KR': '입력 검증 오류입니다. 입력을 확인해 주세요'
  },
  TIMEOUT_ERROR: {
    'zh-TW': '請求超時，請稍後再試',
    'en-US': 'Request timeout, please try again later',
    'ja-JP': 'リクエストタイムアウトです。後でもう一度お試しください',
    'ko-KR': '요청 시간 초과입니다. 나중에 다시 시도해 주세요'
  },
  UNKNOWN_ERROR: {
    'zh-TW': '未知錯誤，請稍後再試',
    'en-US': 'Unknown error, please try again later',
    'ja-JP': '未知のエラーです。後でもう一度お試しください',
    'ko-KR': '알 수 없는 오류입니다. 나중에 다시 시도해 주세요'
  }
};

// ========== 存儲鍵名 ==========

/**
 * LocalStorage 鍵名常量
 */
export const STORAGE_KEYS = {
  API_KEY: 'kilo_api_key',
  API_KEY_SOURCE: 'kilo_api_key_source',
  SELECTED_MODEL: 'kilo_selected_model',
  SOURCE_LANGUAGE: 'kilo_source_language',
  TARGET_LANGUAGE: 'kilo_target_language',
  TRANSLATION_MODE: 'kilo_translation_mode',
  INPUT_MODE: 'kilo_input_mode',
  THEME: 'kilo_theme',
  AUTO_SPEAK: 'kilo_auto_speak',
  STREAM_MODE: 'kilo_stream_mode',
  TRANSLATION_SERVICE: 'kilo_translation_service',
  BIGMODEL_API_KEY: 'kilo_bigmodel_api_key',
  BIGMODEL_MODEL: 'kilo_bigmodel_model'
};

// ========== API 金鑰來源 ==========

/**
 * API 金鑰來源枚舉
 */
export const API_KEY_SOURCES = {
  CLIENT: 'client',
  SERVER: 'server'
};

// ========== 翻譯模式 ==========

/**
 * 翻譯模式枚舉
 */
export const TRANSLATION_MODES = {
  CONVERSATION: 'conversation',
  DOCUMENT: 'document',
  REALTIME: 'realtime'
};

/**
 * 翻譯模式類型
 */
export const TRANSLATION_MODE_TYPES = {
  CONVERSATION: {
    name: '對話翻譯',
    description: '適合日常對話翻譯',
    icon: '💬'
  },
  DOCUMENT: {
    name: '文檔翻譯',
    description: '適合較長文本翻譯',
    icon: '📄'
  },
  REALTIME: {
    name: '實時翻譯',
    description: '即時語音翻譯',
    icon: '🎙️'
  }
};

// ========== 翻譯風格 ==========

/**
 * 翻譯風格枚舉
 */
export const TRANSLATION_STYLES = {
  NORMAL: 'normal',
  NATURAL: 'natural',
  FORMAL: 'formal',
  SIMPLE: 'simple',
  ACADEMIC: 'academic'
};

/**
 * 翻譯風格類型
 */
export const TRANSLATION_STYLE_TYPES = {
  NORMAL: {
    name: '標準翻譯',
    description: '準確翻譯，保持原文語氣和含義',
    icon: '📝'
  },
  NATURAL: {
    name: '自然流暢',
    description: '讓文句更自然流暢，符合日常表達',
    icon: '💬'
  },
  FORMAL: {
    name: '正式商務',
    description: '採用正式的商務用語和敬語',
    icon: '💼'
  },
  SIMPLE: {
    name: '淺白易懂',
    description: '風格淺白，像在跟小朋友解釋一樣',
    icon: '👶'
  },
  ACADEMIC: {
    name: '學術專業',
    description: '風格適合學術人士，使用專業術語',
    icon: '🎓'
  }
};

/**
 * 翻譯風格提示詞指令
 */
export const TRANSLATION_STYLE_PROMPTS = {
  normal: '',
  natural: '翻譯風格要求：讓文句更自然流暢，使用地道的表達方式，避免生硬的直譯，讓讀者感覺像是母語人士的表達。',
  formal: '翻譯風格要求：採用正式的商務用語，使用適當的敬語和專業術語，保持嚴謹的語氣，適合商務場合。',
  simple: '翻譯風格要求：風格要淺白易懂，像在跟小朋友解釋一樣，使用簡單的詞彙和短句，避免複雜的語法結構，讓任何人都能輕鬆理解。',
  academic: '翻譯風格要求：風格要適合學術人士，使用專業術語和學術表達，保持客觀、嚴謹的語氣，適合學術或專業領域的交流。'
};

// ========== 輸入模式 ==========

/**
 * 輸入模式枚舉
 */
export const INPUT_MODES = {
  VOICE: 'voice',
  TEXT: 'text'
};

// ========== 主題 ==========

/**
 * 主題選項枚舉
 */
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto'
};

// ========== 免費模型列表 ==========

/**
 * OpenRouter 免費模型列表
 */
export const FREE_MODELS = [
   'nvidia/nemotron-3-super-120b-a12b:free',
   'google/gemma-4-26b-a4b-it:free',
   'google/gemma-4-31b-it:free',
   'z-ai/glm-4.5-air:free',
   'openai/gpt-oss-120b:free',
   'qwen/qwen3-coder:free'
];

// ========== 模型分類 ==========

/**
 * 模型分類枚舉
 */
export const MODEL_CATEGORIES = {
  FREE: 'free',
  PREMIUM: 'premium',
  CUSTOM: 'custom'
};

// ========== 事件名稱 ==========

/**
 * 事件名稱常量
 */
export const EVENTS = {
  TRANSLATION_START: 'translation:start',
  TRANSLATION_PROGRESS: 'translation:progress',
  TRANSLATION_COMPLETE: 'translation:complete',
  TRANSLATION_ERROR: 'translation:error',
  SPEECH_START: 'speech:start',
  SPEECH_END: 'speech:end',
  SPEECH_RESULT: 'speech:result',
  SPEECH_ERROR: 'speech:error',
  NETWORK_ONLINE: 'network:online',
  NETWORK_OFFLINE: 'network:offline',
  SERVICE_CHANGE: 'service:change'
};

// ========== 快捷鍵 ==========

/**
 * 快捷鍵常量
 */
export const SHORTCUTS = {
  START_RECORDING: 'Space',
  STOP_RECORDING: 'Space',
  CLEAR_TEXT: 'Escape',
  COPY_TRANSLATION: 'Ctrl+C',
  PASTE_TEXT: 'Ctrl+V'
};

// ========== 情感關鍵詞 ==========

/**
 * 情感關鍵詞
 */
export const EMOTION_KEYWORDS = {
  HAPPY: ['開心', '高興', '快樂', 'happy', 'joy', 'excited'],
  SAD: ['難過', '傷心', '悲傷', 'sad', 'upset', 'depressed'],
  ANGRY: ['生氣', '憤怒', 'angry', 'mad', 'furious'],
  SURPRISED: ['驚訝', '意外', 'surprised', 'shocked', 'amazed'],
  THANKFUL: ['感謝', '謝謝', 'thank', 'grateful', 'appreciate']
};

// ========== 導出格式 ==========

/**
 * 導出格式枚舉
 */
export const EXPORT_FORMATS = {
  TXT: 'txt',
  JSON: 'json',
  CSV: 'csv'
};

// ========== MIME 類型 ==========

/**
 * MIME 類型常量
 */
export const MIME_TYPES = {
  TEXT: 'text/plain',
  JSON: 'application/json',
  CSV: 'text/csv',
  HTML: 'text/html'
};

// ========== 狀態枚舉 ==========

/**
 * 狀態枚舉
 */
export const STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
  PROCESSING: 'processing'
};

// ========== 日誌級別 ==========

/**
 * 日誌級別枚舉
 */
export const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
};

// ========== CSP 策略 ==========

/**
 * 內容安全策略
 */
export const CSP_POLICY = {
  'default-src': "'self'",
  'script-src': "'self' 'unsafe-inline' 'unsafe-eval'",
  'style-src': "'self' 'unsafe-inline'",
  'img-src': "'self' data: https:",
  'connect-src': "'self' https://openrouter.ai https://open.bigmodel.cn"
};

// ========== 危險模式（用於輸入驗證）==========

/**
 * 危險模式（用於檢測潛在的 XSS 攻擊）
 */
export const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^>]*>/gi,
  /<link\b[^>]*>/gi,
  /<meta\b[^>]*>/gi,
  /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
  /<\?php/i,
  /<%/i
];

// ========== 語言映射（用於翻譯提示詞）==========

/**
 * 語言名稱映射（用於翻譯系統提示詞）
 */
export const LANGUAGE_NAMES = {
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
  'ar-SA': 'العربية',
  'th-TH': 'ไทย',
  'vi-VN': 'Tiếng Việt'
};

// ========== 翻譯系統提示詞 ==========

/**
 * 翻譯系統提示詞模板
 */
export const TRANSLATION_SYSTEM_PROMPT = (sourceLang, targetLang, style = 'normal') => {
  const sourceLanguage = LANGUAGE_NAMES[sourceLang] || sourceLang;
  const targetLanguage = LANGUAGE_NAMES[targetLang] || targetLang;
  const stylePrompt = TRANSLATION_STYLE_PROMPTS[style] || '';

  return `你是一個專業的翻譯助手。請將${sourceLanguage}準確翻譯成${targetLanguage}。

${stylePrompt}

重要規則：
1. 必須將整段內容翻譯成目標語言：${targetLanguage}
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
};
