// Kilo Translation App - Speech Recognition & Synthesis
//
// 兩條錄音路徑（由 capabilities.js 決定，不由本檔猜）：
//   web  + Web Speech 可用 → 即時逐字
//   native / Web Speech 不可用 → MediaRecorder → 後端 ASR（/api/transcribe）
// 朗讀一律走 tts.js 適配層（原生插件 / speechSynthesis），不在這裡直接碰 speechSynthesis。

import { t } from './i18n.js';
import { isIOSDevice } from './utils.js';
import {
  getSavedAsrModel,
  isVoiceConversationSupported,
  pickRecorderMimeType,
  transcribeAudio,
  transcribeAudioDirect,
} from './asr.js';
import { speak, stopSpeaking, isSpeechAvailable } from './tts.js';
import {
  checkMicPermission,
  requestMicPermission,
  openAppSettings,
  hapticTap,
} from './capabilities.js';
import {
  startChatTimer,
  stopChatTimer,
  startVisualizer,
  stopVisualizer,
  setVoiceChatState,
  setVoiceChatLive,
  setDualMicActive,
  getRecentConversationTurns,
  isDualContextEnabled,
} from './voicechat.js';

// Module-level state
let recognition = null;
let isRecording = false;

// Voice-conversation (MediaRecorder → OpenRouter ASR) state
let mediaRecorder = null;
let mediaStream = null;
let mediaChunks = [];
let voiceConversationActive = false;
// Which dual-mic side is recording ('A' | 'B' | null); cleared on stop.
let activeDualSide = null;
// 語音對話錄音中是否正在朗讀（朗讀時不搶麥）
let isSpeaking = false;

// Stored callbacks from initialization
let _callbacks = {};

/**
 * Whether the OpenRouter voice-conversation path (mic → ASR model) is on.
 * The UI toggles this via the input-mode radio in each transcript box.
 * @param {object} elements
 */
export function isVoiceConversationMode(elements) {
  const dualVisible = elements?.dualTranscriptSection && !elements.dualTranscriptSection.classList.contains('hidden');
  if (dualVisible) {
    return document.querySelector('input[name="dualInputMode"]:checked')?.value === 'voice-chat';
  }
  return document.querySelector('input[name="inputMode"]:checked')?.value === 'voice-chat';
}

/**
 * Get the current recording state.
 * @returns {boolean}
 */
export function getIsRecording() {
    return isRecording;
}

/**
 * Set the recording state.
 * @param {boolean} value
 */
export function setIsRecording(value) {
    isRecording = value;
}

/**
 * Initialize the Web Speech API SpeechRecognition.
 *
 * 注意：WebView 沒有這個 API 是「預期行為」，不是錯誤。
 * 只有連 MediaRecorder 都沒有的裝置才真的不能錄音（textOnly）。
 *
 * @param {object} elements - DOM element references
 * @param {object} callbacks - Callback functions:
 *   { onTranslate, updateStatus, showError, hideError }
 */
