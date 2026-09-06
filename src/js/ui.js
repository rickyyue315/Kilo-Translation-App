// Kilo Translation App - UI Management

import { i18n, t, updateInterfaceLanguage } from './i18n.js';
import {
    languageMap,
    updateModelDescription,
    filterModelsForServerAPI,
    showAllModels
} from './models.js';
import { getExtraTargetLanguages, setExtraTargetLanguages } from './translation.js';
import { toggleRecording, startRecording, stopRecording, playTranslation, getIsRecording } from './speech.js';
import { loadSavedData, isMobileDevice } from './utils.js';

// ========== Module-level State ==========

let isDualMode = false;
let currentUser = 'A';
let _elements = null;
let _callbacks = null;

// ========== State Accessors ==========

export function getIsDualMode() { return isDualMode; }
export function setIsDualMode(value) { isDualMode = value; }
export function getCurrentUser() { return currentUser; }
export function setCurrentUser(value) { currentUser = value; }

// ========== Event Listeners Setup ==========

/**
 * Set up ALL UI event listeners.
 * @param {object} elements
 * @param {object} callbacks
 */
export function setupEventListeners(elements, callbacks = {}) {
    _elements = elements;
    _callbacks = callbacks;

    const {
        translateText: _translateText,
        translateTextInDualMode: _translateTextInDualMode,
        clearHistory: _clearHistory
    } = callbacks;

    // Interface language
    const interfaceLanguageSelector = document.getElementById('interfaceLanguage');
    if (interfaceLanguageSelector) {
        interfaceLanguageSelector.addEventListener('change', function () {
            updateInterfaceLanguage(this.value, elements);
        });
    }

    // Record button toggle
    if (elements.recordButton) {
        elements.recordButton.addEventListener('click', function () {
            toggleRecording(elements, { isDualMode: getIsDualMode(), currentUser: getCurrentUser() });
        });
    }

    // Legacy buttons kept for compatibility if referenced elsewhere
    if (elements.startRecording) {
        elements.startRecording.addEventListener('click', function () {
            startRecording(elements, { isDualMode: getIsDualMode(), currentUser: getCurrentUser() });
        });
    }
    if (elements.stopRecording) {
        elements.stopRecording.addEventListener('click', function () {
            stopRecording(elements);
        });
    }

    elements.playTranslation.addEventListener('click', function () {
        playTranslation(elements);
    });

    elements.clearHistory.addEventListener('click', function () {
        openConfirmClearModal(_clearHistory);
    });

    elements.swapLanguages.addEventListener('click', function () {
        swapLanguages(elements);
        populateExtraTargetCheckboxes(elements);
    });

    // Re-populate extra targets when source/target changes
    if (elements.sourceLanguage) {
        elements.sourceLanguage.addEventListener('change', function () {
            populateExtraTargetCheckboxes(elements);
        });
    }
    if (elements.targetLanguage) {
        elements.targetLanguage.addEventListener('change', function () {
            populateExtraTargetCheckboxes(elements);
        });
    }

    // API key source
    elements.serverApiKey.addEventListener('change', function () {
        if (this.checked) {
            elements.userApiKeySection.classList.add('hidden');
            elements.serverApiKeySection.classList.remove('hidden');
            filterModelsForServerAPI({
                aiModel: elements.aiModel,
                modelDescription: elements.modelDescription,
                translations: _getTranslations()
            });
            localStorage.setItem('api_key_source', 'server');
        }
    });

    elements.userApiKey.addEventListener('change', function () {
        if (this.checked) {
            elements.userApiKeySection.classList.remove('hidden');
            elements.serverApiKeySection.classList.add('hidden');
            showAllModels({
                aiModel: elements.aiModel,
                modelDescription: elements.modelDescription,
                customModelContainer: elements.customModelContainer,
                customModelInput: elements.customModelInput,
                translations: _getTranslations()
            });
            localStorage.setItem('api_key_source', 'user');
        }
    });

    elements.apiKey.addEventListener('change', function () {
        localStorage.setItem('openrouter_api_key', this.value);
    });

    // AI model
    elements.aiModel.addEventListener('change', function () {
        const selectedModel = this.value;
        localStorage.setItem('selected_ai_model', selectedModel);

        if (selectedModel === 'custom') {
            elements.customModelContainer.classList.remove('hidden');
            elements.customModelInput.focus();
        } else {
            elements.customModelContainer.classList.add('hidden');
        }

        updateModelDescription(selectedModel, {
            modelDescription: elements.modelDescription,
            translations: _getTranslations()
        });
    });

    elements.customModelInput.addEventListener('input', function () {
        const customModelId = this.value.trim();
        if (customModelId) {
            localStorage.setItem('custom_ai_model', customModelId);
            updateModelDescription('custom', {
                modelDescription: elements.modelDescription,
                translations: _getTranslations()
            }, customModelId);
        }
    });

    elements.customModelInput.addEventListener('blur', function () {
        const translations = _getTranslations();
        const customModelId = this.value.trim();
        if (!customModelId) {
            showError(translations.enterCustomModelId || '請輸入有效的模型 ID', elements);
        }
    });

    // Translation mode
    elements.streamMode.addEventListener('change', function () {
        localStorage.setItem('translation_mode', 'stream');
    });

    elements.standardMode.addEventListener('change', function () {
        localStorage.setItem('translation_mode', 'standard');
    });

    // Input mode
    elements.voiceInputMode.addEventListener('change', function () {
        if (this.checked) switchToVoiceMode(elements);
    });

    if (elements.voiceChatInputMode) {
        elements.voiceChatInputMode.addEventListener('change', function () {
            if (this.checked) switchToVoiceChatMode(elements);
        });
    }

    elements.textInputMode.addEventListener('change', function () {
        if (this.checked) switchToTextMode(elements);
    });

    // Text translate
    elements.translateTextBtn.addEventListener('click', function () {
        const text = elements.sourceTextInput.value.trim();
        if (text) {
            elements.sourceText.textContent = text;
            if (_translateText) _translateText(text);
        } else {
            showError(_getTranslations().waitingTextInput || '請輸入要翻譯的文字', elements);
        }
    });

    elements.clearTextBtn.addEventListener('click', function () {
        elements.sourceTextInput.value = '';
        elements.sourceTextInput.focus();
    });

    elements.sourceTextInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' && event.ctrlKey) {
            event.preventDefault();
            elements.translateTextBtn.click();
        }
    });

    // Mode type
    elements.singleModeType.addEventListener('change', function () {
        if (this.checked) handleModeChange('single', elements);
    });

    elements.dualModeType.addEventListener('change', function () {
        if (this.checked) handleModeChange('dual', elements);
    });

    elements.swapUsers.addEventListener('click', function () {
        swapUsers(elements);
    });

    // Dual input mode
    elements.dualVoiceInputMode.addEventListener('change', function () {
        if (this.checked) switchToDualVoiceMode(elements);
    });

    if (elements.dualVoiceChatInputMode) {
        elements.dualVoiceChatInputMode.addEventListener('change', function () {
            if (this.checked) switchToDualVoiceChatMode(elements);
        });
    }

    elements.dualTextInputMode.addEventListener('change', function () {
        if (this.checked) switchToDualTextMode(elements);
    });

    elements.dualTranslateTextBtn.addEventListener('click', function () {
        const text = elements.dualSourceTextInput.value.trim();
        if (text) {
            elements.dualSourceText.textContent = text;
            if (_translateTextInDualMode) _translateTextInDualMode(text);
        } else {
            showError(_getTranslations().waitingTextInput || '請輸入要翻譯的文字', elements);
        }
    });

    elements.dualClearTextBtn.addEventListener('click', function () {
        elements.dualSourceTextInput.value = '';
        elements.dualSourceTextInput.focus();
    });

    // Translation style chips
    const styleRadios = document.querySelectorAll('input[name="translationStyle"]');
    styleRadios.forEach(radio => {
        radio.addEventListener('change', function () {
            if (this.checked) {
                localStorage.setItem('translation_style', this.value);
            }
        });
    });

    // Bypass English intermediate step
    if (elements.bypassEnglishStep) {
        elements.bypassEnglishStep.addEventListener('change', function () {
            localStorage.setItem('bypass_english_step', this.checked ? 'true' : 'false');
        });
    }

    // Extra target language checkboxes (delegated)
    const extraTargetContainer = document.getElementById('extraTargetLanguages');
    if (extraTargetContainer) {
        extraTargetContainer.addEventListener('change', function (e) {
            if (e.target.type === 'checkbox' && e.target.dataset.lang) {
                const checked = Array.from(this.querySelectorAll('input[type="checkbox"]:checked'))
                    .map(cb => cb.dataset.lang);
                setExtraTargetLanguages(checked);
            }
        });
    }

    // Settings toggle
    if (elements.settingsToggle && elements.settingsPanel) {
        elements.settingsToggle.addEventListener('click', function () {
            const expanded = this.getAttribute('aria-expanded') === 'true';
            this.setAttribute('aria-expanded', String(!expanded));
            elements.settingsPanel.classList.toggle('open');
        });
    }

    // Help modal
    if (elements.helpBtn && elements.shortcutsModal) {
        elements.helpBtn.addEventListener('click', openShortcutsModal);
        elements.closeShortcutsModal.addEventListener('click', closeShortcutsModal);
        elements.shortcutsOkBtn.addEventListener('click', closeShortcutsModal);
        elements.shortcutsModal.addEventListener('click', function (e) {
            if (e.target === elements.shortcutsModal) closeShortcutsModal();
        });
    }

    // Confirm clear modal
    if (elements.confirmClearModal) {
        elements.closeConfirmClearModal.addEventListener('click', closeConfirmClearModal);
        elements.cancelClearBtn.addEventListener('click', closeConfirmClearModal);
        elements.confirmClearModal.addEventListener('click', function (e) {
            if (e.target === elements.confirmClearModal) closeConfirmClearModal();
        });
    }

    // Global keyboard shortcuts
    document.addEventListener('keydown', function (event) {
        handleGlobalKeydown(event, elements, callbacks);
    });
}

