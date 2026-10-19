/**
 * Kilo Translation App — Prompt Library (shared by browser and server)
 *
 * Implements the three-pass translation method:
 *   PASS 1  LITERAL   — clause-by-clause, keeps source syntax, information-complete
 *   PASS 2  CRITIQUE  — hostile bilingual editor marks what a native writer would reject
 *   PASS 3  REWRITE   — re-translates from the source, applying every critique point
 *
 * Plus a "de-AI" style layer that removes machine-sounding surface patterns without
 * touching facts, numbers, terminology or register.
 *
 * This module is pure (no DOM, no fetch) so that:
 *   - the browser can build messages for user-supplied API keys
 *   - api/_shared.js can build the same messages for the server key
 * One source of truth, no prompt drift between the two paths.
 */

export const STAGE = {
  FAST: 'fast',
  DRAFT: 'draft',       // literal + critique in one response (2 round trips total)
  LITERAL: 'literal',
  CRITIQUE: 'critique',
  REWRITE: 'rewrite',
};

const LANGUAGE_NAMES = {
  'zh-TW': 'Traditional Chinese',
  'zh-CN': 'Simplified Chinese',
  'en-US': 'English',
  'ja-JP': 'Japanese',
  'ko-KR': 'Korean',
  'fr-FR': 'French',
  'es-ES': 'Spanish',
  'de-DE': 'German',
  'it-IT': 'Italian',
  'pt-BR': 'Portuguese',
  'ru-RU': 'Russian',
  'ar-SA': 'Arabic',
  'th-TH': 'Thai',
  'vi-VN': 'Vietnamese',
};

export function langName(code) {
  return LANGUAGE_NAMES[code] || code || 'the target language';
}

// ========== Style overlays ==========

/**
 * Register / genre instructions appended to every pass.
 * Kept language-agnostic: they describe the target text, not the target language.
 */
export const STYLE_GUIDES = {
  normal: '',
  natural:
    'Register: natural and conversational. Prefer the phrasing a native speaker would actually use over a structurally faithful rendering. Contractions are fine when the source is informal.',
  formal:
    'Register: formal business. Complete sentences, no contractions, measured tone, precise modality. Avoid slang and avoid marketing superlatives.',
  simple:
    'Register: plain language. Short sentences, common words, one idea per sentence. Explain any term a general reader would not know. Never simplify away technical facts.',
  academic:
    'Register: academic. Precise terminology, hedged claims where the source hedges, explicit logical links, no rhetorical flourishes. Keep citation markers and defined terms intact.',
  technical:
    'Register: technical documentation. Active voice for system behaviour, present tense for how things work, one term per concept throughout. Keep code identifiers, API names, CLI flags and file paths verbatim. Localise units, currency and dates, and give both values when a local unit would confuse an international reader (e.g. "CNY 8 million (about USD 1.1 million)"). No marketing adjectives, no filler transitions.',
};

// ========== De-AI style layer ==========

const DE_AI_RULES_EN = `STYLE GUARD — remove machine-sounding surface patterns (never alter facts, numbers, names or terminology to do so):
- Banned openers and fillers: "In today's fast-paced world", "It is worth noting that", "It is important to note", "In conclusion", "Overall", "That said" used as decoration.
- Banned verbs and adjectives unless the source is literally about them: delve, leverage, utilise, harness, unlock, elevate, empower, streamline, robust, seamless, cutting-edge, game-changing, revolutionary, holistic, testament to.
- No rule-of-three lists that restate one idea three ways. No "not only ... but also" chains.
- No "Firstly / Secondly / Thirdly / Finally" scaffolding. Let the content itself carry the sequence; use at most one ordinal, or none.
- No paragraph that opens with a topic sentence and closes by restating it.
- No em dash as the default connector: at most one per 150 words, and never in a row.
- Vary sentence length deliberately: mix sentences under 8 words with sentences over 25. Perfectly uniform rhythm reads as machine output.
- Prefer a concrete subject and a strong verb over an abstract noun phrase ("cause serious problems" -> "broke", "made improvements to" -> "cut").
- Do not stack more than two nouns; break noun piles with prepositions or a verb.
- Allow asymmetry: bullets and list items do not all need the same shape or length.
- Repetition for emphasis is allowed once, not three times.`;

