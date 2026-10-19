// Kilo Translation App — rendering for the three-pass drafts panel
//
// Kept separate from translation.js so the translation engine stays free of
// DOM lookups beyond the settings it already reads.

import { PIPELINE_PHASES } from './pipeline.js';

const PANEL_ID = 'pipelinePanel';
const META_ID = 'pipelineMeta';
const LITERAL_ID = 'pipelineLiteral';
const CRITIQUE_ID = 'pipelineCritique';
const FINAL_ID = 'pipelineFinal';

function el(id) {
  return typeof document === 'undefined' ? null : document.getElementById(id);
}

function phaseLabel(phase, translations = {}) {
  switch (phase) {
    case PIPELINE_PHASES.LITERAL:
      return translations.pipelineLiteral || '直譯';
    case PIPELINE_PHASES.CRITIQUE:
      return translations.pipelineCritique || '反思';
    case PIPELINE_PHASES.REWRITE:
      return translations.pipelineRewrite || '意譯';
    default:
      return translations.pipelineDone || '完成';
  }
}

/** Status-line text for a pipeline progress event. */
export function describePhase(info, translations = {}) {
  const base = translations.pipelineRunning || '三步翻譯中';
  const counter = info?.total > 1 ? ` (${info.index + 1}/${info.total})` : '';
  return `${base} · ${phaseLabel(info?.phase, translations)}${counter}…`;
}

export function clearPipelineSteps() {
  const panel = el(PANEL_ID);
  if (!panel) return;
  panel.classList.add('hidden');
  panel.open = false;
  [META_ID, LITERAL_ID, CRITIQUE_ID, FINAL_ID].forEach((id) => {
    const node = el(id);
    if (node) node.textContent = '';
  });
}

/**
 * Live update while the pipeline runs.
 * @param {object} _elements unused, kept for call-site symmetry
 * @param {{phase:string,index:number,total:number,literal?:string,critique?:string,final?:string}} info
 * @param {object} translations i18n dictionary
 */
export function renderPipelineProgress(_elements, info, translations = {}) {
  const panel = el(PANEL_ID);
  if (!panel) return;

  panel.classList.remove('hidden');

  const meta = el(META_ID);
  if (meta) {
    const chunk = info.total > 1 ? ` (${info.index + 1}/${info.total})` : '';
    meta.textContent = `${phaseLabel(info.phase, translations)}${chunk}…`;
  }

  if (info.literal) {
    const literal = el(LITERAL_ID);
    if (literal) literal.textContent = info.literal;
  }
  if (info.critique) {
    const critique = el(CRITIQUE_ID);
    if (critique) critique.textContent = info.critique;
  }
  if (info.final) {
    const final = el(FINAL_ID);
    if (final) final.textContent = info.final;
  }
}

/**
 * Final render once the pipeline finishes.
 * @param {object} run result of runThreePassPipeline
 * @param {object} translations i18n dictionary
 */
export function renderPipelineSteps(_elements, run, translations = {}) {
  const panel = el(PANEL_ID);
  if (!panel || !run) return;

  const chunks = Array.isArray(run.chunks) ? run.chunks : [];
  if (chunks.length === 0) {
    clearPipelineSteps();
    return;
  }

  const joiner = '\n\n· · ·\n\n';
  const literal = el(LITERAL_ID);
  const critique = el(CRITIQUE_ID);
  const final = el(FINAL_ID);

  if (literal) literal.textContent = chunks.map((entry) => entry.literal).filter(Boolean).join(joiner);
  if (critique) critique.textContent = chunks.map((entry) => entry.critique).filter(Boolean).join(joiner);
  if (final) final.textContent = chunks.map((entry) => entry.final).filter(Boolean).join(joiner);

  const meta = el(META_ID);
  if (meta) {
    const segments = `${chunks.length} ${translations.pipelineChunkUnit || '段'}`;
    const calls = `${run.calls || 0} ${translations.pipelineCallsUnit || '次'}`;
    const degraded = run.degraded ? ` · ${translations.pipelineDegraded || '部分段落已退回直譯'}` : '';
    meta.textContent = `${segments} · ${calls}${degraded}`;
  }

  panel.classList.remove('hidden');
  panel.open = true;
}
