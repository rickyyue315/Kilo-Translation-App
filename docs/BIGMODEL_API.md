# BigModel API 實時翻譯功能文檔

## 概述

BigModel API（智譜 GLM）是智譜 AI 提供的人工智能翻譯服務，專注於中文理解與翻譯。本應用程式已集成 BigModel API，提供實時流式翻譯功能。

## 功能特點

- 🚀 **快速響應**：GLM-4 Flash 模型提供毫秒級響應速度
- 🎯 **高品質翻譯**：GLM-4 模型提供專業級翻譯品質
- 💰 **高性價比**：GLM-3 Turbo 模型提供超快速翻譯，成本極低
- 🌊 **流式翻譯**：即時顯示翻譯結果，無需等待完整響應
- 🇨🇳 **中文優化**：專注中文理解與翻譯，特別適合中英互譯
- 🔒 **安全可靠**：API 金鑰可選存儲在伺服器端或用戶端

## 支援的模型

### GLM-4 系列（最新一代）

#### GLM-4 Flash（推薦）
- **模型 ID**: `glm-4-flash`
- **特點**: 快速響應模型，適合實時翻譯，推薦使用
- **響應時間**: < 1秒
- **上下文窗口**: 128K tokens
- **適用場景**: 即時對話、快速翻譯需求
- **成本**: 低（輸入: ¥0.0001/千tokens，輸出: ¥0.0001/千tokens）
- **功能**: 流式翻譯、函數調用

#### GLM-4（標準）
- **模型 ID**: `glm-4`
- **特點**: 標準模型，平衡性能與成本
- **響應時間**: 1-2秒
- **上下文窗口**: 128K tokens
- **適用場景**: 日常翻譯、平衡品質和成本
- **成本**: 中等（輸入: ¥0.0005/千tokens，輸出: ¥0.0005/千tokens）
- **功能**: 流式翻譯、函數調用、視覺

#### GLM-4 Air（輕量級）
- **模型 ID**: `glm-4-air`
- **特點**: 輕量級模型，快速響應
- **響應時間**: < 1秒
- **上下文窗口**: 128K tokens
- **適用場景**: 快速翻譯、移動設備
- **成本**: 低（輸入: ¥0.00015/千tokens，輸出: ¥0.00015/千tokens）
- **功能**: 流式翻譯、函數調用

#### GLM-4 AirX（超輕量級）
- **模型 ID**: `glm-4-airx`
- **特點**: 超輕量級模型，極速響應
- **響應時間**: < 0.5秒
- **上下文窗口**: 128K tokens
- **適用場景**: 極速翻譯、大量請求
- **成本**: 極低（輸入: ¥0.0001/千tokens，輸出: ¥0.0001/千tokens）
- **功能**: 流式翻譯

#### GLM-4 Plus（增強版）
- **模型 ID**: `glm-4-plus`
- **特點**: 增強版模型，更高品質翻譯
- **響應時間**: 1-2秒
- **上下文窗口**: 128K tokens
- **適用場景**: 專業翻譯、高品質需求
- **成本**: 中等偏高（輸入: ¥0.001/千tokens，輸出: ¥0.001/千tokens）
- **功能**: 流式翻譯、函數調用、視覺

#### GLM-4 Long（長文本）
- **模型 ID**: `glm-4-long`
- **特點**: 長文本模型，支援大量輸入
- **響應時間**: 2-3秒
- **上下文窗口**: 1M tokens
- **適用場景**: 長文檔翻譯、大量文本處理
- **成本**: 中等（輸入: ¥0.0005/千tokens，輸出: ¥0.0005/千tokens）
- **功能**: 流式翻譯、長上下文

#### GLM-4V（視覺）
- **模型 ID**: `glm-4v`
- **特點**: 視覺模型，支援圖像理解
- **響應時間**: 2-3秒
- **上下文窗口**: 8K tokens
- **適用場景**: 圖像描述、多模態翻譯
- **成本**: 較高（輸入: ¥0.002/千tokens，輸出: ¥0.002/千tokens）
- **功能**: 流式翻譯、視覺

