// Kilo Translation App - Main Entry Point
import './styles/main.css';
import { i18n, t, updateInterfaceLanguage } from './js/i18n.js';
import { languageMap, aiModels, modelCategories, freeModelsOnly, updateModelDescription, filterModelsForServerAPI, showOpenRouterModels, showAllModels, setServerPaidEnabled } from './js/models.js';
import { isMobileDevice, isIOSDevice, isSafariBrowser, createVolumeIndicator, loadSavedData } from './js/utils.js';
import { initializeSpeechRecognition, startRecording, stopRecording, playTranslation, getIsRecording, refreshRecordButtonLabels } from './js/speech.js';
import { OPENROUTER_ASR_MODELS, getSavedAsrModel, setSavedAsrModel } from './js/asr.js';
import { translateText, translateTextInDualMode, performTranslation, getCurrentTranslation } from './js/translation.js';
import { addToHistory, addToHistoryInDualMode, updateHistoryDisplay, clearHistory, setTranslationHistory, attachHistoryListeners } from './js/history.js';
import { setupEventListeners, handleModeChange, swapUsers, updateUserLabels, refreshDualMicLabels, updateStatus, showError, hideError, showSuccess, animateVolumeIndicator, initTooltipPositioning, initTheme, getIsDualMode, getCurrentUser, switchToTextMode, switchToVoiceMode, switchToVoiceChatMode, switchToDualVoiceMode, switchToDualVoiceChatMode, switchToDualTextMode, populateExtraTargetCheckboxes, initTabs, initSheets } from './js/ui.js';
import { ensureVisualizerBars, setVoiceChatLive, AUTOPLAY_STORAGE_KEY, CONTEXT_STORAGE_KEY, CONTEXT_WINDOW_STORAGE_KEY, updateVoiceChatVisibility } from './js/voicechat.js';
import { apiUrl, isNative } from './js/api.js';
import { getCapabilityReport, applySystemFontScale, refreshFontScale, onFontScaleChange, watchNetwork } from './js/capabilities.js';

// 首屏 paint 前先套用系統字級。
// Android WebView 不會自動套用 fontScale，若等到 initializeApp 才處理，
// 使用者會先看到 16px 再跳成 32px。html[data-booting] 由 <head> 的 inline 腳本設定，
// 這裡一拿到值就解除；inline 端另有 1200ms 保險絲，模組載入失敗也不會永久白屏。
const bootReady = (async () => {
  try {
    await applySystemFontScale();
  } catch {
    // 取不到 fontScale 時維持 1.0，屬已知限制
  } finally {
    document.documentElement.removeAttribute('data-booting');
  }
})();