const DE_AI_RULES_ZH = `文風防護 —— 去掉機器味，但絕不為此改動事實、數字、人名或術語：
- 禁用空洞開頭與總結：「在當今飛速發展的時代」「值得注意的是」「不難發現」「綜上所述」「總的來說」。
- 禁用空詞：「賦能」「助力」「打造」「深耕」「閉環」「抓手」「全方位」「多維度」。
- 禁用「不是……而是……」對舉句式；確需轉折時用具體對比，而不是套模板。
- 禁用「首先／其次／最後」三段式腳手架，讓內容自己承擔順序。
- 禁用三連排比湊字數；同一意思只說一次。
- 少用破折號，連續兩句不得都用。
- 句長必須有起伏：短句可到 5 字，長句可到 40 字，不要通篇同一節奏。
- 少用「進行了……的工作」「作出了……的貢獻」這類動詞名詞化，直接用動詞。
- 名詞不超過兩個連用；「……的……的……」要拆開。
- 允許不對稱：清單每一項不必字數相同、結構相同。`;

const DE_AI_RULES_JA = `文体ガード —— 機械的な表面パターンを除く（事実・数値・固有名詞・術語は変えない）：
- 禁止：「現代の急速に変化する社会において」「注目すべきは」「結論として」「総じて」などの空虚な前置き・まとめ。
- 禁止：「～を実現する」「～を推進する」「～を強化する」の連続による中身のない名詞化。
- 「まず／次に／最後に」の三段構成を機械的に使わない。順序は内容に語らせる。
- 三連列挙で水増ししない。同じ意味を二度言わない。
- 文の長さに起伏を持たせる。短い文と長い文を混ぜる。
- 名詞の連続（「～の～の～」）を避け、動詞で受ける。`;

const DE_AI_RULES_KO = `문체 가드 — 기계적인 표면 패턴을 제거한다(사실·수치·고유명사·용어는 바꾸지 않는다):
- 금지: "오늘날 빠르게 변화하는 시대에", "주목할 만하다", "결론적으로", "전반적으로" 같은 빈 상투적 도입·마무리.
- 금지: "~을 실현하다", "~을 추진하다" 식의 의미 없는 명사화 연속.
- "첫째 / 둘째 / 마지막으로"의 기계적 삼단 구성을 쓰지 않는다. 순서는 내용이 담당한다.
- 삼중 나열로 분량을 늘리지 않는다. 같은 뜻을 두 번 말하지 않는다.
- 문장 길이에 기복을 준다. 짧은 문장과 긴 문장을 섞는다.
- "~의 ~의 ~" 식 명사 연쇄를 피하고 동사로 받는다.`;

export function deAiRules(targetLang) {
  switch (targetLang) {
    case 'zh-TW':
    case 'zh-CN':
      return DE_AI_RULES_ZH;
    case 'ja-JP':
      return DE_AI_RULES_JA;
    case 'ko-KR':
      return DE_AI_RULES_KO;
    default:
      return DE_AI_RULES_EN;
  }
}

const DE_AI_FOOTER = `These are surface rules only. If following one would change meaning, drop the rule. Fidelity beats style, always.`;

// ========== Shared fragments ==========

function glossaryBlock(glossary) {
  if (!Array.isArray(glossary) || glossary.length === 0) return '';
  const lines = glossary
    .filter((entry) => entry && entry.source && entry.target)
    .slice(0, 40)
    .map((entry) => `- ${entry.source} => ${entry.target}`);
  if (lines.length === 0) return '';
  return `\n\nLOCKED TERMINOLOGY (use exactly these renderings):\n${lines.join('\n')}`;
}

