# 三步翻譯法（直譯 → 反思 → 意譯）整合說明

> 版本：v3.1.0
> 適用：Kilo 即時語音翻譯機
> 相關檔案：`src/js/prompts.js`、`src/js/pipeline.js`、`src/js/pipelineView.js`、`api/_shared.js`

---

## 1. 為什麼要改

原本的翻譯器只有一條路徑：把「請把 X 翻譯成 Y」加上幾條風格提示丟給模型，一次調用拿結果。這在語音對話場景夠用，但有兩個結構性問題：

1. **模型沒有自我檢查的機會。** 一次生成的譯文，好壞取決於取樣運氣；中式英語、名詞堆疊、被動語態過多這類問題，模型自己不會回頭修。
2. **風格提示太粗。** 「讓文句更自然流暢」等於什麼都沒說；模型只能用最安全、最模板化的方式寫，結果就是「AI 味」——句長一致、三連排比、空洞總結、行銷形容詞。

三步翻譯法把「檢查」變成流程裡的一個正式步驟，去AI味規則則把「什麼叫自然」寫成可執行的負面清單。

---

## 2. 流程設計

### 2.1 三個 pass

| Pass | 做什麼 | 關鍵約束 |
|------|--------|----------|
| **1 直譯** | 逐子句翻譯，保留原句序、句界、段落與清單結構 | 不合并、不拆分、不加原文沒有的連接詞；允許生硬 |
| **2 反思** | 以敵意編輯的視角審自己的直譯稿，逐條列出問題 | 只診斷不改寫；每行 `[類型] "片段" -> 改法`；最多 10 行；不准誇獎 |
| **3 意譯** | **從原文重譯**，套用所有反思結論 | 不是「修補直譯稿」，是重寫；長短句交錯、強動詞、術語一致 |

反思階段的檢查清單是固定的 11 項：calque（逐字直譯）、名詞堆疊、弱動詞＋抽象名詞、不必要的被動、名詞化與 of 鏈、句長單調、過渡詞腳手架、術語漂移、文化專有詞缺注、單位/貨幣/日期未本地化、AI 填充詞。

固定清單的作用是防止模型「自我審查太寬容」——讓它按項目打勾，而不是自由發揮。

### 2.2 兩次網路請求，三份產物

三個 pass 若各發一次請求，延遲與成本都是三倍。實測大部分模型在一個回覆裡同時產出「直譯＋反思」是穩定的，所以：

```
請求 A：PASS 1 + PASS 2  →  <<<LITERAL>>> ... <<<CRITIQUE>>> ...
請求 B：PASS 3           →  最終譯文
```

客戶端用標記切分（`parseDraftResponse`），容忍模型不守格式、包 code fence、只給其中一段等情況。**標記缺失時不報錯**：整段當作直譯稿，反思留空，第三步仍然能跑。

### 2.3 長文分段

`splitIntoChunks(text, maxChars=1200)` 依序嘗試：

1. 空行分段
2. 句末標點（`。！？!?；;`）
3. 硬切（極少數超長句，寧可切斷也不丟內容）

段落之間把**上一段譯文結尾 240 字**作為 `prevContext` 傳給下一段，要求「術語、語氣、指稱保持一致」。這是跨段一致性的低成本解法，不需要先抽術語表。

### 2.4 降級策略

| 失敗點 | 行為 |
|--------|------|
| 意譯請求失敗／回傳空字串 | 退回該段直譯稿，標記 `degraded`，其餘段落照常 |
| 反思標記缺失 | 反思留空，第三步自行判斷 |
| 使用者取消／超時 | 整個流程 abort，不寫入歷史 |
| 文字少於 8 個「單位」 | 即使選了三步模式也走即時路徑（「好」「OK」不值得三次调用） |

---

## 3. 去AI味規則

規則分語言維護，只作用於**表層**，明確聲明「若與原意衝突則放棄規則」。

### 英文（輸出目標為英語時）

禁用開頭／填充：`In today's fast-paced world`、`It is worth noting that`、`In conclusion`、裝飾性的 `That said`。

禁用詞（除非原文真的在講這些）：`delve`、`leverage`、`utilise`、`harness`、`unlock`、`elevate`、`empower`、`streamline`、`robust`、`seamless`、`cutting-edge`、`game-changing`、`revolutionary`、`holistic`、`testament to`。

結構禁令：

