/**
 * Tests for src/js/utils.js
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isMobileDevice,
  isIOSDevice,
  isSafariBrowser,
  needsEnglishTranslation,
  isLikelyTargetLanguage,
  buildStrictLanguageRule,
} from '../src/js/utils.js';

// ─── Browser Detection ───────────────────────────────────────────────────────

describe('isMobileDevice', () => {
  it('returns true for mobile user agents', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
      configurable: true,
    });
    expect(isMobileDevice()).toBe(true);
  });

  it('returns false for desktop user agents', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      configurable: true,
    });
    expect(isMobileDevice()).toBe(false);
  });
});

describe('isIOSDevice', () => {
  it('detects iPad', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)',
      configurable: true,
    });
    expect(isIOSDevice()).toBe(true);
  });
});

// ─── Language Utils ──────────────────────────────────────────────────────────

describe('needsEnglishTranslation', () => {
  it('returns false when source or target is English', () => {
    expect(needsEnglishTranslation('en-US', 'ja-JP')).toBe(false);
    expect(needsEnglishTranslation('zh-TW', 'en-US')).toBe(false);
  });

  it('returns true when neither source nor target is English', () => {
    expect(needsEnglishTranslation('zh-TW', 'ja-JP')).toBe(true);
    expect(needsEnglishTranslation('fr-FR', 'de-DE')).toBe(true);
    expect(needsEnglishTranslation('ru-RU', 'es-ES')).toBe(true);
  });
});

describe('isLikelyTargetLanguage', () => {
  it('detects Japanese text', () => {
    expect(isLikelyTargetLanguage('こんにちは', 'ja-JP')).toBe(true);
    expect(isLikelyTargetLanguage('Hello', 'ja-JP')).toBe(false);
  });

  it('detects Korean text', () => {
    expect(isLikelyTargetLanguage('안녕하세요', 'ko-KR')).toBe(true);
    expect(isLikelyTargetLanguage('Hello', 'ko-KR')).toBe(false);
  });

  it('detects Chinese text', () => {
    expect(isLikelyTargetLanguage('你好世界', 'zh-TW')).toBe(true);
    expect(isLikelyTargetLanguage('Hello', 'zh-TW')).toBe(false);
  });

  it('detects English text', () => {
    expect(isLikelyTargetLanguage('Hello world', 'en-US')).toBe(true);
  });

  it('detects Russian text', () => {
    expect(isLikelyTargetLanguage('Привет', 'ru-RU')).toBe(true);
    expect(isLikelyTargetLanguage('Hello', 'ru-RU')).toBe(false);
  });

  it('returns false for empty text', () => {
    expect(isLikelyTargetLanguage('', 'en-US')).toBe(false);
    expect(isLikelyTargetLanguage(null, 'en-US')).toBe(false);
  });

  it('returns true for unknown target language', () => {
    expect(isLikelyTargetLanguage('anything', 'xx-XX')).toBe(true);
  });
});

describe('buildStrictLanguageRule', () => {
  it('includes the target language name', () => {
    const rule = buildStrictLanguageRule('ja-JP');
    expect(rule).toContain('日本語');
  });

  it('handles unknown languages gracefully', () => {
    const rule = buildStrictLanguageRule('xx-XX');
    expect(rule).toContain('xx-XX');
  });
});
