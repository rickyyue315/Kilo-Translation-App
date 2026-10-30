# Kilo 即時語音翻譯器 — Android App 轉換方案

> 版本 1.0 ｜ 2026-10-20 ｜ 範圍：Android 手機（Portrait）
> **現行版 · 取代所有先前版本 · 勘誤僅供追溯。** 引用請用「檔名 + 章節號」，不要引用訊息片段——訊息是過程，文件是結論。
> 基準版本：v3.0.0（Vite 6 + 原生 JS PWA，後端 Express 5）

---

## 0. 結論摘要

| 項目 | 決策 |
|------|------|
| 容器方案 | **Capacitor 8**（`@capacitor/core` 8.4.x） |
| 前端改動量 | 5 個檔案、約 300 行；HTML/CSS 結構不動 |
| 原生改動量 | 1 個 40 行 Kotlin 權限插件（必需） |
| 目標規格 | `minSdk 24` / `targetSdk 36` / `minWebViewVersion 105` |
| 工具鏈 | Node 22+、JDK 21、Android Studio Otter 2025.2.1+、AGP 8.13、Gradle 8.14.3 |
| 最大風險 | WebView 不支援 Web Speech API，語音輸入必須改道 |
| 上架阻塞項 | 麥克風權限三態、API base URL、CORS 三項未處理則不可發佈 |

**一句話**：這不是「把網頁包進殼」，而是把**三個瀏覽器專屬能力（Web Speech 辨識、speechSynthesis、相對路徑 API）換成可替換的适配層**，其餘介面與邏輯原樣沿用。

---

## 1. 轉換範圍

### 1.1 核心功能：保留與改道

| 功能模組 | 現況（Web） | Android 目標 | 工作量 | 風險 |
|----------|-------------|--------------|--------|------|
| 語音輸入 | `webkitSpeechRecognition` 即時辨識 | **改走 MediaRecorder → 後端 ASR** | 中 | 高（WebView 無此 API） |
| 語音對話 | MediaRecorder → `/api/transcribe` | 不變，補逾時與權限 | 低 | 低 |
| 朗讀 TTS | `window.speechSynthesis` | **原生 TTS 插件** | 中 | 高（WebView 不可靠） |
| 文字翻譯 | `POST /api/translate` | 改絕對位址，其餘不變 | 低 | 中 |
| BYOK 直連 | OpenRouter 絕對 URL | 不變，需 CORS 白名單 | 低 | 中 |
| 三步精譯 | 純 JS + 兩次 API | 不變 | 無 | 低 |
| 單人／雙人模式 | 分段控制器 + A/B 麥 | 保留，UI 重排 | 中 | 低 |
| 翻譯歷史 | localStorage | 保留，關閉備份 | 低 | 低 |
| 主題切換 | 淺／深二元 | 跟隨系統／淺／深三態 | 低 | 低 |
| 鍵盤快捷鍵 | Space / Ctrl+Enter / A / B | **移除**（無硬體鍵盤） | 低 | 無 |
| PWA / Service Worker | `sw.js` 註冊 | **原生不註冊，並主動反註冊** | 低 | 中（舊快取） |

**不在本期範圍**：iOS、背景錄音（前景服務）、串流即時辨識、離線翻譯與離線語音（列為 P2 選配，見 §11）、帳號與雲端同步、平板專屬版面（僅做置中單欄寬度適配，見 §1.3）。

### 1.2 介面調整

| 項目 | 調整內容 |
|------|----------|
| 導航 | 單頁長滾動 → **2 個主分頁（翻譯／歷史）**，置於 header 下方；不使用底部導航 |
| 主要動作 | 錄音 orb **底部常駐 80dp**；單人 dock 144dp、雙人 182dp（降級 166dp） |
| 設定 | 8 欄密集面板 → **Bottom Sheet**，分「語言與介面／翻譯行為／進階」三段 |
| 模型選擇 | 兩個下拉 + 說明段 → **header 右側 28dp tonal chip**，點擊開模型 sheet |
| 狀態 | 狀態列 + 音量條 → **orb 上方 status pill**（閒置 32dp／錄音 56dp） |
| 卡片 | 6 層白底卡片 + 陰影 → 無邊框分區 + 1dp 分隔線，一屏最多 2 個帶陰影容器 |
| 雙人模式 | 兩顆實心高飽和圓 → **三態**：idle 為角色色淺底（A `#EFF6FF`／B `#F5F3FF`）+ 2dp 角色色邊界；收音側實心 + 3dp 紅環；對方 `scale(0.94)` 去彩度。全程不用 opacity（40% 會讓 12sp 文字掉到 1.8:1） |
| 網頁遺跡 | 移除 `skip-link`、`kbd` 提示、快捷鍵說明鈕、所有 `:hover` 位移 |
| 字級 | 最小 11.5px → **全域下限 12sp，正文 14sp，譯文 16sp/行高 1.6** |
| 觸控 | `.btn-sm` 36px 等 → **命中矩形 ≥48×48dp**，相鄰間隙 ≥8dp |
| 系統欄 | — | Edge-to-edge，狀態列透明，圖示明暗跟隨主題 |

**元件幾何（實作基準）**

| 元件 | 尺寸 | 狀態規則 |
|------|------|----------|
| 錄音 orb | 80dp 圓 | **形狀信號優先**：idle = mic 24dp、recording = 實心 stop 18dp；深色錄音盤反相為淺盤 `#CBD5E1→#94A3B8`；`::after` 3dp 紅環 `inset:-6px`；`[aria-pressed]` 為唯一狀態源 |
| 單人 dock | **144dp** | orb 80dp 居中 + 左右各 48dp 命中區（視覺 40dp tonal 圓、icon 20dp、無文字） |
| 雙人 dock（A） | **182dp** | 2 × 80dp 圓 + 6dp 間距 + 圓下 88dp 置中 label（名稱 12sp/600、語言 12sp/400） |
| 雙人 dock（B 降級） | **166dp** | `height < 700dp` 或字體 ≥150% → 移除語言行（6dp 間距保留），名稱不可省 |
| 雙人 A 鈕 | 80dp | idle：`#EFF6FF` 底 + 2dp `#2563EB` 邊界 + `#1D4ED8` icon（8.6:1） |
| 雙人 B 鈕 | 80dp | idle：`#F5F3FF` 底 + 2dp `#7C3AED` 邊界 + `#6D28D9` icon（6.4:1） |
| 雙人收音側 | 80dp | 角色色實心 + 3dp 紅環 + 白 icon |
| 雙人非收音側 | 80dp | `surface-container` 底 + 1dp 角色色邊界 + `on-surface-variant` icon + `scale(0.94)` |
| status pill | 32dp／56dp | 閒置 full radius、錄音 16dp radius；底邊固定，只生長高度 |
| tabs | **48dp 佈局＝命中盒** | 指示條 44dp 居中；**不做負 margin**（上下各溢出 2dp 會與分段命中盒相接）；`word-break: keep-all`，英譯長標籤在 24sp 下允許 2 行（≈72dp） |
| 卡標題列動作 | 2 個 × 48dp | 複製、朗讀（24dp icon，並排 96dp）；不提供折疊 |
| 列表項（歷史） | 88dp | 1dp `outline-variant` 分隔線，無陰影 |

**雙人角色色 token（兩主題都要過 3:1）**

| 角色 | light 實心 | dark 實心 | icon |
|------|-----------|-----------|------|
| A | `#2563EB`（對白 dock 5.2:1） | `#60A5FA`（對 `#16233D` 6.10:1） | light 白 / dark `#0B1220` |
| B | `#7C3AED`（≈5.9:1） | `#A78BFA`（對 `#16233D` 5.4:1） | 同上 |
| A idle | `#EFF6FF` 底 + `#1D4ED8` 邊界/icon | `#172B4D` 底（1.11:1，刻意）+ 邊界 `#60A5FA`（6.2:1）+ icon `#BFDBFE`（9.9:1） | 線→面 |
| B idle | `#F5F3FF` 底 + `#6D28D9` 邊界/icon | `#2A1F4D` 底（1.04:1，刻意）+ 邊界 `#A78BFA`（5.4:1）+ icon `#A78BFA`（5.7:1） | 線→面 |

**關鍵**：dark 的 idle 填色對 dock 只有 1.04–1.11:1，這是**刻意的**——**idle = 線 + icon + 低對比 tonal 底；active = 實心填色**，狀態差從「顏色深淺」升級成「由線到面」。light 同構（`#EFF6FF` 對白 dock 1.06:1），不是深色特例。**邊界承載身分（用角色色），icon 承載可讀性（用更亮的 on-container，≥4.5:1）**。**不要把它「修」成高對比**：把填色提亮會讓 idle 搶過 active 的層級。驗收時把填色改成與 dock 同色，仍應可辨識——可辨識的責任在邊界與 icon，不在填色。

- **dark 不可直接用 `#2563EB` / `#7C3AED`**：對 dark dock `#16233D` 只有約 2.0–2.3:1，雙人錄音態其實不合格——整輪都在驗單人 orb，漏了雙人。
- idle 的 2dp 角色邊界、inactive 的 1dp 邊界同樣受 3:1 約束，dark 一律改用高明度版；不要各處寫 hex，建 `--role-a` / `--role-a-dark` 兩組 token。

**dock 固定規則**：app shell 為固定高度 flex 容器，dock 是**普通 flex 子元素**（不是 `position: sticky/fixed`），這樣 pill 的定位父層就是 dock 本身，省掉「inset 疊加」與「sticky 位移」兩類 bug。背景不透明（light `#FFFFFF`、dark `#16233D`）、無陰影、頂部 1dp 分隔線、`padding-top: 8px`；`height: auto`，由 `ResizeObserver` 把實測值寫回 `--dock-h`，內容區 `padding-bottom: var(--dock-h)`。底部 padding = `max(56px, calc(var(--sab) + 24px))`。錄音中不染整條 dock，只有 orb 變色。

> 144／182／166 與 header 56／tabs 48／分段 36／語言對 52 都是 **`min-height` 預算常數，不是固定 `height`**：可長高、不可裁字。dock 實際高度由 `ResizeObserver` 回寫 `--dock-h`（fallback 同為 144／182／166）；216dp 是 100% 字級下的**下限**預算。dock 不在 216 預算內，因此 +2dp 不影響首屏。

**pill 契約（三條，違反任一條就會出現遮擋或鬼按鈕）**