#### GLM-4 AllTools（工具）
- **模型 ID**: `glm-4-alltools`
- **特點**: 工具模型，支援多種工具調用
- **響應時間**: 1-2秒
- **上下文窗口**: 128K tokens
- **適用場景**: 複雜任務、工具調用
- **成本**: 中等（輸入: ¥0.001/千tokens，輸出: ¥0.001/千tokens）
- **功能**: 流式翻譯、函數調用、視覺、工具

### GLM-4.7 系列

#### GLM-4.7（最新）
- **模型 ID**: `glm-4.7`
- **特點**: GLM-4.7 最新版本，性能優化
- **響應時間**: 1-2秒
- **上下文窗口**: 128K tokens
- **適用場景**: 最新技術、性能優化需求
- **成本**: 中等（輸入: ¥0.0005/千tokens，輸出: ¥0.0005/千tokens）
- **功能**: 流式翻譯、函數調用、視覺

### GLM-4.6 系列

#### GLM-4.6（標準）
- **模型 ID**: `glm-4.6`
- **特點**: GLM-4.6 版本，性能平衡
- **響應時間**: 1-2秒
- **上下文窗口**: 128K tokens
- **適用場景**: 平衡性能與成本
- **成本**: 中等（輸入: ¥0.0005/千tokens，輸出: ¥0.0005/千tokens）
- **功能**: 流式翻譯、函數調用、視覺

#### GLM-4.6V（視覺）
- **模型 ID**: `glm-4.6v`
- **特點**: GLM-4.6 視覺模型
- **響應時間**: 2-3秒
- **上下文窗口**: 8K tokens
- **適用場景**: 圖像理解、多模態翻譯
- **成本**: 較高（輸入: ¥0.002/千tokens，輸出: ¥0.002/千tokens）
- **功能**: 流式翻譯、視覺

#### GLM-4.6V FlashX（視覺快速）
- **模型 ID**: `glm-4.6v-flashx`
- **特點**: GLM-4.6V FlashX 視覺快速模型
- **響應時間**: 1-2秒
- **上下文窗口**: 8K tokens
- **適用場景**: 快速圖像理解、視覺翻譯
- **成本**: 中等（輸入: ¥0.001/千tokens，輸出: ¥0.001/千tokens）
- **功能**: 流式翻譯、視覺

### GLM-4.5 系列

#### GLM-4.5（輕量級）
- **模型 ID**: `glm-4.5`
- **特點**: GLM-4.5 輕量級版本
- **響應時間**: < 1秒
- **上下文窗口**: 128K tokens
- **適用場景**: 快速翻譯、輕量級應用
- **成本**: 低（輸入: ¥0.0002/千tokens，輸出: ¥0.0002/千tokens）
- **功能**: 流式翻譯、函數調用

#### GLM-4.5 Air（超輕量級）
- **模型 ID**: `glm-4.5-air`
- **特點**: GLM-4.5 Air 超輕量級版本
- **響應時間**: < 0.5秒
- **上下文窗口**: 128K tokens
- **適用場景**: 極速翻譯、大量請求
- **成本**: 極低（輸入: ¥0.00015/千tokens，輸出: ¥0.00015/千tokens）
- **功能**: 流式翻譯

#### GLM-4.5 Flash（快速）
- **模型 ID**: `glm-4.5-flash`
- **特點**: GLM-4.5 Flash 快速響應版本
- **響應時間**: < 1秒
- **上下文窗口**: 128K tokens
- **適用場景**: 即時對話、快速翻譯需求
- **成本**: 極低（輸入: ¥0.0001/千tokens，輸出: ¥0.0001/千tokens）
- **功能**: 流式翻譯、函數調用

