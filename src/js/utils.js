// Kilo Translation App - Utility Functions

import { LANGUAGES } from '../constants.js';

// ========== Device / Browser Detection ==========

/**
 * 檢測是否為移動設備
 */
export function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * 檢測 iOS 設備
 */
export function isIOSDevice() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

/**
 * 檢測 Safari 瀏覽器
 */
export function isSafariBrowser() {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

/**
 * 檢查瀏覽器支援 (SpeechRecognition, speechSynthesis, fetch, localStorage)
 * @param {function} showError - 顯示錯誤訊息的回呼函式
 * @returns {boolean}
 */
export function checkBrowserSupport(showError) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const speechSynthesis = window.speechSynthesis;
    const userAgent = navigator.userAgent;

    // 檢測瀏覽器類型
    const isSafari = isSafariBrowser();
    const isIOS = isIOSDevice();
    const isMobile = isMobileDevice();

    // 檢查基本 API 支援
    if (!SpeechRecognition) {
        console.error('Speech Recognition not supported');

        if (isSafari) {
            showError('Safari 瀏覽器目前不支援語音識別功能。建議使用 Chrome、Edge 或 Firefox 瀏覽器。');
        } else {
            showError('您的瀏覽器不支援語音辨識功能。請使用 Chrome、Edge 或 Safari 瀏覽器。');
        }
        return false;
    }

    if (!speechSynthesis) {
        console.error('Speech Synthesis not supported');
        showError('您的瀏覽器不支援語音合成功能。請更新瀏覽器版本。');
        return false;
    }

    // 檢查 fetch API 支援
    if (!window.fetch) {
        console.error('Fetch API not supported');
        showError('您的瀏覽器版本過舊，不支援必要的網路功能。請更新瀏覽器。');
        return false;
    }

    // 檢查 localStorage 支援
    try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
    } catch (e) {
        console.error('LocalStorage not supported');
        showError('您的瀏覽器不支援本地儲存功能。');
        return false;
    }

    // Safari 特別提示
    if (isSafari && isIOS) {
        console.log('iOS Safari 檢測：語音識別可能需要用戶交互才能啟動');
    }

    return true;
}

// ========== Language Utilities ==========

/**
 * 判斷是否需要英語中間翻譯
 * @param {string} sourceLang - 來源語言代碼
 * @param {string} targetLang - 目標語言代碼
 * @returns {boolean}
 */
export function needsEnglishTranslation(sourceLang, targetLang) {
    return sourceLang !== 'en-US' && targetLang !== 'en-US';
}

/**
 * 目標語言檢測（用於 BigModel 輸出驗證）
 * 包含 Chinese, Japanese, Korean, French, Spanish, German, Portuguese,
 * Russian, Arabic, Hindi, Thai, Vietnamese 的 regex 模式
 */
const targetLanguageChecks = {
    'ja-JP': /[\u3040-\u30FF]/,          // 日文假名
    'ko-KR': /[\uAC00-\uD7AF]/,          // 韓文
    'zh-TW': /[\u4E00-\u9FFF]/,          // CJK 字元（繁體中文）
    'zh-CN': /[\u4E00-\u9FFF]/,          // CJK 字元（簡體中文）
    'en-US': /[A-Za-z]/,                  // 英文
    'fr-FR': /[A-Za-zÀ-ÿŒœÆæÇç]/,      // 法文（含變音符號）
    'es-ES': /[A-Za-záéíóúñüÁÉÍÓÚÑÜ¿¡]/,// 西班牙文（含重音符號）
    'de-DE': /[A-Za-zÄäÖöÜüß]/,         // 德文（含特殊字母）
    'pt-BR': /[A-Za-záàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]/, // 葡萄牙文
    'ru-RU': /[\u0400-\u04FF]/,          // 俄文（西里爾字母）
    'ar-SA': /[\u0600-\u06FF]/,          // 阿拉伯文
    'hi-IN': /[\u0900-\u097F]/,          // 印地文（天城文字母）
    'th-TH': /[\u0E00-\u0E7F]/,         // 泰文
    'vi-VN': /[A-Za-zÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯưẠ-ỹ]/ // 越南文
};

