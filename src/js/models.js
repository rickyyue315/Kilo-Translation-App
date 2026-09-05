// Kilo Translation App - AI Model Definitions

// Language code to display name mapping
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
    'ar-SA': 'العربية',
    'th-TH': 'ไทย',
    'vi-VN': 'Tiếng Việt'
};

// OpenRouter 2025 推薦 AI 模型清單
export const aiModels = {
    // 頂級模型
    "openai/gpt-5.4-mini": {
        name: "OpenAI GPT-5.4 Mini",
        description: "高品質主力模型，適合日常與專業翻譯",
        category: "頂級模型"
    },
    "google/gemini-3.5-flash": {
        name: "Google Gemini 3.5 Flash",
        description: "最新旗艦模型，高速高品質翻譯",
        category: "頂級模型"
    },
    "z-ai/glm-5.1": {
        name: "智譜 GLM-5.1",
        description: "新一代中文能力模型，適合中英翻譯",
        category: "頂級模型"
    },
    "qwen/qwen3.7-plus": {
        name: "Qwen 3.7 Plus",
        description: "最新多語言模型，翻譯表現優異且價格實惠",
        category: "頂級模型"
    },
    "xiaomi/mimo-v2.5": {
        name: "Xiaomi MiMo V2.5",
        description: "新一代輕量模型，性價比出色",
        category: "頂級模型"
    },

    // 高性價比模型
    "google/gemini-3.1-flash-lite": {
        name: "Google Gemini 3.1 Flash Lite",
        description: "超低價格輕量模型，適合大量翻譯任務",
        category: "高性價比"
    },
    "openai/gpt-5.4-nano": {
        name: "OpenAI GPT-5.4 Nano",
        description: "超輕量級模型，回應極快",
        category: "高性價比"
    },
    "qwen/qwen3.6-flash": {
        name: "Qwen 3.6 Flash",
        description: "最新快速模型，極致性價比選擇",
        category: "高性價比"
    },
    "deepseek/deepseek-v4-flash": {
        name: "DeepSeek V4 Flash",
        description: "高性價比模型，翻譯品質穩定",
        category: "高性價比"
    },
    "x-ai/grok-4.3": {
        name: "X-AI Grok 4.3",
        description: "新一代高效模型，即時翻譯流暢",
        category: "高性價比"
    },

    // 免費選項
    "google/gemma-4-26b-a4b-it:free": {
        name: "Google Gemma 4 26B A4B",
        description: "免費大型模型，適合一般翻譯",
        category: "免費選項"
    },
    "google/gemma-4-31b-it:free": {
        name: "Google Gemma 4 31B",
        description: "免費高容量模型，表現更穩定",
        category: "免費選項"
    },
    "nvidia/nemotron-3-super-120b-a12b:free": {
        name: "NVIDIA Nemotron 3 Super 120B",
        description: "免費大型模型，推理與理解能力強",
        category: "免費選項"
    },
    "z-ai/glm-4.5-air:free": {
        name: "智譜 GLM-4.5 Air",
        description: "免費中文模型，適合中英互譯",
        category: "免費選項"
    },
    "openai/gpt-oss-120b:free": {
        name: "OpenAI GPT-OSS 120B",
        description: "免費開源模型，綜合能力佳",
        category: "免費選項"
    },
    "qwen/qwen3-coder:free": {
        name: "Qwen3 Coder",
        description: "免費模型，技術內容翻譯有優勢",
        category: "免費選項"
    }
};

// BigModel 模型清單
export const bigModelModels = {
    "glm-5.1": {
        name: "GLM-5.1",
        description: "新一代旗艦模型，適合高品質翻譯",
        category: "旗艦"
    },
    "glm-4.7-flashx": {
        name: "GLM-4.7 FlashX",
        description: "極速響應版本，適合高頻即時翻譯",
        category: "極速"
    },
    "glm-4.7": {
        name: "GLM-4.7",
        description: "高品質版本，翻譯準確度穩定",
        category: "高品質"
    },
    "glm-4.5-air": {
        name: "GLM-4.5 Air",
        description: "輕量低成本版本，適合日常使用",
        category: "輕量級"
    },
    "glm-4.7-flash": {
        name: "GLM-4.7 Flash",
        description: "速度與品質平衡，適合即時翻譯",
        category: "推薦"
    }
};

// 模型分類
export const modelCategories = {
    "頂級模型": [
        "openai/gpt-5.4-mini",
        "google/gemini-3.5-flash",
        "z-ai/glm-5.1",
        "qwen/qwen3.7-plus",
        "xiaomi/mimo-v2.5"
    ],
    "高性價比": [
        "google/gemini-3.1-flash-lite",
        "openai/gpt-5.4-nano",
        "qwen/qwen3.6-flash",
        "deepseek/deepseek-v4-flash",
        "x-ai/grok-4.3"
    ],
    "免費選項": [
        "nvidia/nemotron-3-super-120b-a12b:free",
        "google/gemma-4-26b-a4b-it:free",
        "google/gemma-4-31b-it:free",
        "z-ai/glm-4.5-air:free",
        "openai/gpt-oss-120b:free",
        "qwen/qwen3-coder:free"
    ]
};

