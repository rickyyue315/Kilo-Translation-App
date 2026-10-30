/**
 * API 位址單一出口（src/js/api.js）
 *
 * 打包後 origin 是 https://localhost，相對路徑會打到 WebView 自己。
 * 這裡鎖住三種 base 形態，避免有人「順手」把結尾斜線或路徑弄掉。
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

async function loadApi(base) {
  vi.resetModules();
  vi.stubEnv('VITE_API_BASE_URL', base);
  return import('../src/js/api.js');
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('apiUrl', () => {
  it('空 base → 維持相對路徑（本機 dev / 同源 web 部署）', async () => {
    const { API_BASE, apiUrl } = await loadApi('');
    expect(API_BASE).toBe('');
    expect(apiUrl('/api/translate')).toBe('/api/translate');
  });

  it('base 結尾斜線會剝除，不會產生 //', async () => {
    const { API_BASE, apiUrl } = await loadApi('https://kilo.example.com/');
    expect(API_BASE).toBe('https://kilo.example.com');
    expect(apiUrl('/api/translate')).toBe('https://kilo.example.com/api/translate');
  });

  it('base 含路徑時原樣保留', async () => {
    const { apiUrl } = await loadApi('https://example.com/v1');
    expect(apiUrl('/api/transcribe')).toBe('https://example.com/v1/api/transcribe');
  });

  it('path 缺少前導斜線時自動補上', async () => {
    const { apiUrl } = await loadApi('https://example.com');
    expect(apiUrl('api/health')).toBe('https://example.com/api/health');
  });

  it('path 為空時不會產生 undefined', async () => {
    const { apiUrl } = await loadApi('https://example.com');
    expect(apiUrl(undefined)).toBe('https://example.com/');
  });
});

describe('isNative', () => {
  it('沒有 Capacitor 時為 false', async () => {
    const { isNative } = await loadApi('');
    delete window.Capacitor;
    expect(isNative()).toBe(false);
  });

  it('Capacitor.isNativePlatform() 為 true 時為 true', async () => {
    const { isNative } = await loadApi('');
    window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android' };
    expect(isNative()).toBe(true);
    delete window.Capacitor;
  });

  it('Capacitor 拋錯時安全回 false', async () => {
    const { isNative } = await loadApi('');
    window.Capacitor = {
      isNativePlatform: () => {
        throw new Error('bridge not ready');
      },
    };
    expect(isNative()).toBe(false);
    delete window.Capacitor;
  });
});