function contextBlock(prevContext) {
  const tail = String(prevContext || '').trim().slice(-240);
  if (!tail) return '';
  return `\n\nCONTINUITY: this is a later segment of the same document. The previous segment ended with:\n"...${tail}"\nKeep terminology, tone and referring expressions consistent with it.`;
}

const SCRIPT_RULES = {
  'zh-TW': 'Write Traditional Chinese only. Never emit Simplified characters, even when the input is Simplified.',
  'zh-CN': 'Write Simplified Chinese only. Never emit Traditional characters, even when the input is Traditional.',
  'ja-JP': 'Write Japanese (kanji, hiragana, katakana). Never fall back to Chinese, even though the input may be Chinese.',
  'ko-KR': 'Write Korean hangul. Never fall back to Chinese or Japanese.',
  'fr-FR': 'Write French with correct accents and elision.',
  'es-ES': 'Write Spanish with correct accents, ñ and inverted punctuation.',
  'de-DE': 'Write German with correct capitalisation of nouns and umlauts.',
};

function scriptGuard(targetLang) {
  const rule = SCRIPT_RULES[targetLang];
  return rule ? `\n- ${rule}` : '';
}

function guardBlock(src, tgt, targetCode) {
  return `HARD CONSTRAINTS:
- Source language: ${src}. Target language: ${tgt}. Never answer in any other language except for terms you intentionally keep in the source form.${scriptGuard(targetCode)}
- The input may mix languages; translate all of it, keeping only proper nouns and code identifiers in their original form.
- Do not add, remove or "improve" information. Numbers, names, code identifiers, units and dates must survive intact.
- Do not explain your choices and do not add notes. Output only what the pass asks for.`;
}

function styleBlock(style) {
  const guide = STYLE_GUIDES[style];
  return guide ? `\n\n${guide}` : '';
}

// ========== Pass builders ==========

const PASS1_LITERAL = `PASS 1 — LITERAL DRAFT.
Translate clause by clause. Keep the source sentence order, sentence boundaries, paragraph breaks, and list structure. Render technical terms literally and consistently. Do not merge or split sentences, do not smooth, do not embellish, do not add connectives the source does not have. A slightly stiff result is correct here: this draft exists to expose structural differences, not to be published.`;

const PASS2_CRITIQUE = (critiqueLang) => `PASS 2 — CRITIQUE.
Now read your draft as a hostile bilingual editor whose name goes on the byline. Your job is to find what a native ${critiqueLang} writer would refuse to publish. Check every item below and report only the real problems:
1. Calques — literal renderings of source idioms, word order carried over, unnatural collocations.
2. Noun piles — three or more nouns stacked together.
3. Weak verb + abstract noun where a strong verb exists.
4. Passive voice where the agent is known and worth naming.
5. Nominalisation and "of" chains that hide the action.
6. Rhythm — sentences over ~35 words that should split; a run of sentences with identical length.
7. Transition scaffolding — "Firstly / Secondly / Moreover" chains, or a topic sentence that the paragraph then repeats.
8. Terminology drift — the same source term rendered two different ways, or jargon left unexplained on first use.
9. Culture-specific references that need a short gloss for the target reader.
10. Units, currency, dates and names that need localising.
11. Machine-flavoured filler from the style guard.
Write one line per issue, in ${critiqueLang}, in this shape:
- [type] "the offending fragment" -> how to fix it
At most 10 lines. No praise, no preamble, no closing summary. If a sentence is genuinely fine, say nothing about it.`;

function formatContract() {
  return `OUTPUT FORMAT — use exactly these two markers on their own lines:
<<<LITERAL>>>
(the literal draft only)
<<<CRITIQUE>>>
(the critique lines only)`;
}

/**
 * Fast single-pass prompt: the model runs the three passes silently and prints only the result.
 * Used for live speech where latency matters more than a visible audit trail.
 */
