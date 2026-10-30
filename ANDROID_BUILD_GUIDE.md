# Kilo 翻譯 — Android 打包與驗收指南

> 對應規格：`ANDROID_APP.md`（唯一事實來源）
> 本次實作範圍：**P0 全部 + P1 介面重排**；P2（離線 AI）未動。
> 基準版本：v3.0.0 ｜ 容器：Capacitor 8.5.3 ｜ `appId: app.kilo.translator`

---

## 0. 一句話結論

網路層、語音層、字級、安全區、22 項既有缺陷已全部改完，`npm test` / `lint` / `build` 全綠，
並用真實 Chrome（360×640 / 360×800 / 深色 / 錄音態 / 200% 字級）量過幾何與截圖。
**本機沒有 JDK 21 與 Android SDK，因此 `assembleDebug` 尚未實際執行** —— 第一次真機打包請照 §2 走一遍。

---

## 1. 這次實際改了什麼

### 新增（能力適配層）

| 檔案 | 作用 |
|------|------|
| `src/js/api.js` | `API_BASE` / `apiUrl()` / `isNative()`：所有後端端點的**單一出口** |
| `src/js/capabilities.js` | 能力決策樹、權限三態、`fontScale` 套用、網路監聽、觸感 |
| `src/js/tts.js` | TTS 適配層（原生插件 / `speechSynthesis`），**不再等 `voiceschanged`** |
| `public/platform-check.js` | ES5 前置檢查，WebView < 105 顯示升級提示（不白屏） |
| `scripts/build-android.mjs` | App 版建置：斷言 `VITE_API_BASE_URL`、關閉 sourcemap |
| `scripts/generate-android-icons.mjs` | adaptive / legacy / monochrome icon + 淺深 splash |
| `scripts/ui-probe.mjs` | CDP 幾何探針 + 截圖（本次驗收用） |
| `android/.../MicPermissionPlugin.java` | 權限三態 + `openSettings` + `getFontScale` |

### 改寫 / 修正

| 檔案 | 重點 |
|------|------|
| `src/main.js` | 首屏 paint 前套字級；能力分級取代硬阻擋；SW 條件註冊＋原生反註冊；離線 banner；返回鍵 |
| `src/js/utils.js` | 刪除 `checkBrowserSupport()`（WebView 100% 觸發 → 白屏） |
| `src/js/speech.js` | 權限「先判後要」、A/B label 動態化、形狀信號（mic/stop）、中斷處理、朗讀走適配層 |
| `src/js/asr.js` | 端點 `apiUrl()`；原生逾時 90s → 20s |
| `src/js/translation.js` | 後端端點 `apiUrl()` |
| `src/js/ui.js` | 2 分頁、bottom sheet、模型 chip、dock 清除、label 重繪 |
| `src/js/voicechat.js` | `aria-pressed` 不再 `removeAttribute`（唯一狀態源）；重播走 TTS 適配層 |
| `index.html` | 重複 `voiceChatVisualizer` 刪除、`theme-color` 4 處同步、`swapUsers` inline 隱藏、dock / tabs / sheet |
| `src/styles/main.css` | 重寫：固定高度 shell、安全區雙層 fallback、移除 `color-mix` / `backdrop-filter`、靜態紅環、幾何 px／字級 rem |
| `server.js` | CORS 白名單 + `allowedHeaders: ['Content-Type','X-OpenRouter-Key']` |
| `vite.config.js` | `VITE_TARGET=android` 時斷言 API base（見 §5 差異 1） |
| `package.json` | `engines.node >= 22`、Capacitor 依賴與 `android:*` scripts |

### 原生工程（`android/`）

- `AndroidManifest.xml`：僅 4 個權限、`allowBackup=false`、`usesCleartextTraffic=false`、`configChanges` 含 `density|fontScale`、`screenOrientation="portrait"`
- `MainActivity.java`：註冊插件、鎖 `textZoom=100`、`onConfigurationChanged` 廣播字級
- `res/values/colors.xml`、`values-night/colors.xml`、`styles.xml`：淺色 `#F1F5F9` / 深色 `#0B1220` splash
- `mipmap-anydpi-v26/*`：background `#2563EB` + monochrome 圖層（線寬 8dp）
- `app/build.gradle`：版本號取自 `package.json`（3.0.0 → 30000）、R8 + keep 規則、簽署可選載入
- `src/debug/`：只在 debug 放行 `10.0.2.2` / `localhost` 明文

---

## 2. 打包步驟（第一次請照順序）

### 2.1 前置檢查

