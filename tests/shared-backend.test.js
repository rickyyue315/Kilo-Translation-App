/**
 * Tests for api/_shared.js (Zeabur/Netlify shared backend)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  ASR_MODELS,
  DEFAULT_ASR_MODEL,
  audioFormatFromMime,
  buildHistoryMessages,
  buildRequestBody,
  checkRateLimit,
  generateSystemPrompt,
  resetRateLimits,
  handleHealth,
  sanitizeHistory,
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

describe('conversation history (dual context)', () => {
  it('sanitizes history to a strict capped shape', () => {
    const out = sanitizeHistory([
      { speaker: 'B', sourceText: 'hi', targetText: '你好', extra: 'drop' },
      { speaker: 'X', sourceText: 'yo' },
      null,
      'junk',
    ]);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ speaker: 'B', sourceText: 'hi', targetText: '你好' });
    expect(out[1].speaker).toBe('A');
    expect(sanitizeHistory(null)).toEqual([]);
    expect(sanitizeHistory('nope')).toEqual([]);
  });

  it('builds context messages and request bodies with history', () => {
    const history = [{ speaker: 'A', sourceText: 'hello', targetText: '你好' }];
    const messages = buildHistoryMessages(history);
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toContain('[對話脈絡]');
    expect(buildHistoryMessages([])).toEqual([]);
    const body = buildRequestBody('thanks', 'en-US', 'zh-TW', 'm', false, 'normal', history);
    expect(body.messages.length).toBe(3);
    expect(body.messages[1].content).toContain('[對話脈絡]');
    const plain = buildRequestBody('thanks', 'en-US', 'zh-TW', 'm', false, 'normal');
    expect(plain.messages.length).toBe(2);
  });

  it('adds a context hint to the system prompt only with history', () => {
    const withHistory = generateSystemPrompt('en-US', 'zh-TW', 'normal', [
      { speaker: 'A', sourceText: 'hi', targetText: '你好' },
    ]);
    expect(withHistory).toContain('對話脈絡');
    const without = generateSystemPrompt('en-US', 'zh-TW', 'normal');
    expect(without).not.toContain('對話脈絡');
  });
});
