/**
 * TTS 適配層（src/js/tts.js）— web 分支
 *
 * 舊版把 speak() 掛在 voiceschanged 裡等，Android WebView 的 getVoices()
 * 永遠回空陣列，於是「永久掛住」、朗讀鈕卡在 disabled。
 * 這裡鎖住三件事：不等 voices、重入先 stop、失敗要能明確結束。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

class FakeUtterance {
  constructor(text) {
    this.text = text;
    this.lang = '';
    this.rate = 1;
    this.pitch = 1;
    this.volume = 1;
    this.voice = null;
    this.onstart = null;
    this.onend = null;
    this.onerror = null;
  }
}

function installSynth({ voices = [], autoEnd = true } = {}) {
  const speak = vi.fn((utterance) => {
    utterance.onstart?.();
    if (autoEnd) utterance.onend?.();
  });
  window.speechSynthesis = {
    speak,
    cancel: vi.fn(),
    getVoices: vi.fn(() => voices),
    addEventListener: vi.fn(),
  };
  window.SpeechSynthesisUtterance = FakeUtterance;
  return { speak };
}

beforeEach(() => {
  delete window.Capacitor;
});

afterEach(() => {
  delete window.speechSynthesis;
  delete window.SpeechSynthesisUtterance;
  delete window.Capacitor;
});

describe('speak — web 分支', () => {
  it('voices 為空時仍然直接發聲，不等 voiceschanged', async () => {
    const { speak: synthSpeak } = installSynth({ voices: [] });
    const { speak } = await import('../src/js/tts.js');

    const result = await speak('你好', 'zh-TW');

    expect(result.error).toBeUndefined();
    expect(synthSpeak).toHaveBeenCalledTimes(1);
    const utterance = synthSpeak.mock.calls[0][0];
    expect(utterance.text).toBe('你好');
    expect(utterance.lang).toBe('zh-TW');
  });

  it('有對應語音時會設定 utterance.voice', async () => {
    const voice = { lang: 'ja-JP', name: 'Kyoko' };
    const { speak: synthSpeak } = installSynth({ voices: [voice] });
    const { speak } = await import('../src/js/tts.js');

    await speak('こんにちは', 'ja-JP');
    expect(synthSpeak.mock.calls[0][0].voice).toBe(voice);
  });

  it('重入先 stop：第二段語音前一定先 cancel', async () => {
    const { speak: synthSpeak } = installSynth();
    const { speak, stopSpeaking } = await import('../src/js/tts.js');

    await speak('第一段', 'zh-TW');
    const cancelCallsBefore = window.speechSynthesis.cancel.mock.calls.length;

    await speak('第二段', 'zh-TW');

    expect(window.speechSynthesis.cancel.mock.calls.length).toBeGreaterThan(cancelCallsBefore);
    expect(synthSpeak).toHaveBeenCalledTimes(2);
    await stopSpeaking();
  });

  it('空字串 → onError 且不呼叫 speak', async () => {
    const { speak: synthSpeak } = installSynth();
    const { speak } = await import('../src/js/tts.js');
    const onError = vi.fn();

    const result = await speak('   ', 'zh-TW', { onError });

    expect(onError).toHaveBeenCalled();
    expect(result.error).toBeTruthy();
    expect(synthSpeak).not.toHaveBeenCalled();
  });

  it('完全沒有 speechSynthesis 時明確失敗，不掛住', async () => {
    delete window.speechSynthesis;
    const { speak } = await import('../src/js/tts.js');
    const onError = vi.fn();

    const result = await speak('hello', 'en-US', { onError });

    expect(result.error).toBeTruthy();
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('不支援'));
  });

  it('onstart / onend 依序觸發，讓 UI 能正確 disable / enable 按鈕', async () => {
    installSynth();
    const { speak } = await import('../src/js/tts.js');
    const events = [];

    await speak('hello', 'en-US', {
      onStart: () => events.push('start'),
      onEnd: () => events.push('end'),
    });

    expect(events).toEqual(['start', 'end']);
  });

  it('語音合成錯誤 → 轉成可讀文案並回報', async () => {
    window.speechSynthesis = {
      speak: vi.fn((utterance) => utterance.onerror?.({ error: 'language-unavailable' })),
      cancel: vi.fn(),
      getVoices: () => [],
    };
    window.SpeechSynthesisUtterance = FakeUtterance;
    const { speak } = await import('../src/js/tts.js');
    const onError = vi.fn();

    const result = await speak('hello', 'xx-XX', { onError });

    expect(onError).toHaveBeenCalledWith(expect.stringContaining('不支援此語言'));
    expect(result.error).toBeTruthy();
  });
});
