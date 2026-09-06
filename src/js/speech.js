// Kilo Translation App - Speech Recognition & Synthesis
import { t } from './i18n.js';
import { isMobileDevice, isIOSDevice, isSafariBrowser } from './utils.js';
import { languageMap } from './models.js';
import {
  getSavedAsrModel,
  isVoiceConversationSupported,
  pickRecorderMimeType,
  transcribeAudio,
  transcribeAudioDirect,
} from './asr.js';
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
 * @param {object} elements - DOM element references
 * @param {object} callbacks - Callback functions:
 *   { onTranslate, updateStatus, showError, hideError }
 */
export function initializeSpeechRecognition(elements, callbacks) {
    _callbacks = callbacks;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        console.warn('SpeechRecognition not available in this browser');
        if (!isVoiceConversationSupported()) {
            _callbacks.showError(t('browserNotSupported') || '此瀏覽器不支援語音辨識功能');
            if (elements.recordButton) {
                elements.recordButton.disabled = true;
            }
        } else {
            console.warn('Web Speech API 缺失，但仍可使用語音對話（OpenRouter ASR）模式');
        }
        return;
    }
    recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = elements.sourceLanguage.value;

    recognition.onstart = function() {
        console.log('語音辨識已開始');
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
        console.log('語音辨識已結束');
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
    startRecording(elements, { isDualMode: true, currentUser: side, speaker: side });
    return true;
}

/**
 * Start speech recognition.
 * @param {object} elements
 * @param {object} [options] { isDualMode, currentUser, speaker }
 */
export function startRecording(elements, options = {}) {
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

  const sourceLang = isDualMode && currentUser === 'B'
    ? elements.targetLanguage.value
    : elements.sourceLanguage.value;
  const sourceBox = isDualMode ? elements.dualSourceText : elements.sourceText;

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    console.error('無法存取麥克風:', error);
    _callbacks.showError(t('microphonePermissionDenied') || '麥克風權限被拒絕。請在瀏覽器設置中允許麥克風存取權限。');
    return;
  }

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
 * Update the visual state of the record button.
 * @param {object} elements
 * @param {boolean} recording
 */
function _updateRecordButton(elements, recording) {
    if (!elements.recordButton) return;
    elements.recordButton.classList.toggle('recording', recording);
    elements.recordButton.setAttribute('aria-pressed', String(recording));
    elements.recordButton.setAttribute('aria-label', recording
        ? (t('stopRecording') || '停止錄音')
        : (t('startRecording') || '開始錄音'));
    if (elements.volumeIndicator) {
        elements.volumeIndicator.classList.toggle('active', recording);
    }
}

/**
 * Play the translated text using the SpeechSynthesis API.
 * @param {object} elements
 */
export function playTranslation(elements, textOverride, langOverride) {
    const readText = (textOverride ?? elements.targetText.textContent ?? '').trim();
    const readLang = langOverride || elements.targetLanguage.value;
    if (!readText || readText === (t('waitingTranslation') || '等待翻譯...')) {
        _callbacks.showError(t('noContentToRead') || '沒有可朗讀的翻譯內容');
        return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(readText);
    utterance.lang = readLang;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    const isIOS = isIOSDevice();
    if (isIOS) {
        utterance.rate = 0.8;
        if (readText.length > 200) {
            const sentences = readText.split(/[.!?。！？]/);
            if (sentences.length > 1) {
                speakSentences(sentences, readLang, elements);
                return;
            }
        }
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
        const targetVoice = voices.find(voice =>
            voice.lang.startsWith(readLang.split('-')[0])
        );
        if (targetVoice) {
            utterance.voice = targetVoice;
        }
    }

    utterance.onstart = function() {
        _callbacks.updateStatus('speaking', t('statusSpeaking') || '正在朗讀...');
        elements.playTranslation.disabled = true;
    };

    utterance.onend = function() {
        _callbacks.updateStatus('ready', t('statusReady') || '準備就緒');
        elements.playTranslation.disabled = false;
    };

    utterance.onerror = function(event) {
        console.error('語音合成錯誤:', event.error);
        let errorMessage = t('speechSynthesisNotSupported') || '語音合成失敗: ';

        switch(event.error) {
            case 'network':
                errorMessage += t('networkError') || '網路錯誤';
                break;
            case 'synthesis-unavailable':
                errorMessage += '語音合成服務不可用';
                break;
            case 'language-unavailable':
                errorMessage += '不支援的語言';
                break;
            case 'voice-unavailable':
                errorMessage += '不支援的語音';
                break;
            case 'text-too-long':
                errorMessage += '文字過長';
                break;
            case 'rate-not-supported':
                errorMessage += '不支援的語速';
                break;
            case 'canceled':
                _callbacks.updateStatus('ready', t('statusReady') || '準備就緒');
                elements.playTranslation.disabled = false;
                return;
            default:
                errorMessage += event.error;
        }

        _callbacks.showError(errorMessage);
        _callbacks.updateStatus('error', t('statusError') || '朗讀失敗');
        elements.playTranslation.disabled = false;
    };

    if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.addEventListener('voiceschanged', function() {
            window.speechSynthesis.speak(utterance);
        }, { once: true });
    } else {
        window.speechSynthesis.speak(utterance);
    }
}

/**
 * Speak long text in chunks (for iOS Safari compatibility).
 * @param {string[]} sentences
 * @param {string} lang
 * @param {object} elements
 */
function speakSentences(sentences, lang, elements) {
    let index = 0;

    function speakNext() {
        if (index >= sentences.length) {
            _callbacks.updateStatus('ready', t('statusReady') || '準備就緒');
            elements.playTranslation.disabled = false;
            return;
        }

        const sentence = sentences[index].trim();
        if (sentence) {
            const utterance = new SpeechSynthesisUtterance(sentence);
            utterance.lang = lang;
            utterance.rate = 0.8;
            utterance.volume = 1;

            utterance.onend = function() {
                index++;
                speakNext();
            };

            utterance.onerror = function() {
                index++;
                speakNext();
            };

            window.speechSynthesis.speak(utterance);
        } else {
            index++;
            speakNext();
        }
    }

    speakNext();
}