/**
 * 檢查翻譯文本是否為目標語言
 * @param {string} text - 要檢查的文本
 * @param {string} targetLang - 目標語言代碼
 * @returns {boolean}
 */
export function isLikelyTargetLanguage(text, targetLang) {
    if (!text) return false;
    const checker = targetLanguageChecks[targetLang];
    if (!checker) return true;
    return checker.test(text);
}

/**
 * 構建嚴格語言輸出規則
 * @param {string} targetLang - 目標語言代碼
 * @returns {string}
 */
export function buildStrictLanguageRule(targetLang) {
    const targetName = LANGUAGES[targetLang] || targetLang;
    return `嚴格規則：輸出必須為${targetName}，不得混入其他語言或說明。`;
}

// ========== DOM Utilities ==========

/**
 * 建立音量指示器的 bar 元素
 * @param {HTMLElement} container - 音量指示器容器元素
 */
export function createVolumeIndicator(container) {
    for (let i = 0; i < 20; i++) {
        const bar = document.createElement('div');
        bar.className = 'volume-bar';
        bar.style.height = '2px';
        container.appendChild(bar);
    }
}

/**
 * 載入儲存的資料（從 localStorage 還原所有設定）
 * @param {object} elements - DOM 元素參考物件
 * @param {object} callbacks - 回呼函式物件
 * @param {function} callbacks.updateHistoryDisplay - 更新歷史紀錄顯示
 * @param {function} callbacks.showBigModelModels - 顯示 BigModel 模型列表
 * @param {function} callbacks.filterModelsForServerAPI - 篩選伺服器 API 可用模型
 * @param {function} callbacks.showAllModels - 顯示所有模型
 * @param {function} callbacks.updateModelDescription - 更新模型描述
 * @param {function} callbacks.switchToTextMode - 切換到文字輸入模式
 * @param {function} callbacks.switchToVoiceMode - 切換到語音輸入模式
 * @param {function} callbacks.handleModeChange - 處理翻譯模式切換
 * @param {function} callbacks.setTranslationHistory - 設定翻譯歷史陣列
 */
