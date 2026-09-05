/**
 * Tests for src/js/asr.js (OpenRouter voice-conversation client)
 */
import { describe, it, expect } from 'vitest';
import {
  OPENROUTER_ASR_MODELS,
  DEFAULT_ASR_MODEL,
  iso639FromBcp47,
  getSavedAsrModel,
  getTranscribeEndpoint,
  pickRecorderMimeType,
  isVoiceConversationSupported,
} from '../src/js/asr.js';

describe('OPENROUTER_ASR_MODELS', () => {
  it('contains the four required models', () => {
    expect(Object.keys(OPENROUTER_ASR_MODELS)).toEqual(
      expect.arrayContaining([
        'mistralai/voxtral-mini-transcribe',
        'microsoft/mai-transcribe-2',
        'qwen/qwen3-asr-1.7b',
        'nvidia/nemotron-3.5-asr-streaming-multilingual-0.6b',
      ])
    );
  });

  it('each model has name, vendor, and description', () => {
    for (const model of Object.values(OPENROUTER_ASR_MODELS)) {
      expect(model).toHaveProperty('name');
      expect(model).toHaveProperty('vendor');
      expect(model).toHaveProperty('description');
    }
  });

  it('default model is one of the supported models', () => {
    expect(OPENROUTER_ASR_MODELS).toHaveProperty(DEFAULT_ASR_MODEL);
  });
});

describe('iso639FromBcp47', () => {
  it('maps app language codes to ISO-639-1', () => {
    expect(iso639FromBcp47('zh-TW')).toBe('zh');
    expect(iso639FromBcp47('en-US')).toBe('en');
    expect(iso639FromBcp47('ja-JP')).toBe('ja');
  });

  it('falls back to the primary subtag', () => {
    expect(iso639FromBcp47('fr-FR')).toBe('fr');
  });
});

describe('getSavedAsrModel', () => {
  it('returns the default when nothing is saved', () => {
    localStorage.clear();
    expect(getSavedAsrModel()).toBe(DEFAULT_ASR_MODEL);
  });

  it('returns the saved model when valid', () => {
    localStorage.setItem('openrouter_asr_model', 'qwen/qwen3-asr-1.7b');
    expect(getSavedAsrModel()).toBe('qwen/qwen3-asr-1.7b');
  });

  it('falls back to default for unknown saved values', () => {
    localStorage.setItem('openrouter_asr_model', 'nope/not-a-model');
    expect(getSavedAsrModel()).toBe(DEFAULT_ASR_MODEL);
  });
});

describe('endpoints and capability helpers', () => {
  it('posts transcription to the backend endpoint', () => {
    expect(getTranscribeEndpoint()).toBe('/api/transcribe');
  });

  it('does not crash in jsdom without mic APIs', () => {
    expect(() => pickRecorderMimeType()).not.toThrow();
    expect(() => isVoiceConversationSupported()).not.toThrow();
  });
});