1. pill 的定位父層必須是 dock（`position: relative`），**不可放進可滾動的譯文卡**——絕對定位元素在 `overflow: hidden/auto` 祖先內會被裁掉上緣。
2. **z-index 階梯（唯一來源，不得各自宣告）**：內容 `0` / dock `10` / pill `11` / 錯誤橫幅 `19` / scrim·modal-backdrop `20` / sheet·modal `21` / toast `30` / skip-link `2000` / tooltip `2100`。**錯誤橫幅放 19（scrim 之下）**：結構上不可能壓住 modal，不依賴任何 JS 狀態；放 22 會讓橫幅浮在 sheet 標題列上，使用者會以為設定頁壞了——錯誤訊息該在它發生的地方出現，不在最上層。排他規則（sheet 開啟時橫幅 `display:none`、錯誤渲染進 sheet、錯誤狀態留 state）仍保留：19 防「蓋住 modal」，排他防「同一錯誤出現兩次」。tooltip 由 99999 降到 2100；skip-link 2000 保留（web PWA 仍在生產）。
3. 被 pill 覆蓋的區域內所有可點元素加 `pointer-events: none` + `visibility: hidden`（僅 `opacity: 0` 仍是「看不見但可點」）。
4. **同一時間只允許一個錯誤容器可見**：sheet 開啟時全域橫幅 `display:none`、錯誤渲染進 sheet；**錯誤狀態保留在 state**，sheet 關閉後若未解除則橫幅重新出現。不用 z-index 競爭解決同層互蓋。

**錄音態四重信號（依可靠度排序，形狀優先）**

1. **形狀（第一信號，不可省）**：`index.html` 的 `#recordButton` 目前寫死麥克風 SVG，全域沒有換圖示的程式碼。新增 `.icon-mic` / `.icon-stop` 兩個 span，由 `[aria-pressed]` 單一狀態源驅動圖示、`aria-pressed`、`aria-label`。idle = mic 24dp / stroke 2dp；recording = 實心 stop 18dp、radius 2.5dp（24dp 會把 80dp 圓壓成黑塊）。不加 transition，icon 用 px 不用 rem。
2. **3dp 紅環**：`::after` 承載（`inset:-6px; border:3px solid var(--color-danger)`），不參與任何動畫。light `#DC2626` 對 dock 4.83:1、dark `#F87171` 6.1:1。
3. **pill 文案**：`錄音中 · 00:12`（不可只有計時數字）。
4. **狀態點恆亮紅**。

**盤面：與所在容器反相，不是「一律加深」**

| 主題 | 閒置盤 | 錄音盤 | 對 dock | icon |
|------|--------|--------|---------|------|
| Light | 紅漸層 | `#1E293B→#0F172A` | 14.6–17.9:1 | 白 |
| Dark | 紅漸層 | `#CBD5E1→#94A3B8` | 6.1–10.6:1 | `#0B1220` |

- 深色下深盤永遠到不了 3:1（`#0F172A` 1.02:1、`#334155` 1.81:1、`#64748B` 2.48:1）；把盤面提亮到 3:1 又會讀成停用。反相是天生的對比來源，且不需要任何描邊。
- **icon 顏色 = 它所坐表面的 on-color**：填色面（recording / active）深填配白、淺填配 `#0B1220`；tonal 底（idle）用角色色承載身分。按「表面類型」分兩條規則，不需要「主題 × 狀態」二維表。
- **inset 只有一套值：`-6px`**。主案不加 border，padding box = 80dp，`-6px` = 外緣 6dp／間隙 3dp。
- **禁止條款**：orb 及其任何祖先不得加 `overflow: hidden`；驗收須截圖確認環的四個象限。

> **對比一律對「所在容器」量，不是頁面。** 深色有三層底（頁 `#0B1220` / 卡 `#111C33` / dock `#16233D`），orb 坐在 dock 上，基準是 `#16233D`。附帶檢查：深色下 `#0F172A` 盤對頁底只有 1.05:1——圓形本身消失，只剩紅環框住空氣。只比「閒置 vs 錄音」兩態是假通過。

> **備選（有證據才切換）**：若夜間真機測試認為 80dp 淺盤刺眼，改用深灰 `#475569→#334155` + 2dp `#9FB0CC` `border`，此時 padding box 為 76dp、`inset` 改 `-8px`，light 需同步加 2dp transparent border 保幾何。該案填色僅 1.8–2.5:1，靠描邊 7.7:1 通過 WCAG 1.4.11；**描邊只能存在於錄音態**，否則狀態無從區分。**描邊須用 `border`，不可用 `box-shadow: inset`**——`main.css:554` 的 `recording-pulse` 動的就是 `box-shadow`，會把描邊覆蓋掉。

**深色畫布通則**：以「變深」表達狀態時，必須同時提供 ≥3:1 的邊界；不要靠一路提亮填色來湊對比，那會讓狀態看起來像停用。

**概念釐清**：紅色是「**可錄**」的品牌色，不是「正在錄音」的信號——單人模式閒置 orb 本來就是紅色漸層，不得為了區分狀態而改成非紅。

**需新增的視覺資產**（現有 `icon-512.png`、`maskable-512.png` 不足）：

1. Adaptive icon 前景層：108dp 網格，圖示內容 ≤66%，**不可直接使用 maskable 圖**（已含額外留白）。
2. Adaptive icon 背景層：純色 `#2563EB`。
3. **Monochrome 圖層**（Android 13+ 主題化圖示）：線寬 ≥8dp，否則縮放後消失。
4. Splash 圖：288×288 無背景版，內容佔 192dp。

### 1.3 行動端最佳化

| 類別 | 內容 |
|------|------|
| 首屏預算 | 非內容區目標 ≤216dp @100% 字體（header 56 + 8 + tabs 48 + 8 + 分段 36 + 8 + 語言對 52），**驗收上限 240dp**；≥150% 放寬至 260dp。**216 只在 100% 量測**——字級放大時 chrome 允許長高，內容區 `flex:1; min-height:0` 讓位，把長高判成 bug 是錯的 |
| 安全區 | `viewport-fit=cover` + SystemBars 注入 `--safe-area-inset-*`；orb 圓底距物理底 ≥56dp |
| 手勢避讓 | 手勢條區域內不得有可點元素中心點；dock 背景不透明 |
| 電量 | orb 脈動由 `box-shadow` 改 `opacity`／`transform` 合成層；背景時停動畫；錄音 >60s 降頻 |
| 音訊中斷 | 來電／搶麥立即停止並保留已辨識文字；耳機插拔停止並提示 |
| 鍵盤 | `@capacitor/keyboard` `resize:'native'`；輸入聚焦時 dock 暫時收起 |
| 大字級 | 系統字體 200% 不裁切、不水平滾動；禁止 `clamp` 假放大。≥150% 時頁面鎖滾動（pill 需固定參照），只讓譯文卡內滾，卡底補 `padding-bottom:32dp` 避免 pill 壓住末行 |
| RTL | 阿拉伯語整頁鏡像，A／B 位置不互換（保護肌肉記憶） |
| 離線 | 文字翻譯、歷史、朗讀可用；雲端辨識與翻譯明示不可用，三層錯誤提示 |
| 效能 | 歷史列表 >50 筆啟用虛擬滾動（專案已有 `VirtualScroll` 模組可複用） |
| 平板／分屏 | `<600dp` 手機滿寬；`600–839dp` 內容欄 480dp 置中；`≥840dp` 520dp 置中；左右留白用 `surface-dim`；**dock 隨欄寬置中，不貼實體螢幕邊**（否則 orb 離拇指 400dp） |

---

## 2. 技術方案與選型

### 2.1 架構

```
┌─────────────────────────────────────────────┐
│ Android App (AAB)                           │
│ ┌─────────────────────────────────────────┐ │
│ │ WebView  https://localhost (secure)     │ │
│ │  dist/ 靜態資產（Vite build）            │ │
│ │  ├ UI：HTML/CSS（沿用）                  │ │
│ │  ├ 邏輯：translation / pipeline / ui     │ │
│ │  └ 适配層：capabilities / apiBase / tts  │ │
│ └───────────────┬─────────────────────────┘ │
│                 │ Capacitor Bridge          │
│ ┌───────────────┴─────────────────────────┐ │
│ │ Native：MicPermission / TTS / Haptics   │ │
│ │         Keyboard / SystemBars / Back    │ │
│ └─────────────────────────────────────────┘ │
└─────────────────┬───────────────────────────┘
                  │ HTTPS
        ┌─────────┴──────────┐
        │ 既有 Express 後端   │
        │ /api/translate      │
        │ /api/transcribe     │
        │ /api/health         │
        └─────────┬──────────┘
                  │
           OpenRouter API
```

### 2.2 選型比較

| 維度 | **Capacitor 8** | TWA / Bubblewrap | RN / Flutter 重寫 |
|------|-----------------|------------------|-------------------|
| 前端改動 | 低（5 檔約 300 行） | 近零（加 assetlinks） | 極高（8–12 人週） |
| 能力上限 | 中高（native 插件可自寫） | 低（受 Chrome 限制） | 最高 |
| 離線 | 好（dist 打包本地） | 差（依賴 Chrome 快取） | 好 |
| 發佈 | AAB，可獨立灰度 | AAB，與網站同生共死 | AAB |
| 主要風險 | WebView 無 Web Speech | 無 Chrome 即不可用 | 排期與回歸成本 |

**結論：Capacitor 8。**

**為什麼不用 TWA（它明明支援 `webkitSpeechRecognition`）**

1. TWA 的辨識是 **Chrome 的雲端服務**：音訊上傳 Google。裝置沒有 Chrome（華為、部分 AOSP、部分中國 ROM）時 TWA 直接不可用，退化為帶網址列的 Custom Tab；端點不可達時只有 `onerror: network`，**沒有替代路徑**。這是「功能有沒有」的差別。
2. TWA 拿不到系統欄顏色與 edge-to-edge inset 控制，Phase 1 的深底與圖示對比無法保證；也拿不到 haptics、原生 TTS、返回鍵語意，2 分頁 + orb dock 的原生感會退化。
3. TWA 依賴線上 `assetlinks.json` 驗證，失敗即降級——等於把「像不像 App」交給部署狀態。

**代價（必須承認）**

- 失去零成本即時逐字，改為後端往返，延遲 **+0.8–2.0s**。
- 需維護 JDK 21 / AGP 8.13 工具鏈。
- 每次 web 更新都要重新發版（無 live update）。
- AAB 增加約 2–4MB 本地資產。

**補償**：音訊不再出境到 Google，改走自建後端（OpenRouter），隱私更好、語言覆蓋由模型決定。

### 2.3 語音層重構（本案核心）

**原則：一條主路徑，兩條增強路徑，永不硬阻擋。**

```
啟動 → resolveSpeechCapabilities()
        │
        ├─ native（Capacitor）
        │    └─ asrEngine = 'backend'
        │         MediaRecorder → /api/transcribe → 翻譯
        │
        ├─ web + Web Speech 可用
        │    └─ asrEngine = 'web'（即時逐字）
        │         失敗（not-allowed / network）→ 降級 backend
        │
        └─ 全不可用
             └─ textOnly：停用麥克風，文字輸入照常
```

新增 `src/js/capabilities.js`（約 120 行）：

```js
export function resolveSpeechCapabilities() {
  const native = !!window.Capacitor?.isNativePlatform?.();
  const hasWebSpeech = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const hasRecorder =
    typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  return {
    native,
    asrEngine: native ? 'backend' : hasWebSpeech ? 'web' : 'backend',
    asrFallback: hasRecorder ? 'backend' : null,
    ttsEngine: native ? 'plugin' : 'web',
    canRecord: hasRecorder,
    level: hasRecorder ? 'full' : 'textOnly',
  };
}
```

