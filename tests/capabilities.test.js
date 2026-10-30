/**
 * 能力探測與原生橋接（src/js/capabilities.js）
 *
 * 這是本次 Android 化最核心的判斷點：WebView 沒有 Web Speech 是常態，
 * 能不能錄音只取決於 MediaRecorder + getUserMedia。
 * 8 組矩陣 = native × WebSpeech × MediaRecorder，斷言 asrEngine / asrFallback / level。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  resolveSpeechCapabilities,
  getCapabilityReport,
  checkMicPermission,
  requestMicPermission,
  openAppSettings,
  getFontScale,
  applySystemFontScale,
} from '../src/js/capabilities.js';

const originalCapacitor = window.Capacitor;

function setNative(native) {
  window.Capacitor = native
    ? { isNativePlatform: () => true, getPlatform: () => 'android', Plugins: {} }
    : undefined;
}

function setWebSpeech(available) {
  if (available) {
    window.SpeechRecognition = function SpeechRecognition() {};
  } else {
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
  }
}

function setRecorder(available) {
  if (available) {
    window.MediaRecorder = function MediaRecorder() {};
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: () => Promise.resolve({}) },
    });
  } else {
    delete window.MediaRecorder;
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
  }
}

beforeEach(() => {
  setNative(false);
  setWebSpeech(false);
  setRecorder(false);
});

afterEach(() => {
  setNative(false);
  setWebSpeech(false);
  setRecorder(false);
  delete document.documentElement.dataset.compact;
  document.documentElement.style.fontSize = '';
  if (originalCapacitor === undefined) delete window.Capacitor;
  else window.Capacitor = originalCapacitor;
});

describe('resolveSpeechCapabilities — 8 組矩陣', () => {
  const cases = [
    // native, webSpeech, recorder, asrEngine, asrFallback, level
    [true, false, true, 'backend', 'backend', 'full'],
    [true, false, false, 'backend', null, 'textOnly'],
    [true, true, true, 'backend', 'backend', 'full'],
    [true, true, false, 'backend', null, 'textOnly'],
    [false, false, true, 'backend', 'backend', 'full'],
    [false, false, false, 'backend', null, 'textOnly'],
    [false, true, true, 'web', 'backend', 'full'],
    [false, true, false, 'web', null, 'textOnly'],
  ];

  it.each(cases)(
    'native=%s webSpeech=%s recorder=%s → %s / %s / %s',
    (native, webSpeech, recorder, engine, fallback, level) => {
      setNative(native);
      setWebSpeech(webSpeech);
      setRecorder(recorder);

      const caps = resolveSpeechCapabilities();
      expect(caps.native).toBe(native);
      expect(caps.asrEngine).toBe(engine);
      expect(caps.asrFallback).toBe(fallback);
      expect(caps.level).toBe(level);
      // native 一律用原生 TTS 插件；web 一律 speechSynthesis
      expect(caps.ttsEngine).toBe(native ? 'plugin' : 'web');
    }
  );
});

describe('getCapabilityReport — 不再硬阻擋', () => {
  it('沒有 Web Speech 但有錄音能力時仍回報 full（WebView 的常態）', () => {
    setRecorder(true);
    const report = getCapabilityReport();
    expect(report.level).toBe('full');
    expect(report.missing).not.toContain('recording');
  });

  it('完全沒有錄音能力才降為 textOnly，且只缺 recording', () => {
    const report = getCapabilityReport();
    expect(report.level).toBe('textOnly');
    expect(report.missing).toContain('recording');
  });

  it('永不回傳 boolean false（舊版 checkBrowserSupport 的行為）', () => {
    const report = getCapabilityReport();
    expect(typeof report).toBe('object');
    expect(report.level).toBeTypeOf('string');
  });
});

describe('麥克風權限三態（原生插件）', () => {
  function withPlugin(plugin) {
    window.Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => 'android',
      Plugins: { MicPermission: plugin },
    };
  }

  it('granted → granted', async () => {
    withPlugin({ check: vi.fn().mockResolvedValue({ state: 'granted' }) });
    await expect(checkMicPermission()).resolves.toBe('granted');
  });

  it('prompt（原生 PROMPT_WITH_RATIONALE 也映射為 prompt）→ prompt', async () => {
    withPlugin({ check: vi.fn().mockResolvedValue({ state: 'prompt' }) });
    await expect(checkMicPermission()).resolves.toBe('prompt');
  });

  it('denied（永久拒絕）→ denied', async () => {
    withPlugin({ check: vi.fn().mockResolvedValue({ state: 'denied', canAskAgain: false }) });
    await expect(checkMicPermission()).resolves.toBe('denied');
  });

  it('插件拋錯時回 unavailable，不讓呼叫端崩潰', async () => {
    withPlugin({ check: vi.fn().mockRejectedValue(new Error('bridge down')) });
    await expect(checkMicPermission()).resolves.toBe('unavailable');
  });

  it('request 回 denied 時對外是 blocked（永久拒絕）', async () => {
    withPlugin({
      check: vi.fn().mockResolvedValue({ state: 'denied', canAskAgain: false }),
      request: vi.fn().mockResolvedValue({ state: 'denied', canAskAgain: false }),
    });
    await expect(requestMicPermission()).resolves.toBe('blocked');
  });

  it('request 回 granted 時對外是 granted', async () => {
    withPlugin({
      check: vi.fn().mockResolvedValue({ state: 'prompt' }),
      request: vi.fn().mockResolvedValue({ state: 'granted' }),
    });
    await expect(requestMicPermission()).resolves.toBe('granted');
  });

  it('openAppSettings 會呼叫原生 openSettings（永久拒絕後的一步救援）', async () => {
    const openSettings = vi.fn().mockResolvedValue(undefined);
    withPlugin({ openSettings });
    await expect(openAppSettings()).resolves.toBe(true);
    expect(openSettings).toHaveBeenCalledTimes(1);
  });

  it('沒有插件時 openAppSettings 回 false，不拋錯', async () => {
    setNative(false);
    await expect(openAppSettings()).resolves.toBe(false);
  });
});

describe('系統字級 fontScale', () => {
  function withFontScale(value) {
    window.Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => 'android',
      Plugins: { MicPermission: { getFontScale: vi.fn().mockResolvedValue({ fontScale: value }) } },
    };
  }

  it('200% → root font-size = 32px', async () => {
    withFontScale(2);
    const scale = await applySystemFontScale();
    expect(scale).toBe(2);
    expect(document.documentElement.style.fontSize).toBe('32px');
    expect(document.documentElement.getAttribute('data-compact')).toBe('true');
  });

  it('100% → 16px，且不加 data-compact', async () => {
    withFontScale(1);
    await applySystemFontScale();
    expect(document.documentElement.style.fontSize).toBe('16px');
    expect(document.documentElement.hasAttribute('data-compact')).toBe(false);
  });

  it('下限 0.85：Android "Smaller" 不被拉回 1.0', async () => {
    withFontScale(0.5);
    await expect(getFontScale()).resolves.toBe(0.85);
  });

  it('上限 2.0：避免 400% 疊乘', async () => {
    withFontScale(4);
    await expect(getFontScale()).resolves.toBe(2);
  });

  it('取不到值時預設 1.0（已知限制，不阻斷啟動）', async () => {
    setNative(false);
    await expect(getFontScale()).resolves.toBe(1);
  });
});
