# GLM-ASR-2512 語音識別集成指南

## 概述

本應用已成功集成智谱 AI 的 **GLM-ASR-2512** 模型，這是一個新一代語音識別模型，能夠將語音實時轉換為高質量文字。

## 功能特性

### 模型運行指標
- **字符錯誤率（CER）**: 0.0717（業界優秀水平）
- **最大音頻時長**: 30 秒
- **最大文件大小**: 25 MB
- **支持格式**: WAV、MP3
- **支持流式轉錄**

### 支持語言
- **中文**：普通話、四川話、粵語、閩南語、吳語
- **英文**：美式、英式多種口音
- **其他語言**：日文、韓文、法文、德文、西班牙文、阿拉伯文、葡萄牙文、俄文等

### 推薦應用場景
1. **實時會議紀要** - 實時轉錄線上會議
2. **客服質檢** - 高精度轉寫客服通話內容
3. **視頻直播字幕** - 為直播提供實時低延遲字幕
4. **辦公文檔輸入** - 語音快速生成文檔
5. **多語言溝通** - 支持跨語言語音理解
6. **醫療病歷錄入** - 實時識別醫學專業術語

## 使用方式

### 1. 後端處理（Netlify 函數）

#### 非流式轉錄
```javascript
// 調用 API
const formData = new FormData();
formData.append('file', audioFile); // File 或 Blob 對象
formData.append('stream', 'false');
formData.append('prompt', '可選的上下文信息');
formData.append('hotwords', JSON.stringify(['詞1', '詞2']));

const response = await fetch('/.netlify/functions/translate', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result.text); // 轉錄結果
```

#### 流式轉錄
```javascript
const formData = new FormData();
formData.append('file', audioFile);
formData.append('stream', 'true');

const response = await fetch('/.netlify/functions/translate', {
  method: 'POST',
  body: formData
});

const result = await response.json();
// 即使設置 stream=true，也會返回單個 JSON 對象
console.log(result.text);
```

### 2. 客戶端使用（推薦）

#### 使用 BigModelASRClient 類

```javascript
import { BigModelASRClient } from './src/translation/BigModelASRClient.js';

// 創建客戶端實例
const asrClient = new BigModelASRClient({
  apiEndpoint: '/.netlify/functions/translate',
  timeout: 60000 // 60 秒超時
});

// 方式 1：基本轉錄
async function basicTranscribe() {
  try {
    const audioFile = document.getElementById('audioInput').files[0];
    
    const result = await asrClient.transcribe(audioFile);
    console.log('轉錄結果:', result.text);
    console.log('模型:', result.model); // glm-asr-2512
    
  } catch (error) {
    console.error('轉錄失敗:', error);
  }
}

// 方式 2：帶上下文和熱詞的轉錄
async function advancedTranscribe() {
  try {
    const audioFile = document.getElementById('audioInput').files[0];
    
    const result = await asrClient.transcribe(audioFile, {
      prompt: '這是一個關於技術的對話', // 上下文提示
      hotwords: ['API', '機器學習', '人工智能'] // 自定義詞彙
    });
    
    console.log('轉錄結果:', result.text);
    
  } catch (error) {
    console.error('轉錄失敗:', error);
  }
}

// 方式 3：流式轉錄
async function streamTranscribe() {
  try {
    const audioFile = document.getElementById('audioInput').files[0];
    
    const fullText = await asrClient.transcribeStream(
      audioFile,
      (chunk) => {
        // 接收轉錄文本片段
        console.log('接收到:', chunk);
      },
      (completeText) => {
        // 轉錄完成
        console.log('完整文本:', completeText);
      },
      (error) => {
        // 錯誤處理
        console.error('流式轉錄錯誤:', error);
      }
    );
    
  } catch (error) {
    console.error('轉錄失敗:', error);
  }
}
```

#### 使用便利函數

```javascript
import { quickTranscribe } from './src/translation/BigModelASRClient.js';

async function quickAsr() {
  try {
    const audioFile = document.getElementById('audioInput').files[0];
    
    const text = await quickTranscribe(audioFile, {
      config: {
        apiEndpoint: '/.netlify/functions/translate',
        timeout: 60000
      }
    });
    
    console.log('轉錄結果:', text);
    
  } catch (error) {
    console.error('轉錄失敗:', error);
  }
}
```

### 3. 獲取模型信息

```javascript
const asrClient = new BigModelASRClient();

// 獲取支持的語言
const languages = asrClient.getSupportedLanguages();
console.log('支持語言:', languages);

// 獲取支持的方言（中文）
const dialects = asrClient.getSupportedDialects();
console.log('支持方言:', dialects);

// 獲取模型詳細信息
const modelInfo = asrClient.getModelInfo();
console.log('模型信息:', modelInfo);
```

## 前端集成示例

### HTML 模板
```html
<div class="asr-section">
  <h2>語音識別 (GLM-ASR-2512)</h2>
  
  <div class="input-group">
    <input 
      type="file" 
      id="audioInput" 
      accept="audio/wav,audio/mp3,audio/mpeg"
      placeholder="選擇音頻文件"
    >
    <button onclick="handleTranscribe()">轉錄</button>
  </div>
  
  <div class="options">
    <textarea 
      id="promptInput" 
      placeholder="可選：提供上下文信息以提高準確率"
      rows="3"
    ></textarea>
    
    <input 
      type="text" 
      id="hotwordsInput" 
      placeholder="可選：用逗號分隔的熱詞 (例: API,機器學習,人工智能)"
    >
  </div>
  
  <div class="output">
    <h3>轉錄結果</h3>
    <div id="result" class="result-box"></div>
    <div id="loading" class="loading" style="display:none;">處理中...</div>
  </div>
</div>
```