// ========== Mode Switching ==========

export function handleModeChange(mode, elements) {
    isDualMode = (mode === 'dual');

    if (isDualMode) {
        // 切換到雙人模式
        elements.singleTranscriptSection.classList.add('hidden');
        elements.dualTranscriptSection.classList.remove('hidden');
        elements.swapUsers.classList.remove('hidden');
        localStorage.setItem('translation_mode_type', 'dual');
        updateUserLabels(elements);
    } else {
        // 切換到單人模式
        elements.singleTranscriptSection.classList.remove('hidden');
        elements.dualTranscriptSection.classList.add('hidden');
        elements.swapUsers.classList.add('hidden');
        localStorage.setItem('translation_mode_type', 'single');
    }

    if (getIsRecording()) {
        stopRecording(elements);
    }
}

export function swapUsers(elements) {
    currentUser = (currentUser === 'A') ? 'B' : 'A';
    updateUserLabels(elements);

    const translations = _getTranslations();

    elements.dualSourceText.textContent = translations.waitingInput || '等待輸入...';
    elements.dualTargetText.textContent = translations.waitingTranslation || '等待翻譯...';
    elements.englishText.textContent = translations.waitingTranslation || '等待翻譯...';

    if (getIsRecording()) {
        stopRecording(elements);
    }
}