#### GLM-4.5 FlashX（超快速）
- **模型 ID**: `glm-4.5-flashx`
- **特點**: GLM-4.5 FlashX 極速響應版本
- **響應時間**: < 0.5秒
- **上下文窗口**: 128K tokens
- **適用場景**: 極速翻譯、大量請求
- **成本**: 極低（輸入: ¥0.0001/千tokens，輸出: ¥0.0001/千tokens）
- **功能**: 流式翻譯

#### GLM-4.5V（視覺）
- **模型 ID**: `glm-4.5v`
- **特點**: GLM-4.5 視覺模型
- **響應時間**: 2-3秒
- **上下文窗口**: 8K tokens
- **適用場景**: 圖像理解、多模態翻譯
- **成本**: 較高（輸入: ¥0.002/千tokens，輸出: ¥0.002/千tokens）
- **功能**: 流式翻譯、視覺

#### GLM-4.5V FlashX（視覺快速）
- **模型 ID**: `glm-4.5v-flashx`
- **特點**: GLM-4.5V FlashX 視覺快速模型
- **響應時間**: 1-2秒
- **上下文窗口**: 8K tokens
- **適用場景**: 快速圖像理解、視覺翻譯
- **成本**: 中等（輸入: ¥0.001/千tokens，輸出: ¥0.001/千tokens）
- **功能**: 流式翻譯、視覺

### GLM-3 系列

#### GLM-3 Turbo（快速）
- **模型 ID**: `glm-3-turbo`
- **特點**: 超快速模型，適合即時翻譯
- **響應時間**: < 0.5秒
- **上下文窗口**: 8K tokens
- **適用場景**: 大量翻譯、即時通訊
- **成本**: 極低（輸入: ¥0.00005/千tokens，輸出: ¥0.00005/千tokens）
- **功能**: 流式翻譯

#### GLM-3 Turbo (0129)（特定版本）
- **模型 ID**: `glm-3-turbo-0129`
- **特點**: GLM-3 Turbo 特定版本
- **響應時間**: < 0.5秒
- **上下文窗口**: 8K tokens
- **適用場景**: 特定版本兼容性
- **成本**: 極低（輸入: ¥0.00005/千tokens，輸出: ¥0.00005/千tokens）
- **功能**: 流式翻譯

### 特定版本

#### GLM-4 (0520)（特定版本）
- **模型 ID**: `glm-4-0520`
- **特點**: GLM-4 特定版本
- **響應時間**: 1-2秒
- **上下文窗口**: 128K tokens
- **適用場景**: 特定版本兼容性
- **成本**: 中等（輸入: ¥0.0005/千tokens，輸出: ¥0.0005/千tokens）
- **功能**: 流式翻譯、函數調用、視覺

## API 端點

```
https://open.bigmodel.cn/api/paas/v4/chat/completions
```

## 請求格式

### 標準請求

```javascript
const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'glm-4-flash',
    messages: [
      {
        role: 'system',
        content: '你是一個專業的翻譯助手。請將中文準確翻譯成英文。'
      },
      {
        role: 'user',
        content: '你好，世界！'
      }
    ],
    temperature: 0.3,
    max_tokens: 2000
  })
});
```

### 流式請求（推薦）

```javascript
const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'glm-4-flash',
    messages: [
      {
        role: 'system',
        content: '你是一個專業的翻譯助手。請將中文準確翻譯成英文。'
      },
      {
        role: 'user',
        content: '你好，世界！'
      }
    ],
    stream: true,
    temperature: 0.3,
    max_tokens: 2000
  })
});

// 處理流式響應
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  // 解析 SSE 格式數據
  // data: {"choices":[{"delta":{"content":"翻譯內容"}}]
}
```

## 響應格式

### 標準響應

```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "Hello, world!"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 10,
    "total_tokens": 30
  },
  "model": "glm-4-flash"
}
```

### 流式響應（SSE 格式）