// DOM Elements Registry
const elements = {
  // Interface
  interfaceLanguage: document.getElementById('interfaceLanguage'),
  errorMessage: document.getElementById('errorMessage'),
  
  // API Key Section
  serverApiKey: document.getElementById('serverApiKey'),
  userApiKey: document.getElementById('userApiKey'),
  userApiKeySection: document.getElementById('userApiKeySection'),
  serverApiKeySection: document.getElementById('serverApiKeySection'),
  apiKey: document.getElementById('apiKey'),
  
  // Model Section
  aiModel: document.getElementById('aiModel'),
  customModelContainer: document.getElementById('customModelContainer'),
  customModelInput: document.getElementById('customModelInput'),
  modelDescription: document.getElementById('modelDescription'),
  asrModel: document.getElementById('asrModel'),
  asrModelDescription: document.getElementById('asrModelDescription'),

  // Translation Mode
  translationModeSection: document.getElementById('translationModeSection'),
  streamMode: document.getElementById('streamMode'),
  standardMode: document.getElementById('standardMode'),
  
  // Translation Style
  styleNormal: document.getElementById('styleNormal'),
  styleNatural: document.getElementById('styleNatural'),
  styleFormal: document.getElementById('styleFormal'),
  styleSimple: document.getElementById('styleSimple'),
  styleAcademic: document.getElementById('styleAcademic'),
  
  // Bypass English intermediate step
  bypassEnglishStep: document.getElementById('bypassEnglishStep'),
  
  // Translation Mode Type
  singleModeType: document.getElementById('singleModeType'),
  dualModeType: document.getElementById('dualModeType'),
  
  // Language Selection
  sourceLanguage: document.getElementById('sourceLanguage'),
  targetLanguage: document.getElementById('targetLanguage'),
  swapLanguages: document.getElementById('swapLanguages'),
  
  // Status
  statusDot: document.getElementById('statusDot'),
  statusText: document.getElementById('statusText'),
  volumeIndicator: document.getElementById('volumeIndicator'),
  
  // Control Buttons
  recordButton: document.getElementById('recordButton'),
  playTranslation: document.getElementById('playTranslation'),
  swapUsers: document.getElementById('swapUsers'),
  clearHistory: document.getElementById('clearHistory'),

  // Settings & modals
  settingsToggle: document.getElementById('settingsToggle'),
  settingsPanel: document.getElementById('settingsPanel'),
  helpBtn: document.getElementById('helpBtn'),
  shortcutsModal: document.getElementById('shortcutsModal'),
  closeShortcutsModal: document.getElementById('closeShortcutsModal'),
  shortcutsOkBtn: document.getElementById('shortcutsOkBtn'),
  confirmClearModal: document.getElementById('confirmClearModal'),
  closeConfirmClearModal: document.getElementById('closeConfirmClearModal'),
  cancelClearBtn: document.getElementById('cancelClearBtn'),
  confirmClearBtn: document.getElementById('confirmClearBtn'),
  
  // Single Mode Transcript
  singleTranscriptSection: document.getElementById('singleTranscriptSection'),
  sourceText: document.getElementById('sourceText'),
  englishTextSingle: document.getElementById('englishTextSingle'),
  targetText: document.getElementById('targetText'),
  
  // Single Mode Text Input
  voiceInputMode: document.getElementById('voiceInputMode'),
  voiceChatInputMode: document.getElementById('voiceChatInputMode'),
  textInputMode: document.getElementById('textInputMode'),
  textInputContainer: document.getElementById('textInputContainer'),
  sourceTextInput: document.getElementById('sourceTextInput'),
  translateTextBtn: document.getElementById('translateTextBtn'),
  clearTextBtn: document.getElementById('clearTextBtn'),
  copySourceBtn: document.getElementById('copySourceBtn'),
  copyTargetBtn: document.getElementById('copyTargetBtn'),
  
  // Dual Mode Transcript
  dualTranscriptSection: document.getElementById('dualTranscriptSection'),
  dualSourceText: document.getElementById('dualSourceText'),
  englishText: document.getElementById('englishText'),
  dualTargetText: document.getElementById('dualTargetText'),
  userALabel: document.getElementById('userALabel'),
  userBLabel: document.getElementById('userBLabel'),
  englishReferenceLabel: document.getElementById('englishReferenceLabel'),
  englishReferenceLabelSingle: document.getElementById('englishReferenceLabelSingle'),
  
  // Dual Mode Text Input
  dualVoiceInputMode: document.getElementById('dualVoiceInputMode'),
  dualVoiceChatInputMode: document.getElementById('dualVoiceChatInputMode'),
  dualTextInputMode: document.getElementById('dualTextInputMode'),
  dualTextInputContainer: document.getElementById('dualTextInputContainer'),
  dualSourceTextInput: document.getElementById('dualSourceTextInput'),
  dualTranslateTextBtn: document.getElementById('dualTranslateTextBtn'),
  dualClearTextBtn: document.getElementById('dualClearTextBtn'),
  
  // History
  historyCount: document.getElementById('historyCount'),
  historyList: document.getElementById('historyList'),
  
  // Internal callbacks for history module
  _showError: (msg) => showError(msg, elements),
  _showSuccess: (msg) => showSuccess(msg, elements),
};