export function updateUserLabels(elements) {
    const sourceLang = languageMap[elements.sourceLanguage.value];
    const targetLang = languageMap[elements.targetLanguage.value];
    const translations = _getTranslations();

    if (currentUser === 'A') {
        elements.userALabel.textContent = `${translations.userA || '使用者 A'} (${sourceLang})`;
        elements.userBLabel.textContent = `${translations.userB || '使用者 B'} (${targetLang})`;
    } else {
        elements.userALabel.textContent = `${translations.userA || '使用者 A'} (${targetLang})`;
        elements.userBLabel.textContent = `${translations.userB || '使用者 B'} (${sourceLang})`;
    }
}

export function switchToDualVoiceMode(elements) {
    elements.dualTextInputContainer.classList.remove('open');
    elements.dualSourceText.classList.remove('hidden');
    if (elements.recordButton) elements.recordButton.classList.remove('hidden');
    localStorage.setItem('dual_input_mode', 'voice');
    if (getIsRecording()) stopRecording(elements);
}

export function switchToDualVoiceChatMode(elements) {
    elements.dualTextInputContainer.classList.remove('open');
    elements.dualSourceText.classList.remove('hidden');
    if (elements.recordButton) elements.recordButton.classList.remove('hidden');
    localStorage.setItem('dual_input_mode', 'voice-chat');
    if (getIsRecording()) stopRecording(elements);
}