export function initializeSpeechRecognition(elements, callbacks) {
    _callbacks = callbacks;

    // 干擾處理：切背景 / 通話中斷 / 耳機拔出都必須停止錄音，但保留已辨識文字
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && isRecording) {
            stopRecording(elements);
            _callbacks.updateStatus?.('ready', t('statusReady') || '準備就緒');
        }
    });

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        console.warn('SpeechRecognition not available in this browser');
        if (!isVoiceConversationSupported()) {
            // 真正的 textOnly：麥克風入口由 main.js 依能力報告收掉
            console.warn('語音對話路徑也不可用（無 MediaRecorder），進入 textOnly 模式');
        } else {
            console.warn('Web Speech API 缺失，改用語音對話（後端 ASR）路徑');
        }
        return;
    }
    recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = elements.sourceLanguage.value;

    recognition.onstart = function() {
        _callbacks.updateStatus('recording', t('statusRecording') || '正在聆聽...');
        if (elements.volumeIndicator) {
            elements.volumeIndicator.classList.add('active');
        }
    };

    recognition.onresult = function(event) {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }

        if (finalTranscript) {
            elements.sourceText.textContent = finalTranscript;
            _callbacks.onTranslate(finalTranscript);
        } else if (interimTranscript) {
            elements.sourceText.textContent = interimTranscript + '...';
        }
    };

    recognition.onerror = function(event) {
        console.error('語音辨識錯誤:', event.error);

        // 降級而非報錯收工：Web Speech 掛掉時直接改走後端 ASR
        if ((event.error === 'not-allowed' || event.error === 'network') && isVoiceConversationSupported()) {
            isRecording = false;
            startVoiceConversation(elements, {
                isDualMode: false,
                currentUser: 'A',
            });
            return;
        }

        let errorMessage = t('statusError') || '語音辨識發生錯誤: ';

        switch(event.error) {
            case 'no-speech':
                errorMessage += t('noSpeechDetected') || '未檢測到語音輸入';
                break;
            case 'audio-capture':
                errorMessage += t('audioCaptureError') || '無法存取麥克風';
                break;
            case 'not-allowed':
                errorMessage += t('microphonePermissionDenied') || '麥克風權限被拒絕';
                break;
            case 'network':
                errorMessage += t('networkError') || '網路連線錯誤';
                break;
            default:
                errorMessage += event.error;
        }

        _callbacks.showError(errorMessage);
        stopRecording(elements);
    };

    recognition.onend = function() {
        if (isRecording) {
            recognition.start();
        } else {
            _callbacks.updateStatus('ready', t('statusReady') || '準備就緒');
            if (elements.volumeIndicator) {
                elements.volumeIndicator.classList.remove('active');
            }
        }
    };
}

/**
 * Toggle speech recognition on/off.
 * @param {object} elements
 * @param {object} [options] { isDualMode, currentUser, speaker }
 * @returns {boolean} new recording state
 */
export function toggleRecording(elements, options = {}) {
    if (isRecording) {
        stopRecording(elements);
        return false;
    }
    startRecording(elements, options);
    return true;
}

/**
 * Dual-mic entry: tap A's or B's mic to record that side.
 * Tapping the active side stops; tapping the other side while recording
 * restarts the turn for that side (fluent back-and-forth).
 * @param {object} elements
 * @param {'A'|'B'} side
 */
export async function toggleDualMic(elements, side) {
    if (isRecording) {
        if (activeDualSide === side) {
            setDualMicActive(null);
            activeDualSide = null;
            stopRecording(elements);
            return false;
        }
        // Switch sides mid-flow: stop current capture, then start the new side.
        setDualMicActive(null);
        activeDualSide = null;
        stopRecording(elements);
        await new Promise((resolve) => setTimeout(resolve, 350));
    }
    activeDualSide = side;
    setDualMicActive(side);
    await startRecording(elements, { isDualMode: true, currentUser: side, speaker: side });
    return true;
}

/**
 * 麥克風權限「先判後要」。
 * 首次：先出 App 內說明 → 再請求系統權限
 * 拒絕一次：仍可再要（但每次都先出說明，不自動彈系統框）
 * 永久拒絕：不彈框，deep-link 到系統設定頁
 *
 * @param {object} elements
 * @returns {Promise<boolean>} 是否可繼續錄音
 */
async function ensureMicPermission(elements) {
    const state = await checkMicPermission();

    if (state === 'granted' || state === 'unavailable') return true;

    // 永久拒絕：不彈系統框（彈了也不會出現），一步帶到系統設定
    if (state === 'denied') {
        const opened = await showBlockedNotice(elements);
        if (opened) {
            await openAppSettings();
            _callbacks.showError?.(t('micEnableInSettings') || '請在系統設定中允許麥克風，返回後再按一次');
        }
        return false;
    }

    // state === 'prompt'：先說明用途，使用者同意後才請求。
    // 拒絕過一次也是 prompt —— 所以每次都會先出說明，不會自動彈系統框。
    const agreed = await showMicRationale();
    if (!agreed) return false;

    const granted = await requestMicPermission();
    if (granted === 'granted') return true;

    if (granted === 'blocked') {
        const opened = await showBlockedNotice(elements);
        if (opened) {
            await openAppSettings();
            _callbacks.showError?.(t('micEnableInSettings') || '請在系統設定中允許麥克風，返回後再按一次');
        }
        return false;
    }

    _callbacks.showError?.(t('microphonePermissionDenied') || '麥克風權限被拒絕');
    return false;
}

