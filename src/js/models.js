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

// OpenRouter 2026-09 推薦 AI 模型清單
// 免費：Input Price $0、近 180 日發布、週榜流量優先，最多 10 個（此處 8 個通用型）
// 收費：Input Price ≤ $1/M，已排除 OpenAI / Google / Anthropic（地區限制）
export const aiModels = {
    // 頂級模型（收費，Input ≤ $1/M，週榜高流量）
    "tencent/hy4-preview": {
        name: "Tencent Hy4 Preview",
        description: "週榜第 1（14.1T tokens），旗艦推理模型，翻譯品質最佳",
        category: "頂級模型"
    },
    "tencent/hy3": {
        name: "Tencent Hy3",
        description: "週榜高流量（4.44T），295B MoE 推理模型，中英翻譯穩健",
        category: "頂級模型"
    },
    "xiaomi/mimo-v2.5": {
        name: "Xiaomi MiMo V2.5",
        description: "週榜前十，原生多模態，Pro 級代理效能僅半價成本",
        category: "頂級模型"
    },
    "qwen/qwen3.8-flash": {
        name: "Qwen 3.8 Flash",
        description: "最新多模態推理，文件與圖表理解強，適合長文翻譯",
        category: "頂級模型"
    },
    "minimax/minimax-m3": {
        name: "MiniMax M3",
        description: "1M 上下文多模態基礎模型，長文翻譯穩定",
        category: "頂級模型"
    },

    // 高性價比模型（收費，Input ≤ $0.1/M）
    "z-ai/glm-5.3-flash": {
        name: "智譜 GLM 5.3 Flash",
        description: "週榜第 2（12.5T），$0.075/M 超低價，中英翻譯首選",
        category: "高性價比"
    },
    "deepseek/deepseek-v4-flash-0731": {
        name: "DeepSeek V4 Flash 0731",
        description: "週榜第 3（12.3T），重訓優化版，極速低價",
        category: "高性價比"
    },
    "deepseek/deepseek-v4-flash": {
        name: "DeepSeek V4 Flash",
        description: "週榜常駐高流量，284B MoE，穩定高效",
        category: "高性價比"
    },
    "qwen/qwen3.7-flash": {
        name: "Qwen 3.7 Flash",
        description: "$0.03/M 極低價，多語言推理，適合大量翻譯任務",
        category: "高性價比"
    },
    "tencent/hy-mt2-30b-a3b": {
        name: "Tencent Hy-MT2 30B",
        description: "旗艦翻譯專用模型，33 語言對，術語表與風格引導",
        category: "高性價比"
    },

    // 免費選項
    "minimax/minimax-m3:free": {
        name: "MiniMax M3",
        description: "免費流量王，週榜第 5（5.56T），1M 上下文",
        category: "免費選項"
    },
    "nvidia/nemotron-3-ultra-550b-a55b:free": {
        name: "NVIDIA Nemotron 3 Ultra",
        description: "週榜第 8（3.65T），550B 旗艦推理免費版",
        category: "免費選項"
    },
    "z-ai/glm-5.2:free": {
        name: "智譜 GLM 5.2",
        description: "免費推理模型，適合中英互譯",
        category: "免費選項"
    },
    "thinkingmachines/inkling:free": {
        name: "Inkling",
        description: "免費旗艦通用推理，1M 上下文，理解能力強",
        category: "免費選項"
    },
    "thinkingmachines/inkling-small:free": {
        name: "Inkling Small",
        description: "免費輕量高效版，回應快，適合即時翻譯",
        category: "免費選項"
    },
    "nvidia/nemotron-3.5-lightning:free": {
        name: "NVIDIA Nemotron 3.5 Lightning",
        description: "免費高吞吐極速模型，適合即時翻譯",
        category: "免費選項"
    },
    "minimax/minimax-m2.7:free": {
        name: "MiniMax M2.7",
        description: "免費通用模型，自主任務與多代理能力佳",
        category: "免費選項"
    },
    "nvidia/nemotron-3-super-120b-a12b:free": {
        name: "NVIDIA Nemotron 3 Super 120B",
        description: "免費大型模型，推理與理解能力強",
        category: "免費選項"
    }
};