export function switchToDualTextMode(elements) {
    elements.dualSourceText.classList.add('hidden');
    elements.dualTextInputContainer.classList.add('open');
    if (elements.recordButton) elements.recordButton.classList.add('hidden');
    localStorage.setItem('dual_input_mode', 'text');
    if (getIsRecording()) stopRecording(elements);
    elements.dualSourceTextInput.focus();
}

// ========== Single-Mode Input Switching ==========

export function switchToVoiceChatMode(elements) {
    elements.textInputContainer.classList.remove('open');
    elements.sourceText.classList.remove('hidden');
    if (elements.recordButton) elements.recordButton.classList.remove('hidden');
    localStorage.setItem('input_mode', 'voice-chat');
    if (getIsRecording()) stopRecording(elements);
}

export function switchToVoiceMode(elements) {
    elements.textInputContainer.classList.remove('open');
    elements.sourceText.classList.remove('hidden');
    if (elements.recordButton) elements.recordButton.classList.remove('hidden');
    localStorage.setItem('input_mode', 'voice');
    if (getIsRecording()) stopRecording(elements);
}

export function switchToTextMode(elements) {
    elements.sourceText.classList.add('hidden');
    elements.textInputContainer.classList.add('open');
    if (elements.recordButton) elements.recordButton.classList.add('hidden');
    localStorage.setItem('input_mode', 'text');
    if (getIsRecording()) stopRecording(elements);
    elements.sourceTextInput.focus();
}

export function swapLanguages(elements) {
    const temp = elements.sourceLanguage.value;
    elements.sourceLanguage.value = elements.targetLanguage.value;
    elements.targetLanguage.value = temp;
}

// ========== Status & Notifications ==========

export function updateStatus(status, message, elements) {
    elements.statusDot.className = 'status-dot';

    switch (status) {
        case 'ready':
        case 'translating':
        case 'speaking':
            elements.statusDot.classList.add('active');
            break;
        case 'recording':
            elements.statusDot.classList.add('recording');
            break;
        case 'error':
        default:
            break;
    }

    const translations = _getTranslations();
    const statusKey = 'status' + status.charAt(0).toUpperCase() + status.slice(1);
    if (translations && translations[statusKey]) {
        elements.statusText.textContent = translations[statusKey];
    } else {
        elements.statusText.textContent = message;
    }
}

export function showError(message, elements) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('success');
    elements.errorMessage.classList.add('show');

    setTimeout(() => {
        hideError(elements);
    }, 3000);
}

export function hideError(elements) {
    elements.errorMessage.classList.remove('show');
}

export function showSuccess(message, elements) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.add('success');
    elements.errorMessage.classList.add('show');

    setTimeout(() => {
        hideError(elements);
        elements.errorMessage.classList.remove('success');
    }, 2000);
}

// ========== Volume Animation ==========

export function animateVolumeIndicator(elements) {
    if (!getIsRecording()) return;

    const bars = elements.volumeIndicator.querySelectorAll('.volume-bar');
    bars.forEach(bar => {
        const height = Math.random() * 18 + 2;
        bar.style.height = `${height}px`;
    });

    if (getIsRecording()) {
        requestAnimationFrame(() => animateVolumeIndicator(elements));
    }
}

// ========== Modals ==========

export function openShortcutsModal() {
    if (!_elements?.shortcutsModal) return;
    _elements.shortcutsModal.classList.add('open');
    _elements.shortcutsModal.querySelector('button, [href], input, select, textarea')?.focus();
}

export function closeShortcutsModal() {
    if (!_elements?.shortcutsModal) return;
    _elements.shortcutsModal.classList.remove('open');
    _elements.helpBtn?.focus();
}

