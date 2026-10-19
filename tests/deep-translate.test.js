/**
 * Integration tests for the deep (three-pass) translation path.
 * Exercises real request bodies through a mocked fetch.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  clearLastPipelineRun,
  getLastPipelineRun,
  getTranslationDepth,
  translateDeep,
} from '../src/js/translation.js';

const DRAFT_WITH_MARKERS = [
  '<<<LITERAL>>>',
  'The translator used to be a single file architecture.',
  '<<<CRITIQUE>>>',
  '- [noun pile] "single file architecture" -> "one long file"',
].join('\n');

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: { get: () => 'application/json' },
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  };
}

function chatResponse(content) {
  return jsonResponse({ choices: [{ message: { content } }] });
}

function setupDom({ serverKey = true, apiKey = '' } = {}) {
  document.body.innerHTML = `
    <input type="radio" name="translationStyle" value="technical" checked>
    <input type="radio" name="translationDepth" value="deep" checked>
    <input type="radio" id="serverApiKey" name="apiKeySource" value="server" ${serverKey ? 'checked' : ''}>
    <input type="radio" id="userApiKey" name="apiKeySource" value="user" ${serverKey ? '' : 'checked'}>
    <select id="aiModel"><option value="test/model" selected>test/model</option></select>
    <input id="customModelInput" value="">
    <input id="apiKey" value="${apiKey}">
  `;
  return {
    serverApiKey: document.getElementById('serverApiKey'),
    userApiKey: document.getElementById('userApiKey'),
    aiModel: document.getElementById('aiModel'),
    customModelInput: document.getElementById('customModelInput'),
    apiKey: document.getElementById('apiKey'),
  };
}

const SOURCE = '翻譯器已經從單一檔案重構成模組化架構，讓程式碼更好維護、更好測試，也更容易擴充。';

describe('translateDeep — server key path', () => {
  beforeEach(() => {
    clearLastPipelineRun();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('makes a draft call then a rewrite call and keeps all three artefacts', async () => {
    const elements = setupDom({ serverKey: true });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(chatResponse(DRAFT_WITH_MARKERS))
      .mockResolvedValueOnce(chatResponse('The translator used to be one long file. Now it is a set of modules.'));
    vi.stubGlobal('fetch', fetchMock);

    const run = await translateDeep(SOURCE, 'zh-TW', 'en-US', elements);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(run.finalText).toBe('The translator used to be one long file. Now it is a set of modules.');
    expect(run.chunks[0].literal).toContain('single file architecture');
    expect(run.chunks[0].critique).toContain('[noun pile]');
    expect(run.degraded).toBe(false);

    const firstBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(firstBody.stage).toBe('draft');
    expect(firstBody.style).toBe('technical');
    expect(firstBody.text).toBe(SOURCE);
    expect(secondBody.stage).toBe('rewrite');
    expect(secondBody.draft).toContain('single file architecture');
    expect(secondBody.critique).toContain('[noun pile]');

    // the panel reads from this
    expect(getLastPipelineRun()).toBe(run);
  });

  it('exposes the depth selected in the UI', () => {
    setupDom({ serverKey: true });
    expect(getTranslationDepth()).toBe('deep');
  });
});

describe('translateDeep — user key path', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls OpenRouter directly with prompts built in the browser', async () => {
    const elements = setupDom({ serverKey: false, apiKey: 'sk-or-test' });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(chatResponse(DRAFT_WITH_MARKERS))
      .mockResolvedValueOnce(chatResponse('Final text.'));
    vi.stubGlobal('fetch', fetchMock);

    await translateDeep(SOURCE, 'zh-TW', 'en-US', elements);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(options.headers.Authorization).toBe('Bearer sk-or-test');

    const body = JSON.parse(options.body);
    expect(body.model).toBe('test/model');
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[0].content).toContain('PASS 1 — LITERAL DRAFT');
    expect(body.messages[1].content).toBe(SOURCE);
  });

  it('fails fast when no key is present', async () => {
    const elements = setupDom({ serverKey: false, apiKey: '' });
    vi.stubGlobal('fetch', vi.fn());
    await expect(translateDeep(SOURCE, 'zh-TW', 'en-US', elements)).rejects.toThrow(/API key|API 金鑰/);
  });
});
