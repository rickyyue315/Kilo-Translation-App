/**
 * UI 探針：用 Chrome DevTools Protocol 在真實瀏覽器裡量幾何 + 截圖。
 *
 * 為什麼要這支腳本：
 * 本專案 4 個問題（Web Speech、fontScale、safe-area、color-mix）在原始碼層面都「看起來對」，
 * 只有真的渲染才會露出來。與其靠肉眼讀 CSS，不如量 getBoundingClientRect。
 *
 * 用法：
 *   npm run build && npx vite preview --port 4173 &
 *   node scripts/ui-probe.mjs http://localhost:4173
 *
 * 產出：.preview/android/*.png + 一份 JSON 量測結果（印在 stdout）
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const URL_TARGET = process.argv[2] || 'http://localhost:4173';
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT_DIR = path.resolve('.preview/android');
mkdirSync(OUT_DIR, { recursive: true });

const userDataDir = path.join(os.tmpdir(), `kilo-probe-${Date.now()}`);

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-port=9222',
    `--user-data-dir=${userDataDir}`,
    'about:blank',
  ],
  { stdio: 'ignore' }
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getPageTarget() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const res = await fetch('http://127.0.0.1:9222/json/list');
      const list = await res.json();
      const page = list.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page;
    } catch {
      // chrome 還沒起來
    }
    await sleep(250);
  }
  throw new Error('無法連上 Chrome DevTools');
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.events = new Map();
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method) {
        const handlers = this.events.get(msg.method) || [];
        handlers.forEach((fn) => fn(msg.params));
      }
    });
  }

  send(method, params = {}) {
    this.id += 1;
    const id = this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  once(method) {
    return new Promise((resolve) => {
      const handlers = this.events.get(method) || [];
      const fn = (params) => {
        this.events.set(method, (this.events.get(method) || []).filter((h) => h !== fn));
        resolve(params);
      };
      handlers.push(fn);
      this.events.set(method, handlers);
    });
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      const detail = result.exceptionDetails.exception?.description
        || result.exceptionDetails.text
        || 'evaluate failed';
      throw new Error(`${detail}\n--- expression ---\n${expression.slice(0, 400)}`);
    }
    return result.result.value;
  }
}

const page = await getPageTarget();
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve);
  ws.addEventListener('error', reject);
});
const cdp = new Cdp(ws);

await cdp.send('Page.enable');
await cdp.send('Runtime.enable');
await cdp.send('Emulation.setDeviceMetricsOverride', {
  width: 360,
  height: 800,
  deviceScaleFactor: 2,
  mobile: true,
});

async function load(url) {
  const loaded = cdp.once('Page.loadEventFired');
  await cdp.send('Page.navigate', { url });
  await loaded;
  // 等模組初始化 + 字級套用；用節點存在與否當就緒訊號，比固定 sleep 可靠
  for (let i = 0; i < 40; i += 1) {
    const ready = await cdp.evaluate("!!document.getElementById('recordButton')");
    if (ready) break;
    await sleep(150);
  }
  await sleep(400);
}

const PROBE = `(() => {
  const rect = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom) };
  };
  const ids = [...document.querySelectorAll('[id]')].map((el) => el.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);

  const hitViolations = [...document.querySelectorAll('button, [role="tab"], select, a')]
    .filter((el) => {
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      if (Number(style.opacity) === 0) return false;
      if (el.closest('[hidden]') || el.getAttribute('aria-hidden') === 'true') return false;
      // 文件 §1.2 明定模型 chip 視覺 28dp；命中區由 ::after 擴到 48dp，
      // getBoundingClientRect 量不到偽元素，故列為已知例外。
      if (el.id === 'modelChip') return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44);
    })
    .map((el) => ({
      id: el.id || el.className,
      w: Math.round(el.getBoundingClientRect().width),
      h: Math.round(el.getBoundingClientRect().height),
    }));

  const visibleButtons = [...document.querySelectorAll('button')].filter((el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden';
  }).length;

  return {
    rootFontSize: getComputedStyle(document.documentElement).fontSize,
    viewport: { w: innerWidth, h: innerHeight },
    header: rect('.app-header'),
    brand: rect('.brand'),
    title: rect('h1'),
    chip: rect('#modelChip'),
    actions: rect('.header-actions'),
    tabs: rect('.tab-bar'),
    mode: rect('.mode-card'),
    lang: rect('.language-section'),
    workspace: rect('.workspace'),
    dock: rect('.dock'),
    orb: rect('#recordButton'),
    pill: rect('#statusPill'),
    firstScreenChrome: Math.round(
      (document.querySelector('.transcript-box')?.getBoundingClientRect().top || 0)
    ),
    orbBottomGap: Math.round(innerHeight - (document.querySelector('#recordButton')?.getBoundingClientRect().bottom || 0)),
    orbIdleBg: getComputedStyle(document.querySelector('.record-orb')).backgroundImage,
    bg: {
      shell: getComputedStyle(document.querySelector('.app-shell')).backgroundColor,
      workspace: getComputedStyle(document.querySelector('.workspace')).backgroundColor,
      header: getComputedStyle(document.querySelector('.app-header')).backgroundColor,
      body: getComputedStyle(document.body).backgroundColor,
    },
    duplicateIds: dupes,
    hitViolations,
    visibleButtons,
    horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    animNames: [...document.querySelectorAll('.vc-pulse, .status-dot, .record-button, .loading-spinner')]
      .map((el) => ({ sel: el.className, name: getComputedStyle(el).animationName })),
  };
})()`;

async function shot(name) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  writeFileSync(path.join(OUT_DIR, `${name}.png`), Buffer.from(data, 'base64'));
}

const report = {};

// 1) light 360×800
await load(URL_TARGET);
report.light360x800 = await cdp.evaluate(PROBE);
await shot('light-360x800');

// 2) light 360×640（首屏最嚴苛）
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 360, height: 640, deviceScaleFactor: 2, mobile: true });
await sleep(300);
report.light360x640 = await cdp.evaluate(PROBE);
await shot('light-360x640');

// 3) dark 360×800
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 2, mobile: true });
await cdp.evaluate("localStorage.setItem('kilo_theme','dark')");
await load(URL_TARGET);
report.dark360x800 = await cdp.evaluate(PROBE);
await shot('dark-360x800');

// 4) 錄音態（用 aria-pressed 直接切，驗形狀 + 環 + pill）
await cdp.evaluate(`(() => {
  const btn = document.getElementById('recordButton');
  btn.setAttribute('aria-pressed','true');
  btn.classList.add('recording');
  document.getElementById('statusPill').classList.add('is-recording');
  document.getElementById('statusText').textContent = '錄音中';
  const timer = document.getElementById('recordTimer');
  timer.classList.remove('hidden');
  timer.textContent = '00:12';
})()`);
await sleep(200);
report.recordingDark = await cdp.evaluate(`(() => {
  const btn = document.getElementById('recordButton');
  const after = getComputedStyle(btn, '::after');
  const orb = getComputedStyle(btn.querySelector('.record-orb'));
  const mic = btn.querySelector('.icon-mic');
  const stop = btn.querySelector('.icon-stop');
  return {
    ringBorder: after.borderTopWidth + ' ' + after.borderTopColor,
    ringOpacity: after.opacity,
    orbBackground: orb.backgroundImage,
    micDisplay: getComputedStyle(mic).display,
    stopDisplay: getComputedStyle(stop).display,
    pill: (() => { const r = document.getElementById('statusPill').getBoundingClientRect(); return { h: Math.round(r.height), w: Math.round(r.width), top: Math.round(r.top) }; })(),
  };
})()`);
await shot('dark-recording');

// 5) reduced motion + 200% 字級
await cdp.send('Emulation.setEmulatedMedia', {
  features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
});
await cdp.evaluate("document.documentElement.style.fontSize='32px'; document.documentElement.setAttribute('data-compact','true')");
await sleep(300);
report.reducedMotion200 = await cdp.evaluate(`(() => {
  const btn = document.getElementById('recordButton');
  return {
    rootFontSize: getComputedStyle(document.documentElement).fontSize,
    orb: (() => { const r = btn.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })(),
    hitMin: getComputedStyle(document.querySelector('.dock-action')).height,
    animationNames: [...document.querySelectorAll('.vc-pulse, .status-dot, .record-button')]
      .map((el) => getComputedStyle(el).animationName),
    spinner: (() => { const el = document.createElement('span'); el.className='loading-spinner'; document.body.appendChild(el); const n = getComputedStyle(el).animationName; el.remove(); return n; })(),
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    clipped: [...document.querySelectorAll('h1, .segmented-option span, .tab, .dual-mic-name, .status-pill span')]
      .filter((el) => el.scrollWidth > el.clientWidth + 1)
      .map((el) => ({ text: (el.textContent || '').trim().slice(0, 10), sw: el.scrollWidth, cw: el.clientWidth })),
    chromeHeight: Math.round(document.querySelector('.app-header').getBoundingClientRect().height
      + document.querySelector('.tab-bar').getBoundingClientRect().height
      + document.querySelector('.mode-card').getBoundingClientRect().height
      + document.querySelector('.language-section').getBoundingClientRect().height + 24),
  };
})()`);
await shot('reduced-motion-200');


// 6) 設定 sheet（新表面）與歷史分頁
await cdp.send('Emulation.setEmulatedMedia', { features: [] });
await cdp.evaluate("document.documentElement.style.fontSize=''; document.documentElement.removeAttribute('data-compact')");
await cdp.send('Page.navigate', { url: URL_TARGET });
await sleep(1200);
await cdp.evaluate("document.getElementById('settingsToggle').click()");
await sleep(500);
report.sheet = await cdp.evaluate(`(() => {
  const panel = document.getElementById('settingsPanel');
  const r = panel.getBoundingClientRect();
  const body = panel.querySelector('.sheet-body');
  return {
    open: panel.classList.contains('open'),
    visibility: getComputedStyle(panel).visibility,
    rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom) },
    withinViewport: r.bottom <= innerHeight + 1 && r.top >= -1,
    scrollable: body ? body.scrollHeight > body.clientHeight : false,
    backdropVisible: !document.getElementById('sheetBackdrop').hidden,
    bodyScrollLocked: document.body.classList.contains('sheet-open'),
  };
})()`);
await shot('sheet-light');

await cdp.evaluate("document.getElementById('settingsSheetClose').click()");
await sleep(400);
await cdp.evaluate("document.getElementById('tabHistory').click()");
await sleep(300);
report.historyTab = await cdp.evaluate(`(() => {
  const panel = document.getElementById('panelHistory');
  return {
    visible: !panel.classList.contains('hidden'),
    translateHidden: document.getElementById('panelTranslate').classList.contains('hidden'),
    selected: document.getElementById('tabHistory').getAttribute('aria-selected'),
    tabsY: Math.round(document.querySelector('.tab-bar').getBoundingClientRect().y),
  };
})()`);
await shot('history-light');

console.log(JSON.stringify(report, null, 2));
ws.close();
chrome.kill();
await sleep(300);
try {
  rmSync(userDataDir, { recursive: true, force: true });
} catch {
  // chrome 可能還握著檔案，忽略
}