export function buildFastMessages({
  text = '',
  sourceLang = 'zh-TW',
  targetLang = 'en-US',
  style = 'normal',
} = {}) {
  const src = langName(sourceLang);
  const tgt = langName(targetLang);
  const system = `You are a senior translator working from ${src} into ${tgt}. You translate the way a native ${tgt} writer would write the same piece from scratch.

Work in three internal passes and print only the result of the third:
1. Draft literally, keeping the source structure, so that nothing is lost.
2. Attack the draft: calques, noun piles, weak verbs, needless passives, monotone rhythm, terminology drift, unexplained cultural references.
3. Rewrite from the source, not from the draft, fixing everything you found.

${guardBlock(src, tgt, targetLang)}${styleBlock(style)}

${deAiRules(targetLang)}

${DE_AI_FOOTER}

Output the final translation only. No markers, no commentary, no quotation marks around it.`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: text },
  ];
}

/**
 * Full three-pass messages.
 * stage 'draft'  -> literal + critique in one response (saves a round trip)
 * stage 'rewrite' -> final pass, needs draft + critique
 * 'literal' / 'critique' are available for debugging or single-pass A/B tests.
 */
export function buildMessages({
  stage = STAGE.DRAFT,
  text = '',
  draft = '',
  critique = '',
  sourceLang = 'zh-TW',
  targetLang = 'en-US',
  style = 'normal',
  interfaceLanguage = 'en-US',
  prevContext = '',
  glossary = null,
} = {}) {
  const src = langName(sourceLang);
  const tgt = langName(targetLang);
  const critiqueLang = langName(interfaceLanguage);
  const shared = `${guardBlock(src, tgt, targetLang)}${styleBlock(style)}${glossaryBlock(glossary)}${contextBlock(prevContext)}`;

  if (stage === STAGE.LITERAL) {
    return [
      {
        role: 'system',
        content: `You are a bilingual translator producing a literal draft from ${src} into ${tgt}.\n\n${shared}\n\n${PASS1_LITERAL}\n\nOutput the literal draft only.`,
      },
      { role: 'user', content: text },
    ];
  }

  if (stage === STAGE.CRITIQUE) {
    return [
      {
        role: 'system',
        content: `You are a hostile bilingual editor reviewing a ${tgt} translation of a ${src} source. You do not rewrite; you diagnose.\n\n${shared}\n\n${PASS2_CRITIQUE(critiqueLang)}\n\nOutput the critique lines only.`,
      },
      { role: 'user', content: `SOURCE:\n${text}\n\nLITERAL DRAFT:\n${draft}` },
    ];
  }

  if (stage === STAGE.REWRITE) {
    return [
      {
        role: 'system',
        content: `You are a senior ${tgt} editor producing the publishable version of a ${src} text.\n\n${shared}\n\nPASS 3 — REWRITE.
Rewrite from the SOURCE, not from the literal draft. The draft and the critique are inputs to your judgement, not text to patch. Apply every valid critique point; ignore any point that would distort the source.
Produce prose a native ${tgt} writer would have written from scratch: varied sentence length, strong verbs, concrete subjects, natural transitions, consistent terminology.
Do not summarise, do not shorten, do not add examples or opinions that are not in the source.

${deAiRules(targetLang)}

${DE_AI_FOOTER}

Output the final translation only. No markers, no commentary.`,
      },
      {
        role: 'user',
        content: `SOURCE:\n${text}\n\nLITERAL DRAFT:\n${draft}\n\nCRITIQUE:\n${critique || '(no critique available — rely on your own reading)'}`,
      },
    ];
  }

  // stage 'draft' (default): literal + critique fused into one response
  return [
    {
      role: 'system',
      content: `You are a bilingual translator and a hostile editor, working from ${src} into ${tgt}. You will do two passes in one response: write a literal draft, then attack it.

${shared}

${PASS1_LITERAL}

${PASS2_CRITIQUE(critiqueLang)}

${formatContract()}`,
    },
    { role: 'user', content: text },
  ];
}

// ========== Parsing ==========

