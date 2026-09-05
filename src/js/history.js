// Kilo Translation App - Translation History Management
import { t } from './i18n.js';
import { i18n } from './i18n.js';
import { getCurrentUser } from './ui.js';

let translationHistory = [];

export function getTranslationHistory() {
    return translationHistory;
}

export function setTranslationHistory(history) {
    translationHistory = history;
}

export function addToHistory(sourceText, targetText, sourceLang, targetLang, englishText, elements) {
    const englishRef = englishText || '';
    const historyItem = {
        id: Date.now(),
        timestamp: new Date().toLocaleString('zh-TW'),
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
        sourceText: sourceText,
        targetText: targetText,
        englishReference: englishRef,
        mode: 'single'
    };

    translationHistory.unshift(historyItem);

    if (translationHistory.length > 50) {
        translationHistory = translationHistory.slice(0, 50);
    }

    localStorage.setItem('translation_history', JSON.stringify(translationHistory));
    updateHistoryDisplay(elements);
}

export function addToHistoryInDualMode(sourceText, targetText, sourceLang, targetLang, englishText, elements) {
    const englishRef = englishText || '';
    const currentUser = getCurrentUser();

    const historyItem = {
        id: Date.now(),
        timestamp: new Date().toLocaleString('zh-TW'),
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
        sourceText: sourceText,
        targetText: targetText,
        englishReference: englishRef,
        mode: 'dual',
        user: currentUser
    };

    translationHistory.unshift(historyItem);

    if (translationHistory.length > 50) {
        translationHistory = translationHistory.slice(0, 50);
    }

    localStorage.setItem('translation_history', JSON.stringify(translationHistory));
    updateHistoryDisplay(elements);
}

export function updateHistoryDisplay(elements) {
    elements.historyCount.textContent = translationHistory.length;

    const currentInterfaceLanguage = localStorage.getItem('interface_language') || 'zh-TW';
    const translations = i18n[currentInterfaceLanguage];

    if (translationHistory.length === 0) {
        elements.historyList.innerHTML = `<p class="history-empty">${translations.noHistory || '暫無翻譯歷史'}</p>`;
        return;
    }

    const historyHTML = translationHistory.map(item => {
        const userLabel = item.mode === 'dual'
            ? (item.user === 'A' ? (translations.userA || '使用者 A') : (translations.userB || '使用者 B'))
            : (translations.singleTranslation || '單人翻譯');

        const hasEnglish = item.englishReference && item.englishReference !== '不需要英語參考';
        const columnsClass = hasEnglish ? 'history-columns-3' : 'history-columns-2';

        const englishBlock = hasEnglish ? `
            <div class="history-source history-english">
                <strong>${translations.englishText || '英語:'}</strong> ${escapeHtml(item.englishReference)}
            </div>
        ` : '';

        return `
            <div class="history-item" data-id="${item.id}">
                <div class="history-item-header">
                    <span>${userLabel}: ${item.sourceLanguage} → ${item.targetLanguage}</span>
                    <div class="history-item-actions">
                        <button type="button" class="icon-btn history-copy" data-action="copy" title="${translations.copy || '複製翻譯'}" aria-label="${translations.copy || '複製翻譯'}">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                        </button>
                        <button type="button" class="icon-btn history-replay" data-action="replay" title="${translations.replay || '朗讀'}" aria-label="${translations.replay || '朗讀'}">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                        </button>
                        <button type="button" class="icon-btn history-delete" data-action="delete" title="${translations.delete || '刪除'}" aria-label="${translations.delete || '刪除'}">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </button>
                    </div>
                </div>
                <div class="history-item-content ${columnsClass}">
                    <div class="history-source">
                        <strong>${translations.originalText || '原文:'}</strong> ${escapeHtml(item.sourceText)}
                    </div>
                    ${englishBlock}
                    <div class="history-target">
                        <strong>${translations.translatedText || '翻譯:'}</strong> ${escapeHtml(item.targetText)}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    elements.historyList.innerHTML = historyHTML;
}

export function clearHistory(elements) {
    if (translationHistory.length === 0) {
        const msg = t('noHistoryToClear') || '沒有歷史記錄需要清除';
        if (typeof elements._showError === 'function') {
            elements._showError(msg);
        }
        return;
    }

    translationHistory = [];
    localStorage.removeItem('translation_history');
    updateHistoryDisplay(elements);
    const successMsg = t('historyCleared') || '歷史記錄已清除';
    if (typeof elements._showSuccess === 'function') {
        elements._showSuccess(successMsg);
    }
}

export function copyHistoryItem(id) {
    const item = translationHistory.find(i => i.id === id);
    if (!item) return;
    const text = `${item.sourceText}\n${item.targetText}`;
    navigator.clipboard.writeText(text).catch(() => {});
}

export function deleteHistoryItem(id, elements) {
    translationHistory = translationHistory.filter(i => i.id !== id);
    localStorage.setItem('translation_history', JSON.stringify(translationHistory));
    updateHistoryDisplay(elements);
}

export function getHistoryItemTargetText(id) {
    const item = translationHistory.find(i => i.id === id);
    return item?.targetText || '';
}

export function attachHistoryListeners(elements, callbacks = {}) {
    if (!elements.historyList) return;

    elements.historyList.addEventListener('click', function (event) {
        const button = event.target.closest('button[data-action]');
        if (!button) return;

        const itemEl = button.closest('.history-item');
        if (!itemEl) return;

        const id = Number(itemEl.dataset.id);
        const action = button.dataset.action;

        if (action === 'copy') {
            copyHistoryItem(id);
            if (callbacks.showSuccess) {
                callbacks.showSuccess(t('copied') || '已複製到剪貼簿');
            }
        } else if (action === 'replay') {
            const text = getHistoryItemTargetText(id);
            if (callbacks.replayText && text) {
                callbacks.replayText(text);
            }
        } else if (action === 'delete') {
            deleteHistoryItem(id, elements);
        }
    });
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