// Application Initialization
function initializeApp() {
  console.log('Kilo Translation App v3.0.0 initializing...');

  // Theme must load before language switch repaints text
  initTheme();

  // Mobile device detection
  if (isMobileDevice()) {
    document.body.classList.add('mobile-device');
  }
  
  // 能力分級：不再硬阻擋。
  // WebView 沒有 Web Speech 是常態，不是錯誤 —— 只有連 MediaRecorder 都沒有時才降級成
  // textOnly（停用麥克風入口），文字翻譯 / 歷史 / 朗讀一律照常。
  const capability = getCapabilityReport();
  renderCapabilityNotice(capability, elements);
  applyCapabilityGating(capability, elements);
  
  // Create volume indicator
  createVolumeIndicator(elements.volumeIndicator);
  
  // Initialize speech recognition
  initializeSpeechRecognition(elements, {
    onTranslate: (text, extra = {}) => {
      if (getIsDualMode()) {
        translateTextInDualMode(text, elements, getAppState(extra));
      } else {
        translateText(text, elements, getAppState(extra));
      }
    },
    updateStatus: (status, msg) => updateStatus(status, msg, elements),
    showError: (msg) => showError(msg, elements),
    hideError: () => hideError(elements),
  });
  
  // Setup all event listeners
  setupEventListeners(elements, {
    translateText: (text) => translateText(text, elements, getAppState()),
    translateTextInDualMode: (text, extra = {}) => translateTextInDualMode(text, elements, getAppState(extra)),
    clearHistory: () => clearHistory(elements),
    addToHistory: (...args) => addToHistory(...args, elements),
    showError: (msg) => showError(msg, elements),
    showSuccess: (msg) => showSuccess(msg, elements),
    updateStatus: (msg) => updateStatus(msg, elements),
    hideError: () => hideError(elements),
    startRecording: () => startRecording(elements, { isDualMode: getIsDualMode(), currentUser: getCurrentUser() }),
    stopRecording: () => stopRecording(elements),
    playTranslation: () => playTranslation(elements),
  });

  // Attach delegated listeners for history item actions
  attachHistoryListeners(elements, {
    showSuccess: (msg) => showSuccess(msg, elements),
    replayText: (text) => {
      elements.targetText.textContent = text;
      playTranslation(elements);
    }
  });
  
  // Load saved data from localStorage
  const loadTranslations = () => {
    const lang = localStorage.getItem('interface_language') || 'zh-TW';
    return i18n[lang] || i18n['zh-TW'] || {};
  };

  loadSavedData(elements, {
    setTranslationHistory,
    updateHistoryDisplay: () => updateHistoryDisplay(elements),
    filterModelsForServerAPI: () => filterModelsForServerAPI({
      aiModel: elements.aiModel,
      modelDescription: elements.modelDescription,
      translations: loadTranslations()
    }),
    showOpenRouterModels: () => showOpenRouterModels({
      aiModel: elements.aiModel,
      modelDescription: elements.modelDescription,
      customModelContainer: elements.customModelContainer,
      customModelInput: elements.customModelInput,
      translations: loadTranslations()
    }),
    showAllModels: () => showAllModels({
      aiModel: elements.aiModel,
      modelDescription: elements.modelDescription,
      customModelContainer: elements.customModelContainer,
      customModelInput: elements.customModelInput,
      translations: loadTranslations()
    }),
    handleModeChange: (mode) => handleModeChange(mode, elements),
    updateModelDescription: (id) => updateModelDescription(id, {
      modelDescription: elements.modelDescription,
      translations: loadTranslations()
    }),
    switchToTextMode: () => switchToTextMode(elements),
    switchToVoiceMode: () => switchToVoiceMode(elements),
    switchToVoiceChatMode: () => switchToVoiceChatMode(elements),
    switchToDualVoiceMode: () => switchToDualVoiceMode(elements),
    switchToDualVoiceChatMode: () => switchToDualVoiceChatMode(elements),
    switchToDualTextMode: () => switchToDualTextMode(elements),
  });
  
  // Initialize interface language
  const savedLang = localStorage.getItem('interface_language') || 'zh-TW';
  if (elements.interfaceLanguage) {
    elements.interfaceLanguage.value = savedLang;
  }
  updateInterfaceLanguage(savedLang, elements);

  // header 的模型 chip（模型清單在 loadSavedData 內可能已被重建）
  updateModelChip(elements);
  elements.aiModel?.addEventListener('change', () => updateModelChip(elements));

  // Non-blocking: ask the backend whether its key may spend on paid models.
  void syncServerModelPolicy(elements);

  // Restore persisted source/target languages
  try {
    const savedSource = localStorage.getItem('source_language');
    const savedTarget = localStorage.getItem('target_language');
    if (savedSource && elements.sourceLanguage.querySelector(`option[value="${savedSource}"]`)) {
      elements.sourceLanguage.value = savedSource;
    }
    if (savedTarget && elements.targetLanguage.querySelector(`option[value="${savedTarget}"]`)) {
      elements.targetLanguage.value = savedTarget;
    }
    if (getIsDualMode()) updateUserLabels(elements);
  } catch {
    // ignore language restore failures
  }

  // Persist language choices
  if (elements.sourceLanguage) {
    elements.sourceLanguage.addEventListener('change', function () {
      try {
        localStorage.setItem('source_language', this.value);
      } catch {
        // ignore
      }
      if (getIsDualMode()) updateUserLabels(elements);
    });
  }
  if (elements.targetLanguage) {
    elements.targetLanguage.addEventListener('change', function () {
      try {
        localStorage.setItem('target_language', this.value);
      } catch {
        // ignore
      }
      if (getIsDualMode()) updateUserLabels(elements);
    });
  }

  // Restore voice-chat auto-play preference
  const autoPlayBox = document.getElementById('voiceChatAutoPlay');
  if (autoPlayBox) {
    try {
      const saved = localStorage.getItem(AUTOPLAY_STORAGE_KEY);
      autoPlayBox.checked = saved === null ? true : saved !== 'false';
    } catch {
      autoPlayBox.checked = true;
    }
  }

  // Restore dual conversation context preference
  const contextToggle = document.getElementById('dualContextToggle');
  if (contextToggle) {
    try {
      const saved = localStorage.getItem(CONTEXT_STORAGE_KEY);
      contextToggle.checked = saved === null ? true : saved !== 'false';
    } catch {
      contextToggle.checked = true;
    }
  }
  const contextWindow = document.getElementById('dualContextWindow');
  if (contextWindow) {
    try {
      const saved = localStorage.getItem(CONTEXT_WINDOW_STORAGE_KEY);
      if (saved !== null && contextWindow.querySelector(`option[value="${saved}"]`)) {
        contextWindow.value = saved;
      }
    } catch {
      // ignore restore failures
    }
  }

  // Paint dual-mic captions once at startup
  refreshDualMicLabels(elements);
  refreshRecordButtonLabels(elements);

  // Voice-chat panel: visualizer skeleton + correct initial visibility
  ensureVisualizerBars();
  setVoiceChatLive(t('voiceChatLivePlaceholder') || '', true);
  updateVoiceChatVisibility();
  
  // Initialize tooltip positioning
  initTooltipPositioning();
  
  // Initialize extra target language checkboxes
  populateExtraTargetCheckboxes(elements);

  // 2 分頁 + Bottom Sheet（取代桌面式的長滾動與 8 欄面板）
  initTabs();
  initSheets(elements);

  // 離線：全域 banner + 擋住錄音入口；文字翻譯與歷史仍可瀏覽
  void watchNetwork((online) => {
    document.documentElement.classList.toggle('is-offline', !online);
    if (!online) {
      showError(t('statusOffline') || '目前離線：語音辨識與雲端翻譯不可用', elements);
    }
  });

  // Android 返回鍵 + 字級重讀
  if (isNative()) {
    void onFontScaleChange();

    void (async () => {
      try {
        const mod = await import('@capacitor/app');
        mod.App.addListener('backButton', () => {
          const openSheet = document.querySelector('.sheet.open');
          if (openSheet) {
            openSheet.classList.remove('open');
            document.body.classList.remove('sheet-open');
            document.getElementById('sheetBackdrop')?.setAttribute('hidden', '');
            return;
          }
          const openModal = document.querySelector('.modal-backdrop.open');
          if (openModal) {
            openModal.classList.remove('open');
            return;
          }
          mod.App.exitApp();
        });
        // 在背景改完系統字級再回來：重讀，否則會出現「字沒變但版面已 compact」
        mod.App.addListener('resume', () => {
          void refreshFontScale();
        });
      } catch {
        // 沒有 App 插件時交給系統預設行為
      }
    })();
  }

  // Initialize ASR model selector (OpenRouter voice conversation)
  if (elements.asrModel) {
    elements.asrModel.innerHTML = Object.entries(OPENROUTER_ASR_MODELS)
      .map(([id, model]) => `<option value="${id}">${model.name} (${model.vendor})</option>`)
      .join('');
    const savedAsr = getSavedAsrModel();
    if (OPENROUTER_ASR_MODELS[savedAsr]) elements.asrModel.value = savedAsr;
    updateAsrDescription(elements.asrModel.value);
    elements.asrModel.addEventListener('change', function () {
      setSavedAsrModel(this.value);
      updateAsrDescription(this.value);
    });
  }

  function updateAsrDescription(modelId) {
    if (!elements.asrModelDescription) return;
    const model = OPENROUTER_ASR_MODELS[modelId];
    elements.asrModelDescription.textContent = model
      ? `${model.name}：${model.description}`
      : '選擇一個語音辨識模型';
  }

  console.log('Kilo Translation App v3.0.0 ready!');
}

