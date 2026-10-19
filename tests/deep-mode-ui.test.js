/**
 * Wiring checks for the three-pass controls in index.html
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { i18n } from '../src/js/i18n.js';

const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

const REQUIRED_IDS = [
  'depthFast',
  'depthDeep',
  'styleTechnical',
  'pipelinePanel',
  'pipelineMeta',
  'pipelineLiteral',
  'pipelineCritique',
  'pipelineFinal',
];

const REQUIRED_KEYS = [
  'translationDepth',
  'depthFast',
  'depthDeep',
  'depthHint',
  'deepModeNoPivot',
  'pipelineTitle',
  'pipelineLiteral',
  'pipelineCritique',
  'pipelineRewrite',
  'pipelineRunning',
  'pipelineChunkUnit',
  'pipelineCallsUnit',
  'pipelineDegraded',
  'translationStyleTechnical',
  'translationStyleTechnicalDesc',
  'textTooLongDeep',
  'requestTimeout',
];

describe('index.html deep-mode wiring', () => {
  it.each(REQUIRED_IDS)('contains #%s', (id) => {
    expect(html).toContain(`id="${id}"`);
  });

  it('binds the depth radios to the expected values', () => {
    expect(html).toContain('name="translationDepth" value="fast"');
    expect(html).toContain('name="translationDepth" value="deep"');
  });

  it('offers the technical style', () => {
    expect(html).toContain('name="translationStyle" value="technical"');
  });
});

describe('i18n completeness for the new UI', () => {
  const languages = Object.keys(i18n);

  it('covers all bundled interface languages', () => {
    expect(languages).toEqual(expect.arrayContaining(['zh-TW', 'zh-CN', 'en-US', 'ja-JP', 'ko-KR']));
  });

  it.each(languages)('%s defines every new key', (lang) => {
    REQUIRED_KEYS.forEach((key) => {
      expect(i18n[lang][key], `${lang}.${key}`).toBeTruthy();
    });
  });
});
