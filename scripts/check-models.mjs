#!/usr/bin/env node
/**
 * Verify every model ID the app ships against OpenRouter's live catalogue.
 *
 *   npm run check:models
 *
 * Checks:
 *   - chat models exist in /api/v1/models
 *   - recorded price / context still match (warns on drift)
 *   - transcription models resolve via /api/v1/models/{id}/endpoints
 *   - published audio price is still what we documented
 *
 * Exit code 1 if any configured model is gone. Price drift is a warning, not a failure.
 */

import {
  ASR_MODELS,
  DEFAULT_ASR_MODEL,
  DEFAULT_MODEL,
  MODEL_CATALOG,
  MODEL_ORDER,
} from '../src/js/modelCatalog.js';

const API = 'https://openrouter.ai/api/v1/models';
const PAGE = 'https://openrouter.ai';
const colour = process.stdout.isTTY
  ? { red: '\x1b[31m', yellow: '\x1b[33m', green: '\x1b[32m', dim: '\x1b[2m', bold: '\x1b[1m', off: '\x1b[0m' }
  : { red: '', yellow: '', green: '', dim: '', bold: '', off: '' };

const c = colour;
const problems = [];
const warnings = [];

/**
 * Models that appear in the catalogue as free but reject plain API keys with
 * "only available on agentic harnesses". Keep this list so the check fails
 * loudly if one is ever added back to MODEL_ORDER.
 */
const HARNESS_ONLY = new Set([
  'thinkingmachines/inkling:free',
  'thinkingmachines/inkling-small:free',
]);

async function getJson(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'kilo-model-check/1.0' } });
  if (!response.ok) throw new Error(`${url} → HTTP ${response.status}`);
  return response.json();
}

async function getText(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'kilo-model-check/1.0' } });
  return response.ok ? response.text() : '';
}

/** "$0.00005 per second" / "$0.10 per hour" / "$0.002 per minute" → USD per hour */
function parseAudioPricePerHour(html) {
  const match = html.match(/Priced at \$([0-9.]+)\s*per\s*(second|minute|hour)/i);
  if (!match) return null;
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === 'second') return value * 3600;
  if (unit === 'minute') return value * 60;
  return value;
}

function money(value) {
  if (value === null || value === undefined) return '—';
  if (value === 0) return 'free';
  return `$${value < 0.01 ? value.toFixed(4) : value.toFixed(3)}`;
}

async function main() {
  console.log(`${c.bold}OpenRouter model check${c.off} ${c.dim}(live catalogue)${c.off}\n`);

  const catalogue = await getJson(API);
  const byId = new Map(catalogue.data.map((model) => [model.id, model]));
  console.log(`${c.dim}catalogue size: ${catalogue.data.length} models${c.off}\n`);

  // ── Chat models ────────────────────────────────────────────
  console.log(`${c.bold}Chat models${c.off}`);
  const ordered = Object.values(MODEL_ORDER).flat();
  const known = new Set(ordered);

  for (const id of Object.keys(MODEL_CATALOG)) {
    if (!known.has(id)) warnings.push(`${id} is in the catalogue object but not in MODEL_ORDER`);
  }

  for (const id of ordered) {
    if (HARNESS_ONLY.has(id)) {
      problems.push(`${id} — free but restricted to agentic harnesses (403 for plain API keys)`);
      console.log(`${c.red}HARNESS${c.off} ${id}`);
      continue;
    }
    const recorded = MODEL_CATALOG[id];
    const live = byId.get(id);

    if (!live) {
      problems.push(`${id} — no longer on OpenRouter`);
      console.log(`${c.red}MISSING${c.off}  ${id}`);
      continue;
    }

    const input = Number(live.pricing.prompt) * 1e6;
    const output = Number(live.pricing.completion) * 1e6;
    const priceChanged =
      Math.abs(input - recorded.input) > Math.max(0.001, recorded.input * 0.05) ||
      Math.abs(output - recorded.output) > Math.max(0.001, recorded.output * 0.05);

    if (priceChanged) {
      warnings.push(`${id} — price moved: $${recorded.input}/${recorded.output} → $${input}/${output} per M`);
    }
    if (live.context_length !== recorded.context) {
      warnings.push(`${id} — context moved: ${recorded.context} → ${live.context_length}`);
    }

    const flag = priceChanged ? `${c.yellow}PRICE${c.off}` : `${c.green}OK${c.off}   `;
    const selected = id === DEFAULT_MODEL ? ` ${c.dim}← default${c.off}` : '';
    console.log(
      `${flag} ${id.padEnd(50)} in ${money(input).padStart(7)}  out ${money(output).padStart(7)}  ctx ${String(live.context_length).padStart(8)}${selected}`
    );
  }

  // ── Transcription models ───────────────────────────────────
  console.log(`\n${c.bold}Transcription models${c.off} ${c.dim}(priced per hour of audio)${c.off}`);
  for (const [id, recorded] of Object.entries(ASR_MODELS)) {
    let endpoints;
    try {
      endpoints = await getJson(`${API}/${id}/endpoints`);
    } catch {
      endpoints = null;
    }
    if (!endpoints?.data) {
      problems.push(`${id} — transcription endpoint not found`);
      console.log(`${c.red}MISSING${c.off}  ${id}`);
      continue;
    }

    const html = await getText(`${PAGE}/${id}`);
    const perHour = parseAudioPricePerHour(html);
    const changed = perHour !== null && Math.abs(perHour - recorded.pricePerHour) > 0.0005;
    if (changed) {
      warnings.push(`${id} — audio price moved: $${recorded.pricePerHour}/h → $${perHour}/h`);
    }

    const flag = changed ? `${c.yellow}PRICE${c.off}` : `${c.green}OK${c.off}   `;
    const price = perHour === null ? `${c.dim}price n/a${c.off}` : `$${perHour.toFixed(4)}/h`;
    const selected = id === DEFAULT_ASR_MODEL ? ` ${c.dim}← default${c.off}` : '';
    console.log(`${flag} ${id.padEnd(56)} ${price.padStart(12)}${selected}`);
  }

  // ── Summary ────────────────────────────────────────────────
  console.log('');
  if (warnings.length) {
    console.log(`${c.yellow}${warnings.length} warning(s)${c.off}`);
    warnings.forEach((message) => console.log(`  · ${message}`));
  }
  if (problems.length) {
    console.log(`${c.red}${problems.length} model(s) missing${c.off}`);
    problems.forEach((message) => console.log(`  · ${message}`));
    console.log(`\nUpdate src/js/modelCatalog.js before shipping.`);
    process.exitCode = 1;
    return;
  }
  console.log(`${c.green}All ${ordered.length + Object.keys(ASR_MODELS).length} configured models resolve.${c.off}`);
}

main().catch((error) => {
  console.error(`${c.red}check failed:${c.off} ${error.message}`);
  process.exitCode = 1;
});