```
data: {"choices":[{"delta":{"content":"Hello"},"finish_reason":null}]}

data: {"choices":[{"delta":{"content":","},"finish_reason":null}]}

data: {"choices":[{"delta":{"content":" world"},"finish_reason":null}]}

data: {"choices":[{"delta":{"content":"!"},"finish_reason":null}]}

data: {"choices":[{"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

## 系統提示詞

BigModel API 使用專業的翻譯系統提示詞，確保翻譯品質：

```javascript
function getTranslationSystemPrompt(sourceLang, targetLang) {
  const sourceLanguage = LANGUAGE_NAMES[sourceLang] || sourceLang;
  const targetLanguage = LANGUAGE_NAMES[targetLang] || targetLang;
  
  return `你是一個專業的翻譯助手。請將${sourceLanguage}準確翻譯成${targetLanguage}。
重要規則：
1. 必須將整段內容翻譯成目標語言：${targetLanguage}
2. 保持原文的語氣和含義
3. 只返回翻譯結果，不要添加任何解釋或額外內容
4. 專有名詞、品牌名稱、人名、地名等應根據目標語言的慣例處理
5. 輸入可能包含混合語言（中英文夾雜或其他語言），請智能識別並正確翻譯
特定語言翻譯規則：
- 翻譯成日文時：請確保輸出的是正確的日文（平假名、片假名、漢字），不要翻譯成中文（簡體或繁體）
- 翻譯成韓文時：請確保輸出的是正確的韓文，不要翻譯成中文或日文
- 翻譯成繁體中文時：請確保輸出的是繁體中文，不要翻譯成簡體中文
- 翻譯成簡體中文時：請確保輸出的是簡體中文，不要翻譯成繁體中文
- 翻譯成法文時：請確保輸出的是正確的法文，包含正確的變音符號
- 翻譯成西班牙文時：請確保輸出的是正確的西班牙文，包含正確的重音符號
- 翻譯成英文時：請確保輸出的是正確的英文，不要翻譯成其他語言`;
}
```

## 錯誤處理

### 錯誤代碼

| 錯誤代碼 | 說明 | 解決方案 |
|---------|------|---------|
| `invalid_api_key` | API 金鑰無效 | 檢查 API 金鑰格式，確保正確輸入 |
| `rate_limit_exceeded` | 請求過於頻繁 | 等待片刻後重試，或升級 API 套餐 |
| `quota_exceeded` | API 配額已用完 | 檢查賬戶餘額，充值後重試 |
| `invalid_request` | 請求格式錯誤 | 檢查請求參數格式 |
| `server_error` | 伺服器錯誤 | 稍後重試，或聯繫客服 |
| `network_error` | 網路連線錯誤 | 檢查網路連線 |

### 錯誤響應示例

```json
{
  "error": {
    "code": "invalid_api_key",
    "message": "Invalid API key",
    "type": "authentication_error"
  }
}
```

## API 金鑰管理

### 獲取 API 金鑰

1. 前往 [智譜 AI 開放平台](https://open.bigmodel.cn/)
2. 註冊帳號並登入
3. 在控制台中獲取 API 金鑰
4. API 金鑰格式：`{id}.{secret}`

### JWT 認證機制

**重要**：BigModel API 使用 JWT (JSON Web Token) 認證，而不是簡單的 Bearer token。

#### JWT Token 生成

BigModel API Key 格式：`id.secret`
- `id`：API Key ID
- `secret`：API Key 密鑰

#### JWT Payload 結構

```json
{
  "api_key": "your_api_key_id",
  "exp": 1705468800000,
  "timestamp": 1705465200000
}
```

#### JWT 生成步驟

1. 將 API Key 分解為 id 和 secret
2. 創建 JWT payload，包含：
   - `api_key`: id
   - `exp`: 過期時間戳（建議設置為當前時間 + 1 小時）
   - `timestamp`: 當前時間戳
3. 使用 HS256 算法和 secret 對 payload 進行簽名
4. 生成 JWT token

#### JWT 生成示例（Node.js）

```javascript
const jwt = require('jsonwebtoken');