function openConfirmClearModal(clearCallback) {
    if (!_elements?.confirmClearModal) return;

    const confirmBtn = _elements.confirmClearBtn;
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    _elements.confirmClearBtn = newConfirmBtn;

    newConfirmBtn.addEventListener('click', function () {
        if (clearCallback) clearCallback();
        closeConfirmClearModal();
    });

    _elements.confirmClearModal.classList.add('open');
    _elements.cancelClearBtn?.focus();
}

export function closeConfirmClearModal() {
    if (!_elements?.confirmClearModal) return;
    _elements.confirmClearModal.classList.remove('open');
    _elements.clearHistory?.focus();
}

// ========== Keyboard Shortcuts ==========

export function handleGlobalKeydown(event, elements, callbacks) {
    const target = event.target;
    const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);

    // ? - open shortcuts help (not when typing)
    if (event.key === '?' && !isTyping && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        openShortcutsModal();
        return;
    }

    // Esc - close modals first, then stop recording
    if (event.key === 'Escape') {
        if (_elements?.shortcutsModal?.classList.contains('open')) {
            event.preventDefault();
            closeShortcutsModal();
            return;
        }
        if (_elements?.confirmClearModal?.classList.contains('open')) {
            event.preventDefault();
            closeConfirmClearModal();
            return;
        }
        if (getIsRecording()) {
            event.preventDefault();
            stopRecording(elements);
            return;
        }
    }

    // Ctrl/Cmd + L - swap languages
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        swapLanguages(elements);
        return;
    }

    // Space - toggle recording (not when typing or a button is focused)
    if (event.code === 'Space' && !isTyping && target?.tagName !== 'BUTTON') {
        event.preventDefault();
        toggleRecording(elements, { isDualMode: getIsDualMode(), currentUser: getCurrentUser() });
        return;
    }
}

// ========== Extra Target Languages ==========

/**
 * Populate the extra target language checkboxes based on current source/target selection.
 * Excludes source and main target from the available options.
 * @param {object} elements - DOM elements reference
 */
export function populateExtraTargetCheckboxes(elements) {
    const container = document.getElementById('extraTargetLanguages');
    if (!container) return;

    const sourceLang = elements.sourceLanguage.value;
    const mainTargetLang = elements.targetLanguage.value;
    const savedExtras = getExtraTargetLanguages();

    // All languages except source and main target
    const available = Object.entries(languageMap).filter(
        ([code]) => code !== sourceLang && code !== mainTargetLang
    );

    container.innerHTML = available.map(([code, name]) => `
        <label class="style-chip">
            <input type="checkbox" data-lang="${code}" ${savedExtras.includes(code) ? 'checked' : ''}>
            <span>${name}</span>
        </label>
    `).join('');
}

// ========== Tooltip Positioning ==========

export function initTooltipPositioning() {
    document.querySelectorAll('.tooltip').forEach(tooltip => {
        const tooltiptext = tooltip.querySelector('.tooltiptext');
        if (!tooltiptext) return;

        tooltip.addEventListener('mouseenter', function () {
            const rect = tooltip.getBoundingClientRect();
            const tooltipWidth = tooltiptext.offsetWidth || 220;
            const tooltipHeight = tooltiptext.offsetHeight;

            let left = rect.left + rect.width / 2 - tooltipWidth / 2;
            let top = rect.top - tooltipHeight - 10;

            if (left < 10) left = 10;
            if (left + tooltipWidth > window.innerWidth - 10) {
                left = window.innerWidth - tooltipWidth - 10;
            }

            if (top < 10) {
                top = rect.bottom + 10;
                tooltiptext.setAttribute('data-arrow-direction', 'down');
            } else {
                tooltiptext.setAttribute('data-arrow-direction', 'up');
            }

            tooltiptext.style.left = left + 'px';
            tooltiptext.style.top = top + 'px';
            tooltiptext.style.visibility = 'visible';
            tooltiptext.style.opacity = '1';
        });

        tooltip.addEventListener('mouseleave', function () {
            tooltiptext.style.visibility = 'hidden';
            tooltiptext.style.opacity = '0';
        });
    });
}

// ========== Internal Helpers ==========

function _getTranslations() {
    const lang = localStorage.getItem('interface_language') || 'zh-TW';
    return i18n[lang] || i18n['zh-TW'] || {};
}
