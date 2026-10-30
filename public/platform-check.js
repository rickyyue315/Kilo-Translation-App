/*
 * Kilo Translation App - 前置環境檢查（ES5、非 module）
 *
 * 為什麼要獨立成一支 ES5 腳本並 inline 進 <head>：
 * main.js 是 ES module。WebView < 105 解析 module script 會直接 SyntaxError，
 * 使用者看到的是純白畫面，而且任何寫在 main.js 裡的錯誤處理都永遠不會執行。
 * 這支腳本必須在 module 之前、且只用 ES5 語法，才能在「舊引擎」上活下來。
 *
 * 只做兩件事：
 *   1. 偵測 Android WebView 的 Chrome 版本 < 105 → 顯示升級提示（不白屏）
 *   2. 提供 window.__kiloPlatform 給後續模組讀取（版本、是否原生）
 */
(function () {
  'use strict';

  var MIN_CHROME = 105;
  var ua = navigator.userAgent || '';

  function parseChromeMajor() {
    var m = ua.match(/(Chrome|Chromium)\/(\d+)/);
    return m ? parseInt(m[2], 10) : 0;
  }

  var major = parseChromeMajor();
  var isAndroidWebView = /Android/i.test(ua) && /;\s*wv\)/.test(ua);
  var isCapacitor = !!(window.Capacitor && window.Capacitor.isNativePlatform);
  var tooOld = false;

  // 只對「確定是 WebView 且版本可讀」的環境判定，避免誤傷 Firefox / Safari
  if ((isAndroidWebView || isCapacitor) && major > 0 && major < MIN_CHROME) {
    tooOld = true;
  }

  window.__kiloPlatform = {
    chromeMajor: major,
    isAndroidWebView: isAndroidWebView,
    isCapacitor: isCapacitor,
    minChrome: MIN_CHROME,
    tooOld: tooOld
  };

  if (!tooOld) return;

  function paintUpgradeNotice() {
    var title = '請更新 Android System WebView';
    var body =
      '本App需要 WebView 版本 105 以上才能正常顯示。\n' +
      '目前的版本是 Chrome ' + major + '。\n\n' +
      '請到 Google Play 更新「Android System WebView」或 Chrome，然後重新開啟本App。';
    document.documentElement.setAttribute('data-unsupported', 'true');
    var wrap = document.createElement('div');
    wrap.setAttribute('role', 'alert');
    wrap.style.cssText =
      'position:fixed;inset:0;z-index:99999;background:#f1f5f9;color:#0f172a;' +
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
      'padding:32px 20px;display:flex;flex-direction:column;justify-content:center;gap:12px;';
    var h = document.createElement('h1');
    h.style.cssText = 'font-size:20px;margin:0';
    h.textContent = title;
    var p = document.createElement('p');
    p.style.cssText = 'font-size:15px;line-height:1.7;margin:0;white-space:pre-line;color:#334155';
    p.textContent = body;
    wrap.appendChild(h);
    wrap.appendChild(p);
    document.body.textContent = '';
    document.body.appendChild(wrap);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', paintUpgradeNotice);
  } else {
    paintUpgradeNotice();
  }
})();
