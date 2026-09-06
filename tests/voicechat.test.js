/**
 * Tests for src/js/voicechat.js (voice conversation UI helpers)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  VOICE_CHAT_BAR_COUNT,
  VOICE_CHAT_MAX_TURNS,
  CONTEXT_WINDOW_STORAGE_KEY,
  DEFAULT_CONTEXT_WINDOW,
  formatChatTime,
  ensureVisualizerBars,
  startChatTimer,
  stopChatTimer,
  setVoiceChatState,
  setVoiceChatLive,
  isVoiceChatMode,
  getVoiceChatAutoPlay,
  setVoiceChatPanelVisible,
  updateVoiceChatVisibility,
  addVoiceChatTurn,
  clearVoiceChatTurns,
  getVoiceChatTurnCount,
  isDualContextEnabled,
  getDualContextWindow,
  getRecentConversationTurns,
  setDualMicActive,
  updateDualMicLabels,
} from '../src/js/voicechat.js';

function mountShell() {
  document.body.innerHTML = `
    <section id="voiceChatPanel" class="hidden">
      <span id="voiceChatTimer">00:00</span>
      <div id="voiceChatVisualizer"></div>
      <p id="voiceChatLiveText"></p>
      <div id="voiceChatTurns"><p id="voiceChatEmpty">empty</p></div>
      <button id="dualMicA"></button>
      <button id="dualMicB"></button>
      <span id="dualMicNameA"></span>
      <span id="dualMicNameB"></span>
      <span id="dualMicLangA"></span>
      <span id="dualMicLangB"></span>
    </section>
    <span id="recordTimer" class="hidden">00:00</span>
    <section id="singleTranscriptSection">
      <input type="radio" name="inputMode" value="voice" checked>
      <input type="radio" name="inputMode" value="voice-chat">
    </section>
    <section id="dualTranscriptSection" class="hidden">
      <input type="radio" name="dualInputMode" value="voice" checked>
      <input type="radio" name="dualInputMode" value="voice-chat">
    </section>
    <input type="checkbox" id="voiceChatAutoPlay" checked>
    <input type="checkbox" id="dualContextToggle" checked>
    <select id="dualContextWindow">
      <option value="0">0</option>
      <option value="2">2</option>
      <option value="4" selected>4</option>
    </select>
  `;
}

beforeEach(() => {
  mountShell();
  localStorage.clear();
  stopChatTimer();
});

describe('formatChatTime', () => {
  it('pads minutes and seconds', () => {
    expect(formatChatTime(0)).toBe('00:00');
    expect(formatChatTime(5)).toBe('00:05');
    expect(formatChatTime(65)).toBe('01:05');
    expect(formatChatTime(600)).toBe('10:00');
  });

  it('floors fractional seconds and clamps negatives', () => {
    expect(formatChatTime(9.9)).toBe('00:09');
    expect(formatChatTime(-3)).toBe('00:00');
  });
});

describe('ensureVisualizerBars', () => {
  it('creates the expected number of bars', () => {
    const bars = ensureVisualizerBars();
    expect(bars).toHaveLength(VOICE_CHAT_BAR_COUNT);
    expect(document.getElementById('voiceChatVisualizer').children).toHaveLength(VOICE_CHAT_BAR_COUNT);
  });

  it('is idempotent on repeat calls', () => {
    ensureVisualizerBars();
    const again = ensureVisualizerBars();
    expect(again).toHaveLength(VOICE_CHAT_BAR_COUNT);
  });
});

describe('setVoiceChatState', () => {
  it('toggles listening and working classes', () => {
    const panel = document.getElementById('voiceChatPanel');
    setVoiceChatState('listening');
    expect(panel.classList.contains('listening')).toBe(true);
    setVoiceChatState('working');
    expect(panel.classList.contains('working')).toBe(true);
    expect(panel.classList.contains('listening')).toBe(false);
    setVoiceChatState('idle');
    expect(panel.classList.contains('listening')).toBe(false);
    expect(panel.classList.contains('working')).toBe(false);
  });
});

describe('setVoiceChatLive', () => {
  it('sets text and placeholder class', () => {
    const el = document.getElementById('voiceChatLiveText');
    setVoiceChatLive('hello', false);
    expect(el.textContent).toContain('hello');
    expect(el.classList.contains('is-placeholder')).toBe(false);
    setVoiceChatLive('waiting…', true);
    expect(el.textContent).toBe('waiting…');
    expect(el.classList.contains('is-placeholder')).toBe(true);
  });
});

describe('voice-chat visibility helpers', () => {
  it('detects single-mode voice-chat selection', () => {
    expect(isVoiceChatMode()).toBe(false);
    document.querySelector('input[name="inputMode"][value="voice-chat"]').checked = true;
    expect(isVoiceChatMode()).toBe(true);
  });

  it('shows the panel only in voice-chat mode', () => {
    updateVoiceChatVisibility();
    expect(document.getElementById('voiceChatPanel').classList.contains('hidden')).toBe(true);
    document.querySelector('input[name="inputMode"][value="voice-chat"]').checked = true;
    updateVoiceChatVisibility();
    expect(document.getElementById('voiceChatPanel').classList.contains('hidden')).toBe(false);
    setVoiceChatPanelVisible(false);
    expect(document.getElementById('voiceChatPanel').classList.contains('hidden')).toBe(true);
  });

  it('reads the auto-play checkbox with localStorage fallback', () => {
    expect(getVoiceChatAutoPlay()).toBe(true);
    document.getElementById('voiceChatAutoPlay').checked = false;
    expect(getVoiceChatAutoPlay()).toBe(false);
    document.getElementById('voiceChatAutoPlay').remove();
    localStorage.setItem('kilo_auto_speak', 'false');
    expect(getVoiceChatAutoPlay()).toBe(false);
  });
});

describe('voice-chat turns', () => {
  it('appends a turn with source and target bubbles', () => {
    const turn = addVoiceChatTurn({
      speaker: 'A',
      speakerClass: 'speaker-a',
      sourceText: 'hello',
      targetText: '你好',
      sourceLang: 'English',
      targetLang: '中文',
    });
    expect(turn).not.toBeNull();
    expect(getVoiceChatTurnCount()).toBe(1);
    expect(document.getElementById('voiceChatEmpty').classList.contains('hidden')).toBe(true);
    expect(turn.textContent).toContain('hello');
    expect(turn.textContent).toContain('你好');
  });

  it('renders error turns without bubbles', () => {
    const turn = addVoiceChatTurn({ speaker: 'A', error: 'boom' });
    expect(turn.classList.contains('is-error')).toBe(true);
    expect(turn.textContent).toContain('boom');
  });

  it('caps the turn list and clears it on demand', () => {
    for (let i = 0; i < VOICE_CHAT_MAX_TURNS + 5; i += 1) {
      addVoiceChatTurn({ speaker: 'A', sourceText: `s${i}`, targetText: `t${i}` });
    }
    expect(getVoiceChatTurnCount()).toBe(VOICE_CHAT_MAX_TURNS);
    clearVoiceChatTurns();
    expect(getVoiceChatTurnCount()).toBe(0);
    expect(document.getElementById('voiceChatEmpty').classList.contains('hidden')).toBe(false);
  });
});

describe('chat timer', () => {
  it('starts and stops without throwing', () => {
    expect(() => startChatTimer()).not.toThrow();
    expect(() => stopChatTimer()).not.toThrow();
    expect(document.getElementById('recordTimer').classList.contains('hidden')).toBe(true);
  });
});

describe('dual conversation memory', () => {
  it('context toggle defaults to enabled', () => {
    expect(isDualContextEnabled()).toBe(true);
    document.getElementById('dualContextToggle').checked = false;
    expect(isDualContextEnabled()).toBe(false);
  });

  it('context window reads the select with a sane default', () => {
    expect(getDualContextWindow()).toBe(4);
    localStorage.setItem(CONTEXT_WINDOW_STORAGE_KEY, '2');
    document.getElementById('dualContextWindow').remove();
    expect(getDualContextWindow()).toBe(2);
    expect(DEFAULT_CONTEXT_WINDOW).toBe(4);
  });

  it('returns the last N turns with speaker attribution', () => {
    addVoiceChatTurn({ speaker: 'A', speakerClass: 'speaker-a', sourceText: 'hello', targetText: '你好' });
    addVoiceChatTurn({ speaker: 'B', speakerClass: 'speaker-b', sourceText: 'thanks', targetText: '謝謝' });
    const turns = getRecentConversationTurns(2);
    expect(turns).toHaveLength(2);
    expect(turns[0]).toMatchObject({ speaker: 'A', sourceText: 'hello', targetText: '你好' });
    expect(turns[1]).toMatchObject({ speaker: 'B', sourceText: 'thanks', targetText: '謝謝' });
    expect(getRecentConversationTurns(1)).toHaveLength(1);
    expect(getRecentConversationTurns(0)).toHaveLength(0);
  });

  it('paints dual-mic active state and labels', () => {
    const panel = document.getElementById('voiceChatPanel');
    setDualMicActive('A');
    expect(document.getElementById('dualMicA').classList.contains('is-active')).toBe(true);
    expect(panel.classList.contains('mic-a-active')).toBe(true);
    setDualMicActive('B');
    expect(document.getElementById('dualMicB').classList.contains('is-active')).toBe(true);
    expect(panel.classList.contains('mic-b-active')).toBe(true);
    setDualMicActive(null);
    expect(document.getElementById('dualMicA').classList.contains('is-active')).toBe(false);
    updateDualMicLabels({ sourceLang: '中文', targetLang: 'English', userA: '甲', userB: '乙' });
    expect(document.getElementById('dualMicNameA').textContent).toBe('甲');
    expect(document.getElementById('dualMicLangB').textContent).toBe('English');
  });
});