function generateBigModelJWT(apiKey) {
  const [id, secret] = apiKey.split('.');
  
  if (!id || !secret) {
    throw new Error('Invalid API Key format. Expected format: id.secret');
  }
  
  const now = Date.now();
  const payload = {
    api_key: id,
    exp: now + 3600000, // 1 小時後過期
    timestamp: now
  };
  
  return jwt.sign(payload, secret, {
    algorithm: 'HS256'
  });
}

// 使用示例
const apiKey = 'your_api_key_id.your_api_key_secret';
const jwtToken = generateBigModelJWT(apiKey);

// 在請求中使用
const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwtToken}`  // 使用生成的 JWT token
  },
  body: JSON.stringify({
    model: 'glm-4-flash',
    messages: [...]
  })
});
```

#### JWT Token 過期處理

- JWT token 有效期為 1 小時
- 當 token 過期時，API 會返回 401 錯誤
- 需要重新生成 token 並重試請求

#### 錯誤處理示例

```javascript
async function callBigModelAPI(apiKey, requestData) {
  try {
    const jwtToken = generateBigModelJWT(apiKey);
    
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        // Token 過期，重新生成並重試
        const newJwtToken = generateBigModelJWT(apiKey);
        // 重試請求...
      }
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('BigModel API error:', error);
    throw error;
  }
}
```

### API 金鑰格式驗證

```javascript
function validateBigModelApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }
  const parts = apiKey.split('.');
  return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
}
```

## 使用方式

### 在應用程式中使用

1. **選擇翻譯服務**
   - 在應用程式中選擇「BigModel API」作為翻譯服務
   - 系統會自動顯示 BigModel 模型選項

2. **選擇模型**
   - 根據需求選擇合適的模型：
     - `glm-4-flash`：快速響應（推薦）
     - `glm-4`：高品質翻譯
     - `glm-3-turbo`：超快速翻譯

3. **輸入 API 金鑰**（可選）
   - 如果使用伺服器端 API 金鑰，無需輸入
   - 如果使用用戶端 API 金鑰，輸入您的 BigModel API 金鑰

4. **開始翻譯**
   - 選擇來源語言和目標語言
   - 使用語音或文字輸入
   - 系統會即時顯示翻譯結果

## 模型選擇建議

### 根據場景選擇

| 場景 | 推薦模型 | 原因 |
|------|---------|------|
| 即時對話 | `glm-4-flash` 或 `glm-4.5-flash` | 快速響應，品質良好 |
| 專業翻譯 | `glm-4` 或 `glm-4.7` | 高品質翻譯，準確度高 |
| 大量翻譯 | `glm-3-turbo` 或 `glm-4.5-flashx` | 超快速，成本極低 |
| 中英互譯 | `glm-4-flash`、`glm-4.5-flash` 或 `glm-4` | 中文優化，效果最佳 |
| 多語言翻譯 | `glm-4` 或 `glm-4.7` | 支援多語言，品質穩定 |
| 圖像翻譯 | `glm-4v`、`glm-4.5v` 或 `glm-4.6v` | 視覺模型，支援圖像理解 |

### 根據預算選擇

| 預算 | 推薦模型 | 成本 |
|------|---------|------|
| 極低預算 | `glm-3-turbo` 或 `glm-4.5-flashx` | 極低 |
| 低預算 | `glm-4-flash`、`glm-4.5-flash` 或 `glm-4.5-air` | 低 |
| 中等預算 | `glm-4`、`glm-4.5` 或 `glm-4.6` | 中等 |
| 高預算 | `glm-4-plus` 或 `glm-4.7` | 中等偏高 |

### GLM-4.5 系列模型對比