**必須改寫 `src/js/utils.js:33 checkBrowserSupport()`**

現行邏輯在沒有 `SpeechRecognition` 時 `showError(...)` 並 `return false`，在 WebView 100% 觸發，且擋在初始化鏈最前面。改為回傳能力報告、不再中斷流程：

```js
export function getCapabilityReport() {
  const c = resolveSpeechCapabilities();
  const missing = [];
  if (!c.canRecord) missing.push('recording');
  if (c.ttsEngine === 'web' && !window.speechSynthesis) missing.push('tts');
  return { level: c.level, missing };
}
```

呼叫點 `src/main.js:139` 改為 `renderCapabilityNotice(getCapabilityReport())`，僅 `textOnly` 時提示。

**朗讀：一定要換插件**

Android WebView 的 `speechSynthesis` 實務上不可用——`window.speechSynthesis` 可能為 `undefined`，或 `getVoices()` 永遠回空陣列、`voiceschanged` 永不觸發。現有 `src/js/speech.js:525-531` 的 fallback 會**永久掛住**，導致朗讀按鈕卡在 disabled。

```js
// 適配層示意
export async function speak(text, lang) {
  if (isNative()) {
    return TextToSpeech.speak({
      text, lang, rate: 0.9, pitch: 1.0, volume: 1.0,
      queueStrategy: 0, // Flush：新請求取代舊請求
    });
  }
  // web 保留原 speechSynthesis 實作
}
```

**失敗分支與處理**

| 分支 | 偵測 | 處理 |
|------|------|------|
| 首次權限 | `checkPermissions() === 'prompt'` | 先出 App 內 rationale，再請求系統權限 |
| 拒絕一次 | `'denied'` + rationale 為真 | 重試時可再彈系統框，文案寫明用途 |
| 永久拒絕 | `'denied'` + rationale 為假 | 不彈框，deep-link 到系統 App 詳情頁 |
| 無 MediaRecorder | `typeof MediaRecorder === 'undefined'` | 停用錄音，提示文字輸入，**不禁用翻譯** |
| 後端 404 | `response.status === 404` | 保留現有文案，提示可切 BYOK |
| 逾時 | `AbortError`（現 90s） | 行動網路降到 **20s**，文案「請縮短錄音」 |
| 無網路 | `@capacitor/network` | 進線即擋 + 離線 banner |

### 2.4 API 位址：打包後最容易整站失效的一點

打包後頁面 origin 是 `https://localhost`（Capacitor 本地伺服器），`fetch('/api/translate')` 會打到 WebView 自己，回 404。

**方案：建置期環境變數 `VITE_API_BASE_URL`**（而非執行期 config 檔）。理由：`dist` 是打包資產，執行期 config 同樣進 APK，改它一樣要重建，不會帶來 OTA 彈性；建置期還能讓 CI 斷言非空，避免「上架版打到 dev 後端」。

```js
// src/js/config.js（新增）
const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
export const API_BASE = base;
export const apiUrl = (p) => `${API_BASE}${p}`;
export const isNative = () => !!window.Capacitor?.isNativePlatform?.();
```

要改的呼叫點：

| 檔案 | 行 | 改法 |
|------|----|------|
| `src/js/translation.js` | 296 | `[apiUrl('/api/translate'), apiUrl('/.netlify/functions/translate')]` |
| `src/js/asr.js` | 57–59 | `return apiUrl('/api/transcribe')` |
| `src/js/asr.js` | 97 | netlify 備援改 `apiUrl(...)` |

BYOK 直連（`translation.js:488/737/930`、`asr.js:153`）已是絕對 URL，**不動**。

`vite.config.js` 的 `base` **維持 `'/'`**（改 `'./'` 會讓 `/icons/*`、`/manifest.json` 解析錯誤），另加建置期斷言：

```js
export default defineConfig(({ mode }) => {
  if (mode === 'production' && !process.env.VITE_API_BASE_URL) {
    throw new Error('missing VITE_API_BASE_URL');
  }
  return { /* 原設定 */ };
});
```

### 2.5 CORS

`https://localhost` 對後端而言是跨來源；BYOK 會帶自訂 header `X-OpenRouter-Key`，**會觸發 preflight**，`allowedHeaders` 沒列就被擋。

```js
// server.js:37
const allowed = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: allowed.length ? allowed : true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-OpenRouter-Key'],
  maxAge: 86400,
}));
```

生產環境設 `CORS_ORIGIN=https://localhost,https://<web-domain>`，**不要留 `'*'`**。

### 2.6 Service Worker

打包後**不註冊**，並主動清除殘留。原因：`dist` 已本地化，SW 沒有額外離線價值；`public/sw.js` 是 cache-first + 固定 `CACHE_NAME`，`cap sync` 換版後會持續服務舊 HTML/JS，使用者「更新了但畫面沒變」且無法自癒。

```js
// src/main.js:394-400
const isNativeApp = !!window.Capacitor?.isNativePlatform?.();
if ('serviceWorker' in navigator && !isNativeApp) {
  window.addEventListener('load', () =>
    navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
if (isNativeApp && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
  if (window.caches) caches.keys().then(ks => ks.forEach(k => caches.delete(k)));
}
```

---

## 3. 平台相容性考量

### 3.1 WebView 能力矩陣

| 能力 | Android WebView | Chrome / TWA | 影響 | 對策 |
|------|-----------------|--------------|------|------|
| `SpeechRecognition` | **不支援** | 支援（雲端） | 語音輸入失效 | 改走後端 ASR |
| `speechSynthesis` | 不可靠（voices 常為空） | 可用 | 朗讀卡死 | 原生 TTS 插件 |
| `getUserMedia` | 支援（需權限 + secure context） | 支援 | 錄音 | 三態權限 + `https://localhost` |
| `MediaRecorder` | 支援（webm/opus；低端機可能只有 mp4） | 支援 | 上傳格式 | 執行期 `isTypeSupported` 偵測 |
| Web Audio / AnalyserNode | 支援 | 支援 | 音量條 | 不需改 |
| `localStorage` | 支援 | 支援 | 設定與歷史 | `allowBackup=false` |
| Service Worker | 支援 | 支援 | 舊快取 | 原生不註冊 |
| `100dvh` | Chromium 108+ | 支援 | 高度計算 | `minWebViewVersion 108` |
| `env(safe-area-inset-*)` | 需 `viewport-fit=cover` + inset 注入 | 原生支援 | Edge-to-edge | SystemBars `insetsHandling:'css'` |
| Clipboard API | 需使用者手勢，部分版本受限 | 支援 | 複製 | 必要時用插件 |

### 3.2 版本與政策

| 項目 | 值 | 說明 |
|------|----|------|
| `minSdkVersion` | 24（Android 7.0） | Capacitor 8 下限 |
| `targetSdkVersion` | 36 | Play 自 2026-08 起要求新應用以 API 36 為目標 |
| `compileSdkVersion` | 36 | 與 target 同步 |
| `minWebViewVersion` | 105 | 覆蓋 API 24 邊界機型。全螢幕 WebView 無網址列，`100vh` 與 `100dvh` 等效，犧牲可忽略；低於此顯示升級提示 |
| Android 13+ | 通知權限 | **本期不需**（不做背景錄音，不加 `POST_NOTIFICATIONS`） |
| Android 14+ | 麥克風使用指示器 | 系統自動顯示，UI 不需處理 |
| Android 16+ | 大螢幕忽略 `screenOrientation` | 已有因應：≥600dp 走置中單欄（§1.3），不依賴方向鎖 |

### 3.3 安全區變數的實際接法（易錯）

Capacitor 8 的 `SystemBars` 以 **CSS 變數** `--safe-area-inset-*` 注入，不是改寫 `env()`。專案現有：

```css
:root {
  --sat: env(safe-area-inset-top, 0px);
  --sab: env(safe-area-inset-bottom, 0px);
}
```

在部分 WebView 上 `env()` 為 0，會導致 header 被狀態列壓住。必須改為「先取注入變數，再退回 env()」：

```css
:root {
  --sat: var(--safe-area-inset-top, env(safe-area-inset-top, 0px));
  --sab: var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px));
  --sal: var(--safe-area-inset-left, env(safe-area-inset-left, 0px));
  --sar: var(--safe-area-inset-right, env(safe-area-inset-right, 0px));
}
```

配套三處（漏一處就會出現空白帶或遮擋）：

1. `padding-top` 從 `body` 移到 `.app-header`——header 背景才能染到狀態列下方。
2. **刪除 `body.mobile-device` 的 `padding-bottom`**：dock 是佈局內元素，內容區已用 `--dock-h` 讓位，body 再加一次只會多一條空白。
3. 底部公式 `max(56px, calc(var(--sab) + 24px))` 驗算：手勢機（inset 24）→ `max(56, 48)` = **56** ✓；三鍵機（inset 48）→ `max(56, 72)` = **72** ✓。

**高度基準（與 105 的相容性）**：shell 高度主值用 `height: 100%`（Chrome 105 全支援，且隨 `Keyboard.resize:'native'` 自動重算），`100dvh` 只放進 `@supports (height: 100dvh)` 做漸進增強。**不可把 `100dvh` 當主值**——`dvh` 需 Chromium 108+，與 `minWebViewVersion: 105` 直接衝突，會讓舊機 shell 高度塌成 0。同理，任何 `dvh` 宣告都必須有 `vh` 前置（見 §3.5 #12）。

### 3.4 系統字級：WebView 不吃 `fontScale`（最易「做完但沒做到」的一項）

Android WebView **不會**自動套用系統字級：`matchMedia` 與 `getComputedStyle(root).fontSize` 都讀不到 `fontScale`，永遠是 16px。若不處理，「支援 200% 字體」這條需求會**假通過**——測試機看起來正常，真實低視力使用者永遠拿到 16px。

做法：

1. 原生插件回傳 `Configuration.fontScale`，**clamp 0.85–2.0**（下限不能是 1.0：Android 有 "Smaller" 0.85，強制拉回等於把使用者的選擇改掉）。
2. **顯式鎖 `webView.settings.textZoom = 100`**：WebView 的 `textZoom` 預設 100 且不追蹤 `fontScale`；部分 ROM 會把它改成跟隨系統，於是 `root font-size × textZoom` **疊乘成 400%**，只在特定機型重現、測試機永遠看不到。這行必須加註解說明緣由，否則後人會當多餘設定刪掉。
3. 首屏 paint **之前**（`DOMContentLoaded` 最前）設 `document.documentElement.style.fontSize = (16 * fs) + 'px'`，並在 `fs > 1.3` 時加 `data-compact`。
4. **單位分工（硬規則）**：字級、行高（unitless）、`letter-spacing` 用 `rem`（1rem = 16px baseline）；間距、圓角、元件尺寸、命中盒、`border-width`、`max-width`、dock 高度一律用 `px`（等同 dp）。若間距也用 rem，root 放大 2 倍時 dock padding 8→16、144/180/164 與首屏 216dp 全部崩。
5. `App.resume` 時重讀——使用者在背景改字級再回來，否則會出現「字沒變但版面已 compact」的錯位。
6. 取不到值時預設 1.0，並記錄為已知限制。