/** App 內說明（後端無法在系統框前插話，所以自己出一個）。 */
function showMicRationale() {
    return new Promise((resolve) => {
        const modal = document.getElementById('micRationaleModal');
        if (!modal) {
            // 沒有 modal（舊版 HTML / 測試環境）時不硬擋
            resolve(true);
            return;
        }
        const close = (value) => {
            modal.classList.remove('open');
            modal.querySelector('#micRationaleAllow')?.removeEventListener('click', onAllow);
            modal.querySelector('#micRationaleCancel')?.removeEventListener('click', onCancel);
            resolve(value);
        };
        const onAllow = () => close(true);
        const onCancel = () => close(false);
        modal.querySelector('#micRationaleAllow')?.addEventListener('click', onAllow);
        modal.querySelector('#micRationaleCancel')?.addEventListener('click', onCancel);
        modal.classList.add('open');
        modal.querySelector('#micRationaleAllow')?.focus();
    });
}

/** 永久拒絕後的一步救援。 */
function showBlockedNotice(elements) {
    return new Promise((resolve) => {
        const modal = document.getElementById('micBlockedModal');
        if (!modal) {
            _callbacks.showError?.(t('micBlockedHint') || '麥克風權限已被永久關閉，請至系統設定開啟');
            resolve(false);
            return;
        }
        const close = (value) => {
            modal.classList.remove('open');
            modal.querySelector('#micBlockedOpenSettings')?.removeEventListener('click', onOpen);
            modal.querySelector('#micBlockedCancel')?.removeEventListener('click', onCancel);
            resolve(value);
        };
        const onOpen = () => close(true);
        const onCancel = () => close(false);
        modal.querySelector('#micBlockedOpenSettings')?.addEventListener('click', onOpen);
        modal.querySelector('#micBlockedCancel')?.addEventListener('click', onCancel);
        modal.classList.add('open');
        void elements;
    });
}

/**
 * Start speech recognition.
 * @param {object} elements
 * @param {object} [options] { isDualMode, currentUser, speaker }
 */
export async function startRecording(elements, options = {}) {
    if (navigator.onLine === false) {
        _callbacks.showError?.(t('statusOffline') || '目前離線，語音功能不可用；文字翻譯仍可正常使用');
        return;
    }

    const permitted = await ensureMicPermission(elements);
    if (!permitted) return;

    void hapticTap();

    const voiceChat = isVoiceConversationMode(elements);
    if (voiceChat || !recognition) {
        if (isVoiceConversationSupported()) {
            startVoiceConversation(elements, options);
            return;
        }
        if (!recognition) {
            _callbacks.showError(t('voiceRecognitionNotInitialized') || '語音辨識功能未初始化');
            return;
        }
        // Voice-chat requested but MediaRecorder unavailable → fall back to Web Speech
    }

    const { isDualMode = false, currentUser = 'A' } = options;

    try {
        if (isDualMode) {
            recognition.lang = currentUser === 'A'
                ? elements.sourceLanguage.value
                : elements.targetLanguage.value;
        } else {
            recognition.lang = elements.sourceLanguage.value;
        }

        if (isIOSDevice()) {
            console.log('iOS 設備：開始語音辨識');
        }

        recognition.start();
        isRecording = true;
        _updateRecordButton(elements, true);
        elements.sourceText.textContent = t('listening') || '正在聆聽...';
        if (elements.targetText) {
            elements.targetText.textContent = t('waitingTranslation') || '等待翻譯...';
        }
        _callbacks.hideError();
    } catch (error) {
        console.error('無法開始語音辨識:', error);

        if (error.name === 'NotAllowedError') {
            _callbacks.showError(t('microphonePermissionDenied') || '麥克風權限被拒絕。請在瀏覽器設置中允許麥克風存取權限。');
        } else if (error.name === 'NotFoundError') {
            _callbacks.showError(t('microphoneNotFound') || '未找到麥克風設備。請確保您的設備有可用的麥克風。');
        } else if (error.name === 'NotReadableError') {
            _callbacks.showError(t('microphoneNotReadable') || '無法讀取麥克風。請檢查麥克風是否被其他應用程式佔用。');
        } else {
            _callbacks.showError(t('cannotStartVoiceRecognition') || '無法開始語音辨識，請檢查麥克風權限');
        }
    }
}