- 三連排比湊字（同一意思說三次）
- `not only ... but also` 連鎖
- `Firstly / Secondly / Thirdly / Finally` 腳手架
- 開頭主題句、結尾再複述一次的段落
- 破折號當默認連接詞（每 150 字最多一個，且不能連用）

節奏要求：**每 150 字至少出現一個 8 字以內的短句**；允許 25 字以上的長句，但必須與短句交錯。名詞連用不超過兩個。

### 中文（輸出目標為中文時）

禁用：「在當今飛速發展的時代」「值得注意的是」「不難發現」「綜上所述」「總的來說」；「賦能／助力／打造／深耕／閉環／抓手／全方位／多維度」；「不是……而是……」對舉；「首先／其次／最後」；三連排比；「進行了……的工作」式動詞名詞化。

### 日文／韓文

禁止機械式三段構成、禁止「～を実現する」式的空名詞化連續、禁止名詞鏈（`～の～の～`／`~의 ~의 ~`），要求文長有起伏。

---

## 4. 如何使用

### 4.1 介面

設定面板新增兩個控制項：

- **翻譯風格**：新增「技術」選項（主動語態、術語一致、保留程式碼識別碼、單位與貨幣雙標註、不用行銷形容詞）。
- **翻譯深度**：
  - **即時**（預設）— 單次调用，模型在內部跑完三步但只輸出結果。延遲與舊版相同。
  - **三步精譯** — 真的分兩次請求，並把直譯稿、反思、意譯三段顯示在結果下方的「三步譯稿」面板。

選擇會存進 `localStorage`（`translation_depth`、`translation_style`）。

### 4.2 API

`POST /api/translate` 新增可選欄位：

```json
{
  "text": "待譯段落",
  "sourceLang": "zh-TW",
  "targetLang": "en-US",
  "model": "minimax/minimax-m3:free",
  "style": "technical",
  "stage": "draft",
  "draft": "（rewrite 階段必填）直譯稿",
  "critique": "（rewrite 階段選填）反思清單",
  "prevContext": "上一段譯文結尾",
  "glossary": [{ "source": "灰度發布", "target": "canary rollout" }],
  "interfaceLanguage": "zh-TW"
}
```

- `stage` 省略或為 `null` → 走即時路徑（行為與舊版相容）。
- `stage: "draft"` → 回傳含 `<<<LITERAL>>>` / `<<<CRITIQUE>>>` 的原始文字。
- `stage: "rewrite"` → 必須帶 `draft`，否則回 400。
- `glossary` 最多 40 條，`prevContext` 只取尾 240 字，`draft` 上限 12000 字（皆為後端強制）。

提示詞由 `src/js/prompts.js` 統一產生，瀏覽器（自訂金鑰）與伺服器（伺服器金鑰）送出**完全相同的 messages**，不存在兩套提示詞漂移的問題。

### 4.3 程式碼

```js
import { runThreePassPipeline } from './src/js/pipeline.js';

const run = await runThreePassPipeline({
  text, sourceLang: 'zh-TW', targetLang: 'en-US',
  style: 'technical',
  callStage: async (payload) => { /* 回傳模型原始字串 */ },
  onProgress: (info) => console.log(info.phase),
});

run.finalText;      // 最終譯文
run.chunks[0];      // { source, literal, critique, final }
run.degraded;       // 是否有段落退回直譯
```

---

## 5. 方法示範（人工對照稿）

以下用本專案 `ARCHITECTURE.md` 的三段原文示範三個版本。此處為人工對照稿，用來标示品質基準；App 內的實際輸出由模型產生。

### 原文

> Kilo 即時語音翻譯機已從單一文件架構重構為模塊化架構，提升代碼的可維護性、可測試性和可擴展性。
>
> 翻譯流程：語音文本 → 輸入驗證 → 檢查緩存 → 調用翻譯 API → 緩存結果 → 顯示翻譯。優化包括 LRU 緩存機制、請求隊列管理、錯誤分類和重試、網路狀態監控。
>
> 翻譯結果使用 LRU 緩存，緩存項目 1 小時後自動過期，最多緩存 100 個翻譯結果。網路錯誤會自動重試，採用指數退避。

### Step 1 直譯

> The Kilo real-time voice translator has already been refactored from a single-file architecture into a modular architecture, improving the maintainability, testability and extensibility of the code.
>
> Translation flow: voice text → input validation → check cache → call translation API → cache result → display translation. Optimizations include LRU cache mechanism, request queue management, error classification and retry, network status monitoring.
>
> Translation results use LRU cache, cache items automatically expire after 1 hour, and at most 100 translation results are cached. Network errors will be automatically retried, using exponential backoff.