```bash
node -v                  # 需 v22.x（本機 22.22.2）
java -version            # 需 21（本機目前是 1.8，必須先裝 JDK 21）
echo $ANDROID_HOME       # 需指向 SDK（含 platform 36、build-tools 36）
npx cap doctor           # 應無 error
```

> **本機現況**：`java -version` 是 1.8、`ANDROID_HOME` 未設，所以還沒跑過 Gradle。
> 裝好 JDK 21（Temurin）+ Android Studio（含 SDK 36）後再繼續。

### 2.2 設定後端網址（上架阻塞項，不可省略）

```bash
# Git Bash
VITE_API_BASE_URL=https://<你的-zeabur-domain> npm run android:sync

# PowerShell
$env:VITE_API_BASE_URL="https://<你的-zeabur-domain>"; npm run android:sync
```

`android:sync` 會依序做三件事：產生 Android 圖像 → 建置 web 資產（含 API base 斷言）→ `cap sync`。
**沒設 `VITE_API_BASE_URL` 會直接失敗**，這是刻意的：打包後 origin 是 `https://localhost`，
相對路徑 `/api/*` 會打到 WebView 自己，回 404。

後端同時要放行來源：

```bash
CORS_ORIGIN=https://localhost,https://<web-domain>
```

### 2.3 Debug APK

```bash
npm run android:debug
# 產物：android/app/build/outputs/apk/debug/app-debug.apk

adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n app.kilo.translator/.MainActivity
```

### 2.4 簽署金鑰（只做一次，做完備份）

```bash
keytool -genkey -v -keystore kilo-release.keystore -alias kilo \
  -keyalg RSA -keysize 2048 -validity 10000
```

在專案根目錄建 `key.properties`（已在 `.gitignore`）：

```properties
storeFile=../kilo-release.keystore
storePassword=********
keyAlias=kilo
keyPassword=********
```

沒有這個檔也能跑 `assembleDebug`；`bundleRelease` 會產出未簽署的 AAB。

### 2.5 Release AAB

```bash
npm run android:release
# 產物：android/app/build/outputs/bundle/release/app-release.aab
```

上架前用 `bundletool` 在本機安裝驗證一次，再進 Play 內部測試軌（≥20 人 × 48h）。

### 2.6 高頻報錯

| 症狀 | 原因 / 處置 |
|------|-------------|
| `cmdline-tools not found` | 未裝 Android SDK Command-line Tools |
| `Could not find installation of TypeScript` | `npm i -D typescript`（讀 `capacitor.config.ts` 需要） |
| `Unsupported class file major version` | Gradle 用到 JDK 8/17，改 `JAVA_HOME` 指向 21 |
| `SDK location not found` | 建 `android/local.properties`：`sdk.dir=C\:\\...\\Android\\Sdk` |
| R8 release 崩在插件 | 檢查 `proguard-rules.pro` 的 `MicPermissionPlugin` keep 規則 |
| 更新後畫面沒變 | 原生已反註冊 SW；確認 `cap sync` 有跑、`versionCode` 有加 |

---

## 3. 實測驗收（真實 Chrome，非推論）

探針：`node scripts/ui-probe.mjs http://localhost:4173`，產出在 `.preview/android/`。

| 項目 | 標準 | 實測 | 判定 |
|------|------|------|------|
| 首屏非內容區（360×640 / 800，100%） | ≤240dp（目標 216） | **236dp** | 通過（貼近上限） |
| header / tabs / dock / orb 底距 | 56 / 48 / 144 / ≥56 | 57 / 49 / 145 / **56** | 通過 |
| 可點元素命中盒 | ≥48×48，例外 0 | **0 件違規** | 通過 |
| 重複 id | 0 | **0** | 通過 |
| 水平溢出 | 0 | **0**（100% 與 200%） | 通過 |
| 200% 字級 root | ≈32px | **32px** | 通過 |
| 200% 幾何不變 | orb 80、命中盒 48 | orb **80×80**、hit **48px** | 通過 |
| 200% 不裁字 | 0 處 | **0 處**（`scrollWidth > clientWidth` 掃描） | 通過 |
| 200% 非內容區 | ≥150% 放寬至 260dp | **300dp** | 未達標，見 §5 差異 3 |
| 錄音態形狀 | mic→stop | mic `none` / stop `grid` | 通過 |
| 錄音紅環 | 3px、四象限可見 | `3px rgb(248,113,113)`、opacity 1 | 通過 |
| 深色錄音盤 | 淺盤 `#CBD5E1→#94A3B8` | 完全一致 | 通過 |
| 閒置盤（兩主題） | 紅色（品牌「可錄」） | `#ef4444→#b91c1c` | 通過 |
| status pill | 32 / 錄音 56、向上生長 | 32 → **56** | 通過 |
| reduced-motion | `animation-name: none` | 三個脈動元素皆 `none` | 通過 |
| spinner 不被誤關 | 仍在轉 | `spin`（2.4s） | 通過 |
| sheet | 不出屏、可滾、鎖背景滾動 | bottom 800/800、可滾、鎖定 | 通過 |
| 分頁切換 | tabs Y 位移 0 | 57 → 57 | 通過 |

