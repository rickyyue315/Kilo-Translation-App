/**
 * Structural tests for the model catalogue.
 * Liveness and price accuracy are covered by `npm run check:models`.
 */
import { describe, it, expect, afterEach } from 'vitest';
import {
  ASR_MODELS,
  DEFAULT_ASR_MODEL,
  DEFAULT_MODEL,
  FREE_MODELS,
  MODEL_CATALOG,
  MODEL_ORDER,
  MODEL_TIERS,
  SERVER_PAID_MODELS,
} from '../src/js/modelCatalog.js';
import { aiModels, freeModelsOnly, modelCategories, filterModelsForServerAPI, getServerAllowedModels, setServerPaidEnabled } from '../src/js/models.js';

const ordered = Object.values(MODEL_ORDER).flat();

describe('catalogue integrity', () => {
  it('lists every catalogue entry exactly once in MODEL_ORDER', () => {
    expect(new Set(ordered).size).toBe(ordered.length);
    expect(ordered.sort()).toEqual(Object.keys(MODEL_CATALOG).sort());
  });

  it('gives every model a tier that MODEL_TIERS knows', () => {
    Object.values(MODEL_CATALOG).forEach((model) => {
      expect(MODEL_TIERS[model.tier], model.name).toBeTruthy();
    });
  });

  it('keeps free models free and paid models priced', () => {
    Object.entries(MODEL_CATALOG).forEach(([id, model]) => {
      if (id.endsWith(':free')) {
        expect(model.input, id).toBe(0);
        expect(model.output, id).toBe(0);
        expect(model.tier, id).toBe('free');
      } else {
        expect(model.input, id).toBeGreaterThan(0);
        expect(model.output, id).toBeGreaterThan(0);
      }
    });
  });

  it('ships a default model that is selectable', () => {
    expect(MODEL_CATALOG[DEFAULT_MODEL]).toBeTruthy();
    expect(MODEL_ORDER.value).toContain(DEFAULT_MODEL);
  });

  it('only allows curated paid models on the server key', () => {
    SERVER_PAID_MODELS.forEach((id) => {
      expect(MODEL_CATALOG[id], id).toBeTruthy();
      expect(id.endsWith(':free'), id).toBe(false);
    });
  });
});

describe('free model list', () => {
  it('is the free tier in fallback order', () => {
    expect(FREE_MODELS).toEqual(MODEL_ORDER.free);
    FREE_MODELS.forEach((id) => expect(id).toMatch(/:free$/));
  });

  it('contains no duplicate fallbacks', () => {
    expect(new Set(FREE_MODELS).size).toBe(FREE_MODELS.length);
  });
});

describe('transcription models', () => {
  it('has a valid default', () => {
    expect(ASR_MODELS[DEFAULT_ASR_MODEL]).toBeTruthy();
  });

  it('documents a per-hour price for every model', () => {
    Object.entries(ASR_MODELS).forEach(([id, model]) => {
      expect(model.name, id).toBeTruthy();
      expect(model.vendor, id).toBeTruthy();
      expect(model.description, id).toBeTruthy();
      expect(typeof model.pricePerHour, id).toBe('number');
      expect(model.pricePerHour, id).toBeGreaterThan(0);
    });
  });

  it('orders the cheapest capable model as default', () => {
    const prices = Object.values(ASR_MODELS).map((model) => model.pricePerHour);
    expect(ASR_MODELS[DEFAULT_ASR_MODEL].pricePerHour).toBeLessThan(Math.max(...prices));
  });
});

describe('models.js derivation', () => {
  it('exposes every ordered model with a display shape', () => {
    expect(Object.keys(aiModels).sort()).toEqual([...ordered].sort());
    Object.values(aiModels).forEach((model) => {
      expect(model.name).toBeTruthy();
      expect(model.description).toBeTruthy();
      expect(Object.values(MODEL_TIERS)).toContain(model.category);
    });
  });

  it('mirrors the free list and category buckets', () => {
    expect(freeModelsOnly).toEqual(MODEL_ORDER.free);
    expect(modelCategories[MODEL_TIERS.free]).toEqual(MODEL_ORDER.free);
    expect(modelCategories[MODEL_TIERS.value]).toEqual(MODEL_ORDER.value);
  });
});

describe('server-key model policy', () => {
  const buildSelect = () => {
    const select = document.createElement('select');
    select.innerHTML = '<option value="custom">custom</option>';
    return select;
  };
  const buildDeps = () => ({
    aiModel: buildSelect(),
    modelDescription: document.createElement('p'),
    translations: {},
  });

  afterEach(() => setServerPaidEnabled(false));

  it('shows free models only by default', () => {
    const deps = buildDeps();
    setServerPaidEnabled(false);
    filterModelsForServerAPI(deps);

    const values = [...deps.aiModel.querySelectorAll('option')].map((option) => option.value);
    expect(values).toEqual(MODEL_ORDER.free);
    expect(deps.aiModel.value).toBe(MODEL_ORDER.free[0]);
    expect(getServerAllowedModels()).toEqual(MODEL_ORDER.free);
  });

  it('includes the curated paid list when the deployment opts in', () => {
    const deps = buildDeps();
    setServerPaidEnabled(true);
    filterModelsForServerAPI(deps);

    const values = [...deps.aiModel.querySelectorAll('option')].map((option) => option.value);
    expect(values).toEqual([...SERVER_PAID_MODELS, ...MODEL_ORDER.free]);
    expect(deps.aiModel.value).toBe(DEFAULT_MODEL);
  });

  it('keeps a still-valid selection when re-rendering', () => {
    const deps = buildDeps();
    setServerPaidEnabled(true);
    filterModelsForServerAPI(deps);
    deps.aiModel.value = 'z-ai/glm-5.3';
    filterModelsForServerAPI(deps);
    expect(deps.aiModel.value).toBe('z-ai/glm-5.3');
  });
});
