/**
 * Tests for the three-pass prompt library (src/js/prompts.js)
 */
import { describe, it, expect } from 'vitest';
import {
  STAGE,
  buildFastMessages,
  buildMessages,
  cleanFinalOutput,
  deAiRules,
  langName,
  parseDraftResponse,
  splitIntoChunks,
} from '../src/js/prompts.js';

describe('buildFastMessages', () => {
  it('returns a system + user pair and asks for output only', () => {
    const messages = buildFastMessages({ text: '你好', sourceLang: 'zh-TW', targetLang: 'en-US' });
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toContain('senior translator');
    expect(messages[0].content).toContain('Output the final translation only');
    expect(messages[1]).toEqual({ role: 'user', content: '你好' });
  });

  it('carries the de-AI style guard', () => {
    const messages = buildFastMessages({ text: 'x', sourceLang: 'zh-TW', targetLang: 'en-US' });
    expect(messages[0].content).toContain('STYLE GUARD');
    expect(messages[0].content).toContain('delve');
  });

  it('enforces the target script for Traditional Chinese', () => {
    const messages = buildFastMessages({ text: 'hello', sourceLang: 'en-US', targetLang: 'zh-TW' });
    expect(messages[0].content).toContain('Traditional Chinese only');
  });

  it('adds the technical style guide when requested', () => {
    const messages = buildFastMessages({ text: 'x', sourceLang: 'zh-TW', targetLang: 'en-US', style: 'technical' });
    expect(messages[0].content).toContain('technical documentation');
    expect(messages[0].content).toContain('code identifiers');
  });
});

describe('buildMessages', () => {
  it('draft stage asks for a literal draft plus a critique', () => {
    const messages = buildMessages({
      stage: STAGE.DRAFT,
      text: '業務規模擴大',
      sourceLang: 'zh-TW',
      targetLang: 'en-US',
    });
    expect(messages).toHaveLength(2);
    expect(messages[0].content).toContain('PASS 1 — LITERAL DRAFT');
    expect(messages[0].content).toContain('PASS 2 — CRITIQUE');
    expect(messages[0].content).toContain('<<<LITERAL>>>');
    expect(messages[0].content).toContain('<<<CRITIQUE>>>');
    expect(messages[1].content).toBe('業務規模擴大');
  });

  it('writes the critique in the interface language', () => {
    const zh = buildMessages({
      stage: STAGE.DRAFT, text: 'x', sourceLang: 'zh-TW', targetLang: 'en-US', interfaceLanguage: 'zh-TW',
    });
    expect(zh[0].content).toContain('in Traditional Chinese');
    const ja = buildMessages({
      stage: STAGE.DRAFT, text: 'x', sourceLang: 'zh-TW', targetLang: 'en-US', interfaceLanguage: 'ja-JP',
    });
    expect(ja[0].content).toContain('in Japanese');
  });

  it('rewrite stage receives source, literal draft and critique', () => {
    const messages = buildMessages({
      stage: STAGE.REWRITE,
      text: '原文',
      draft: 'literal draft',
      critique: '- [calque] "with the continuous expansion" -> "As we grew"',
      sourceLang: 'zh-TW',
      targetLang: 'en-US',
    });
    expect(messages[0].content).toContain('PASS 3 — REWRITE');
    expect(messages[0].content).toContain('STYLE GUARD');
    expect(messages[1].content).toContain('SOURCE:');
    expect(messages[1].content).toContain('literal draft');
    expect(messages[1].content).toContain('As we grew');
  });

  it('rewrite stage still works without a critique', () => {
    const messages = buildMessages({
      stage: STAGE.REWRITE, text: 'a', draft: 'b', critique: '', sourceLang: 'zh-TW', targetLang: 'en-US',
    });
    expect(messages[1].content).toContain('no critique available');
  });

  it('injects locked terminology and continuity context', () => {
    const messages = buildMessages({
      stage: STAGE.DRAFT,
      text: 'x',
      sourceLang: 'zh-TW',
      targetLang: 'en-US',
      glossary: [{ source: '灰度發布', target: 'canary rollout' }],
      prevContext: 'previous segment text',
    });
    expect(messages[0].content).toContain('LOCKED TERMINOLOGY');
    expect(messages[0].content).toContain('灰度發布 => canary rollout');
    expect(messages[0].content).toContain('CONTINUITY');
    expect(messages[0].content).toContain('previous segment text');
  });
});

describe('deAiRules', () => {
  it('returns Chinese rules for Chinese targets', () => {
    expect(deAiRules('zh-TW')).toContain('值得注意的是');
    expect(deAiRules('zh-CN')).toContain('賦能');
  });

  it('returns English rules for other targets', () => {
    expect(deAiRules('en-US')).toContain('STYLE GUARD');
    expect(deAiRules('fr-FR')).toContain('STYLE GUARD');
  });
});

describe('parseDraftResponse', () => {
  it('splits literal and critique on the markers', () => {
    const parsed = parseDraftResponse('<<<LITERAL>>>\nThe draft.\n<<<CRITIQUE>>>\n- [weak verb] "made improvements" -> "cut"');
    expect(parsed.literal).toBe('The draft.');
    expect(parsed.critique).toContain('[weak verb]');
  });

  it('tolerates a wrapping code fence', () => {
    const parsed = parseDraftResponse('```\n<<<LITERAL>>>\nDraft\n<<<CRITIQUE>>>\nNote\n```');
    expect(parsed.literal).toBe('Draft');
    expect(parsed.critique).toBe('Note');
  });

  it('falls back to treating the whole reply as a draft when markers are missing', () => {
    const parsed = parseDraftResponse('Just a translation with no markers.');
    expect(parsed.literal).toBe('Just a translation with no markers.');
    expect(parsed.critique).toBe('');
  });

  it('handles an empty response', () => {
    expect(parseDraftResponse('')).toEqual({ literal: '', critique: '' });
    expect(parseDraftResponse(null)).toEqual({ literal: '', critique: '' });
  });
});

describe('cleanFinalOutput', () => {
  it('strips code fences and stray markers', () => {
    expect(cleanFinalOutput('```markdown\nHello\n```')).toBe('Hello');
    expect(cleanFinalOutput('<<<LITERAL>>>\nHello')).toBe('Hello');
  });
});

describe('splitIntoChunks', () => {
  it('keeps short text intact', () => {
    expect(splitIntoChunks('short text', 100)).toEqual(['short text']);
    expect(splitIntoChunks('   ', 100)).toEqual([]);
  });

  it('splits on paragraph boundaries without losing content', () => {
    const paragraph = '這是一段用於測試的中文文字，長度適中。'.repeat(10);
    const text = `${paragraph}\n\n${paragraph}\n\n${paragraph}`;
    const chunks = splitIntoChunks(text, 300);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((chunk) => expect(chunk.length).toBeLessThanOrEqual(300));
    const strip = (value) => value.replace(/\s/g, '');
    expect(chunks.map(strip).join('')).toBe(strip(text));
  });

  it('hard-cuts a single oversized sentence instead of dropping it', () => {
    const text = '字'.repeat(500);
    const chunks = splitIntoChunks(text, 120);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join('')).toBe(text);
  });
});

describe('langName', () => {
  it('maps codes to readable names and falls back to the code', () => {
    expect(langName('zh-TW')).toBe('Traditional Chinese');
    expect(langName('xx-YY')).toBe('xx-YY');
  });
});
