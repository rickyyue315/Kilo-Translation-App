/**
 * Tests for api/_shared.js (Zeabur/Netlify shared backend)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  ASR_MODELS,
  DEFAULT_ASR_MODEL,
  audioFormatFromMime,
  checkRateLimit,
  resetRateLimits,
  handleHealth,
  transcribeWithOpenRouter,
} from '../api/_shared.js';

function mockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    payload: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    set(h) {
      Object.assign(this.headers, h);
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
    send(body) {
      this.payload = body;
      return this;
    },
  };
  return res;
}

describe('ASR_MODELS', () => {
  it('contains the four required models', () => {
    expect(Object.keys(ASR_MODELS)).toEqual(
      expect.arrayContaining([
        'mistralai/voxtral-mini-transcribe',
        'microsoft/mai-transcribe-2',
        'qwen/qwen3-asr-1.7b',
        'nvidia/nemotron-3.5-asr-streaming-multilingual-0.6b',
      ])
    );
  });

  it('default model is supported', () => {
    expect(ASR_MODELS).toHaveProperty(DEFAULT_ASR_MODEL);
  });
});

describe('audioFormatFromMime', () => {
  it('maps browser recording mimetypes', () => {
    expect(audioFormatFromMime('audio/webm;codecs=opus')).toBe('webm');
    expect(audioFormatFromMime('audio/mp4')).toBe('m4a');
    expect(audioFormatFromMime('audio/wav')).toBe('wav');
  });

  it('returns null for unknown types', () => {
    expect(audioFormatFromMime('video/mp4')).toBeNull();
    expect(audioFormatFromMime('')).toBeNull();
  });
});

describe('handleHealth', () => {
  it('reports service status and ASR models', () => {
    const res = mockRes();
    handleHealth({}, res);
    expect(res.statusCode).toBe(200);
    expect(res.payload.ok).toBe(true);
    expect(res.payload.asrModels).toContain('mistralai/voxtral-mini-transcribe');
  });
});

describe('checkRateLimit', () => {
  beforeEach(() => resetRateLimits());

  it('allows requests under the limit', () => {
    for (let i = 0; i < 60; i += 1) {
      expect(checkRateLimit('test-ip')).toBe(true);
    }
  });

  it('blocks requests over the limit', () => {
    for (let i = 0; i < 60; i += 1) {
      checkRateLimit('test-ip');
    }
    expect(checkRateLimit('test-ip')).toBe(false);
  });
});

describe('transcribeWithOpenRouter validation', () => {
  it('rejects unsupported models without calling the API', async () => {
    const result = await transcribeWithOpenRouter({
      audioBuffer: Buffer.from([1, 2, 3]),
      mimeType: 'audio/webm',
      model: 'nope/not-a-model',
      apiKey: 'test-key',
    });
    expect(result.status).toBe(400);
    expect(result.error).toMatch(/不支援的 ASR 模型/);
  });

  it('rejects unsupported audio formats', async () => {
    const result = await transcribeWithOpenRouter({
      audioBuffer: Buffer.from([1, 2, 3]),
      mimeType: 'video/mp4',
      model: DEFAULT_ASR_MODEL,
      apiKey: 'test-key',
    });
    expect(result.status).toBe(400);
  });
});