### JavaScript 實現
```javascript
import { BigModelASRClient } from './src/translation/BigModelASRClient.js';

const asrClient = new BigModelASRClient();

async function handleTranscribe() {
  const audioInput = document.getElementById('audioInput');
  const promptInput = document.getElementById('promptInput');
  const hotwordsInput = document.getElementById('hotwordsInput');
  const resultDiv = document.getElementById('result');
  const loadingDiv = document.getElementById('loading');
  
  if (!audioInput.files.length) {
    alert('請選擇音頻文件');
    return;
  }
  
  try {
    loadingDiv.style.display = 'block';
    resultDiv.innerHTML = '';
    
    const audioFile = audioInput.files[0];
    const options = {};
    
    if (promptInput.value) {
      options.prompt = promptInput.value;
    }
    
    if (hotwordsInput.value) {
      options.hotwords = hotwordsInput.value
        .split(',')
        .map(w => w.trim())
        .filter(w => w);
    }
    
    const result = await asrClient.transcribe(audioFile, options);
    
    resultDiv.innerHTML = `
      <div class="result-success">
        <h4>轉錄成功</h4>
        <p><strong>文本：</strong> ${result.text}</p>
        <p><strong>模型：</strong> ${result.model}</p>
        <p><strong>請求 ID：</strong> ${result.id}</p>
        <p><strong>時間戳：</strong> ${new Date(result.created * 1000).toLocaleString()}</p>
      </div>
    `;
    
  } catch (error) {
    resultDiv.innerHTML = `
      <div class="result-error">
        <h4>轉錄失敗</h4>
        <p>${error.message}</p>
      </div>
    `;
  } finally {
    loadingDiv.style.display = 'none';
  }
}
```

## 配置要求

### 環境變量
在 Netlify 中設置以下環境變量：
```
BIGMODEL_API_KEY = your_api_key_here
```

### API 金鑰格式
BigModel API 金鑰格式為：`{id}.{secret}`

### 文件結構
```
netlify/
├── functions/
│   └── translate.js          # 主函數（已更新支援 ASR）
└── package.json              # 已添加 busboy 和 form-data 依賴
```

## 錯誤處理

### 常見錯誤

| 錯誤 | 原因 | 解決方案 |
|------|------|--------|
| 不支持的音頻格式 | 上傳的音頻格式不是 WAV 或 MP3 | 轉換為支持的格式 |
| 文件過大 | 音頻文件超過 25 MB | 縮小文件大小或分割音頻 |
| 請求超時 | 音頻轉錄超過 60 秒 | 縮短音頻長度或處理時間警告 |
| 無效的 API 金鑰 | BigModel API 金鑰配置錯誤 | 檢查環境變量設置 |

### 錯誤處理最佳實踐
```javascript
try {
  const result = await asrClient.transcribe(audioFile);
} catch (error) {
  if (error.message.includes('超時')) {
    // 處理超時
    console.log('音頻轉錄超時，請縮短音頻長度');
  } else if (error.message.includes('不支持')) {
    // 處理格式錯誤
    console.log('不支持的音頻格式，請使用 WAV 或 MP3');
  } else if (error.message.includes('過大')) {
    // 處理文件過大
    console.log('文件過大，請使用小於 25MB 的文件');
  } else {
    // 其他錯誤
    console.log('轉錄失敗:', error.message);
  }
}
```

## API 端點詳情

### 請求格式
```
POST /.netlify/functions/translate
Content-Type: multipart/form-data

參數：
- file: 必需，音頻文件 (File 或 Blob)
- stream: 可選，'true' 或 'false'（默認 'false'）
- prompt: 可選，上下文信息（字符串）
- hotwords: 可選，熱詞列表（JSON 字符串）
```

### 響應格式
```json
{
  "id": "task_id",
  "created": 1234567890,
  "model": "glm-asr-2512",
  "text": "轉錄的文本內容"
}
```

## 性能優化建議

1. **使用熱詞提升準確率**
   ```javascript
   // 為特定領域添加專業術語
   const hotwords = ['SmartUI', 'API接口', '算法機制'];
   ```

2. **利用上下文提示**
   ```javascript
   // 提供之前的轉錄結果作為上下文
   const prompt = '之前的轉錄內容...';
   ```

3. **分割長音頻**
   ```javascript
   // 如果音頻超過 30 秒，分割成多個片段
   // 然後分別轉錄，最後合併結果
   ```

4. **離線預處理**
   - 先進行音頻轉格式（如需要）
   - 移除靜音段落
   - 檢查音頻質量

## 相關資源

- [GLM-ASR-2512 官方文檔](https://docs.bigmodel.cn/zh/guide/models/sound-and-video/glm-asr-2512)
- [BigModel API 參考](https://docs.bigmodel.cn/api-reference)
- [Netlify 函數文檔](https://docs.netlify.com/functions/overview/)

## 更新日誌

### v2.1.0 (2026-02-23)
- ✅ 添加 GLM-ASR-2512 語音識別支持
- ✅ 實現 BigModelASR 服務端模塊
- ✅ 實現 BigModelASRClient 客戶端模塊
- ✅ 支持流式和非流式轉錄
- ✅ 支持熱詞和上下文提示
- ✅ 添加完整的錯誤處理

## 支持與反饋

如有任何問題或反饋，請提交 Issue 或聯繫開發團隊。