// 免費模型列表（伺服器 API 金鑰限定使用）
export const freeModelsOnly = [
    "nvidia/nemotron-3-super-120b-a12b:free",
    "google/gemma-4-26b-a4b-it:free",
    "google/gemma-4-31b-it:free",
    "z-ai/glm-4.5-air:free",
    "openai/gpt-oss-120b:free",
    "qwen/qwen3-coder:free"
];

// ============================================================
// Model Management Functions
// ============================================================

/**
 * Updates the model description display element.
 * @param {string} modelId - The selected model ID
 * @param {Object} deps - Dependencies
 * @param {HTMLElement} deps.modelDescription - The DOM element to display description
 * @param {Object} deps.translations - Current i18n translations object
 * @param {string|null} [customModelId=null] - Custom model ID if modelId is 'custom'
 */
export function updateModelDescription(modelId, { modelDescription, translations }, customModelId = null) {
    if (!modelDescription || !translations) return;
    const translationService = localStorage.getItem('translation_service') || 'openrouter';

    if (modelId === 'custom') {
        if (customModelId) {
            modelDescription.textContent = `${translations.customModelLabel || '自定義模型'}：${customModelId}`;
        } else {
            modelDescription.textContent = translations.enterCustomModelId || '請輸入自定義模型 ID';
        }
    } else if (translationService === 'bigmodel') {
        // BigModel 模型描述
        const model = bigModelModels[modelId];
        const description = model ? `${model.name}：${model.description}` : '選擇一個 BigModel 模型進行翻譯';
        modelDescription.textContent = description;
    } else {
        // OpenRouter 模型描述
        const model = aiModels[modelId];
        const description = model ? `${model.name}：${model.description}` : '選擇一個 AI 模型進行翻譯';
        modelDescription.textContent = description;
    }
}

/**
 * Filters the model select to only show free models (for server API key usage).
 * @param {Object} deps - Dependencies
 * @param {HTMLSelectElement} deps.aiModel - The model <select> element
 * @param {HTMLElement} deps.modelDescription - The DOM element to display description
 * @param {Object} deps.translations - Current i18n translations object
 */
export function filterModelsForServerAPI({ aiModel, modelDescription, translations }) {
    const currentValue = aiModel.value;

    // 清空現有選項
    aiModel.innerHTML = '';

    // 只添加免費模型選項
    const freeOptgroup = document.createElement('optgroup');
    freeOptgroup.label = '🆓 免費選項（伺服器 API 限定）';

    freeModelsOnly.forEach(modelId => {
        const model = aiModels[modelId];
        if (model) {
            const option = document.createElement('option');
            option.value = modelId;
            option.textContent = `${model.name} (${model.description})`;
            freeOptgroup.appendChild(option);
        }
    });

    aiModel.appendChild(freeOptgroup);

    // 如果當前選擇的不是免費模型，選擇第一個免費模型
    if (!freeModelsOnly.includes(currentValue)) {
        aiModel.value = freeModelsOnly[0];
        updateModelDescription(freeModelsOnly[0], { modelDescription, translations });
    } else {
        aiModel.value = currentValue;
        updateModelDescription(currentValue, { modelDescription, translations });
    }
}

/**
 * Switches the active translation service and persists the choice.
 * @param {string} service - The service identifier ('openrouter' or 'bigmodel')
 */
export function switchTranslationService(service) {
    localStorage.setItem('translation_service', service);
    console.log('翻譯服務已切換為:', service);
}

/**
 * Rebuilds the model <select> to show BigModel models.
 * @param {Object} deps - Dependencies
 * @param {HTMLSelectElement} deps.aiModel - The model <select> element
 * @param {HTMLElement} deps.modelDescription - The DOM element to display description
 * @param {Object} deps.translations - Current i18n translations object
 */
export function showBigModelModels({ aiModel, modelDescription, translations }) {
    const currentValue = aiModel.value;

    // 清空現有選項
    aiModel.innerHTML = '';

    // 添加 BigModel 模型選項
    const bigModelOptgroup = document.createElement('optgroup');
    bigModelOptgroup.label = 'BigModel 模型';

    Object.entries(bigModelModels).forEach(([modelId, model]) => {
        const option = document.createElement('option');
        option.value = modelId;
        option.textContent = `${model.name} (${model.description})`;
        if (modelId === 'glm-4.5-air') {
            option.selected = true;
        }
        bigModelOptgroup.appendChild(option);
    });

    aiModel.appendChild(bigModelOptgroup);

    // 更新模型描述
    updateModelDescription(aiModel.value, { modelDescription, translations });
}

/**
 * Generates the full OpenRouter model options HTML string.
 * @returns {string} innerHTML for the model select element
 */