### Step 2 反思

| # | 類型 | 片段 | 問題 | 改法 |
|---|------|------|------|------|
| 1 | 弱動詞＋抽象名詞 | `improving the maintainability, testability and extensibility of the code` | 三個 `-ity` 抽象名詞堆在一起，是典型的中文「提升……性」直譯 | 改成形容詞＋動詞：`easier to maintain, test and extend` |
| 2 | 完成式冗餘 | `has already been refactored ... into` | 「已經重構為」逐字翻，英文不需要 `already` | `used to be one long file. It is now a set of modules` |
| 3 | 句子像流程圖 | `voice text → input validation → check cache → ...` | 箭頭照抄，英文讀起來像電路圖，缺主語 | 給它一個主語：`A request moves through a fixed path: ...` |
| 4 | 名詞堆疊 | `LRU cache mechanism, request queue management, error classification and retry, network status monitoring` | 四個名詞短語並列，`include` 一掛就沒動詞了 | 拆成動作：`an LRU cache, a request queue, error classification with retry, a network monitor` |
| 5 | 被動＋數字後置 | `at most 100 translation results are cached` | 被動語態，重點（100）藏在句尾 | `caps the cache at 100 entries` |
| 6 | 分詞掛尾 | `will be automatically retried, using exponential backoff` | `, using ...` 是中文「採用……」的直譯掛尾 | `retries itself with exponential backoff` |
| 7 | 句長單調 | 三段皆為「主語＋謂語＋清單」 | 節奏完全一致，讀三段像讀一段 | 第一段用兩個短句，第二段一個長句，第三段一中一短 |
| 8 | 缺連接 | 三段之間無過渡 | 段落是拼接而非文章 | 用 `Around that path sit four guards` 把流程與優化串起來 |

### Step 3 意譯

> The translator used to be one long file. It is now a set of modules, which makes the code easier to maintain, test and extend.
>
> A request moves through a fixed path: validate the input, check the cache, call the translation API, store the result, render it. Around that path sit four guards — an LRU cache, a request queue, error classification with retry, and a network monitor.
>
> The cache holds at most 100 results and drops each one an hour after it was written. When the network fails, the request retries itself with exponential backoff.

### 改進對照

| 維度 | 直譯版 | 意譯版 |
|------|--------|--------|
| 動詞 | `improving the maintainability...` | `makes the code easier to maintain` |
| 主語 | 流程圖式無主語 | `A request moves through a fixed path` |
| 資訊層級 | 四項優化平鋪 | 用 `four guards` 統攝，再逐項展開 |
| 數字 | `at most 100 ... are cached` | `holds at most 100 results` |
| 被動比例 | 約 60% | 約 15% |
| 句長 | 24 / 22 / 27 字，三段幾乎等長 | 7 / 26 / 9 / 18 字，長短交錯 |
| 段落關係 | 並列拼接 | 「流程—守衛—細節」遞進 |

---

## 6. 成本與延遲

| 模式 | 模型调用次數 | 相對延遲 | 適用 |
|------|--------------|----------|------|
| 即時 | 1 | 1× | 語音對話、逐句口譯 |
| 三步（≤1200 字） | 2 | 約 2.2× | 郵件、簡短文件、字幕稿 |
| 三步（5000 字） | 約 10（5 段 × 2） | 約 10× | 技術文件、報告 |

伺服器端超時：draft 30 秒、rewrite 45 秒；客戶端整體 180 秒。免費模型池會在同一個 stage 內自動換模型重試，但不會跨 stage 重試（避免半套譯文）。

---

## 7. 已知限制

1. **反思品質取決於模型。** 小模型容易只寫「表達可以更自然」這類廢話。清單式提問能緩解，但不能根治；建議三步模式搭配 70B 以上的模型。
2. **跨段術語只靠尾段上下文。** 沒有做全域術語抽取，超長文件（>10 段）仍可能出現術語漂移。要徹底解決需要先跑一輪術語抽取，再帶 `glossary` 進入翻譯。
3. **反思語言跟隨介面語言。** 介面是日文時反思就是日文，對只讀中文的使用者不友善；目前以「介面語言＝使用者語言」為假設。
4. **雙人模式的三步翻譯沒有視覺化面板。** 出於版面考量，只在單人模式顯示「三步譯稿」。
5. **沒有 token 計費統計。** `run.calls` 只記次數，不記 token。