截圖：`light-360x640.png`、`light-360x800.png`、`dark-360x800.png`、`dark-recording.png`、
`reduced-motion-200.png`、`sheet-light.png`、`history-light.png`。

**尚未驗證（需真機）**：安全區真值（`--safe-area-inset-*`）、`fontScale` 實際回傳、來電／耳機中斷、
CORS preflight、低端機 mimeType、R8 release 打包、冷啟時間。文件 §7.3 的 5 機型矩陣仍是上架前必做。

---

## 4. 測試

```bash
npm test          # 15 檔 / 200 tests 全綠
npm run lint      # 0 error（20 個既有 warning）
npm run build     # web 版（含 sourcemap）
```

新增 4 檔測試：

- `tests/capabilities.test.js` — 8 組能力矩陣、權限三態、fontScale clamp
- `tests/api-base.test.js` — 空 base / 尾斜線 / 含路徑
- `tests/tts-adapter.test.js` — 不等 voices、重入先 stop、錯誤可結束
- `tests/android-shell.test.js` — 唯一 id、主題色、無 `color-mix`、z-index 階梯、
  token 一色一義、`data-compact` 不改字級、red-motion 不用 `*`

最後一檔就是文件 §9 說的「把紀律變成結構」：這 29 條斷言把 22 項缺陷中可靜態判定的部分鎖住了。

---

## 5. 與文件的差異（每條都有理由）

1. **API base 斷言加了 `VITE_TARGET=android` 門檻**（§2.4 原文是無條件）
   同一份 `dist` 也供應 Netlify / Zeabur 的同源 web 部署，那裡相對路徑才是正解。
   無條件斷言會讓所有 web 建置失敗 —— 用一個新 bug 換一個舊 bug。

2. **`MicPermission` 用 Java 而非 Kotlin**（§10 #19 寫 `.kt`）
   專案是 Capacitor 的 Java-only 模板，引入 Kotlin 要加 Gradle 插件與工具鏈，對 40 行插件不划算。
   功能與方法簽名與文件一致。

3. **200% 字級下非內容區 300dp（文件放寬值 260dp）**
   實測 236dp 的組成中，模式分段在 200% 時 6 個中文字放不進半欄。
   要嘛裁字（違反 §7.6 #19），要嘛長高。我選長高，並改成上下兩列（避免「單人翻譯模／式」半字斷行）。
   若必須壓回 260，唯一辦法是 200% 時把模式／語言列移進可滾動內容 —— 會違反 §1.3「只讓譯文卡內滾」。

4. **`platform-check.js` 放在 `public/` 用經典 `<script src>` 載入，不是 inline**
   單一來源、不重複程式碼；它仍是 ES5、非 module、排在 module script 之前，舊 WebView 一樣不會白屏。
   `data-booting` 的首屏守門才是 inline（那行必須在 paint 前執行）。

5. **dock 沒有 `--dock-h` + `ResizeObserver` 回寫**（§1.2 的作法）
   dock 是 `flex: 0 0 auto` 的佈局內元素，內容區 `flex:1; min-height:0` 自動讓位。
   ResizeObserver 是為了 `position:sticky` 才需要的補償；這裡不需要，少一個會壞的環節。

6. **`data-compact` 多做三件事**：隱藏模型 chip、語言標籤改視覺隱藏、模式分段改單欄。
   都是為了滿足「200% 不裁字」；皆未改任何字級（有測試鎖住）。

---

## 6. 上架前還缺什麼

| 項目 | 狀態 |
|------|------|
| 5 機型真機矩陣（§7.3） | 未做（需實機） |
| 6 個人工場景（權限三態／來電／離線／耳機／200%／RTL） | 未做（需實機） |
| Play 預先發布報告、內部測試軌 | 未做 |
| 隱私政策（載明音訊送往 ASR 服務） | 未做 |
| 商店截圖與文案 | 未做 |
| `key.properties` + keystore 備份 | 未做（**遺失即無法更新**） |

離線 AI（§11）建議照文件先做 5–8 人日 spike，不通過就不立項。