**幾何單位二分法**（132 處 `rem` 中約 60 處要改，不可一刀切）：

| 類型 | 單位 | 例子 |
|------|------|------|
| 純幾何 | 固定 **px** | orb 80、圓角、邊距、`border-width`、`max-width`、分隔線、命中盒 48、fade 8 |
| 含文字容器 | **`min-height: Npx` + `height: auto`** | header 56、tabs 44、分段 36、語言對 52、dock 144/180/164、pill 錄音態 56、歷史項 88 |

pill 最容易漏：56dp 裝 14sp 計時 + 4dp 音量條，寫死 `height` 會在 200% 時把文字裁掉。`--dock-h` 的量測值**不四捨五入**（保留小數），只有靜態 token round 到整數 dp。

`data-compact` 是**版面分支，不是字級分支**，只負責五件事：雙人 dock 換 compact（移語言行）、模式分段隱藏 icon 且高度 auto 48–56dp、pill `max-width` 放寬至 `calc(100% - 32dp)`、譯文卡允許卡內滾動、tabs `min-height: 48px`（200% 下 44dp 裝不下文字）。**不得在 `data-compact` 內改變任何字級**，否則 200% 會被二次縮放成 120% 或 400%。

### 3.5 已知既有缺陷（上架前必修）

| # | 位置 | 問題 | 影響與處置 |
|---|------|------|------------|
| 1 | `index.html:325` / `:351` | 重複 `id="voiceChatVisualizer"` | 視覺化器取錯節點；多出 12–16dp 空白帶；TalkBack 關聯錯誤。**保留 325、刪 351** |
| 2 | `index.html:10-11` | light `theme-color` 為 `#2563eb`、dark 為 `#0f172a`；實際底色 light `#f1f5f9`、dark `#0b1220` | 狀態列與頁面出現異色接縫（深色模式最明顯）。兩者都要改 |
| 3 | `ui.js:491 swapUsers()` | 清空當前譯文並停止錄音 | 破壞性且與 A/B 雙麥重複，手機版移除入口。節點**不可刪**：`ui.js:303` 對它 `addEventListener`，刪掉即 TypeError、初始化中斷、**整頁白屏**。改為 **HTML inline `style="display:none"`** + `disabled` + `tabindex="-1"` + `aria-hidden="true"`（寫在 HTML 而非 JS，避免首屏閃現）；inline style 免疫 `classList` 切換，class 方案要對抗 `ui.js:465` 的 `remove('hidden')`，成本更高 |
| 4 | `main.css` `.dual-mic-row` | `backdrop-filter: blur(8px)` | edge-to-edge 下每幀重繪整片滾動內容，且透出譯文文字。改不透明 `surface` |
| 5 | `main.css` 無障礙段 | `animation-duration: 0.01ms` 搭 `iteration-count: infinite` | 等於每秒上百次重繪。且**紅環不能靠動畫終態呈現**：`main.css:543` 的 `::before` 帶 `opacity:0`，環靠 `ring-expand` 中間值出現，`animation: none` 後完全消失。改為 `::after` 承載靜態環。**reduced-motion 只能用顯式選取器清單，禁止 `*`**：全域 `animation: none` 會連 `.loading-spinner` 一起停掉，使用者看到靜止的 spinner 只會認為 App 卡死 |
| 6 | `main.css` dock 背景 | `color-mix(in srgb, var(--color-surface) 86%, transparent)` | WebView 105–110 不支援 `color-mix`，**不相容會讓整個 `background` 宣告失效變透明**，沒有任何 fallback。改 `var(--color-surface)` |
| 7 | `main.css` body | `body.mobile-device` 的 `padding-bottom: var(--sab)` | dock 改佈局內元素後會多一條空白帶。刪除，改由內容區 `padding-bottom: var(--dock-h)` 讓位 |
| 8 | `main.css` `.record-button:hover` 等 | hover 位移／變色 | Android 無 hover，點擊後樣式會「黏住」。改 `:active`；桌機 hover 效果包進 `@media (hover: hover)` |
| 9 | `main.css` `.btn-sm` | 36px | 未達 48dp 觸控目標。改**雙層盒**：外層 48×48 命中盒 + 內層 36dp 視覺皮層；`::before` 擴張會被父層 `overflow` 裁掉 |
| 10 | `package.json` `engines.node` | `>=20` | CI 用 Node 20 會在 `cap sync` 失敗。改 `>=22.0.0` |
| 11 | `voicechat.js:69` `getElementById('voiceChatVisualizer')` | 取不到節點時 return，無錯誤輸出 | 刪重複 id 後若節點改名，視覺化器會**靜默失效**。加 null guard 與 `console.warn`，並納入 smoke test |
| 12 | `main.css:623` `.vc-turns { max-height: 46dvh }` | 沒有 `vh` fallback | Chrome 105–107 整條失效，對話記錄區無限長。補 `max-height: 46vh` 前置宣告 |
| 13 | `public/manifest.json` | `theme_color: #2563eb`、`background_color: #f1f5f9` | Web PWA 仍在上線。同色需顧 **4 處**：`index.html:10`（light `#f1f5f9`）、`:11`（dark `#0b1220`）、`manifest.theme_color`、`manifest.background_color`；漏一處 web 端就留著藍色狀態列 |
| 14 | `main.css` `html[data-theme="dark"] .record-button.recording` | 深色模式下錄音態與閒置態同為紅漸層，僅靠 pulse 區分 | reduced-motion 一開，深色使用者**無法分辨是否正在錄音**。**整條刪除（不是改值）**——只換 hex 會留下舊結構，且仍在錄音態選擇器內會覆蓋新 token。深色錄音盤改由 `--record-disc-from/-to` 驅動的**淺盤** `#CBD5E1→#94A3B8`（對 dock 6.1–10.6:1），icon 轉 `#0B1220` |
| 15 | `main.css` `.tooltip` `z-index: 99999` | 高於 sheet（21）與 toast（30） | 模型說明會穿透浮在最上層，蓋住 sheet 內容。下調至 `2100` |
| 16 | `main.css` `.loading-spinner` | 被全域 reduced-motion 規則波及 | 停掉後無法判斷「處理中」還是「卡死」。降速到 2.4s（旋轉屬進度指示，非裝飾）並在旁加靜態「處理中…」 |
| 17 | `index.html` `#recordButton` | 內含寫死的麥克風 SVG，全域無換圖示邏輯 | 錄音中仍顯示麥克風 → 沒有形狀信號。新增 `.icon-mic` / `.icon-stop` 由 `[aria-pressed="true"]` 驅動。**`aria-pressed` 已由 `speech.js:428`、`voicechat.js:467/479` 維護**，只需補初始 `aria-pressed="false"`，並把 `voicechat.js:467` 的 `removeAttribute` 改成 `setAttribute('aria-pressed','false')` |
| 18 | `main.css` `overscroll-behavior` | 只寫在容器層 | WebView 頁面層仍會觸發下拉重新整理／橡皮筋。`html, body` 需 `overscroll-behavior: none`，內層容器維持 `contain` |
| 19 | `main.css` 焦點樣式 | 改雙層盒後，`outline` 若寫在內層 `span` 上永遠不觸發（span 不可聚焦） | 選擇器必須由外層驅動：`.outer:focus-visible > .skin { outline: … }`，並確認四邊未被裁切 |
| 20 | `main.css` `.record-button`（已查 `537-542`：目前無 `overflow:hidden`） | 不會裁環，但屬高風險回歸點 | **禁止條款**：orb 及其祖先不得加 `overflow:hidden`；環用 `inset:-6px`（僅備選的 2dp 描邊方案才是 `-8px`）；驗收仍以截圖確認四象限 |
| 21 | `main.css:550` `.record-orb svg { width: 2.2rem }` | 圖示用 `rem`，200% 字級下變 **70.4px** | 直接撐爆 80dp orb。改 `width: 24px`（stop 18px）；且現值 35.2dp 的圖示／容器比 44%，M3 慣例約 30%，縮到 24dp 同時修單位與比例 |
| 22 | `speech.js:428-431`、`voicechat.js` A/B | `aria-label` 走 `t()` 翻譯，切換介面語言時未重跑；A/B 兩顆麥**只有 `aria-pressed`、沒有動態 label** | 出現「中文介面 + 英文 label」；雙人模式 TalkBack 只唸「按鈕」。補 idle「使用者 A，中文（繁體），錄音」／recording「使用者 A，錄音中，已錄 00:12」，並在語言切換後重跑 `_updateRecordButton()` |

**設計澄清（不是缺陷）**：dark 的雙人 idle 填色對 dock 僅 1.04–1.11:1，屬「由線到面」的刻意設計，不要列為修復項。識別由 2dp 角色色**邊界**承擔（`#60A5FA` 6.2:1 / `#A78BFA` 5.4:1）；`#BFDBFE`（9.9:1）只用於 **icon**，不用於邊界——邊界若用 10.9:1，深色會比淺色亮一級，破壞跨主題視覺重量匹配。

### 3.6 五類「假通過」（驗收前逐項自問）

| # | 假通過的樣子 | 正確驗法 |
|---|--------------|----------|
| 1 | 量到 CSS 寫 `13px` 就認定字級正確 | 量 root 實際 `font-size`；WebView 不吃 `fontScale` 時永遠 16px |
| 2 | 只查 `animation-duration: 0.01ms` 就認定動畫已關 | 查 computed `animation-name === 'none'`；`0.01ms + infinite` 等於每秒上百次重繪 |
| 3 | 只查 `id="voiceChatVisualizer"` 存在就認定正常 | 查 `querySelectorAll` 長度 = 1；重複 id 的第二個永遠是死節點 |
| 4 | 只讀 CSS 確認有 `border:3px` 就認定環存在 | 截圖看四個象限；`overflow:hidden` 會把它裁掉 |
| 5 | 只比「閒置 vs 錄音」兩態 | 同時比「元件 vs 畫布」；深色下 `#0F172A` 對 `#111C33` 只有 1.05:1 |

> 這五項的共同點：**都是「程式碼看起來對、畫面其實錯」**。本專案已有 4 個這種案例（Web Speech、fontScale、safe-area、color-mix），全部在 Chrome 桌機測不出來。

### 3.7 三條架構級規則（本專案已發生 6 次同類 bug）

