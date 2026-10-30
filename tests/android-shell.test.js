/**
 * 靜態驗收：把「紀律」變成「結構」。
 *
 * ANDROID_APP.md §3.5（22 項既有缺陷）、§3.7（四條架構級規則）、§9（三條 grep 級 CI 檢查）
 * 的共同問題是「程式碼看起來對、畫面其實錯」。這些檢查不需要真機，跑在 CI 就能擋住回歸。
 *
 * 這裡只驗「可從原始碼判定」的項目；對比、幾何、真機行為仍須 §7.3 的機型矩陣。
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const css = readFileSync(path.join(ROOT, 'src', 'styles', 'main.css'), 'utf8');
const manifest = JSON.parse(readFileSync(path.join(ROOT, 'public', 'manifest.json'), 'utf8'));

/** 從 css 的某個起始位置抓出平衡大括號的區塊內容 */
function extractBlock(source, fromIndex) {
  const open = source.indexOf('{', fromIndex);
  if (open === -1) return '';
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  return '';
}

function idsInHtml(source) {
  return [...source.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
}

describe('index.html — 唯一 id 與節點契約', () => {
  it('所有 id 唯一（重複 id 的第二個永遠是死節點）', () => {
    const ids = idsInHtml(html);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    expect(duplicates).toEqual([]);
  });

  it('voiceChatVisualizer 只剩一個（缺陷 #1）', () => {
    const count = (html.match(/id="voiceChatVisualizer"/g) || []).length;
    expect(count).toBe(1);
  });

  it('swapUsers 保留節點但 inline 隱藏（刪掉即 TypeError → 白屏）', () => {
    const tag = html.match(/<button[^>]*id="swapUsers"[^>]*>/)?.[0] || '';
    expect(tag).toContain('style="display:none"');
    expect(tag).toContain('disabled');
    expect(tag).toContain('tabindex="-1"');
    expect(tag).toContain('aria-hidden="true"');
  });

  it('錄音 orb 內含 mic / stop 兩個形狀，並以 aria-pressed 為初始狀態', () => {
    const start = html.indexOf('id="recordButton"');
    const block = html.slice(start, start + 900);
    expect(block).toContain('aria-pressed="false"');
    expect(block).toContain('icon-mic');
    expect(block).toContain('icon-stop');
  });

  it('兩個分頁的 aria-controls 都指向存在的 panel', () => {
    const controls = [...html.matchAll(/role="tab"[^>]*aria-controls="([^"]+)"/g)].map((m) => m[1]);
    expect(controls).toHaveLength(2);
    controls.forEach((id) => expect(html).toContain(`id="${id}"`));
  });

  it('platform-check 必須排在 module script 之前（舊 WebView 才不會白屏）', () => {
    const platformCheck = html.indexOf('/platform-check.js');
    const moduleScript = html.indexOf('type="module"');
    expect(platformCheck).toBeGreaterThan(-1);
    expect(moduleScript).toBeGreaterThan(-1);
    expect(platformCheck).toBeLessThan(moduleScript);
  });

  it('移除網頁遺跡：不再有 skip-link / kbd / 快捷鍵說明鈕', () => {
    expect(html).not.toContain('class="skip-link"');
    expect(html).not.toContain('<kbd');
    expect(html).not.toContain('id="helpBtn"');
  });

  it('麥克風權限三態的兩個說明視窗都在', () => {
    expect(html).toContain('id="micRationaleModal"');
    expect(html).toContain('id="micBlockedModal"');
    expect(html).toContain('id="micBlockedOpenSettings"');
  });
});

describe('主題色 — 四處必須同色（缺陷 #2 / #13）', () => {
  it('index.html 的 light / dark theme-color 等於實際底色', () => {
    expect(html).toMatch(/name="theme-color" content="#f1f5f9"/);
    expect(html).toMatch(/name="theme-color" content="#0b1220"/);
  });

  it('manifest 的 theme_color / background_color 同步', () => {
    expect(manifest.theme_color).toBe('#f1f5f9');
    expect(manifest.background_color).toBe('#f1f5f9');
  });

  it('manifest 引用的圖示檔都存在', () => {
    manifest.icons.forEach((icon) => {
      const file = path.join(ROOT, 'public', icon.src.replace(/^\//, ''));
      expect(existsSync(file), `missing ${icon.src}`).toBe(true);
    });
  });
});

describe('main.css — WebView 相容性（105–110）', () => {
  it('不得使用 color-mix（不相容會讓整條 background 失效變透明）', () => {
    expect(css).not.toContain('color-mix(');
  });

  it('不得使用 backdrop-filter（edge-to-edge 下每幀重繪整片滾動內容）', () => {
    expect(css).not.toContain('backdrop-filter');
  });

  it('dvh 宣告必須有 vh 前置 fallback', () => {
    // 只看真正的宣告行（略過註解），否則註解裡提到 dvh 也會被誤判
    const dvhLines = css
      .split('\n')
      .filter((line) => /^\s*[a-z-]+\s*:[^;]*dvh/.test(line));
    expect(dvhLines.length).toBeGreaterThan(0);
    const withoutFallback = dvhLines.filter((line) => {
      const prop = line.split(':')[0].trim();
      return !new RegExp(`\\n\\s*${prop}\\s*:\\s*[^;]*vh;`).test(css);
    });
    expect(withoutFallback).toEqual([]);
  });

  it('body.mobile-device 不再重複加 padding-bottom（dock 已在佈局內讓位）', () => {
    expect(css).not.toContain('body.mobile-device');
  });

  it('安全區採雙層 fallback：先取注入變數，再退 env()', () => {
    expect(css).toMatch(/--sat:\s*var\(--safe-area-inset-top,\s*env\(safe-area-inset-top/);
    expect(css).toMatch(/--sab:\s*var\(--safe-area-inset-bottom,\s*env\(safe-area-inset-bottom/);
  });

  it('orb 及其容器沒有 overflow: hidden', () => {
    const orbBlocks = [...css.matchAll(/\.record-(button|orb)\s*\{([^}]*)\}/g)].map((m) => m[2]);
    expect(orbBlocks.length).toBeGreaterThan(0);
    orbBlocks.forEach((block) => expect(block).not.toContain('overflow: hidden'));
  });

  it('reduce-motion 不得用萬用選擇器（會連 spinner 一起停掉）', () => {
    const index = css.indexOf('@media (prefers-reduced-motion: reduce)');
    expect(index).toBeGreaterThan(-1);
    const block = extractBlock(css, index);
    expect(block).not.toMatch(/(^|[\s,{])\*(\s*,|\s*\{)/);
    expect(block).not.toContain('animation-duration: 0.01ms');
    // spinner 必須保留旋轉（降速），否則使用者以為 App 卡死
    expect(block).toContain('.loading-spinner');
  });

  it('tooltip 層級已下調（不可高於 sheet 21）', () => {
    expect(css).toMatch(/--z-tooltip:\s*2100/);
    expect(css).toMatch(/--z-sheet:\s*21/);
    expect(css).toMatch(/--z-error:\s*19/);
    expect(css).toMatch(/--z-scrim:\s*20/);
  });
});

describe('main.css — 幾何與單位分工（§3.4）', () => {
  it('orb 圖示用 px，不用 rem（200% 會變 70.4px 撐爆 80dp）', () => {
    expect(css).toMatch(/\.record-orb svg\s*\{\s*width:\s*24px/);
    expect(css).not.toMatch(/\.record-orb svg\s*\{[^}]*width:\s*[\d.]+rem/);
  });

  it('dock 是佈局內元素，不是 sticky / fixed', () => {
    const dockBlock = css.match(/\.dock\s*\{[^}]*\}/)?.[0] || '';
    expect(dockBlock).toContain('flex: 0 0 auto');
    expect(dockBlock).toContain('position: relative');
    expect(dockBlock).not.toContain('position: sticky');
    expect(dockBlock).not.toContain('position: fixed');
  });

  it('dock 背景不透明且不用 color-mix', () => {
    const dockBlock = css.match(/\.dock\s*\{[^}]*\}/)?.[0] || '';
    expect(dockBlock).toContain('background: var(--color-surface)');
  });

  it('data-compact 是版面分支：不得改變任何字級', () => {
    const compactRules = [...css.matchAll(/html\[data-compact\][^{]*\{([^}]*)\}/g)].map((m) => m[1]);
    expect(compactRules.length).toBeGreaterThan(0);
    compactRules.forEach((block) => {
      expect(block).not.toMatch(/(^|[\s;])font-size\s*:/);
    });
  });

  it('命中盒下限 48px 已定義，且 .btn 使用它', () => {
    expect(css).toMatch(/--hit-min:\s*48px/);
    const btnBlock = css.match(/\n\.btn\s*\{[^}]*\}/)?.[0] || '';
    expect(btnBlock).toContain('min-height: var(--hit-min)');
  });
});

describe('main.css — token 與狀態承載（§9 三條 grep 級檢查）', () => {
  it('一色一義：--*-on / --*-on-container 不得引用 var(--color-', () => {
    const onTokens = [...css.matchAll(/(--[\w-]*(?:on|on-container|icon)):\s*([^;]+);/g)];
    const offenders = onTokens.filter(([, , value]) => value.includes('var(--color-'));
    expect(offenders.map((m) => m[0])).toEqual([]);
  });

  it('雙人角色色四個槽位在兩個主題都定義', () => {
    ['--role-a', '--role-a-on', '--role-a-container', '--role-a-on-container',
      '--role-b', '--role-b-on', '--role-b-container', '--role-b-on-container'].forEach((token) => {
      const count = (css.match(new RegExp(`${token}:`, 'g')) || []).length;
      expect(count, `${token} 應在 light 與 dark 各定義一次`).toBe(2);
    });
  });

  it('dark 不得把 #2563EB / #7C3AED 當角色填色（對 dock 僅 2.0–2.3:1）', () => {
    const darkBlock = extractBlock(css, css.indexOf('html[data-theme="dark"]'));
    expect(darkBlock).not.toMatch(/--role-a:\s*#2563EB/i);
    expect(darkBlock).not.toMatch(/--role-b:\s*#7C3AED/i);
    expect(darkBlock).toMatch(/--role-a:\s*#60A5FA/i);
    expect(darkBlock).toMatch(/--role-b:\s*#A78BFA/i);
  });

  it('錄音環由靜態 ::after 承載，不靠 keyframes 中間值', () => {
    expect(css).toMatch(/\.record-button::after\s*\{[^}]*border:\s*3px solid/);
    expect(css).not.toContain('@keyframes ring-expand');
  });

  it('深色錄音盤是淺盤（反相），不是紅色漸層', () => {
    expect(css).toMatch(/--record-disc-from:\s*#CBD5E1/);
    expect(css).toMatch(/--record-disc-to:\s*#94A3B8/);
  });
});
