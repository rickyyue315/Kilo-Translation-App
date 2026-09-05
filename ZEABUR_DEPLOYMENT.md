# Kilo 即時語音翻譯器 — Zeabur 部署指南

本專案已改為「前後端同一進程」架構，可直接部署到 Zeabur（同時保留 Netlify 相容）。

## 架構

```
瀏覽器 ──► node server.js（Zeabur / Docker / 本機）
              ├─ 靜態檔：dist/（Vite build 產物）
              ├─ POST /api/translate   → OpenRouter / BigModel 翻譯
              ├─ POST /api/transcribe  → OpenRouter ASR（4 個語音模型）
              └─ GET  /api/health      → 健康檢查
```

舊的 `/.netlify/functions/*` 路徑仍可使用（自動對應到同一邏輯），
Netlify 部署方式不受影響。

## Zeabur 部署（推薦：零設定）

1. 將此 repo 推到 GitHub。
2. 在 Zeabur 建立 Project → Add Service → Git，選擇此 repo。
3. Zeabur 會自動偵測 Node.js：
   - Build：`npm ci && npm run build`（已寫在 `zbpack.json`）
   - Start：`node server.js`（已寫在 `zbpack.json`，監聽 `$PORT`）
4. 在 Service → Variables 設定環境變數（見下表），重新部署即可。

> 也可用 Docker 方式部署：本目錄附有 `Dockerfile`（multi-stage，
> `node:20-alpine` 建置 + 執行），Zeabur 會自動使用它。

## 環境變數

| 變數 | 必填 | 說明 |
|------|------|------|
| `OPENROUTER_API_KEY` | ✅ | OpenRouter 金鑰（翻譯 + ASR 伺服器端代理共用）。到 https://openrouter.ai/ 申請 |
| `BIGMODEL_API_KEY` | 選填 | 智譜 BigModel 金鑰（`id.secret` 格式），只用 BigModel 翻譯路徑時需要 |
| `APP_URL` | 選填 | 部署後的公開網址，用作 OpenRouter `HTTP-Referer` |
| `CORS_ORIGIN` | 選填 | 預設 `*` |
| `PORT` | 自動 | Zeabur 自動注入，不需手動設定 |

本機開發可複製 `.env.example` 為 `.env` 填入。

## 語音對話（OpenRouter ASR）

前端錄音（MediaRecorder）→ 後端 `/api/transcribe` →
OpenRouter `POST /api/v1/audio/transcriptions`（base64 JSON 格式）。

可在頂部 Model Bar 切換 4 個 ASR 模型（https://openrouter.ai/）：

| 模型 ID | 提供者 | 特性 |
|---------|--------|------|
| `mistralai/voxtral-mini-transcribe`（預設） | Mistral | 輕量 STT，會議/語音筆記/播客 |
| `microsoft/mai-transcribe-2` | Microsoft | 多語言 STT，FLEURS 基準領先 |
| `qwen/qwen3-asr-1.7b` | Qwen | 30 語言 + 22 種中文方言，串流/離線 |
| `nvidia/nemotron-3.5-asr-streaming-multilingual-0.6b` | NVIDIA | 低延遲串流，40+ 語言 |

三種輸入模式（單人/雙人各一組）：

- **語音輸入**：瀏覽器 Web Speech API 即時辨識（免後端，Chrome/Edge 最佳）
- **語音對話**（新）：按錄音鍵開始、再按一次送出 → ASR 模型轉文字 → 自動翻譯
- **文字輸入**：鍵盤輸入

金鑰模式：伺服器端金鑰（預設，`OPENROUTER_API_KEY`）或自訂金鑰
（自訂時 ASR 走瀏覽器直連 OpenRouter，不經後端）。

## 本機開發

```bash
npm install
cp .env.example .env   # 填入 OPENROUTER_API_KEY

# 方式 A：前後端一起（最接近 Zeabur 生產環境）
npm run build && npm start        # http://localhost:3000

# 方式 B：前端熱重載 + 後端 API
npm start &                         # 後端 :3000（含 /api/*）
npm run dev                         # 前端 :5173，/api 由 vite proxy 轉發
```

## 健康檢查

```bash
curl http://localhost:3000/api/health
# {"ok":true,"service":"kilo-voice-translator","asrModels":[...],...}
```

## Netlify（保留相容）

- `netlify.toml`、`netlify/functions/translate.js` 保持不變，可照舊部署。
- 新增 `netlify/functions/transcribe.mjs`（ASR 代理，與 `server.js` 共用 `api/_shared.js` 邏輯）。
- 前端會先試 `/api/*`，404 時自動 fallback 到 `/.netlify/functions/*`，
  因此同一份 `dist/` 在 Zeabur 與 Netlify 都能運作。