function getOpenRouterOptionsHTML() {
    return `
        <optgroup label="高性價比模型">
            <option value="google/gemini-3.1-flash-lite" selected>Google Gemini 3.1 Flash Lite (超低價格輕量模型)</option>
            <option value="openai/gpt-5.4-nano">OpenAI GPT-5.4 Nano (超輕量級模型)</option>
            <option value="qwen/qwen3.6-flash">Qwen 3.6 Flash (最新快速模型)</option>
            <option value="deepseek/deepseek-v4-flash">DeepSeek V4 Flash (最新高效模型)</option>
            <option value="x-ai/grok-4.3">X-AI Grok 4.3 (新一代高效模型)</option>
        </optgroup>
        <optgroup label="頂級模型">
            <option value="openai/gpt-5.4-mini">OpenAI GPT-5.4 Mini (高品質主力模型)</option>
            <option value="google/gemini-3.5-flash">Google Gemini 3.5 Flash (最新旗艦模型)</option>
            <option value="z-ai/glm-5.1">智譜 GLM-5.1 (新一代中文能力模型)</option>
            <option value="qwen/qwen3.7-plus">Qwen 3.7 Plus (最新多語言模型)</option>
            <option value="xiaomi/mimo-v2.5">Xiaomi MiMo V2.5 (新一代輕量模型)</option>
        </optgroup>
        <optgroup label="免費選項">
            <option value="nvidia/nemotron-3-super-120b-a12b:free">NVIDIA Nemotron 3 Super 120B (免費大型模型)</option>
            <option value="google/gemma-4-26b-a4b-it:free">Google Gemma 4 26B A4B (免費大型模型)</option>
            <option value="google/gemma-4-31b-it:free">Google Gemma 4 31B (免費高容量模型)</option>
            <option value="z-ai/glm-4.5-air:free">智譜 GLM-4.5 Air (免費中文模型)</option>
            <option value="openai/gpt-oss-120b:free">OpenAI GPT-OSS 120B (免費開源模型)</option>
            <option value="qwen/qwen3-coder:free">Qwen3 Coder (免費技術內容模型)</option>
        </optgroup>
        <optgroup label="自定義模型">
            <option value="custom">自定義模型...</option>
        </optgroup>
    `;
}

/**
 * Rebuilds the model <select> to show OpenRouter models.
 * @param {Object} deps - Dependencies
 * @param {HTMLSelectElement} deps.aiModel - The model <select> element
 * @param {HTMLElement} deps.modelDescription - The DOM element to display description
 * @param {HTMLElement} deps.customModelContainer - The custom model input container
 * @param {HTMLInputElement} deps.customModelInput - The custom model text input
 * @param {Object} deps.translations - Current i18n translations object
 */
export function showOpenRouterModels({ aiModel, modelDescription, customModelContainer, customModelInput, translations }) {
    const currentValue = aiModel.value;

    // 重建完整的選項列表
    aiModel.innerHTML = getOpenRouterOptionsHTML();

    // 恢復之前的選擇，如果不存在則選擇預設值
    if (aiModel.querySelector(`option[value="${currentValue}"]`)) {
        aiModel.value = currentValue;
    } else {
        aiModel.value = 'google/gemini-3.1-flash-lite';
    }

    updateModelDescription(aiModel.value, { modelDescription, translations });

    // 處理自定義模型顯示
    if (aiModel.value === 'custom') {
        customModelContainer.classList.remove('hidden');
        const savedCustomModel = localStorage.getItem('custom_ai_model');
        if (savedCustomModel) {
            customModelInput.value = savedCustomModel;
        }
    } else {
        customModelContainer.classList.add('hidden');
    }
}

/**
 * Shows all models (used when user provides their own API key).
 * @param {Object} deps - Dependencies
 * @param {HTMLSelectElement} deps.aiModel - The model <select> element
 * @param {HTMLElement} deps.modelDescription - The DOM element to display description
 * @param {HTMLElement} deps.customModelContainer - The custom model input container
 * @param {HTMLInputElement} deps.customModelInput - The custom model text input
 * @param {Object} deps.translations - Current i18n translations object
 */
export function showAllModels({ aiModel, modelDescription, customModelContainer, customModelInput, translations }) {
    const currentValue = aiModel.value;

    // 重建完整的選項列表
    aiModel.innerHTML = getOpenRouterOptionsHTML();

    // 恢復之前的選擇，如果不存在則選擇預設值
    if (aiModel.querySelector(`option[value="${currentValue}"]`)) {
        aiModel.value = currentValue;
    } else {
        aiModel.value = 'google/gemini-3.1-flash-lite';
    }

    updateModelDescription(aiModel.value, { modelDescription, translations });

    // 處理自定義模型顯示
    if (aiModel.value === 'custom') {
        customModelContainer.classList.remove('hidden');
        const savedCustomModel = localStorage.getItem('custom_ai_model');
        if (savedCustomModel) {
            customModelInput.value = savedCustomModel;
        }
    } else {
        customModelContainer.classList.add('hidden');
    }
}
