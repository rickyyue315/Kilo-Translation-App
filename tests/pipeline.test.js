/**
 * Tests for the three-pass pipeline orchestration (src/js/pipeline.js)
 */
import { describe, it, expect, vi } from 'vitest';
import { DEPTH, runThreePassPipeline, shouldUseDeepPipeline } from '../src/js/pipeline.js';

const DRAFT_REPLY = '<<<LITERAL>>>\nA literal draft sentence.\n<<<CRITIQUE>>>\n- [weak verb] "made improvements" -> "cut"';

function mockCallStage(overrides = {}) {
  return vi.fn(async (payload) => {
    if (payload.stage === 'draft') return overrides.draft ?? DRAFT_REPLY;
    if (payload.stage === 'rewrite') {
      if (overrides.rewriteError) throw new Error('model exploded');
      return overrides.rewrite ?? 'A publishable final sentence.';
    }
    return '';
  });
}

describe('runThreePassPipeline', () => {
  it('runs draft then rewrite and returns all three artefacts', async () => {
    const callStage = mockCallStage();
    const result = await runThreePassPipeline({
      text: '我們決定採用事件驅動架構。',
      sourceLang: 'zh-TW',
      targetLang: 'en-US',
      callStage,
    });

    expect(callStage).toHaveBeenCalledTimes(2);
    expect(callStage.mock.calls[0][0].stage).toBe('draft');
    expect(callStage.mock.calls[1][0].stage).toBe('rewrite');

    expect(result.finalText).toBe('A publishable final sentence.');
    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0].literal).toBe('A literal draft sentence.');
    expect(result.chunks[0].critique).toContain('[weak verb]');
    expect(result.calls).toBe(2);
    expect(result.degraded).toBe(false);
  });

  it('feeds the literal draft and critique into the rewrite call', async () => {
    const callStage = mockCallStage();
    await runThreePassPipeline({
      text: 'source text',
      sourceLang: 'zh-TW',
      targetLang: 'en-US',
      style: 'technical',
      callStage,
    });

    const rewritePayload = callStage.mock.calls[1][0];
    expect(rewritePayload.draft).toBe('A literal draft sentence.');
    expect(rewritePayload.critique).toContain('made improvements');
    expect(rewritePayload.style).toBe('technical');
  });

  it('emits progress for each phase', async () => {
    const phases = [];
    await runThreePassPipeline({
      text: 'short source',
      sourceLang: 'zh-TW',
      targetLang: 'en-US',
      callStage: mockCallStage(),
      onProgress: (info) => phases.push(info.phase),
    });

    expect(phases).toEqual(['literal', 'critique', 'rewrite', 'done']);
  });

  it('splits long text into chunks and carries context forward', async () => {
    const paragraph = '這是一段技術文件內容，用來說明系統的設計與取捨。'.repeat(6);
    const text = `${paragraph}\n\n${paragraph}\n\n${paragraph}`;
    const callStage = mockCallStage();

    const result = await runThreePassPipeline({
      text,
      sourceLang: 'zh-TW',
      targetLang: 'en-US',
      callStage,
      maxChars: 300,
    });

    expect(result.chunks.length).toBeGreaterThan(1);
    expect(callStage).toHaveBeenCalledTimes(result.chunks.length * 2);

    // Every chunk after the first must see the previous final text as context.
    const secondDraft = callStage.mock.calls[2][0];
    expect(secondDraft.prevContext).toContain('A publishable final sentence');
  });

  it('falls back to the literal draft when the rewrite pass fails', async () => {
    const callStage = mockCallStage({ rewriteError: true });
    const result = await runThreePassPipeline({
      text: 'source',
      sourceLang: 'zh-TW',
      targetLang: 'en-US',
      callStage,
    });

    expect(result.degraded).toBe(true);
    expect(result.finalText).toBe('A literal draft sentence.');
  });

  it('uses the literal draft when the rewrite pass returns empty text', async () => {
    const callStage = mockCallStage({ rewrite: '   ' });
    const result = await runThreePassPipeline({
      text: 'source',
      sourceLang: 'zh-TW',
      targetLang: 'en-US',
      callStage,
    });

    expect(result.degraded).toBe(true);
    expect(result.finalText).toBe('A literal draft sentence.');
  });

  it('honours an aborted signal', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      runThreePassPipeline({
        text: 'source',
        sourceLang: 'zh-TW',
        targetLang: 'en-US',
        callStage: mockCallStage(),
        signal: controller.signal,
      })
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('returns an empty result for empty input', async () => {
    const callStage = mockCallStage();
    const result = await runThreePassPipeline({ text: '   ', sourceLang: 'zh-TW', targetLang: 'en-US', callStage });
    expect(result.finalText).toBe('');
    expect(result.calls).toBe(0);
    expect(callStage).not.toHaveBeenCalled();
  });

  it('requires a callStage function', async () => {
    await expect(runThreePassPipeline({ text: 'x', sourceLang: 'zh-TW', targetLang: 'en-US' }))
      .rejects.toThrow(/callStage/);
  });
});

describe('shouldUseDeepPipeline', () => {
  it('is false unless deep mode is selected', () => {
    expect(shouldUseDeepPipeline('a long enough sentence to translate', DEPTH.FAST)).toBe(false);
  });

  it('skips trivially short utterances even in deep mode', () => {
    expect(shouldUseDeepPipeline('ok', DEPTH.DEEP)).toBe(false);
    expect(shouldUseDeepPipeline('這是一句足夠長的句子，值得走完整的三步流程。', DEPTH.DEEP)).toBe(true);
  });
});
