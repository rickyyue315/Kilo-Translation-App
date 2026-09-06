// Kilo Translation App - Voice Chat UI Manager
//
// DOM-driven helpers for the voice-conversation panel: state badge,
// live transcription text, visualizer bars, recording timer, panel
// visibility, and conversation turn bubbles.
//
// Dependency-free (no imports) so speech.js, translation.js and ui.js
// can all use it without creating import cycles.

export const VOICE_CHAT_BAR_COUNT = 28;
export const VOICE_CHAT_MAX_TURNS = 30;
export const AUTOPLAY_STORAGE_KEY = 'kilo_auto_speak';
export const THEME_STORAGE_KEY = 'kilo_theme';
export const CONTEXT_STORAGE_KEY = 'kilo_dual_context';
export const CONTEXT_WINDOW_STORAGE_KEY = 'kilo_dual_context_window';
export const DEFAULT_CONTEXT_WINDOW = 4;

function $(id) {
    return typeof document === 'undefined' ? null : document.getElementById(id);
}

export function formatChatTime(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

// ========== Recording timer ==========

let chatTimerId = null;
let chatTimerStart = 0;

function paintTimer() {
    const text = formatChatTime((Date.now() - chatTimerStart) / 1000);
    const vc = $('voiceChatTimer');
    if (vc) vc.textContent = text;
    const rec = $('recordTimer');
    if (rec) {
        rec.textContent = text;
        rec.classList.remove('hidden');
    }
}

export function startChatTimer() {
    stopChatTimer();
    chatTimerStart = Date.now();
    paintTimer();
    chatTimerId = setInterval(paintTimer, 250);
}

export function stopChatTimer() {
    if (chatTimerId !== null) {
        clearInterval(chatTimerId);
        chatTimerId = null;
    }
    const rec = $('recordTimer');
    if (rec) rec.classList.add('hidden');
}

// ========== Visualizer bars ==========

let visRaf = null;
let visCtx = null;
let visAnalyser = null;
let visData = null;

export function ensureVisualizerBars() {
    const box = $('voiceChatVisualizer');
    if (!box) return [];
    if (box.childElementCount !== VOICE_CHAT_BAR_COUNT) {
        box.innerHTML = '';
        for (let i = 0; i < VOICE_CHAT_BAR_COUNT; i += 1) {
            const bar = document.createElement('span');
            bar.className = 'vc-bar';
            bar.style.height = '6px';
            box.appendChild(bar);
        }
    }
    return Array.from(box.children);
}

function cancelVisualizer() {
    if (visRaf !== null) {
        if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(visRaf);
        visRaf = null;
    }
    if (visCtx) {
        try {
            visCtx.close();
        } catch {
            // ignore close failures
        }
        visCtx = null;
    }
    visAnalyser = null;
    visData = null;
}

function paintVisualizerFrame(bars) {
    if (visAnalyser && visData) {
        visAnalyser.getByteFrequencyData(visData);
        const step = Math.max(1, Math.floor(visData.length / bars.length));
        bars.forEach((bar, i) => {
            const v = visData[i * step] || 0;
            bar.style.height = `${Math.round(6 + (v / 255) * 56)}px`;
        });
    } else {
        bars.forEach((bar) => {
            bar.style.height = `${Math.round(6 + Math.random() * 54)}px`;
        });
    }
}

export function startVisualizer(stream) {
    const bars = ensureVisualizerBars();
    if (!bars.length || typeof requestAnimationFrame === 'undefined') return;
    cancelVisualizer();
    const AC = window.AudioContext || window.webkitAudioContext;
    if (stream && AC) {
        try {
            visCtx = new AC();
            const src = visCtx.createMediaStreamSource(stream);
            visAnalyser = visCtx.createAnalyser();
            visAnalyser.fftSize = 256;
            visAnalyser.smoothingTimeConstant = 0.75;
            visData = new Uint8Array(visAnalyser.frequencyBinCount);
            src.connect(visAnalyser);
        } catch {
            visAnalyser = null;
            visData = null;
        }
    }
    let last = 0;
    const loop = (now) => {
        if (now - last > 90) {
            last = now;
            paintVisualizerFrame(bars);
        }
        visRaf = requestAnimationFrame(loop);
    };
    visRaf = requestAnimationFrame(loop);
}

export function stopVisualizer() {
    cancelVisualizer();
    const bars = ensureVisualizerBars();
    bars.forEach((bar) => {
        bar.style.height = '6px';
    });
}

// ========== Panel state & live text ==========

export function setVoiceChatState(state) {
    const panel = $('voiceChatPanel');
    if (!panel) return;
    panel.classList.toggle('listening', state === 'listening');
    panel.classList.toggle('working', state === 'working');
}

export function setVoiceChatLive(text, isPlaceholder) {
    const el = $('voiceChatLiveText');
    if (!el) return;
    el.textContent = '';
    el.classList.toggle('is-placeholder', Boolean(isPlaceholder));
    el.appendChild(document.createTextNode(text || ''));
    if (!isPlaceholder) {
        const cursor = document.createElement('span');
        cursor.className = 'vc-cursor';
        cursor.setAttribute('aria-hidden', 'true');
        el.appendChild(cursor);
    }
}

export function isVoiceChatMode() {
    try {
        const dual = $('dualTranscriptSection');
        const dualVisible = dual ? !dual.classList.contains('hidden') : false;
        if (dualVisible) {
            return document.querySelector('input[name="dualInputMode"]:checked')?.value === 'voice-chat';
        }
        return document.querySelector('input[name="inputMode"]:checked')?.value === 'voice-chat';
    } catch {
        return false;
    }
}

export function getVoiceChatAutoPlay() {
    const box = $('voiceChatAutoPlay');
    if (box) return box.checked;
    try {
        return localStorage.getItem(AUTOPLAY_STORAGE_KEY) !== 'false';
    } catch {
        return true;
    }
}

export function setVoiceChatPanelVisible(visible) {
    const panel = $('voiceChatPanel');
    if (!panel) return;
    panel.classList.toggle('hidden', !visible);
}

export function updateVoiceChatVisibility() {
    const panel = $('voiceChatPanel');
    if (!panel) return;
    const single = $('singleTranscriptSection');
    const dual = $('dualTranscriptSection');
    const singleVisible = single ? !single.classList.contains('hidden') : true;
    const dualVisible = dual ? !dual.classList.contains('hidden') : false;
    const singleChat = getInputValue('inputMode') === 'voice-chat';
    const dualChat = getInputValue('dualInputMode') === 'voice-chat';
    const show = (singleVisible && singleChat) || (dualVisible && dualChat);
    setVoiceChatPanelVisible(show);
    try {
        document.body.classList.toggle('dual-mode', dualVisible);
        document.body.classList.toggle('dual-voice-chat', dualVisible && dualChat);
    } catch {
        // ignore DOM failures (non-browser env)
    }
}

function getInputValue(name) {
    try {
        return document.querySelector(`input[name="${name}"]:checked`)?.value || '';
    } catch {
        return '';
    }
}

// ========== Conversation turns ==========

const REPLAY_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
const COPY_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';

function replayTurn(text, lang) {
    try {
        if (!text || !('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang || 'en-US';
        utterance.rate = 0.9;
        const voices = window.speechSynthesis.getVoices() || [];
        const prefix = String(utterance.lang).split('-')[0];
        const voice = voices.find((v) => v.lang.startsWith(prefix));
        if (voice) utterance.voice = voice;
        window.speechSynthesis.speak(utterance);
    } catch {
        // ignore TTS failures on turn replay
    }
}

function copyTurn(text) {
    const done = () => {};
    try {
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(text).then(done).catch(done);
            return;
        }
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    } catch {
        // clipboard unavailable — ignore
    }
}

function makeBubble(cls, tag, text) {
    const bubble = document.createElement('div');
    bubble.className = `vc-bubble ${cls}`;
    if (tag) {
        const tagEl = document.createElement('span');
        tagEl.className = 'vc-lang-tag';
        tagEl.textContent = tag;
        bubble.appendChild(tagEl);
    }
    bubble.appendChild(document.createTextNode(text || ''));
    return bubble;
}

export function addVoiceChatTurn(opts) {
    const {
        speaker = '',
        speakerClass = 'speaker-a',
        sourceText = '',
        targetText = '',
        englishText = '',
        sourceLang = '',
        targetLang = '',
        error = ''
    } = opts || {};
    const list = $('voiceChatTurns');
    if (!list) return null;
    let empty = $('voiceChatEmpty');
    if (empty) {
        if (empty.parentElement !== list) list.appendChild(empty);
        empty.classList.add('hidden');
    }

    const turn = document.createElement('article');
    turn.className = 'vc-turn';
    if (error) turn.classList.add('is-error');
    const speakerSide = speakerClass === 'speaker-b' ? 'B' : 'A';
    turn.setAttribute('data-speaker', speakerSide);
    turn.classList.add(speakerSide === 'B' ? 'side-b' : 'side-a');

    const meta = document.createElement('div');
    meta.className = 'vc-turn-meta';
    const who = document.createElement('span');
    who.className = `vc-speaker ${speakerClass}`;
    who.textContent = speaker;
    meta.appendChild(who);
    const time = document.createElement('span');
    time.className = 'vc-time';
    try {
        time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
        time.textContent = '';
    }
    meta.appendChild(time);

    if (!error && targetText) {
        const actions = document.createElement('span');
        actions.className = 'vc-turn-actions';
        const replay = document.createElement('button');
        replay.type = 'button';
        replay.className = 'vc-mini-btn';
        replay.title = '朗讀';
        replay.setAttribute('aria-label', '朗讀');
        replay.innerHTML = REPLAY_ICON;
        replay.addEventListener('click', () => replayTurn(targetText, targetLang));
        const copy = document.createElement('button');
        copy.type = 'button';
        copy.className = 'vc-mini-btn';
        copy.title = '複製';
        copy.setAttribute('aria-label', '複製');
        copy.innerHTML = COPY_ICON;
        copy.addEventListener('click', () => copyTurn(targetText));
        actions.appendChild(replay);
        actions.appendChild(copy);
        meta.appendChild(actions);
    }
    turn.appendChild(meta);

    if (error) {
        const p = document.createElement('p');
        p.className = 'vc-error-text';
        p.textContent = error;
        turn.appendChild(p);
    } else {
        turn.appendChild(makeBubble('vc-bubble-source', sourceLang, sourceText));
        if (englishText) turn.appendChild(makeBubble('vc-bubble-en', 'EN', englishText));
        turn.appendChild(makeBubble('vc-bubble-target', targetLang, targetText));
    }

    list.appendChild(turn);
    empty = $('voiceChatEmpty');
    if (empty && empty.parentElement === list) list.appendChild(empty);
    list.querySelectorAll('.vc-turn.is-latest').forEach((el) => el.classList.remove('is-latest'));
    if (!error) turn.classList.add('is-latest');
    while (list.querySelectorAll('.vc-turn').length > VOICE_CHAT_MAX_TURNS) {
        const oldest = list.querySelector('.vc-turn');
        if (!oldest) break;
        oldest.remove();
    }
    list.scrollTop = list.scrollHeight;
    return turn;
}

export function clearVoiceChatTurns() {
    const list = $('voiceChatTurns');
    if (list) {
        const empty = $('voiceChatEmpty');
        list.innerHTML = '';
        if (empty) {
            empty.classList.remove('hidden');
            list.appendChild(empty);
        }
    } else {
        const empty = $('voiceChatEmpty');
        if (empty) empty.classList.remove('hidden');
    }
    setVoiceChatState('idle');
}

export function getVoiceChatTurnCount() {
    const list = $('voiceChatTurns');
    if (!list) return 0;
    return list.querySelectorAll('.vc-turn').length;
}

// ========== Dual conversation memory (context for coherent translation) ==========

export function isDualContextEnabled() {
    const box = $('dualContextToggle');
    if (box) return box.checked;
    try {
        const saved = localStorage.getItem(CONTEXT_STORAGE_KEY);
        return saved === null ? true : saved !== 'false';
    } catch {
        return true;
    }
}

export function getDualContextWindow() {
    const select = $('dualContextWindow');
    if (select) {
        const n = Number.parseInt(select.value, 10);
        if (Number.isFinite(n) && n >= 0 && n <= 10) return n;
    }
    try {
        const saved = Number.parseInt(localStorage.getItem(CONTEXT_WINDOW_STORAGE_KEY), 10);
        if (Number.isFinite(saved) && saved >= 0 && saved <= 10) return saved;
    } catch {
        // ignore storage failures
    }
    return DEFAULT_CONTEXT_WINDOW;
}

/**
 * Read the last N conversation turns from the voice-chat panel DOM.
 * Each entry: { speaker: 'A'|'B', sourceText, targetText }.
 * Pure DOM read — works in single or dual mode panels alike.
 * @param {number} [limit]
 * @returns {Array<{speaker: string, sourceText: string, targetText: string}>}
 */
export function getRecentConversationTurns(limit) {
    const list = $('voiceChatTurns');
    if (!list) return [];
    const n = Number.isFinite(limit) ? limit : getDualContextWindow();
    if (n <= 0) return [];
    const textOf = (turn, selector) => {
        const bubble = turn.querySelector(selector);
        if (!bubble) return '';
        return Array.from(bubble.childNodes)
            .filter((node) => node.nodeType === 3)
            .map((node) => node.textContent)
            .join('')
            .trim();
    };
    return Array.from(list.querySelectorAll('.vc-turn[data-speaker]'))
        .slice(-n)
        .map((turn) => ({
            speaker: turn.getAttribute('data-speaker') || '',
            sourceText: textOf(turn, '.vc-bubble-source'),
            targetText: textOf(turn, '.vc-bubble-target'),
        }))
        .filter((entry) => entry.sourceText || entry.targetText);
}

/**
 * Persist the dual-mic "which side is recording" indicator and paint both
 * mic buttons. Pass 'A', 'B', or null to clear.
 */
export function setDualMicActive(side) {
    const btnA = $('dualMicA');
    const btnB = $('dualMicB');
    [btnA, btnB].forEach((btn) => {
        if (btn) {
            btn.classList.remove('is-active');
            btn.removeAttribute('aria-pressed');
        }
    });
    const panel = $('voiceChatPanel');
    if (panel) {
        panel.classList.remove('mic-a-active', 'mic-b-active');
        if (side === 'A') panel.classList.add('mic-a-active');
        if (side === 'B') panel.classList.add('mic-b-active');
    }
    const active = side === 'A' ? btnA : side === 'B' ? btnB : null;
    if (active) {
        active.classList.add('is-active');
        active.setAttribute('aria-pressed', 'true');
    }
}

/**
 * Paint the dual-mic name/language captions to mirror the current
 * source/target selections and interface labels.
 * @param {object} [opts] { sourceLang, targetLang, userA, userB }
 */
export function updateDualMicLabels(opts = {}) {
    const nameA = $('dualMicNameA');
    const nameB = $('dualMicNameB');
    const langA = $('dualMicLangA');
    const langB = $('dualMicLangB');
    const btnA = $('dualMicA');
    const btnB = $('dualMicB');
    const { sourceLang = '', targetLang = '', userA = '', userB = '' } = opts;
    if (nameA && userA) nameA.textContent = userA;
    if (nameB && userB) nameB.textContent = userB;
    if (langA && sourceLang) langA.textContent = sourceLang;
    if (langB && targetLang) langB.textContent = targetLang;
    if (btnA && (userA || sourceLang)) {
        btnA.setAttribute('aria-label', `${userA || 'A'} · ${sourceLang}`);
    }
    if (btnB && (userB || targetLang)) {
        btnB.setAttribute('aria-label', `${userB || 'B'} · ${targetLang}`);
    }
}