/**
 * header 上的模型 chip：只顯示模型名稱，點擊開 sheet 看完整說明。
 * 模型清單會被 filterModelsForServerAPI() 重建，所以每次重建後都要重畫。
 */
function updateModelChip(elements) {
  const chipText = document.getElementById('modelChipText');
  if (!chipText || !elements.aiModel) return;
  const option = elements.aiModel.selectedOptions?.[0];
  const label = (option?.textContent || '').replace(/[（(][^)）]*[)）]/g, '').trim();
  // 去掉開頭的全大寫廠牌（NVIDIA / OPENAI / GOOGLE…），否則 128px 只放得下「NV…」
  const words = label.split(/\s+/).filter(Boolean);
  const hasVendorPrefix = words.length > 1 && /^[A-Z0-9][A-Z0-9.+-]*$/.test(words[0]);
  const short = (hasVendorPrefix ? words.slice(1).join(' ') : label) || 'AI 模型';
  chipText.textContent = short;
  document.getElementById('modelChip')?.setAttribute('title', option?.textContent?.trim() || 'AI 模型設定');
}

/**
 * 能力提示：只在真的缺東西時出現，而且不擋任何流程。
 * textOnly 是「麥克風不可用」而非「App 不可用」。
 */
function renderCapabilityNotice(report, elements) {
  const notice = document.getElementById('capabilityNotice');
  if (!notice) return;

  if (report.level !== 'textOnly') {
    notice.classList.add('hidden');
    notice.textContent = '';
    return;
  }

  notice.classList.remove('hidden');
  notice.textContent = t('capabilityTextOnly') || '此裝置無法錄音，已切換為文字模式；翻譯與朗讀仍可正常使用。';
  if (elements.recordButton) elements.recordButton.setAttribute('aria-disabled', 'true');
}