| 模型 | 響應速度 | 成本 | 適用場景 |
|------|---------|------|---------|
| `glm-4.5` | 快 | 低 | 輕量級翻譯 |
| `glm-4.5-air` | 極快 | 極低 | 極速翻譯、大量請求 |
| `glm-4.5-flash` | 快 | 極低 | 即時對話、快速翻譯需求 |
| `glm-4.5-flashx` | 極快 | 極低 | 極速翻譯、大量請求 |
| `glm-4.5v` | 中等 | 較高 | 圖像理解、多模態翻譯 |
| `glm-4.5v-flashx` | 快 | 中等 | 快速圖像理解、視覺翻譯 |

### GLM-4.6 系列模型對比

| 模型 | 響應速度 | 成本 | 適用場景 |
|------|---------|------|---------|
| `glm-4.6` | 中等 | 中等 | 平衡性能與成本 |
| `glm-4.6v` | 中等 | 較高 | 圖像理解、多模態翻譯 |
| `glm-4.6v-flashx` | 快 | 中等 | 快速圖像理解、視覺翻譯 |

### GLM-4.7 模型特點

| 特點 | 說明 |
|------|------|
| 最新版本 | GLM-4.7 是最新的 GLM 模型，性能優化 |
| 平衡性能 | 在品質、速度和成本之間取得最佳平衡 |
| 推薦使用 | 適合大多數翻譯場景 |

## 與 OpenRouter API 的對比

| 特性 | BigModel API | OpenRouter API |
|------|-------------|----------------|
| 中文翻譯 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 響應速度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 模型選擇 | 3 個專用模型 | 100+ 模型 |
| 成本 | 低 | 中等 |
| 多語言支援 | 6 種語言 | 100+ 種語言 |
| 流式翻譯 | ✅ | ✅ |
| 伺服器端金鑰 | ✅ | ✅ |

## 技術實現

### 模塊結構

```
src/
├── translation/
│   ├── BigModelTranslator.js    # BigModel 翻譯器
│   └── TranslationService.js    # 統一翻譯服務接口
├── constants.js                  # BigModel 常量定義
└── config.js                     # BigModel 配置
```

### 核心類

#### BigModelTranslator

```javascript
import { BIGMODEL_CONFIG, TRANSLATION_SYSTEM_PROMPT } from '../constants.js';

export class BigModelTranslator {
  constructor(config = {}) {
    this.apiKey = config.apiKey || '';
    this.apiUrl = config.apiUrl || BIGMODEL_CONFIG.API_URL;
    this.model = config.model || BIGMODEL_CONFIG.DEFAULT_MODEL;
    this.temperature = config.temperature || 0.3;
    this.maxTokens = config.maxTokens || 2000;
    this.timeout = config.timeout || 30000;
  }

  async translateStream(text, sourceLang, targetLang, onChunk, onComplete, onError) {
    // 流式翻譯實現
  }

  async translate(text, sourceLang, targetLang) {
    // 標準翻譯實現
  }

  static validateApiKey(apiKey) {
    // API 金鑰驗證
  }

  async testConnection() {
    // 連接測試
  }
}
```

#### TranslationService

```javascript
import { BigModelTranslator } from './BigModelTranslator.js';
import { TRANSLATION_SERVICES } from '../constants.js';

export class TranslationService {
  constructor(config = {}) {
    this.currentService = config.service || TRANSLATION_SERVICES.OPENROUTER;
    this.bigModelTranslator = null;
    this.openRouterTranslator = null;
    this.eventListeners = new Map();
  }

  init(service, config = {}) {
    // 初始化翻譯服務
  }

  async translateStream(text, sourceLang, targetLang, onChunk, onComplete, onError) {
    // 統一流式翻譯接口
  }

  switchService(serviceType, config = {}) {
    // 切換翻譯服務
  }
}
```

## 最佳實踐

### 1. 使用流式翻譯

流式翻譯可以即時顯示翻譯結果，提升用戶體驗：

