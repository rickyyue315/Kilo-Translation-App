/**
 * Tests for src/js/models.js
 */
import { describe, it, expect } from 'vitest';
import {
  languageMap,
  aiModels,
  modelCategories,
  freeModelsOnly,
} from '../src/js/models.js';

describe('languageMap', () => {
  it('contains core supported languages', () => {
    expect(Object.keys(languageMap).length).toBeGreaterThanOrEqual(6);
    expect(languageMap['zh-TW']).toBe('中文 (繁體)');
    expect(languageMap['en-US']).toBe('English');
    expect(languageMap['ja-JP']).toBe('日本語');
  });
});

describe('aiModels', () => {
  it('is an object of model definitions', () => {
    expect(typeof aiModels).toBe('object');
    expect(Object.keys(aiModels).length).toBeGreaterThan(0);
  });

  it('each model has name, description, and category', () => {
    for (const [id, model] of Object.entries(aiModels)) {
      expect(model).toHaveProperty('name');
      expect(model).toHaveProperty('description');
      expect(model).toHaveProperty('category');
    }
  });

  it('free models have :free suffix in their key', () => {
    const freeOnes = Object.entries(aiModels).filter(([, m]) => m.category === '免費選項');
    for (const [id] of freeOnes) {
      expect(id).toMatch(/:free$/);
    }
  });
});

describe('modelCategories', () => {
  it('has top-tier, value, and free tiers', () => {
    expect(modelCategories).toHaveProperty('頂級模型');
    expect(modelCategories).toHaveProperty('高性價比');
    expect(modelCategories).toHaveProperty('免費選項');
  });
});

describe('freeModelsOnly', () => {
  it('is an array of free model IDs', () => {
    expect(Array.isArray(freeModelsOnly)).toBe(true);
    for (const id of freeModelsOnly) {
      expect(id).toMatch(/:free$/);
    }
  });

  it('matches aiModels free category', () => {
    const freeFromAiModels = Object.entries(aiModels)
      .filter(([, m]) => m.category === '免費選項')
      .map(([id]) => id);
    for (const id of freeModelsOnly) {
      expect(freeFromAiModels).toContain(id);
    }
  });
});