/**
 * 依能力報告收掉不可用的入口。
 * 注意：只 disable / 加 aria-disabled，不移除節點 —— 移除會讓既有事件綁定 TypeError。
 */
function applyCapabilityGating(report, elements) {
  if (report.missing.includes('recording')) {
    const micButtons = [
      elements.recordButton,
      document.getElementById('dualMicA'),
      document.getElementById('dualMicB'),
    ].filter(Boolean);
    micButtons.forEach((btn) => {
      btn.disabled = true;
      btn.setAttribute('aria-disabled', 'true');
    });
  }
}

/**
 * Ask the backend whether its key may use paid models, then re-render the
 * server-key list. Any failure keeps the free-only default — this must never
 * block startup.
 */
async function syncServerModelPolicy(elements) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(apiUrl('/api/health'), { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) return;

    const data = await response.json();
    setServerPaidEnabled(Boolean(data.paidModelsEnabled));

    if (elements.serverApiKey?.checked) {
      const lang = localStorage.getItem('interface_language') || 'zh-TW';
      filterModelsForServerAPI({
        aiModel: elements.aiModel,
        modelDescription: elements.modelDescription,
        translations: i18n[lang] || i18n['zh-TW'] || {}
      });
      updateModelChip(elements);
    }
  } catch {
    // Offline, static host, or no health endpoint — stay on free models.
  }
}

// Get current application state (passed to translation functions)
function getAppState(extra = {}) {  return {
    isDualMode: getIsDualMode(),
    currentUser: getCurrentUser(),
    speaker: extra.speaker,
    history: extra.history,
    translationMode: document.querySelector('input[name="translationMode"]:checked')?.value || 'stream',
    translationStyle: document.querySelector('input[name="translationStyle"]:checked')?.value || 'normal',
    apiKeySource: document.querySelector('input[name="apiKeySource"]:checked')?.value || 'server',
    interfaceLanguage: localStorage.getItem('interface_language') || 'zh-TW',
    addToHistory: (...args) => addToHistory(...args, elements),
    addToHistoryInDualMode: (...args) => addToHistoryInDualMode(...args, elements),
    updateHistoryDisplay: () => updateHistoryDisplay(elements),
    showError: (msg) => showError(msg, elements),
    hideError: () => hideError(elements),
    showSuccess: (msg) => showSuccess(msg, elements),
    updateStatus: (status, msg) => updateStatus(status, msg, elements),
  };
}

// Initialize when DOM is ready — 但先等系統字級就緒（bootReady），確保首屏就是正確字級。
document.addEventListener('DOMContentLoaded', () => {
  void bootReady.then(() => {
    initializeApp();
  });
});

// Service Worker：web 版照舊註冊；原生容器不註冊並主動清除殘留。
// 理由：dist 已本地化，SW 沒有額外離線價值，而 cache-first 的固定 CACHE_NAME
// 會在 cap sync 換版後持續供應舊 HTML/JS —— 使用者「更新了但畫面沒變」且無法自癒。
if ('serviceWorker' in navigator) {
  if (isNative()) {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => registrations.forEach((registration) => registration.unregister()))
      .catch(() => {});
    if (window.caches) {
      window.caches.keys()
        .then((keys) => Promise.all(keys.map((key) => window.caches.delete(key))))
        .catch(() => {});
    }
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW registration failed — app still works without it
      });
    });
  }
}