| 規則 | 內容 | 已防止的案例 |
|------|------|--------------|
| **一、屬性所有權** | 每個 CSS 屬性只能有一個「擁有者」。`box-shadow` 已被 `recording-pulse` 佔用於 orb → 任何其他視覺不得再用 `box-shadow` 表達同一元素；`transform` 已被 `ring-expand` 與 `scale()` 部分佔用 | 內描邊被 pulse 覆蓋、紅環靠動畫終態 |
| **二、狀態承載** | 任何「必須被看見」的狀態由靜態樣式承載（`border` / 形狀 / 文字），動畫只能加強、不得負責生成 | 紅環消失、spinner 被全域 reduced-motion 誤關 |
| **三、裁切檢查** | 任何畫在元素框外的視覺（錄音環 `inset:-6px`、focus 環、fade）都必須確認祖先沒有 `overflow: hidden`；驗收要看**四邊**，不能只看一側 | 環被圓鈕裁掉、focus 環缺一角 |
| **四、唯一真相** | 同一狀態只允許一個判斷來源：`[aria-pressed="true"]` 同時驅動 icon、`aria-pressed`、`aria-label`、文案。語言切換要重跑 label，但不得各自維護開關 | A/B 只翻 `aria-pressed` 沒換圖示、切語言後 label 不更新 |

**判準**：若關掉所有 `animation` 後某個狀態「看不出來」，違反規則二；若兩個視覺改同一個屬性，違反規則一；若某個視覺只在程式碼裡存在、截圖看不到，違反規則三；若某個狀態需要「記得同步第二個地方」，違反規則四。**能推導的不做決策，能做結構保證的不靠紀律**——這是本專案六輪來回後最值錢的一句。
| 15 | `main.css` `overscroll-behavior` | 只寫在容器層 | WebView 頁面層仍會觸發下拉重新整理／橡皮筋。`html, body` 需 `overscroll-behavior: none`，內層容器維持 `contain` |
| 16 | `main.css` `.dual-mic.is-active` pulse | 另一處 `infinite` 動畫 | 與 #5 同源的耗電問題，reduced-motion 段需一併移除；靜態環同樣由 `::after` 承載 |

**元件實作規則（雙層盒與狀態承載）**

1. **狀態形狀必須由靜態樣式承載，動畫只能加強**。任何依賴 keyframe 中間值或 `animation-fill-mode: forwards` 才看得到的狀態（紅環、選中指示、進度）一律重寫——關閉動畫後狀態就消失，等於對 reduced-motion 使用者說謊。
2. **語意元素（`button` / `input`）永遠在最外層**，內層只能是純視覺 `<span>`；可讀文字留在外層，`aria-hidden` 只套在純視覺 span 上。反過來會讓 TalkBack 焦點框與點擊區錯位，且讀到空按鈕。
3. **焦點環畫在內層，選擇器由外層驅動**：`.outer:focus-visible > .skin { outline: … }`。寫成 `.skin:focus-visible` 永遠不觸發（span 不可聚焦）。
4. **命中盒佔位**：外層 `height: 48px` + `margin-block: -2px`（佔位 44、命中 48），避免 tabs 把首屏從 216 推到 220。上下相鄰的不同列允許 ≤2dp 重疊（誤點後果是切 tab vs 切模式，皆可逆）；同列左右仍須 ≥8dp 或不重疊。
5. **`.btn-sm` 文字鈕**內層 `min-height: 44px` + `height: auto` + `padding-block: 13px`；40dp 時 12sp 中文只剩 11dp 內距、字貼邊。面板標題列不在 216 首屏預算內，多這 4dp 成本為零。

---

## 4. 依賴清單

### 4.1 npm 套件

| 套件 | 版本策略 | 用途 | 級別 |
|------|----------|------|------|
| `@capacitor/core` | `^8.4.0` | runtime、SystemBars（內建） | 必要 |
| `@capacitor/android` | `^8.4.0` | Android 平台 | 必要 |
| `@capacitor/cli` | `^8.4.0`（dev） | `cap sync` / `cap doctor` | 必要 |
| `@capacitor/app` | `^8` | 返回鍵攔截 | 必要 |
| `@capacitor/haptics` | `^8` | orb dock 觸感 | 必要 |
| `@capacitor/keyboard` | `^8` | `resize:'native'` | 必要 |
| `@capacitor/splash-screen` | `^8` | 消除白閃 | 必要 |
| `@capacitor-community/text-to-speech` | `~8.0.2` | 原生 TTS | 必要 |
| `@capacitor/network` | `^8` | 離線分支 | 建議 |
| `@capacitor/preferences` | `^8` | BYOK key 移出 `localStorage` | 建議 |

版本策略：`@capacitor/*` 用 `overrides` 鎖同一 minor；社群插件用 `~` 只收 patch；CI 一律 `npm ci`。

**不引入原生語音辨識插件。** 社群的 `@capacitor-community/speech-recognition` 對 Android 13+ 語言查詢已失效、無 on-device 控制，`partialResults` 在 popup 模式不發事件；Capawesome 版本雖完整但授權模式需確認。本專案已有可用的後端 ASR，**功能不缺，只失去即時逐字**，不值得為此引入維護風險。若日後要補，做成獨立插件、預設關閉。

### 4.2 系統與工具鏈

| 項目 | 版本 | 驗證指令 |
|------|------|----------|
| Node.js | ≥22（本機 22.22.2） | `node -v` |
| JDK | 21（Temurin） | `java -version` |
| Android Studio | Otter 2025.2.1+ | About 對話框 |
| Android SDK | 36（含 Build-Tools） | `sdkmanager --list_installed` |
| Gradle | 8.14.3（wrapper） | `./gradlew -v` |
| AGP | 8.13.0 | `android/build.gradle` |

---

## 5. 設定

