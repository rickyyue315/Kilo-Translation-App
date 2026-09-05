/**
 * Tests for src/js/i18n.js
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { i18n, t } from '../src/js/i18n.js';

describe('i18n dictionary', () => {
  it('has all 5 supported locales', () => {
    const locales = Object.keys(i18n);
    expect(locales).toContain('zh-TW');
    expect(locales).toContain('zh-CN');
    expect(locales).toContain('en-US');
    expect(locales).toContain('ja-JP');
    expect(locales).toContain('ko-KR');
  });

  it('all locales have similar set of keys (baseline: zh-TW)', () => {
    const baseKeys = new Set(Object.keys(i18n['zh-TW']));
    for (const locale of Object.keys(i18n)) {
      const localeKeys = Object.keys(i18n[locale]);
      // Each locale should have at least 90% of zh-TW keys
      const overlap = localeKeys.filter((k) => baseKeys.has(k));
      expect(overlap.length / baseKeys.size).toBeGreaterThan(0.9);
    }
  });
});

describe('t() helper', () => {
  beforeEach(() => {
    // Default to zh-TW
    localStorage.setItem('interface_language', 'zh-TW');
  });

  it('returns translated string for valid key', () => {
    const result = t('appTitle');
    expect(result).toBe(i18n['zh-TW']['appTitle']);
  });

  it('returns the key itself for missing key', () => {
    expect(t('nonexistent_key_xyz')).toBe('nonexistent_key_xyz');
  });

  it('respects language setting', () => {
    localStorage.setItem('interface_language', 'en-US');
    const result = t('appTitle');
    expect(result).toBe(i18n['en-US']['appTitle']);
  });
});