/**
 * Stop speech recognition.
 * @param {object} elements
 */
export function stopRecording(elements) {
    if (voiceConversationActive) {
        stopVoiceConversation(elements);
        return;
    }
    if (recognition && isRecording) {
        recognition.stop();
    }
    isRecording = false;
    activeDualSide = null;
    _updateRecordButton(elements, false);
    setDualMicActive(null);
}

/**
 * Start a voice-conversation turn: record mic audio, transcribe with the
 * selected OpenRouter ASR model, then feed the text into the normal
 * translation pipeline via onTranslate.
 * @param {object} elements
 * @param {object} [options] { isDualMode, currentUser }
 */
export async function startVoiceConversation(elements, options = {}) {
  const { isDualMode = false, currentUser = 'A', speaker = null } = options;
  if (voiceConversationActive) return;

  if (!isVoiceConversationSupported()) {
    _callbacks.showError(t('voiceChatNotSupported') || '此瀏覽器不支援語音對話錄音，請改用語音輸入或文字輸入');
    return;
  }

  // 朗讀中不搶麥：先停朗讀，避免把自己的聲音錄進去
  if (isSpeaking) {
    await stopSpeaking();
  }

  const sourceLang = isDualMode && currentUser === 'B'
    ? elements.targetLanguage.value
    : elements.sourceLanguage.value;
  const sourceBox = isDualMode ? elements.dualSourceText : elements.sourceText;

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    console.error('無法存取麥克風:', error);
    if (error?.name === 'NotAllowedError') {
      _callbacks.showError(t('microphonePermissionDenied') || '麥克風權限被拒絕。請在設定中允許麥克風存取權限。');
    } else if (error?.name === 'NotReadableError') {
      _callbacks.showError(t('microphoneNotReadable') || '麥克風被其他應用程式佔用，請關閉後再試');
    } else {
      _callbacks.showError(t('audioCaptureError') || '無法存取麥克風');
    }
    return;
  }

  // 耳機拔出 / 系統搶麥：音軌 ended 時立即停止，不錄靜音軌
  mediaStream.getAudioTracks().forEach((track) => {
    track.addEventListener('ended', () => {
      if (voiceConversationActive) {
        stopVoiceConversation(elements);
        _callbacks.showError?.(t('audioInterrupted') || '音訊中斷（耳機拔出或裝置被佔用），已停止錄音');
      }
    });
  });

  mediaChunks = [];
  const mimeType = pickRecorderMimeType();
  try {
    mediaRecorder = mimeType ? new MediaRecorder(mediaStream, { mimeType }) : new MediaRecorder(mediaStream);
  } catch (error) {
    console.error('無法建立錄音器:', error);
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
    _callbacks.showError(t('voiceChatNotSupported') || '此瀏覽器不支援語音對話錄音');
    return;
  }

  voiceConversationActive = true;
  isRecording = true;
  if (isDualMode) activeDualSide = speaker || currentUser;
  _updateRecordButton(elements, true);
  _callbacks.hideError();
  _callbacks.updateStatus('recording', t('statusRecording') || '正在聆聽...');
  if (sourceBox) sourceBox.textContent = t('listening') || '正在聆聽...';
  startChatTimer();
  startVisualizer(mediaStream);
  setVoiceChatState('listening');
  setVoiceChatLive(t('listening') || '正在聆聽...', false);

  mediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) mediaChunks.push(event.data);
  };

  mediaRecorder.onstop = async () => {
    const tracks = mediaStream ? mediaStream.getTracks() : [];
    tracks.forEach((track) => track.stop());
    mediaStream = null;
    voiceConversationActive = false;
    stopChatTimer();
    stopVisualizer();

    const blobType = mediaRecorder.mimeType || mimeType || 'audio/webm';
    const audioBlob = new Blob(mediaChunks, { type: blobType });
    mediaChunks = [];
    isRecording = false;
    _updateRecordButton(elements, false);

    if (audioBlob.size === 0) {
      _callbacks.updateStatus('ready', t('statusReady') || '準備就緒');
      setVoiceChatState('idle');
      return;
    }

    try {
      _callbacks.updateStatus('translating', t('transcribing') || '正在辨識語音...');
      setVoiceChatState('working');
      if (sourceBox) sourceBox.textContent = `${t('transcribing') || '正在辨識語音...'}`;
      setVoiceChatLive(t('transcribing') || '正在辨識語音...', false);

      const useServerKey = elements.serverApiKey ? elements.serverApiKey.checked : true;
      const userKey = elements.apiKey ? elements.apiKey.value.trim() : '';
      const result = useServerKey || !userKey
        ? await transcribeAudio(audioBlob, { model: getSavedAsrModel(), language: sourceLang })
        : await transcribeAudioDirect(audioBlob, userKey, { model: getSavedAsrModel(), language: sourceLang });

      const text = (result.text || '').trim();
      if (!text) {
        _callbacks.showError(t('noSpeechDetected') || '未檢測到語音輸入');
        _callbacks.updateStatus('ready', t('statusReady') || '準備就緒');
        setVoiceChatState('idle');
        return;
      }
      if (sourceBox) sourceBox.textContent = text;
      setVoiceChatLive(text, false);
      _callbacks.updateStatus('ready', t('statusReady') || '準備就緒');
      _callbacks.onTranslate(text, {
        speaker: isDualMode ? (speaker || currentUser) : undefined,
        history: isDualMode && isDualContextEnabled() ? getRecentConversationTurns() : undefined,
      });
    } catch (error) {
      console.error('語音對話轉錄失敗:', error);
      _callbacks.showError(error.message);
      _callbacks.updateStatus('error', t('statusError') || '發生錯誤');
      setVoiceChatState('idle');
    }
  };

  mediaRecorder.onerror = (event) => {
    console.error('錄音錯誤:', event.error);
    stopVoiceConversation(elements);
    _callbacks.showError(t('audioCaptureError') || '無法存取麥克風');
  };

  mediaRecorder.start();
}

