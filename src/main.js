// Kilo Translation App - Main Entry Point
import './styles/main.css';
import { i18n, t, updateInterfaceLanguage } from './js/i18n.js';
import { languageMap, aiModels, modelCategories, freeModelsOnly, updateModelDescription, filterModelsForServerAPI, showOpenRouterModels, showAllModels } from './js/models.js';
import { isMobileDevice, isIOSDevice, isSafariBrowser, checkBrowserSupport, createVolumeIndicator, loadSavedData } from './js/utils.js';
import { initializeSpeechRecognition, startRecording, stopRecording, playTranslation, getIsRecording } from './js/speech.js';
import { OPENROUTER_ASR_MODELS, getSavedAsrModel, setSavedAsrModel } from './js/asr.js';
import { translateText, translateTextInDualMode, performTranslation, getCurrentTranslation } from './js/translation.js';
import { addToHistory, addToHistoryInDualMode, updateHistoryDisplay, clearHistory, setTranslationHistory, attachHistoryListeners } from './js/history.js';
import { setupEventListeners, handleModeChange, swapUsers, updateUserLabels, updateStatus, showError, hideError, showSuccess, animateVolumeIndicator, initTooltipPositioning, initTheme, getIsDualMode, getCurrentUser, switchToTextMode, switchToVoiceMode, switchToVoiceChatMode, switchToDualVoiceMode, switchToDualVoiceChatMode, switchToDualTextMode, populateExtraTargetCheckboxes } from './js/ui.js';
import { ensureVisualizerBars, setVoiceChatLive, AUTOPLAY_STORAGE_KEY, updateVoiceChatVisibility } from './js/voicechat.js';

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
  
  // Browser support check
  checkBrowserSupport((msg) => showError(msg, elements));
  
  // Create volume indicator
  createVolumeIndicator(elements.volumeIndicator);
  
  // Initialize speech recognition
  initializeSpeechRecognition(elements, {
    onTranslate: (text) => {
      if (getIsDualMode()) {
        translateTextInDualMode(text, elements, getAppState());
      } else {
        translateText(text, elements, getAppState());
      }
    },
    updateStatus: (status, msg) => updateStatus(status, msg, elements),
    showError: (msg) => showError(msg, elements),
    hideError: () => hideError(elements),
  });
  
  // Setup all event listeners
  setupEventListeners(elements, {
    translateText: (text) => translateText(text, elements, getAppState()),
    translateTextInDualMode: (text) => translateTextInDualMode(text, elements, getAppState()),
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

  // Voice-chat panel: visualizer skeleton + correct initial visibility
  ensureVisualizerBars();
  setVoiceChatLive(t('voiceChatLivePlaceholder') || '', true);
  updateVoiceChatVisibility();
  
  // Initialize tooltip positioning
  initTooltipPositioning();
  
  // Initialize extra target language checkboxes
  populateExtraTargetCheckboxes(elements);

  // Initialize ASR model selector (OpenRouter voice conversation)
  if (elements.asrModel) {
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

// Get current application state (passed to translation functions)
function getAppState() {
  return {
    isDualMode: getIsDualMode(),
    currentUser: getCurrentUser(),
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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);
// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed — app still works without it
    });
  });
}