```javascript
await translationService.translateStream(
  text,
  sourceLang,
  targetLang,
  (chunk) => {
    // 處理每個翻譯片段
    console.log('翻譯片段:', chunk);
  },
  (fullText) => {
    // 翻譯完成
    console.log('完整翻譯:', fullText);
  },
  (error) => {
    // 錯誤處理
    console.error('翻譯錯誤:', error);
  }
);
```

### 2. 選擇合適的模型

根據場景選擇合適的模型：

```javascript
// 即時對話
translator.model = 'glm-4-flash';

// 專業翻譯
translator.model = 'glm-4';

// 大量翻譯
translator.model = 'glm-3-turbo';
```

### 3. 錯誤處理

實現完善的錯誤處理機制：

```javascript
try {
  const result = await translator.translate(text, sourceLang, targetLang);
} catch (error) {
  if (error.code === 'rate_limit_exceeded') {
    // 處理頻率限制
    await delay(1000);
    // 重試
  } else if (error.code === 'quota_exceeded') {
    // 處理配額用完
    showUpgradePrompt();
  } else {
    // 其他錯誤
    showError(error.message);
  }
}
```

### 4. API 金鑰安全

- 不要在前端代碼中硬編碼 API 金鑰
- 使用伺服器端 API 金鑰模式（推薦）
- 如果使用用戶端 API 金鑰，僅存儲在瀏覽器本地
- 定期更換 API 金鑰

### 5. 性能優化

- 使用流式翻譯減少等待時間
- 快取翻譯結果避免重複請求
- 根據網路狀況調整超時時間
- 使用合適的模型平衡品質和速度

## 故障排除

### 常見問題

#### 1. 翻譯結果不準確

**可能原因**：
- 模型選擇不當
- 系統提示詞不夠明確

**解決方案**：
- 切換到更高品質的模型（如 `glm-4`）
- 檢查系統提示詞是否正確

#### 2. 響應速度慢

**可能原因**：
- 網路連線不佳
- 模型響應慢

**解決方案**：
- 檢查網路連線
- 切換到更快的模型（如 `glm-3-turbo`）

#### 3. API 金鑰無效

**可能原因**：
- API 金鑰格式錯誤
- API 金鑰已過期

**解決方案**：
- 檢查 API 金鑰格式（`{id}.{secret}`）
- 重新獲取 API 金鑰

#### 4. 流式翻譯中斷

**可能原因**：
- 網路連線中斷
- API 超時

**解決方案**：
- 檢查網路連線
- 增加超時時間
- 實現自動重試機制

## 參考資料

- [智譜 AI 官方文檔](https://docs.bigmodel.cn/cn/guide/agents/translation)
- [智譜 AI 開放平台](https://open.bigmodel.cn/)
- [GLM-4 模型介紹](https://open.bigmodel.cn/dev/api#glm-4)
- [API 定價](https://open.bigmodel.cn/pricing)

## 更新日誌

### v2.2.0 (2025-01-17)
- 🔧 修復 BigModel API 認證方式，使用 JWT token 代替 Bearer token
- ✨ 新增 JWT 生成函數和相關文檔
- 📝 更新 API 金鑰管理章節，添加 JWT 認證說明
- 📝 添加 JWT token 過期處理和錯誤處理示例

### v2.1.0 (2025-01-17)
- ✨ 新增 GLM-4.7、GLM-4.6、GLM-4.6V、GLM-4.6V FlashX 模型
- ✨ 新增 GLM-4.5、GLM-4.5 Air、GLM-4.5 Flash、GLM-4.5 FlashX 模型
- ✨ 新增 GLM-4.5V、GLM-4.5V FlashX 模型
- 📝 更新文檔，添加完整模型對比表格

### v2.0.0 (2025-01-16)
- ✨ 新增 BigModel API 支援
- ✨ 新增 GLM-4 Flash、GLM-4、GLM-3 Turbo 模型
- ✨ 新增流式翻譯功能
- ✨ 新增翻譯服務切換功能
- 📝 更新文檔

---

**BigModel API 實時翻譯功能** - 讓翻譯更快、更準、更智能 🚀