const LITERAL_MARK = /<<<\s*LITERAL\s*>>>/i;
const CRITIQUE_MARK = /<<<\s*CRITIQUE\s*>>>/i;

/**
 * Split a fused draft response into { literal, critique }.
 * Tolerates missing markers, marker variants, and models that wrap the whole reply in code fences.
 */
export function parseDraftResponse(raw) {
  let body = String(raw || '').trim();
  if (!body) return { literal: '', critique: '' };

  // Strip a single wrapping code fence, if present.
  const fence = body.match(/^```[a-z]*\s*\n([\s\S]*?)\n```$/i);
  if (fence) body = fence[1].trim();

  const hasLiteral = LITERAL_MARK.test(body);
  const hasCritique = CRITIQUE_MARK.test(body);

  if (!hasLiteral && !hasCritique) {
    // No contract honoured: treat the whole thing as the draft, let the rewrite pass
    // do its own critique instead of failing the request.
    return { literal: body, critique: '' };
  }

  let literal = '';
  let critique = '';

  if (hasLiteral && hasCritique) {
    const parts = body.split(CRITIQUE_MARK);
    literal = parts[0].replace(LITERAL_MARK, '').trim();
    critique = parts.slice(1).join('').trim();
  } else if (hasLiteral) {
    literal = body.replace(LITERAL_MARK, '').trim();
  } else {
    // Only the critique marker: everything before it is the draft.
    const parts = body.split(CRITIQUE_MARK);
    literal = parts[0].trim();
    critique = parts.slice(1).join('').trim();
  }

  return { literal, critique };
}

/** Best-effort cleanup of a final-pass response. */
export function cleanFinalOutput(raw) {
  let body = String(raw || '').trim();
  const fence = body.match(/^```[a-zA-Z-]*\s*\n([\s\S]*?)\n```$/);
  if (fence) body = fence[1].trim();
  // Some models still echo the markers despite instructions.
  body = body.replace(/<<<\s*(LITERAL|CRITIQUE)\s*>>>/gi, '').trim();
  return body;
}

// ========== Chunking ==========

/**
 * Split long text into translation units that keep paragraph and sentence integrity.
 * Order is preserved and concatenating the result reproduces the input (modulo
 * whitespace at the seams), so no content is lost.
 *
 * @param {string} text
 * @param {number} maxChars soft upper bound per chunk
 * @returns {string[]}
 */
export function splitIntoChunks(text, maxChars = 1200) {
  const source = String(text || '');
  if (!source.trim()) return [];
  if (source.length <= maxChars) return [source];

  const paragraphs = source.split(/\n{2,}/);
  const chunks = [];
  let buffer = '';

  const flush = () => {
    if (buffer.trim()) chunks.push(buffer.trim());
    buffer = '';
  };

  const pushSentenceSplit = (paragraph) => {
    // Split on CJK and Latin sentence terminators, keeping the terminator.
    const sentences = paragraph.match(/[^。！？!?；;\n]+[。！？!?；;]?/g) || [paragraph];
    for (const sentence of sentences) {
      if (!sentence.trim()) continue;
      if (buffer.length + sentence.length > maxChars && buffer.trim()) flush();
      if (sentence.length > maxChars) {
        // Hard cut a monster sentence; extremely rare, and better than dropping it.
        for (let i = 0; i < sentence.length; i += maxChars) {
          const slice = sentence.slice(i, i + maxChars);
          if (buffer && buffer.length + slice.length > maxChars) flush();
          buffer += slice;
          flush();
        }
      } else {
        buffer += sentence;
      }
    }
  };

  for (const paragraph of paragraphs) {
    if (paragraph.length + buffer.length + 2 <= maxChars) {
      buffer += (buffer ? '\n\n' : '') + paragraph;
      continue;
    }
    flush();
    if (paragraph.length <= maxChars) {
      buffer = paragraph;
    } else {
      pushSentenceSplit(paragraph);
      flush();
    }
  }
  flush();

  return chunks;
}
