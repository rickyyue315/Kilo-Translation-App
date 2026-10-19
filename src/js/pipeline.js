// Kilo Translation App — Three-pass translation pipeline
//
// Literal -> Critique -> Rewrite, executed as two model calls per chunk
// (draft+critique fused, then the rewrite). Long documents are split on
// paragraph/sentence boundaries and translated chunk by chunk.

import {
  STAGE,
  cleanFinalOutput,
  parseDraftResponse,
  splitIntoChunks,
} from './prompts.js';

export const DEPTH = {
  FAST: 'fast',
  DEEP: 'deep',
};

export const PIPELINE_PHASES = {
  LITERAL: 'literal',
  CRITIQUE: 'critique',
  REWRITE: 'rewrite',
  DONE: 'done',
};

function abortError() {
  const error = new Error('已取消翻譯');
  error.name = 'AbortError';
  return error;
}

function assertLive(signal) {
  if (signal && signal.aborted) throw abortError();
}

/**
 * Run the three-pass pipeline over a possibly long text.
 *
 * @param {object} options
 * @param {string} options.text               source text
 * @param {string} options.sourceLang
 * @param {string} options.targetLang
 * @param {string} [options.style]            normal | natural | formal | simple | academic | technical
 * @param {string} [options.interfaceLanguage] language used for the critique notes
 * @param {Function} options.callStage        async (payload, meta) => string
 *                                            payload = { stage, text, draft, critique, sourceLang, targetLang, style, prevContext, glossary }
 * @param {Function} [options.onProgress]     ({ phase, index, total, literal, critique, final })
 * @param {AbortSignal} [options.signal]
 * @param {number} [options.maxChars]         chunk size, default 1200
 * @param {Array} [options.glossary]          [{ source, target }]
 * @param {string} [options.initialContext]   tail of prior conversation/document, for continuity
 * @returns {Promise<{ finalText: string, chunks: Array, calls: number, degraded: boolean }>}
 */
export async function runThreePassPipeline({
  text,
  sourceLang,
  targetLang,
  style = 'normal',
  interfaceLanguage = 'en-US',
  callStage,
  onProgress = null,
  signal = null,
  maxChars = 1200,
  glossary = null,
  initialContext = '',
} = {}) {
  if (typeof callStage !== 'function') {
    throw new Error('runThreePassPipeline 需要 callStage 函數');
  }

  const chunks = splitIntoChunks(text, maxChars);
  if (chunks.length === 0) {
    return { finalText: '', chunks: [], calls: 0, degraded: false };
  }

  const results = [];
  let calls = 0;
  let degraded = false;
  let prevContext = String(initialContext || '').trim().slice(-240);
  const workingGlossary = Array.isArray(glossary) ? [...glossary] : [];

  for (let index = 0; index < chunks.length; index += 1) {
    const source = chunks[index];
    const meta = { index, total: chunks.length };

    assertLive(signal);
    if (onProgress) onProgress({ phase: PIPELINE_PHASES.LITERAL, ...meta });

    // ---- Pass 1 + 2: literal draft and critique, in one response ----
    const draftRaw = await callStage(
      {
        stage: STAGE.DRAFT,
        text: source,
        sourceLang,
        targetLang,
        style,
        interfaceLanguage,
        prevContext,
        glossary: workingGlossary,
      },
      { stage: STAGE.DRAFT, ...meta }
    );
    calls += 1;
    assertLive(signal);

    const { literal, critique } = parseDraftResponse(draftRaw);

    if (onProgress) {
      onProgress({ phase: PIPELINE_PHASES.CRITIQUE, literal, critique, ...meta });
    }

    // ---- Pass 3: rewrite from the source, applying the critique ----
    if (onProgress) onProgress({ phase: PIPELINE_PHASES.REWRITE, literal, critique, ...meta });

    let final = '';
    try {
      const rewriteRaw = await callStage(
        {
          stage: STAGE.REWRITE,
          text: source,
          draft: literal,
          critique,
          sourceLang,
          targetLang,
          style,
          interfaceLanguage,
          prevContext,
          glossary: workingGlossary,
        },
        { stage: STAGE.REWRITE, ...meta }
      );
      calls += 1;
      final = cleanFinalOutput(rewriteRaw);
    } catch (error) {
      if (error && error.name === 'AbortError') throw error;
      // A failed final pass must not lose the work already done. The literal
      // draft is stiff but information-complete, so it is the safest fallback.
      console.warn('[pipeline] 意譯階段失敗，退回直譯稿:', error?.message || error);
      degraded = true;
      final = cleanFinalOutput(literal);
    }

    if (!final.trim()) {
      degraded = true;
      final = cleanFinalOutput(literal);
    }

    results.push({ source, literal, critique, final });
    prevContext = final.slice(-240);

    if (onProgress) {
      onProgress({ phase: PIPELINE_PHASES.DONE, final, literal, critique, ...meta });
    }
  }

  return {
    finalText: results.map((entry) => entry.final).join('\n\n'),
    chunks: results,
    calls,
    degraded,
  };
}

/**
 * Whether a request is worth the extra round trips.
 * Live speech stays on the fast path unless the caller forces deep mode;
 * even then, one- or two-word utterances are not worth three passes.
 */
export function shouldUseDeepPipeline(text, depth) {
  if (depth !== DEPTH.DEEP) return false;
  const value = String(text || '').trim();
  if (!value) return false;
  const cjk = (value.match(/[\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/g) || []).length;
  const latinWords = (value
    .replace(/[\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/g, ' ')
    .match(/[A-Za-z0-9][A-Za-z0-9'-]*/g) || []).length;
  // One CJK character carries roughly as much as one short word, so both count as one unit.
  return cjk + latinWords >= 8;
}
