// Kilo Translation App - AI Model Definitions

import { DEFAULT_MODEL, MODEL_CATALOG, MODEL_ORDER, MODEL_TIERS, SERVER_PAID_MODELS } from './modelCatalog.js';

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

// 模型清單來自 src/js/modelCatalog.js（單一資料來源，以 OpenRouter 實測為準）
// 重新驗證：npm run check:models

export const aiModels = Object.fromEntries(
    Object.values(MODEL_ORDER).flat().map((id) => {
        const model = MODEL_CATALOG[id];
        return [id, {
            name: model.name,
            description: model.note,
            category: MODEL_TIERS[model.tier]
        }];
    })
);

// 模型分類（陣列順序即介面顯示順序）
export const modelCategories = {
    [MODEL_TIERS.top]: MODEL_ORDER.top,
    [MODEL_TIERS.value]: MODEL_ORDER.value,
    [MODEL_TIERS.free]: MODEL_ORDER.free
};

// 免費模型列表（伺服器 API 金鑰限定使用），順序即備援優先序
export const freeModelsOnly = [...MODEL_ORDER.free];

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
// Whether the deployment's server key may also spend on the curated paid list
// (mirrors ALLOW_PAID_MODELS on the backend; set from /api/health at startup).
let serverPaidEnabled = false;

export function setServerPaidEnabled(enabled) {
    serverPaidEnabled = Boolean(enabled);
}

export function isServerPaidEnabled() {
    return serverPaidEnabled;
}

/** Options the server key is allowed to use, in display order. */
export function getServerAllowedModels() {
    return serverPaidEnabled
        ? [...SERVER_PAID_MODELS, ...MODEL_ORDER.free]
        : [...MODEL_ORDER.free];
}

export function filterModelsForServerAPI({ aiModel, modelDescription, translations }) {
    const currentValue = aiModel.value;
    const allowed = getServerAllowedModels();

    const groups = serverPaidEnabled
        ? [['高性價比模型（伺服器可用）', SERVER_PAID_MODELS], ['🆓 免費選項', MODEL_ORDER.free]]
        : [['🆓 免費選項（伺服器 API 限定）', MODEL_ORDER.free]];

    aiModel.innerHTML = groups
        .map(([label, ids]) => buildOptgroup(label, ids))
        .join('\n');

    if (!allowed.includes(currentValue)) {
        const fallback = serverPaidEnabled ? DEFAULT_MODEL : MODEL_ORDER.free[0];
        aiModel.value = fallback;
        updateModelDescription(fallback, { modelDescription, translations });
    } else {
        aiModel.value = currentValue;
        updateModelDescription(currentValue, { modelDescription, translations });
    }
}

/**
 * Generates the full OpenRouter model options HTML string.
 * @returns {string} innerHTML for the model select element
 */
function buildOptgroup(label, ids) {
    const options = ids
        .map((id) => {
            const model = aiModels[id];
            if (!model) return '';
            const selected = id === DEFAULT_MODEL ? ' selected' : '';
            return `            <option value="${id}"${selected}>${model.name}</option>`;
        })
        .filter(Boolean)
        .join('\n');
    return `        <optgroup label="${label}">\n${options}\n        </optgroup>`;
}

function getOpenRouterOptionsHTML() {
    return [
        buildOptgroup('高性價比模型', MODEL_ORDER.value),
        buildOptgroup('頂級模型', MODEL_ORDER.top),
        buildOptgroup('免費選項', MODEL_ORDER.free),
        '        <optgroup label="自定義模型">\n            <option value="custom">自定義模型...</option>\n        </optgroup>'
    ].join('\n');
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
        aiModel.value = DEFAULT_MODEL;
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
        aiModel.value = DEFAULT_MODEL;
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