function stopVoiceConversation(elements) {
  voiceConversationActive = false;
  activeDualSide = null;
  stopChatTimer();
  stopVisualizer();
  setVoiceChatState('idle');
  setDualMicActive(null);
  try {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
  } catch (error) {
    console.error('停止錄音失敗:', error);
    if (mediaStream) mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
    isRecording = false;
    _updateRecordButton(elements, false);
  }
}

/**
 * 唯一的錄音狀態出口。
 *
 * 規則四（唯一真相）：`[aria-pressed]` 是唯一狀態源，同時驅動
 * 圖示形狀（.icon-mic / .icon-stop）、aria-pressed、aria-label、CSS 環與盤面。
 * 形狀必須與語意同源 —— 畫面是停止方塊而 TalkBack 唸「開始錄音」即判失敗。
 *
 * @param {object} elements
 * @param {boolean} recording
 */
function _updateRecordButton(elements, recording) {
    if (!elements.recordButton) return;
    const button = elements.recordButton;
    button.classList.toggle('recording', recording);
    button.setAttribute('aria-pressed', String(recording));
    button.setAttribute('aria-label', describeRecordButton(recording, elements));

    // A/B 兩顆麥：label 也必須跟著狀態換，否則 TalkBack 只會唸「按鈕」
    ['A', 'B'].forEach((side) => {
        const btn = document.getElementById(side === 'A' ? 'dualMicA' : 'dualMicB');
        if (!btn) return;
        const isActive = recording && activeDualSide === side;
        btn.setAttribute('aria-pressed', String(isActive));
        btn.classList.toggle('is-recording', isActive);
        btn.setAttribute('aria-label', describeDualMic(side, isActive, elements));
    });

    if (elements.volumeIndicator) {
        elements.volumeIndicator.classList.toggle('active', recording);
    }
}