export function loadSavedData(elements, callbacks) {
    const {
        updateHistoryDisplay,
        showBigModelModels,
        filterModelsForServerAPI,
        showAllModels,
        updateModelDescription,
        switchToTextMode,
        switchToVoiceMode,
        handleModeChange,
        setTranslationHistory
    } = callbacks;

    // 載入翻譯歷史
    const savedHistory = localStorage.getItem('translation_history');
    if (savedHistory) {
        setTranslationHistory(JSON.parse(savedHistory));
        updateHistoryDisplay();
    }

    // 載入翻譯模式和設定
    const savedMode = localStorage.getItem('translation_mode');
    const savedModel = localStorage.getItem('selected_ai_model');
    const savedApiKey = localStorage.getItem('openrouter_api_key');
    const savedBigModelApiKey = localStorage.getItem('bigmodel_api_key');
    const savedTranslationService = localStorage.getItem('translation_service') || 'openrouter';
    const savedApiKeySource = localStorage.getItem('api_key_source') || 'server';

    // 始終使用 OpenRouter API
    elements.translationModeSection.classList.remove('hidden');

    // 載入翻譯服務選擇
    if (savedTranslationService === 'bigmodel') {
        elements.bigmodelService.checked = true;
        elements.openrouterService.checked = false;
        elements.bigmodelApiKeySection.classList.remove('hidden');

        // 載入 BigModel API 金鑰
        if (savedBigModelApiKey) {
            elements.bigmodelApiKey.value = savedBigModelApiKey;
        }

        // 顯示 BigModel 模型
        showBigModelModels();
    } else {
        elements.openrouterService.checked = true;
        elements.bigmodelService.checked = false;
        elements.bigmodelApiKeySection.classList.add('hidden');

        // 載入 OpenRouter API 金鑰
        if (savedApiKey) {
            elements.apiKey.value = savedApiKey;
        }

        // 根據 API 金鑰來源決定顯示哪些模型
        if (savedApiKeySource === 'server') {
            elements.serverApiKey.checked = true;
            elements.userApiKey.checked = false;
            elements.userApiKeySection.classList.add('hidden');
            elements.serverApiKeySection.classList.remove('hidden');
            filterModelsForServerAPI(); // 只顯示免費模型
        } else {
            elements.userApiKey.checked = true;
            elements.serverApiKey.checked = false;
            elements.userApiKeySection.classList.remove('hidden');
            elements.serverApiKeySection.classList.add('hidden');
            showAllModels(); // 顯示所有模型
        }
    }

    if (savedMode === 'standard') {
        elements.standardMode.checked = true;
        elements.streamMode.checked = false;
    }

    // 載入選擇的 AI 模型（如果還沒有被過濾函數處理）
    if (savedModel && elements.aiModel.querySelector(`option[value="${savedModel}"]`)) {
        elements.aiModel.value = savedModel;

        // 如果是自定義模型，顯示輸入框並載入值
        if (savedModel === 'custom') {
            const savedCustomModel = localStorage.getItem('custom_ai_model');
            if (savedCustomModel) {
                elements.customModelInput.value = savedCustomModel;
                elements.customModelContainer.classList.remove('hidden');
            }
        }
    }

    // 確保模型描述正確顯示
    updateModelDescription(elements.aiModel.value);

    // 載入輸入模式設定
    const savedInputMode = localStorage.getItem('input_mode');
    if (savedInputMode === 'text') {
        elements.textInputMode.checked = true;
        elements.voiceInputMode.checked = false;
        if (elements.voiceChatInputMode) elements.voiceChatInputMode.checked = false;
        switchToTextMode();
    } else if (savedInputMode === 'voice-chat' && elements.voiceChatInputMode) {
        elements.voiceChatInputMode.checked = true;
        elements.voiceInputMode.checked = false;
        elements.textInputMode.checked = false;
        switchToVoiceMode();
    } else {
        switchToVoiceMode();
    }

    // 載入雙人模式輸入設定
    const savedDualInputMode = localStorage.getItem('dual_input_mode');
    if (callbacks.switchToDualTextMode || callbacks.switchToDualVoiceChatMode || callbacks.switchToDualVoiceMode) {
        if (savedDualInputMode === 'text') {
            if (elements.dualTextInputMode) elements.dualTextInputMode.checked = true;
            if (elements.dualVoiceInputMode) elements.dualVoiceInputMode.checked = false;
            if (elements.dualVoiceChatInputMode) elements.dualVoiceChatInputMode.checked = false;
            if (callbacks.switchToDualTextMode) callbacks.switchToDualTextMode();
        } else if (savedDualInputMode === 'voice-chat') {
            if (elements.dualVoiceChatInputMode) elements.dualVoiceChatInputMode.checked = true;
            if (elements.dualVoiceInputMode) elements.dualVoiceInputMode.checked = false;
            if (elements.dualTextInputMode) elements.dualTextInputMode.checked = false;
            if (callbacks.switchToDualVoiceChatMode) callbacks.switchToDualVoiceChatMode();
        }
    }

    // 載入翻譯模式類型（單人/雙人）
    const savedModeType = localStorage.getItem('translation_mode_type');
    if (savedModeType === 'dual') {
        elements.dualModeType.checked = true;
        elements.singleModeType.checked = false;
        handleModeChange('dual');
    } else {
        elements.singleModeType.checked = true;
        elements.dualModeType.checked = false;
        handleModeChange('single');
    }

    // 載入翻譯風格
    const savedStyle = localStorage.getItem('translation_style') || 'normal';
    const styleRadio = document.querySelector(`input[name="translationStyle"][value="${savedStyle}"]`);
    if (styleRadio) {
        styleRadio.checked = true;
    }

    // 載入繞過英語中間步驟設定
    const bypassEnglish = localStorage.getItem('bypass_english_step') === 'true';
    if (elements.bypassEnglishStep) {
        elements.bypassEnglishStep.checked = bypassEnglish;
    }
}