// 模型分類
export const modelCategories = {
    "頂級模型": [
        "tencent/hy4-preview",
        "tencent/hy3",
        "xiaomi/mimo-v2.5",
        "qwen/qwen3.8-flash",
        "minimax/minimax-m3"
    ],
    "高性價比": [
        "z-ai/glm-5.3-flash",
        "deepseek/deepseek-v4-flash-0731",
        "deepseek/deepseek-v4-flash",
        "qwen/qwen3.7-flash",
        "tencent/hy-mt2-30b-a3b"
    ],
    "免費選項": [
        "minimax/minimax-m3:free",
        "nvidia/nemotron-3-ultra-550b-a55b:free",
        "z-ai/glm-5.2:free",
        "thinkingmachines/inkling:free",
        "thinkingmachines/inkling-small:free",
        "nvidia/nemotron-3.5-lightning:free",
        "minimax/minimax-m2.7:free",
        "nvidia/nemotron-3-super-120b-a12b:free"
    ]
};

// 免費模型列表（伺服器 API 金鑰限定使用）
export const freeModelsOnly = [
    "minimax/minimax-m3:free",
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "z-ai/glm-5.2:free",
    "thinkingmachines/inkling:free",
    "thinkingmachines/inkling-small:free",
    "nvidia/nemotron-3.5-lightning:free",
    "minimax/minimax-m2.7:free",
    "nvidia/nemotron-3-super-120b-a12b:free"
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

    if (modelId === 'custom') {
        if (customModelId) {
            modelDescription.textContent = `${translations.customModelLabel || '自定義模型'}：${customModelId}`;
        } else {
            modelDescription.textContent = translations.enterCustomModelId || '請輸入自定義模型 ID';
        }
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
 * Generates the full OpenRouter model options HTML string.
 * @returns {string} innerHTML for the model select element
 */
function getOpenRouterOptionsHTML() {
    return `
        <optgroup label="高性價比模型">
            <option value="z-ai/glm-5.3-flash" selected>智譜 GLM 5.3 Flash (週榜第 2，超低價)</option>
            <option value="deepseek/deepseek-v4-flash-0731">DeepSeek V4 Flash 0731 (週榜第 3)</option>
            <option value="deepseek/deepseek-v4-flash">DeepSeek V4 Flash (穩定高效)</option>
            <option value="qwen/qwen3.7-flash">Qwen 3.7 Flash ($0.03/M 極低價)</option>
            <option value="tencent/hy-mt2-30b-a3b">Tencent Hy-MT2 30B (翻譯專用)</option>
        </optgroup>
        <optgroup label="頂級模型">
            <option value="tencent/hy4-preview">Tencent Hy4 Preview (週榜第 1)</option>
            <option value="tencent/hy3">Tencent Hy3 (高流量推理)</option>
            <option value="xiaomi/mimo-v2.5">Xiaomi MiMo V2.5 (多模態旗艦)</option>
            <option value="qwen/qwen3.8-flash">Qwen 3.8 Flash (最新多模態)</option>
            <option value="minimax/minimax-m3">MiniMax M3 (1M 上下文)</option>
        </optgroup>
        <optgroup label="免費選項">
            <option value="minimax/minimax-m3:free">MiniMax M3 (免費流量王)</option>
            <option value="nvidia/nemotron-3-ultra-550b-a55b:free">NVIDIA Nemotron 3 Ultra (免費旗艦推理)</option>
            <option value="z-ai/glm-5.2:free">智譜 GLM 5.2 (免費中文模型)</option>
            <option value="thinkingmachines/inkling:free">Inkling (免費通用推理)</option>
            <option value="thinkingmachines/inkling-small:free">Inkling Small (免費輕量高效)</option>
            <option value="nvidia/nemotron-3.5-lightning:free">NVIDIA Nemotron 3.5 Lightning (免費極速)</option>
            <option value="minimax/minimax-m2.7:free">MiniMax M2.7 (免費通用模型)</option>
            <option value="nvidia/nemotron-3-super-120b-a12b:free">NVIDIA Nemotron 3 Super 120B (免費大型模型)</option>
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
        aiModel.value = 'z-ai/glm-5.3-flash';
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
        aiModel.value = 'z-ai/glm-5.3-flash';
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