/**
 * 焦點 / 語意文字：角色 + 語言 + 狀態。
 * 切換介面語言時由 speech.js 的 refreshRecordButtonLabels() 重跑。
 */
function describeRecordButton(recording, elements) {
    const lang = elements?.sourceLanguage?.selectedOptions?.[0]?.textContent?.trim() || '';
    const base = recording
        ? (t('stopRecording') || '停止錄音')
        : (t('startRecording') || '開始錄音');
    if (!lang) return base;
    return recording ? `${base}，${lang}` : `${base}，${lang}`;
}

function describeDualMic(side, recording, elements) {
    const nameKey = side === 'A' ? 'userA' : 'userB';
    const name = t(nameKey) || `使用者 ${side}`;
    const langCode = side === 'A' ? elements?.sourceLanguage?.value : elements?.targetLanguage?.value;
    const lang = elements?.[side === 'A' ? 'sourceLanguage' : 'targetLanguage']?.selectedOptions?.[0]?.textContent?.trim()
        || langCode || '';
    const stateText = recording
        ? (t('statusRecording') || '錄音中')
        : (t('startRecording') || '開始錄音');
    return `${name}，${lang}，${stateText}`;
}

/** 介面語言切換後重跑 label（不得各自維護開關）。 */
export function refreshRecordButtonLabels(elements) {
    if (!elements?.recordButton) return;
    const recording = elements.recordButton.getAttribute('aria-pressed') === 'true';
    elements.recordButton.setAttribute('aria-label', describeRecordButton(recording, elements));
    ['A', 'B'].forEach((side) => {
        const btn = document.getElementById(side === 'A' ? 'dualMicA' : 'dualMicB');
        if (!btn) return;
        const isActive = btn.getAttribute('aria-pressed') === 'true';
        btn.setAttribute('aria-label', describeDualMic(side, isActive, elements));
    });
}

/**
 * Play the translated text using the TTS adapter (native plugin / web speechSynthesis).
 * @param {object} elements
 */
export async function playTranslation(elements, textOverride, langOverride) {
    const readText = (textOverride ?? elements.targetText?.textContent ?? '').trim();
    const readLang = langOverride || elements.targetLanguage?.value;
    if (!readText || readText === (t('waitingTranslation') || '等待翻譯...')) {
        _callbacks.showError(t('noContentToRead') || '沒有可朗讀的翻譯內容');
        return;
    }

    if (!isSpeechAvailable()) {
        _callbacks.showError(t('speechSynthesisNotSupported') || '此裝置不支援語音朗讀，請直接閱讀文字');
        return;
    }

    isSpeaking = true;
    if (elements.playTranslation) elements.playTranslation.disabled = true;
    _callbacks.updateStatus('speaking', t('statusSpeaking') || '正在朗讀...');

    const result = await speak(readText, readLang, {
        rate: 0.9,
        onError: (message) => {
            _callbacks.showError(message);
            _callbacks.updateStatus('error', t('statusError') || '朗讀失敗');
        },
    });

    isSpeaking = false;
    if (elements.playTranslation) elements.playTranslation.disabled = false;
    if (!result.error && !result.cancelled) {
        _callbacks.updateStatus('ready', t('statusReady') || '準備就緒');
    }
}

/** 供外部（如語音對話自動朗讀）判斷目前是否在朗讀。 */
export function getIsSpeaking() {
    return isSpeaking;
}