### 5.1 `capacitor.config.ts`（可直接使用）

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.kilo.translator',   // 上架後不可變更
  appName: 'Kilo 翻譯',
  webDir: 'dist',
  android: {
    androidScheme: 'https',        // 必須：getUserMedia 需 secure context
    minWebViewVersion: 105,        // 全螢幕 WebView 下 100vh 等效，優先覆蓋舊機
    backgroundColor: '#f1f5f9',    // 單一值；深色由 values-night 的 splash 覆蓋
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SystemBars: { insetsHandling: 'css', initialViewportFitValueHint: 'cover', style: 'DEFAULT' },
    Keyboard: { resize: 'native', resizeOnFullScreen: true },
    SplashScreen: {
      launchShowDuration: 600,
      launchAutoHide: true,
      backgroundColor: '#f1f5f9',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;
```

**不使用 `server.url`**：會讓 App 載入遠端網址，帶來白屏風險、無離線冷啟、版本不可控、origin 變遠端站（CORS 更複雜），商店也可能視為純 webview 殼。僅 dev live-reload 臨時開啟，不進版控。

**Splash 深色**：`SplashScreen.backgroundColor` 只吃單一色。深色模式要靠原生資源分流——`values/styles.xml` 用 `#F1F5F9`、`values-night/styles.xml` 用 `#0B1220`，覆寫 `windowSplashScreenBackground`（API 31+）與 `android:windowBackground`（API 24–30）。只改 JS 配置會出現「深色啟動白閃一下」。

### 5.2 `AndroidManifest.xml`

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />

<application
    android:allowBackup="false"
    android:usesCleartextTraffic="false"
    android:supportsRtl="true">
  <activity
      android:screenOrientation="portrait"
      android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode|navigation|density|fontScale" />
</application>
```

- `allowBackup="false"`：避免 BYOK key 與歷史經 adb／雲備份外流。
- `usesCleartextTraffic="false"`：只在 `src/debug/AndroidManifest.xml` 的白名單放 `10.0.2.2`、`localhost`，不要全域開。
- `density` 為 Capacitor 8 必要項目（避免折疊／縮放時 WebView 重建）；`fontScale` 是本專案追加（大字級測試）。

### 5.3 Gradle 版本與簽署

```gradle
// android/variables.gradle
minSdkVersion = 24
compileSdkVersion = 36
targetSdkVersion = 36
```

```gradle
// android/app/build.gradle
def keystoreProps = new Properties()
file("../key.properties").withInputStream { keystoreProps.load(it) }

android {
  signingConfigs {
    release {
      storeFile file(keystoreProps['storeFile'])
      storePassword keystoreProps['storePassword']
      keyAlias keystoreProps['keyAlias']
      keyPassword keystoreProps['keyPassword']
    }
  }
  buildTypes {
    release {
      signingConfig signingConfigs.release
      minifyEnabled true
      shrinkResources true
    }
  }
}
```

`key.properties` 與 `*.keystore` 必須加入 `.gitignore`；keystore 備份到密碼管理器，遺失即無法更新。

版本號規則：`versionName` 取自 `package.json`；`versionCode = major*10000 + minor*100 + patch`（3.0.0 → 30000），CI 追加 run number 保證唯一。

### 5.4 環境變數

```bash
# .env.production（不進版控，或由 CI 注入）
VITE_API_BASE_URL=https://<zeabur-domain>
```

```bash
# 後端
CORS_ORIGIN=https://localhost,https://<web-domain>
```

---

## 6. 打包與發佈步驟

### 6.1 前置檢查

```bash
node -v                 # 需 v22.x
java -version           # 需 21
echo $ANDROID_HOME      # 需指向 SDK
npx cap doctor          # 需無 error
```

### 6.2 建置與同步

```bash
npm ci
npm run build                   # 驗證：dist/ 存在且含 assets/
npx cap add android             # 僅首次；驗證：android/ 生成
npx cap sync android            # 每次 web 改動後；驗證：Copied web assets + 插件列表
```

### 6.3 Debug 建置

```bash
cd android
./gradlew assembleDebug
# 產物：app/build/outputs/apk/debug/app-debug.apk
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n app.kilo.translator/.MainActivity
# 驗證：冷啟 < 3s、無白屏、翻譯可用
```

### 6.4 簽署金鑰（只做一次）

```bash
keytool -genkey -v -keystore kilo-release.keystore -alias kilo \
  -keyalg RSA -keysize 2048 -validity 10000
```

### 6.5 Release 與上架

```bash
cd android
./gradlew bundleRelease
# 產物：app/build/outputs/bundle/release/app-release.aab

# 本機先驗證 AAB 可安裝
bundletool build-apks --bundle=app-release.aab --output=kilo.apks \
  --ks=kilo-release.keystore --ks-key-alias=kilo
bundletool install-apks --apks=kilo.apks
```

上架流程：Play Console 建立應用 → 內部測試軌（≥20 人 × 48h）→ 預先發布報告 → 5% → 20% → 100%。

### 6.6 CI 要點（GitHub Actions）

```yaml
- uses: actions/setup-node@v4
  with: { node-version: 22, cache: npm }
- uses: actions/setup-java@v4
  with: { distribution: temurin, java-version: 21 }
- uses: gradle/actions/setup-gradle@v4
- run: npm ci && npm test && npm run lint
- run: npm run build
- run: npx cap sync android
- run: cd android && ./gradlew bundleRelease
  env:
    VITE_API_BASE_URL: ${{ vars.VITE_API_BASE_URL }}
- uses: actions/upload-artifact@v4
  with:
    name: app-release-aab
    path: android/app/build/outputs/bundle/release/app-release.aab
```

keystore 由 `secrets.KILO_KEYSTORE_B64` 解到 `$RUNNER_TEMP`，build 後立即刪除。`npm test` / `lint` 為 gate，失敗不產 AAB。

---

## 7. 驗證方式

### 7.1 第一層：單元測試

```bash
npm test              # 現有 11 檔必綠
npm run test:coverage # 新增模組覆蓋率 ≥90%
```

新增測試：

| 檔案 | 驗證內容 |
|------|----------|
| `tests/capabilities.test.js` | native × plugin × MediaRecorder × WebSpeech 8 組矩陣，斷言 `asrEngine` / `asrFallback` |
| `tests/api-base.test.js` | 空 base、尾斜線、含路徑三種 `apiUrl()` |
| `tests/permission-states.test.js` | 三態文案；`blocked` 時呼叫 `openSettings`（mock） |
| `tests/tts-adapter.test.js` | native 走插件、web 走 `speechSynthesis`、重入先 `stop` |
| `tests/utils.test.js`（改） | `getCapabilityReport()` 不得回傳 hard-false |

### 7.2 第二層：建置與靜態檢查

| 檢查 | 指令 | 通過標準 |
|------|------|----------|
| Capacitor 健康 | `npx cap doctor` | 無 error |
| Lint | `npm run lint` | 0 error |
| Web 資產 | `du -sh dist` | ≤1.5MB |
| AAB 體積 | `bundletool get-size total` | 下載量 ≤8MB |
| 權限清單 | `aapt dump permissions` | 僅 INTERNET / RECORD_AUDIO / ACCESS_NETWORK_STATE / MODIFY_AUDIO_SETTINGS |

### 7.3 第三層：真機矩陣

| 機型 | Android | WebView | 重點 |
|------|---------|---------|------|
| Pixel 6a | 16 (API 36) | 最新 | Edge-to-edge、insets、orientation 政策 |
| Samsung A14 | 14 | 最新 | One UI 權限對話框差異 |
| Redmi 9A | 10 | 舊 | 低端：mimeType、記憶體、啟動時間 |
| 舊機 | 7.1 (API 24) | 可更新 | minSdk 邊界 |
| 平板／摺疊 | 16 | 最新 | 600dp+ 佈局 |

每機型必過 5 個核心流程：文字翻譯、語音輸入、語音對話、朗讀、歷史。

### 7.4 第四層：商店前

- Play **預先發布報告**：Robo test 無 crash / ANR。
- 內部測試軌 ≥20 人 × 48h，**crash-free ≥99.5%**。
- 商店資訊：截圖需含手機尺寸、隱私政策需載明音訊送往 ASR 服務。

### 7.5 六項必測人工場景

| # | 場景 | 通過標準 |
|---|------|----------|
| 1 | 權限三態 | 首次先出 App 內說明；拒絕一次後連續 3 次點擊不自動彈系統框；永久拒絕後 1 步開啟系統設定，返回後自動恢復 |
| 2 | 來電中斷 | 通話結束後麥克風不自動恢復，需手動重按；已辨識文字保留 |
| 3 | 離線 | 全域 banner 出現；辨識與翻譯被擋；文字翻譯與歷史仍可瀏覽 |
| 4 | 藍牙／有線耳機插拔 | 錄音中拔耳機即停止並提示，不會錄到靜音軌 |
| 5 | 字體 200% | orb dock、sheet、譯文卡無裁切、無水平滾動 |
| 6 | RTL（ar-SA） | sheet 與 dock 鏡像、A 仍在左 B 仍在右、進度方向正確 |

### 7.6 驗收標準（可判定）

1. **對比**：淺／深兩主題 WCAG AA 失敗數 = 0；正文 ≥4.5:1、圖示與大字 ≥3:1。已驗：orb 白 icon on `#DC2626` = 4.83、A 鈕 `#1D4ED8` on `#EFF6FF` = 8.6、B 鈕 `#6D28D9` on `#F5F3FF` = 6.4。
2. **系統字級真實生效**：Android 設定調到 200% 後，`getComputedStyle(html).fontSize` 必須 ≈32px（不是 16px）；三畫面（語音對話／譯文卡／設定 sheet）無截斷、無水平滾動，文字未被 `clamp` 假放大。
3. **觸控**：可點元素命中矩形 ≥48×48dp，例外 = 0；相鄰命中區間隙 ≥8dp；tabs／chip 僅垂直擴張；tabs 在 200% 下不換行、不截字、指示條位置正確。
4. **Edge-to-edge**：gesture / 3-button nav × 淺深共 4 張截圖，header 不與狀態列重疊、orb 圓底距物理底 ≥56dp、無元素被圓角或挖孔裁切。
5. **安全區不疊加**：手勢機型（inset > 0）orb 圓底距實體底 ≥56dp（**必過**）；inset = 48 機型 ≥72dp（條件項；三鍵機多數回 0，不強求）；header 上緣與狀態列下緣間距 8dp ±1。
6. **首屏**：360×640 與 360×800，「header 上緣到譯文卡上緣」≤240dp（100% 字級）、譯文卡可視高 ≥200dp；切換分頁時 tabs 的 Y 座標位移 = 0px。
7. **雙人可辨性**：收音圓有紅環且環外 2dp 間隙；非收音圓**無環**、1dp 角色色邊界 + 去彩度 icon + `scale(0.94)`；灰階化後仍可區分；名稱與語言完整顯示不省略。
8. **八項風險抵禦**：弱網 3G 下後端 ASR 必須在 **20s 內**回傳「已逾時」並提供「改文字輸入」；後端不可達時顯示文案與重試，不可白屏；離線時錄音入口停用、文字翻譯可用。
9. **動效與耗電**：按下錄音到視覺變化 ≤100ms；`prefers-reduced-motion` 下無限動畫 = 0；切背景 10 秒內無 paint；連續錄音 5 分鐘不降頻、不發熱降亮度。
10. **權限三態**：首次 100% 先出 App 內說明；拒絕一次後連續 3 次點擊不自動彈系統框；永久拒絕後 1 步開啟系統設定並自動恢復。
11. **中斷不丟資料**：來電、切背景、拔耳機各測 1 次，返回後已辨識文字非空且提示中斷。
12. **旋轉不丟狀態**：錄音中旋轉 90°，計時連續、文字不重置；Android 16 大螢幕忽略方向鎖時，至少保證不重建 WebView。
13. **格線一致**：360dp 下所有水平 padding = 16dp；dock 左右 padding = 16dp；卡片與 sheet 同值。
14. **平板**：600dp 與 840dp 各截 1 張，內容欄 480／520dp 置中、留白為 `surface-dim`、dock 隨欄寬置中不貼邊、設定以 dialog 呈現。
15. **reduced-motion 語意**：computed `animation-name` 為 `none`（不是 0.01ms）；orb 顯示靜態 3dp 紅環且對 `surface` 對比 ≥3:1；pill 文案含「錄音中 00:12」，不可只有數字。
16. **200% 幾何不變**：orb 直徑 80、dock 高度、48dp 命中盒、16dp 邊距**數值不變**（證明幾何未用 rem），同時文字確實放大。
17. **波形真機有效**：錄音時波形振幅有變化；`voicechat.js:69` 的 null guard 會靜默失敗，**console 無紅字不算通過**。
18. **命中盒不被裁切**：`getBoundingClientRect()` ≥48×48，且以元素中心點 hit-test 驗證 tabs 命中盒未被父層 `overflow` 裁切。
19. **200% 不裁字**：header 標題與模式分段文字完整可見（與第 16 條互補：16 驗幾何，19 驗文字）。
20. **深色狀態可辨（阻塞）**：深色主題下閒置／錄音態截圖比對，填色相對亮度差 ≥1.5:1；關閉動畫時仍可區分（環 + 文字成立），不得依賴脈動。
21. **紅環對比與存在性**：環由 `::after` 承載、`box-shadow: 0 0 0 2px surface, 0 0 0 5px danger`；對 surface 對比 ≥3:1（dark `#F87171` 為 6.1:1）；`prefers-reduced-motion` 下環仍在；pill 文案含「錄音中」；遮擋區 hit-test 可點元素 = 0。
22. **平板 dock 邊界**：600／840dp 下 dock 左右邊界落在內容欄內（非實體螢幕邊），且 orb 與內容欄中心對齊。
23. **錄音盤 vs 畫布 ≥3:1（阻塞）**：light `#1E293B` on `#F1F5F9` ≈11:1；dark 靠 2dp `#9FB0CC` 內輪廓達 ≥7:1。只量「閒置 vs 錄音」兩態互比不算通過。
24. **環的四個象限**：截圖檢查 `::after` 環未被 `overflow:hidden` 裁切，四角皆可見。
25. **單一錯誤容器**：sheet 開啟時全域橫幅不可見；sheet 關閉後若錯誤未解除，橫幅重新出現。
26. **tabs 不裂字**：英文長標籤在 24sp 下最多 2 行、`word-break: keep-all`，不逐字斷行。
27. **焦點環四邊完整**：Tab 走完全部可聚焦元素，每個 focus 環四邊皆未被裁切，且對比 ≥3:1。
28. **載入態雙重證據**：reduced-motion 下「處理中…」文字可見**且** spinner 仍在轉（2.4s），缺一不可。
29. **命中盒不被搶**：以 `elementFromPoint()` 在 tabs 下緣 1px 取點，必須命中 tabs 而非下方分段；相鄰命中盒不得重疊。
30. **形狀與語意同源**：圖示形狀、`aria-pressed`、`aria-label` 由同一狀態源驅動——畫面是停止方塊而 TalkBack 唸「開始錄音」即判失敗；切換介面語言後 label 必須跟著換。
31. **對比量測不寫死底色**：腳本以 `getComputedStyle(el.parentElement).backgroundColor` 動態取容器色再算比值；寫死 `#16233D` 會在改版後失效。
32. **icon 幾何**：mic 24dp / stop 18dp，圖示／容器比 ≈30%（≤35%）；200% 字級下仍是 24px（不是 70.4px）。
33. **雙人兩主題皆 ≥3:1**：idle 填色與邊界、active 實心、inactive 邊界，light 與 dark 各量一次。dark 用 `#60A5FA`（6.2）／`#A78BFA`（5.4），**不得直接用 `#2563EB`／`#7C3AED`**（2.0–2.3:1）；dark idle 填色 1.04–1.11:1 屬「由線到面」設計，不判失敗，但邊界須對 dock 與 container **兩側都 ≥3:1**、icon ≥4.5:1；**移除測試**：把 idle 填色改成與 dock 同色，仍須可辨識。
34. **雙人 A/B 形狀同源**：A/B 錄音態也切換為停止方塊（同一 `[aria-pressed]` 來源），label 含角色＋語言＋狀態；切換介面語言後即時更新，不出現中英混雜。

---

## 8. 風險表

| # | 風險 | 影響 | 緩解 | 阻塞上線 |
|---|------|------|------|----------|
| 1 | WebView 無 Web Speech，語音輸入改道 | 核心體驗 | 後端 ASR 單一路徑；文字輸入永遠可用 | 否 |
| 2 | `RECORD_AUDIO` 三態在 WebView 不可辨識 | 使用者卡死無指引 | 自寫 `MicPermission` 插件「先判後要」 | **是** |
| 3 | 相對路徑 `/api/*` 打到本地 | 翻譯全掛 | `apiUrl()` 統一出口 + 建置斷言 | **是** |
| 4 | CORS `'*'` + 自訂 header preflight 失敗 | BYOK 不可用 | 白名單 + `allowedHeaders` | **是** |
| 5 | API 36 大螢幕忽略 `screenOrientation` | 平板／折疊版面錯亂 | 置中單欄 + 旋轉狀態保持（§1.3），不依賴方向鎖 | 否 |
| 6 | 低端機無 `audio/webm` | 錄音失敗 | 執行期 `isTypeSupported`，退 `audio/mp4`（後端已支援 m4a） | 否 |
| 7 | SW 殘留舊版本 | 更新不生效 | 原生不註冊 + 主動反註冊 | 否 |
| 8 | BYOK key 存 `localStorage` | 備份外流 | `allowBackup=false`；可選 Preferences | 否 |
| 9 | 首屏白閃 | 觀感 | Splash `#0b1220` + `android.backgroundColor` + `values-night` | 否 |
| 10 | WebView 不套用系統字級 | 「200%」假通過，低視力使用者永遠 16px | 原生回傳 `fontScale`，首屏 paint 前設 root font-size（§3.4） | **是**（若宣稱無障礙支援） |
| 11 | dock 用固定 `height` | 200% 字級裁字、爆版 | 全部改 `min-height` + `ResizeObserver` 回寫 `--dock-h` | 否 |
| 12 | app shell 由頁面滾動改為固定高度 | 影響所有頁面，回歸範圍大 | **列為第一件事做**，先建立 shell 再改元件；`VirtualScroll` 需重新量測容器 | 否（但排第一） |

### 需真機驗證（無法靜態確定）

1. Capacitor 8 `onPermissionRequest` 對 `RECORD_AUDIO` 的實際轉發與 deny 後語義 → 已備自寫插件方案。
2. Android 16 大螢幕對 `screenOrientation` 的忽略行為 → 已備 600dp+ 佈局。
3. 低端機 `MediaRecorder` 支援的 mimeType 集合 → 已備執行期偵測。
4. `SystemBars` 注入變數與 `env()` 在目標機型的實際值 → 已備雙層 fallback。
5. WebView 是否套用系統 `fontScale`（預期**不套用**）→ 已備原生插件 + 首屏設定，需以 `getComputedStyle(html).fontSize` 實測。
6. `color-mix` 在 105–110 的支援（預期**不支援且會整條失效**）→ 已全面改純色，不需實測也能避開。

---

## 9. 分期建議

| 階段 | 內容 | 產出 |
|------|------|------|
| **P0（上架必需）** | app shell 重構（固定高度 + 內滾）、適配層（capabilities / api / tts）、`platform-check`、`MicPermission` + `fontScale` 插件、SW 停用、`checkBrowserSupport` 改寫、CORS、**二十二項既有缺陷（§3.5）**、icon／splash 資產 | 可通過內部測試的 AAB |
| **P1（體驗）** | 2 分頁 + orb dock、設定／模型 sheet、status pill、雙人 A/B 重排、字級與觸控修正、haptics | 可公開上架版本 |
| **P2（後續）** | **離線 AI 包（§11）**、背景錄音（前景服務 + 通知）、原生 on-device 辨識、Capgo live update、iOS、平板佈局 | 迭代版本 |

### 決策凍結與變更門檻

- 顏色與幾何已凍結。任何方案翻轉**必須附真機截圖或量測數據**，不得只憑論證。
- 選型判準：用「未來被靜默改壞的點數」決定，不用美學論證（A 案 0 個不變式／3 層同心；B 案 2 個不變式／4 層，且每次調色都要重新主觀裁決）。
- 兩條推導原則：**能推導的不列舉，能測量的不論證**。反例（本輪已發生）：把 3:1 套在填色而非量測對象上；把可推導的 icon 顏色當成獨立風險。
- **能用字面值固定的，不引用會變的東西。** 跨主題恆定的值（如淺色表面上的 on 色 `#0B1220`）寫死 hex；只有隨主題變的值才引用 token。引用主題作用域變數會讓常數靜默翻轉，比寫死更危險。
- **規則寫「通過條件」，實作寫「當前選擇」，替代路徑寫「切換條件」**——三者分開存放，才不會把「曾經的選擇」誤讀成「必須的規則」。
- **角色色槽位固定**：`--role-*`（填色／邊界）、`--role-*-on`（填色上的 icon）、`--role-*-container`（idle 底）、`--role-*-on-container`（idle 底上的 icon）。跨槽位挪用同一 hex 視為缺陷——同一個值在不同位置有不同語意，是規格沒說清楚，不是設計自由。
- **對比五件套**：任何對比值必須齊備 **(槽位, 顏色 A, 顏色 B = 實際容器, 值, 判定門檻)**。缺一視為未驗證。同一組顏色對 dock 與對 container 差約 1:1（`#60A5FA` 6.10 / 5.51），只寫數字不寫基準必然算錯。
- **定性缺陷前先驗前提**：由規則推出「這是缺陷」之前，先確認該推導所依據的 token／基準已在規格中明示；未明示就先報規格缺口，不急著判缺陷。本輪兩次浪費都屬於此類——**前提沒被檢驗，就開始推導**。
- **變更既有結論須附證據**：真機量測或截圖。前者管前提，後者管結論，缺一不可。
- **同槽位跨主題 ±1.5:1（反棘輪）**：同一槽位（填色／邊界）在兩主題下的對比須落在同一量級，不得為「更好」單側拉高；僅在該槽位 <3:1 時允許。**不適用於 icon**（icon 由 on-color 推導，沒有單側調整空間）。現況驗算：idle 邊界 5.12 / 6.10、active 填色 5.12 / 6.10，Δ0.98 ✓。這條與「z-index 軍備競賽」同一種病。
- **一色一義**：`#0B1220` 統一作為「淺色表面上的 on 色」（紀錄盤 icon、雙人 dark icon）。`#0F172A` 已擔任 light 暗端，不得再兼任 on 色——不是為了 +0.33 的對比，而是避免一個 hex 兼兩職。
- **固定值寫字面值，命名用 `bright` 不用 `light`**：`--on-bright-surface: #0B1220;` 必須是字面值。**不可寫 `var(--color-bg)`**——它在 light 主題解析成 `#F1F5F9`（近白），會讓「高明度表面上的 icon」變白配淺盤、直接隱形，而且是**靜默翻轉**而非固定錯誤。`light` 在 CSS 生態同時指「淺色主題」與「高明度」，這個名字本身就在邀請人踩坑；註解防錯比命名防錯弱一級。
- **變更記錄必填三欄**：`變更內容 / 被推翻的那句話 / 新證據`。指不出被推翻的句子，就不是採納、只是附和。這條直接對治本輪多版來回的成因——每次翻轉往往不是因為新證據，而是因為「聽起來有道理」。
- **token 分區採「零重構」版（重要）**：**不要把 light 的 `--color-*` 搬進 `html[data-theme="light"]`**——`:root` 的 light 值同時是「`data-theme` 缺失時的兜底」，搬走會讓 JS 失敗或首屏競態時所有顏色變成 `undefined`、整站透明。正確做法：`:root` 內用註解橫幅分段（常數區／主題區），並把散落的 `--sat/--sab/--sal/--sar`（`main.css:123-128` 的獨立 `:root`）併回常數段。檢查能力相同，風險低一個數量級。
- **三條 grep 級 CI 檢查**（把紀律變成結構，一次寫、永久生效）：① `--*-on:` / `--*-icon:` 宣告不得含 `var(--color-`；② 同一 hex 出現在兩個不同 token 名時需附理由（一色一義）；③ 常數區 token 名不得出現在 `html[data-theme]` 區塊。
- **Review 三步（有序，前一步不通過就不必看下一步）**：① **輸入是否完整**（對比四件套、跨主題 ±1.5:1）→ ② **引用是否穩定**（固定值用字面值，不用 `var()`）→ ③ **語意是否唯一**（槽位固定、一色一義、屬性所有權）。本輪 5 次失誤全部落在這三步之一，適合當檢查表的標題而不是散落在各條。
- **非阻塞待辦（勿隨協作結束遺失）**：① 實作後**夜間截圖**確認 80dp 淺盤不刺眼，刺眼才切 fallback（`#475569→#334155` + 2dp `#9FB0CC` + `inset:-8px/-7px` + light 加 `transparent` border），**規則不變**；② `data-theme` 缺失時靠 `:root` 的 light 值兜底，不得為了分區整齊而搬移。
- **結論的可信度不能超過輸入的完整度。** 本輪三種錯誤的共同根因：把未複算的數字當已驗證、把未明示的槽位當已明示、把一個可行解當成規則。
- 本輪 6 次來回中有 2 次源於互相引用舊版本。後續溝通以本文件為唯一事實來源，不再以訊息片段為準。

---

## 10. 變更清單（給實作的人）

| # | 檔案 | 動作 |
|---|------|------|
| 1 | `capacitor.config.ts` | 新增（本文件 §5.1） |
| 2 | `src/js/api.js` | 新增 `API_BASE` / `apiUrl()` / `isNative()` |
| 3 | `src/js/capabilities.js` | 新增能力偵測與決策樹 |
| 4 | `src/js/tts.js` | 新增 TTS 適配層（native 插件 / web speechSynthesis） |
| 5 | `src/js/platform-check.js` | 新增**非 module、ES5 語法**的前置檢查，inline 進 `index.html` `<head>`；WebView < 105 時以 `document.body.textContent` 顯示升級提示。原因：`main.js` 是 ES module，舊 WebView 會 SyntaxError 直接白屏，錯誤處理永遠不會執行 |
| 6 | `src/js/utils.js:33` | `checkBrowserSupport` → `getCapabilityReport`，移除硬阻擋（現行在 WebView 100% 觸發並中斷初始化） |
| 7 | `src/main.js:139` | 改呼叫能力報告，僅 `textOnly` 時提示 |
| 8 | `src/main.js:66` / `:394` | 最頂端 await `getFontScale()` 並在首屏 paint 前設 root font-size（須在 `initializeApp` 之前）；SW 條件註冊 + 原生反註冊 |
| 9 | `src/js/translation.js:296` | `BACKEND_TRANSLATE_ENDPOINTS` 改用 `apiUrl()` |
| 10 | `src/js/asr.js:57,97` | 端點改用 `apiUrl()` |
| 11 | `src/js/speech.js:449-567` | 朗讀改走 TTS 適配層；移除會永久掛住的 `voiceschanged` 等待 |
| 12 | `server.js:37` | CORS 白名單 + `allowedHeaders: ['Content-Type','X-OpenRouter-Key']` |
| 13 | `vite.config.js` | 建置期 `VITE_API_BASE_URL` 斷言（`mode === 'production'` 且為空即 throw） |
| 14 | `package.json` | `engines.node` → `>=22.0.0`；新增 Capacitor 依賴與 `android:sync` / `android:debug` / `android:release` scripts |
| 15 | `index.html` head | 三處 `theme-color`（light `#f1f5f9`、dark `#0b1220`）+ platform-check inline + `manifest.json` 同步 |
| 16 | `index.html:351` | 刪除重複 `voiceChatVisualizer`（保留 325） |
| 17 | `index.html` `#swapUsers` | **inline `style="display:none"`** + `disabled` + `tabindex="-1"` + `aria-hidden="true"`。不可只加 class：`ui.js:465` 會 `classList.remove('hidden')` 讓它復活；也不可刪節點：`ui.js:303` 綁事件會 TypeError、初始化中斷、整頁白屏 |
| 18 | `src/styles/main.css` | app shell 固定高度 flex + 譯文卡內滾；dock 改佈局內元素（非 sticky）；`--sat/--sab` 雙層 fallback；header 吃 `--sat`；刪 body `padding-bottom`；dock 不透明並移除 `color-mix`；移除 `.dual-mic-row` 的 `backdrop-filter`；`@media (hover:hover)` 包住 hover；reduced-motion 補 `animation-name: none`；`.btn-sm` 雙層命中盒；`.vc-turns` 補 `46vh` fallback；單位分工（字級 rem／其餘 px） |
| 19 | `android/app/src/main/java/.../MicPermissionPlugin.kt` | 新增（約 40 行）：`check` / `request` / `openSettings` / `getFontScale` |
| 20 | `android/app/src/main/java/.../MainActivity.java` | `registerPlugin(MicPermissionPlugin.class)`；`onConfigurationChanged` 廣播 fontScale |
| 21 | `android/app/src/main/AndroidManifest.xml` | 權限、`allowBackup=false`、`usesCleartextTraffic=false`、`configChanges` 加 `density|fontScale` |
| 22 | `android/app/src/main/res/values-night/styles.xml` | Splash 深色底 `#0B1220`；light 用 `#F1F5F9` |
| 23 | `public/icons/` | 新增 adaptive foreground / monochrome / 288×288 splash |

---

## 11. 離線 AI 擴充（選配，P2）

> 問題：Android 版能否支援 Google 開源的 **TranslateGemma 4B** 離線翻譯模型與離線語音包？
> 結論：**技術可行，但不建議作為預設，也不建議與主版本同時上線。** 作法是「可選離線包 + 機型分級」，雲端仍是預設路徑。

### 11.1 模型事實（已核對 Hugging Face 與社群量化）

| 項目 | 內容 |
|------|------|
| 模型 | `google/translategemma-4b-it`，4B（模型卡標 5B params），Gemma 3 架構，image-text-to-text |
| 語言 | 55 種；語言碼支援 `en` 與 `en_US` 兩種形式 |
| 上下文 | **2K tokens（總輸入，含 prompt）** |
| 權重 | BF16 safetensors；**HF 倉庫為 gated，需接受 Google 條款** |
| 授權 | Gemma License（可商用，但有使用限制與通知義務） |
| 量化 | 社群已有 Q4_K_M GGUF，**約 2.32–2.49 GB** |
| 品質 | WMT24++ MetricX（越低越好）：4B **5.32**／12B 3.60／27B 3.09；Comet：81.6／83.5／84.4 |
| 輸入格式 | user 內容必須是**單元素列表**，含 `type`、`source_lang_code`、`target_lang_code`、`text`（或 `url`）——**不是通用 chat 格式** |

品質的誠實解讀：4B 與 27B 的 MetricX 差 **2.23**，是「可用」與「接近商用」的差距。它適合當離線保底，不適合取代雲端模型。

### 11.2 硬體門檻（實測推算，需 spike 驗證）

| 項目 | 門檻 | 說明 |
|------|------|------|
| RAM | **≥8GB**，且可用 ≥4GB | 權重 2.4GB + 執行期／KV cache 0.8–1.2GB → 峰值 3.2–3.6GB；6GB 機型會被 LMK 殺 |
| 儲存 | **≥5GB 可用** | 模型 2.5GB + 離線語音包 0.1–0.3GB + 暫存與更新 |
| ABI | `arm64-v8a` | llama.cpp 以 NDK 編譯；`armeabi-v7a` 不支援 |
| 系統 | Android 10+（建議 12+） | 記憶體管理與 NEON 指令集 |
| 速度 | 旗艦 3–10 tok/s；中階 1.5–4 tok/s | 20 token 的句子約 3–10 秒；100 token 段落 15–60 秒 |

**這代表什麼**：離線模式不能用於即時語音對話（延遲 3 秒以上就破壞對話節奏），只適合「文字輸入 → 等結果」與「無網路時的保底翻譯」。

### 11.3 架構

```
WebView（既有 UI）
  └ capabilities.js：偵測 offline 可用性
      └ Capacitor Plugin「OfflineTranslate」（Kotlin + JNI）
          ├ ModelManager：下載／續傳／SHA-256／原子替換／刪除
          ├ llama.cpp（arm64-v8a .so）：GGUF Q4_K_M 推理
          ├ PromptBuilder：TranslateGemma 專用格式（不可沿用 prompts.js）
          └ OfflineAsr：sherpa-onnx 串流模型（每語言 30–80MB）
```

- **推理引擎選 llama.cpp**：官方有 `examples/android`，純 C/C++、無 Python、可 JNI 直呼，對 Gemma 3 架構支援完整。MediaPipe/LiteRT 需先轉 `.task`，社群轉換品質不一，且更新鏈較長。
- **模型不下載進 APK**：Play 基底模組上限 200MB、asset pack 上限 2GB，2.4GB 已超限，且沒人想在安裝時被強迫下載 2.4GB。改為執行期下載到你自己的 CDN（或 Cloudflare R2），支援續傳與 Wi-Fi only。
- **Prompt 必須另寫**：TranslateGemma 的輸入是結構化列表，不是 `role: user` 的一段文字。`src/js/prompts.js` 的三步提示在此完全不能用，需新增 `offlinePrompt.js`。
- **離線語音**：`sherpa-onnx` 的串流 zipformer 每語言 30–80MB，中文／英文各一包即可；不依賴 Google App 的離線語言包（OEM 差異大、常缺失）。朗讀沿用既有 Android TTS（多數機型需先下載語音資料）。

### 11.4 與現有翻譯管線的關係

| 能力 | 雲端（現況） | 離線（4B） |
|------|--------------|------------|
| 單次翻譯 | ✓ | ✓ |
| 三步精譯（直譯→反思→意譯） | ✓ | **停用**（4B 的反思品質不足，且 2K context 放不下三段） |
| 長文 | 1200 字／段，保留上下文 | **400–600 字／段**，跨段上下文減半 |
| 額外目標語言 | 同時多語 | 逐一序列推理（速度 ×N） |
| 翻譯風格 | 6 種 | 僅「正常／自然」，其餘降級 |
| 延遲 | 0.8–3s | 3–60s |

**Fallback 順序**：雲端（預設）→ 離線模型（若已安裝且可用）→ 文字輸入提示。離線時 UI 必須顯示「離線 · 4B」徽章，並在結果卡註明「裝置端翻譯，品質可能低於雲端」。

### 11.5 分發、法務與商店

- **Gemma License**：可商用與再分發，但必須附授權條款、保留 notices、遵守禁止用途政策。HF 原倉是 gated，**不要叫使用者自己去 HF 下載**（需登入與同意），应由你托管轉換後的 GGUF 並附條款。
- **隱私**：離線模式是賣點——文字與音訊不離開裝置。但要在隱私政策明確區分「雲端模式」與「離線模式」的資料流向，否則商店資料安全表會對不上。
- **Play 政策**：模型下載屬一般檔案下載，不違規；但要在商店頁標明「可選下載 2.5GB」與「建議 8GB RAM」。
- **版本管理**：模型檔案要帶 `modelVersion` 與 SHA-256，App 更新時可偵測舊模型並提示重下；不要讓舊 GGUF 與新 prompt 混用。

### 11.6 分級策略（不讓低端機被排除）

| 等級 | 條件 | 方案 |
|------|------|------|
| A | ≥8GB RAM、arm64、Android 12+ | TranslateGemma 4B Q4_K_M（2.4GB） |
| B | 4–6GB RAM | **ML Kit Translation**（每語言約 30MB，幾乎全機可用，品質中等）或 NLLB-200-distilled-600M Q4（約 0.4GB） |
| C | 不支援 | 僅雲端 + 文字輸入 |

這個分級是關鍵：只做 A 級等於放棄一半使用者；只做 B 級則拿不到「TranslateGemma」的品質與話題性。

### 11.7 工作量與風險

| 項目 | 估計 |
|------|------|
| 技術 spike（3 機型實測速度／記憶體／品質） | 5–8 人日 |
| ModelManager + 下載器 | 5 人日 |
| OfflineTranslate plugin + prompt builder | 8–10 人日 |
| 離線 ASR（sherpa-onnx） | 5–8 人日 |
| UI（模型管理頁、離線徽章、能力門檻） | 3–5 人日 |
| 測試與商店合規 | 5 人日 |
| **合計** | **約 5–7 週（1 人）** |

| 風險 | 影響 | 緩解 |
|------|------|------|
| OOM／LMK 殺進程 | 崩潰 | 硬性 RAM 門檻 + 啟動前檢查 + 捕捉 `OutOfMemoryError` 降級 |
| 發熱降頻 | 後半段變慢 | 限制 `n_threads`（4）、連續翻譯 10 段後冷卻提示 |
| 品質落差 | 使用者失望 | 離線徽章 + 首次使用說明 + 可一鍵切回雲端 |
| 2.4GB 下載失敗 | 放棄安裝 | 續傳、Wi-Fi only、可暫停、顯示剩餘時間 |
| Gemma 條款合規 | 下架風險 | 隨模型附授權與禁止用途、法務審閱 |
| 模型與 prompt 版本漂移 | 輸出劣化 | 模型與 prompt 綁同一 `modelVersion`，不匹配即拒絕載入 |

### 11.8 建議

1. **不要放進本期（P0/P1）**。目前的上架阻塞項是權限、API base、CORS、a11y；離線模型是另一個量級的工程。
2. 若要做，先做 **5–8 人日的 spike**：在一台旗艦、一台中階、一台 6GB 機上實測 tok/s、峰值 RSS、發熱與 20 句翻譯的主觀品質。**spike 不通過就不立項**。
3. 立項後按 A/B/C 分級做，**預設仍是雲端**，離線是「下載後可選」的能力，不是預設路徑。
4. 若目標只是「無網路也能用」而非「一定要 TranslateGemma」，**ML Kit Translation 是成本低一個數量級的方案**（語言包 30MB、全機可用、無 2.4GB 下載），代價是品質與可解釋性較低。這個取捨要先跟產品確認。

---

*文件結束。實作前請先完成 §6.1 工具鏈檢查與 §7.1 現有測試基線。*
