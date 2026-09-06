/**
 * Tests for src/js/voicechat.js (voice conversation UI helpers)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  VOICE_CHAT_BAR_COUNT,
  VOICE_CHAT_MAX_TURNS,
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
} from '../src/js/voicechat.js';

function mountShell() {
  document.body.innerHTML = `
    <section id="voiceChatPanel" class="hidden">
      <span id="voiceChatTimer">00:00</span>
      <div id="voiceChatVisualizer"></div>
      <p id="voiceChatLiveText"></p>
      <div id="voiceChatTurns"><p id="voiceChatEmpty">empty</p></div>
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
