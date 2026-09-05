# Kilo 即時語音翻譯機 - 模塊化架構說明

## 📋 目錄

1. [概述](#概述)
2. [架構原則](#架構原則)
3. [模塊結構](#模塊結構)
4. [技術棧](#技術棧)
5. [模塊詳解](#模塊詳解)
6. [數據流](#數據流)
7. [安全架構](#安全架構)
8. [性能優化](#性能優化)
9. [遷移策略](#遷移策略)

---

## 概述

Kilo 即時語音翻譯機已從單一文件架構重構為模塊化架構，提升代碼的可維護性、可測試性和可擴展性。

### 主要目標

- ✅ **模塊化** - 將單一大文件拆分為多個專用模塊
- ✅ **統一導入** - 通過統一的導入文件管理所有模塊
- ✅ **配置管理** - 集中管理應用配置
- ✅ **類型安全** - 使用 JSDoc 提供類型提示
- ✅ **錯誤處理** - 統一的錯誤分類和處理機制
- ✅ **性能優化** - 緩存、防抖、節流等優化
- ✅ **安全增強** - 加密存儲、輸入驗證、XSS 防護

---

## 架構原則

### 1. 單一職責原則

每個模塊應該：
- **專注單一職責** - 每個模塊只負責一個特定功能
- **清晰的接口** - 提供清晰的公共 API
- **獨立性** - 模塊之間的依賴應該最小化
- **可測試性** - 易於編寫單元測試
- **可維護性** - 易於理解和修改

### 2. 依賴管理原則

- **避免循環依賴** - 模塊之間不應該有循環依賴
- **明確依賴** - 所有依賴應該在模塊頂部明確聲明
- **鬆耦合** - 使用接口和事件機制降低耦合度
- **依賴注入** - 通過構造函數或依賴注入模式

### 3. 命名規範

- **描述性命名** - 使用有意義的變數和函數名稱
- **避免縮寫** - 除非是廣泛認可的縮寫
- **常量使用大寫** - 常量使用 `UPPER_CASE`
- **類名使用 PascalCase** - 類名使用 `PascalCase`
- **函數名使用 camelCase** - 函數名使用 `camelCase`
- **私有成員使用 `_` 前綴** - 私有成員使用下劃線開頭

### 4. 錯誤處理原則

- **快速失敗** - 錯誤應該快速失敗並記錄
- **統一錯誤處理** - 使用統一的錯誤分類和處理機制
- **用戶友好** - 提供清晰的錯誤訊息和解決方案
- **日誌記錄** - 所有錯誤都應該被記錄
- **不暴露敏感信息** - 錯誤日誌中不應該包含敏感信息

### 5. 性能優化原則

- **懶加載** - 按需加載資源和模塊
- **緩存策略** - 使用 LRU 緩存減少重複計算
- **防抖和節流** - 對頻繁的事件進行防抖和節流
- **資源管理** - 及時清理不再使用的資源
- **避免阻塞主線程** - 使用 Web Workers 處理繁重任務

---

## 模塊結構

```
src/
├── index.js                    # 統一導入文件
├── config.js                   # 應用配置
├── constants.js                # 常量和枚舉
├── utils.js                    # 工具函數
├── storage/
│   └── SecureStorage.js        # 安全存儲
├── validation/
│   └── InputValidator.js      # 輸入驗證
├── cache/
│   └── TranslationCache.js   # 翻譯緩存
├── error/
│   └── ErrorClassifier.js     # 錯誤分類
├── speech/
│   ├── VoiceActivityDetector.js    # 語音活動檢測
│   ├── AudioPreprocessor.js        # 音頻預處理
│   └── SpeechRetryHandler.js      # 語音重試處理
├── network/
│   ├── RequestQueue.js            # 請求隊列管理
│   └── NetworkMonitor.js          # 網路監控
└── performance/
    ├── LazyLoader.js              # 懶加載
    ├── ResourceManager.js          # 資源管理
    ├── VirtualScroll.js           # 虛擬滾動
    └── WorkerManager.js           # Web Worker 管理
```

---

## 技術棧

### 前端技術

- **HTML5** - 語義化標記
- **CSS3** - 響應式設計和動畫
- **Vanilla JavaScript (ES6+)** - 原生 JavaScript，無框架依賴
- **Web Speech API** - 語音辨識和合成
- **Web Workers** - 後台處理繁重任務
- **Service Workers** - 離線支持和緩存
- **LocalStorage** - 本地數據存儲
- **IndexedDB** - 大型數據存儲（未來擴展）

### 後端技術

- **Netlify Functions** - Serverless 後端
- **Node.js** - 後端運行時
- **OpenRouter API** - AI 翻譯服務

### 開發工具

- **ESLint** - 代碼質量檢查
- **Prettier** - 代碼格式化
- **Jest** - 單元測試框架（未來）
- **Git** - 版本控制

---

## 模塊詳解

### 1. index.js - 統一導入

**職責**: 統一管理所有模塊的導入和初始化

**主要功能**:
- 導出所有模塊的公共接口
- 提供模塊初始化函數
- 檢查瀏覽器兼容性
- 提供應用信息查詢
- 日誌應用啟動信息

**主要導出**:
```javascript
export {
  // 配置
  config,
  default as defaultConfig,
  
  // 常量
  LANGUAGES,
  ERROR_CODES,
  ERROR_MESSAGES,
  STORAGE_KEYS,
  // ... 其他常量
  
  // 工具函數
  debounce,
  throttle,
  generateId,
  // ... 其他工具函數
  
  // 存儲
  SecureStorage,
  getSecureStorage,
  // ... 其他存儲相關
  
  // 驗證
  InputValidator,
  // ... 其他驗證相關
  
  // 緩存
  TranslationCache,
  getTranslationCache,
  // ... 其他緩存相關
  
  // 錯誤處理
  ErrorClassifier,
  getErrorClassifier,
  // ... 其他錯誤處理相關
  
  // 版本和環境
  VERSION,
  BUILD_DATE,
  ENV,
  BROWSER_SUPPORT,
  DEFAULT_INSTANCES,
  
  // 輔助函數
  checkBrowserCompatibility,
  initializeModules,
  getAppInfo,
  logAppInfo,
  exportAllModules
};
```

**使用示例**:
```javascript
import { 
  initializeModules, 
  getAppInfo,
  BROWSER_SUPPORT 
} from './src/index.js';

// 初始化所有模塊
const { success, instances } = await initializeModules();

if (success) {
  const appInfo = getAppInfo();
  console.log('應用信息:', appInfo);
  
  // 檢查瀏覽器兼容性
  if (!BROWSER_SUPPORT.speechRecognition) {
    console.error('瀏覽器不支援語音辨識');
  }
  
  // 使用模塊實例
  const { secureStorage, cache, errorClassifier } = instances;
  
  // 存儲敏感數據
  secureStorage.set('api_key', apiKey);
  
  // 使用緩存
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  // 分類錯誤
  const errorInfo = errorClassifier.classify(error);
  if (errorInfo.retryable) {
    // 重試邏輯
  }
}
```

### 2. config.js - 應用配置

**職責**: 集中管理應用配置參數

**主要配置**:
```javascript
{
  api: {
    baseUrl: 'https://openrouter.ai/api/v1',
    timeout: 35000,
    maxRetries: 3,
    retryDelay: 1000,
    maxConcurrent: 3
  },
  speech: {
    continuous: true,
    interimResults: true,
    maxAlternatives: 3,
    silenceThreshold: 0.02,
    silenceDuration: 1000
  },
  cache: {
    maxSize: 100,
    ttl: 3600000,  // 1小時
    enabled: true
  },
  ui: {
    animationDuration: 300,
    debounceDelay: 300,
    throttleDelay: 50,
    skeletonDelay: 200
  },
  storage: {
    prefix: 'kilo_',
    securePrefix: 'kilo_secure_'
  },
  rateLimit: {
    maxRequests: 10,
    windowMs: 60000  // 每分鐘最多 10 次請求
  }
}
```

**使用示例**:
```javascript
import { config } from './src/config.js';

// 使用 API 配置
const timeout = config.api.timeout;

// 使用語音配置
const silenceThreshold = config.speech.silenceThreshold;

// 使用緩存配置
const cacheSize = config.cache.maxSize;
```

### 3. constants.js - 常量和枚舉

**職責**: 統一定義所有常量、枚舉和配置值

**主要常量**:
- `LANGUAGES` - 支援的語言映射
- `ERROR_CODES` - 錯誤代碼枚舉
- `ERROR_MESSAGES` - 多語言錯誤訊息
- `STORAGE_KEYS` - 存儲鍵名常量
- `API_KEY_SOURCES` - API 金鑰來源枚舉
- `TRANSLATION_MODES` - 翻譯模式枚舉
- `TRANSLATION_MODE_TYPES` - 翻譯模式類型枚舉
- `INPUT_MODES` - 輸入模式枚舉
- `THEMES` - 主題選項枚舉
- `FREE_MODELS` - 免費模型列表
- `MODEL_CATEGORIES` - 模型分類枚舉
- `EVENTS` - 事件名稱常量
- `SHORTCUTS` - 快捷鍵常量
- `EMOTION_KEYWORDS` - 情感關鍵詞
- `EXPORT_FORMATS` - 導出格式枚舉
- `MIME_TYPES` - MIME 類型常量
- `STATUS` - 狀態枚舉
- `LOG_LEVELS` - 日誌級別枚舉
- `CSP_POLICY` - 內容安全策略
- `DANGEROUS_PATTERNS` - 危險模式（用於輸入驗證）

**使用示例**:
```javascript
import { 
  LANGUAGES, 
  ERROR_CODES, 
  STORAGE_KEYS 
} from './src/constants.js';

// 使用語言常量
const languageName = LANGUAGES['zh-TW'];

// 使用錯誤代碼
if (error.code === ERROR_CODES.NETWORK) {
  // 處理網路錯誤
}

// 使用存儲鍵
const apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
```

### 4. utils.js - 工具函數

**職責**: 提供通用的工具函數

**主要函數**:
- `debounce(func, wait)` - 防抖函數
- `throttle(func, limit)` - 節流函數
- `generateId()` - 生成唯一 ID
- `formatDate(date, locale)` - 格式化日期
- `sanitizeHTML(str)` - 淨化 HTML（防 XSS）
- `escapeRegExp(string)` - 轉義正則表達式
- `deepClone(obj)` - 深度克隆對象
- `isEmpty(obj)` - 檢查是否為空
- `merge(target, ...sources)` - 合併對象
- `delay(ms)` - 延遲執行
- `requestIdleCallback(callback, options)` - 請求空閒回調
- `cancelIdleCallback(id)` - 取消空閒回調
- `hashString(str)` - 計算字符串哈希
- `truncate(str, maxLength, suffix)` - 截斷字符串
- `formatFileSize(bytes)` - 格式化文件大小
- `isMobileDevice()` - 檢查是否為移動設備
- `isIOSDevice()` - 檢查是否為 iOS 設備
- `isSafariBrowser()` - 檢查是否為 Safari 瀏覽器
- `getBrowserInfo()` - 獲取瀏覽器信息
- `copyToClipboard(text)` - 複製到剪貼板
- `downloadFile(content, filename, mimeType)` - 下載文件
- `parseQueryString(url)` - 解析 URL 查詢參數
- `buildQueryString(params)` - 構建 URL 查詢參數
- `setLocalStorage(key, value)` - 設置本地存儲
- `getLocalStorage(key, defaultValue)` - 獲取本地存儲
- `removeLocalStorage(key)` - 移除本地存儲
- `clearLocalStorage()` - 清除本地存儲
- `isLocalStorageSupported()` - 檢查本地存儲支持
- `isSessionStorageSupported()` - 檢查會話存儲支持

**使用示例**:
```javascript
import { 
  debounce, 
  throttle, 
  generateId, 
  formatDate 
} from './src/utils.js';

// 防抖使用
const debouncedSearch = debounce((query) => {
  console.log('搜索:', query);
}, 300);

// 節流使用
const throttledScroll = throttle(() => {
  console.log('滾動更新');
}, 50);

// 生成 ID
const id = generateId();
console.log('生成的 ID:', id);

// 格式化日期
const dateStr = formatDate(new Date(), 'zh-TW');
console.log('格式化日期:', dateStr);

// 淨化 HTML（防止 XSS）
const safeHTML = sanitizeHTML(userInput);
console.log('淨化後的 HTML:', safeHTML);
```

### 5. storage/SecureStorage.js - 安全存儲

**職責**: 提供加密的本地存儲功能

**主要類**:
- `SecureStorage` - 安全存儲類
  - `constructor()` - 構造函數
  - `generateKey()` - 生成用戶特定的加密密鑰
  - `encrypt(text)` - 加密數據
  - `decrypt(encrypted)` - 解密數據
  - `set(key, value)` - 存儲數據
  - `get(key, defaultValue)` - 獲取數據
  - `remove(key)` - 移除數據
  - `clear()` - 清除所有數據
  - `has(key)` - 檢查鍵是否存在
  - `keys()` - 獲取所有鍵
  - `getSize()` - 獲取存儲大小

**主要功能**:
- 使用用戶特定的密鑰加密存儲
- 保護敏感數據（如 API 金鑰）
- 防止未授權訪問
- 提供存儲統計功能

**使用示例**:
```javascript
import { getSecureStorage } from './src/storage/SecureStorage.js';

// 獲取實例
const storage = getSecureStorage();

// 存儲 API 金鑰
storage.set('api_key', 'sk-or-v1-xxx-xxx');

// 獲取 API 金鑰
const apiKey = storage.get('api_key');

// 檢查鍵是否存在
if (storage.has('api_key')) {
  console.log('API 金鑰已存儲');
}

// 獲取存儲大小
const size = storage.getSize();
console.log('存儲大小:', size, '字節');

// 清除所有數據
storage.clear();
```

### 6. validation/InputValidator.js - 輸入驗證

**職責**: 提供各種輸入驗證功能，防止 XSS 和注入攻擊

**主要方法**:
- `sanitize(input)` - 淨化 HTML（防止 XSS）
- `validateApiKey(apiKey)` - 驗證 API 金鑰
- `validateText(text, options)` - 驗證翻譯文本
- `validateLanguage(langCode)` - 驗證語言代碼
- `validateModel(modelId, allowCustom)` - 驗證 AI 模型 ID
- `validateURL(url)` - 驗證 URL
- `validateEmail(email)` - 驗證電子郵件
- `validatePhone(phone)` - 驗證電話號碼
- `validateNumber(value, options)` - 驗證數字
- `validateDate(date)` - 驗證日期
- `validateFileType(file, allowedTypes)` - 驗證文件類型
- `validateFileSize(file, maxSize)` - 驗證文件大小
- `validateSchema(data, schema)` - 批量驗證
- `cleanInput(input, options)` - 清理和標準化輸入
- `validateJSON(jsonString)` - 驗證 JSON 格式
- `validateUsername(username)` - 驗證用戶名
- `validatePassword(password)` - 驗證密碼強度

**使用示例**:
```javascript
import { InputValidator } from './src/validation/InputValidator.js';

// 驗證 API 金鑰
const { valid, error } = InputValidator.validateApiKey('sk-or-v1-xxx-xxx');
if (!valid) {
  console.error('API 金鑰無效:', error);
}

// 驗證翻譯文本
const { valid: textValid, error: textError } = InputValidator.validateText(text, {
  maxLength: 5000,
  minLength: 1
});

if (!textValid) {
  console.error('文本無效:', textError);
}

// 驗證語言
const { valid: langValid, language } = InputValidator.validateLanguage('zh-TW');
if (langValid) {
  console.log('語言有效:', language);
}

// 淨化輸入
const cleanText = InputValidator.cleanInput(userInput, {
  trim: true,
  normalizeWhitespace: true
});
console.log('清理後的輸入:', cleanText);

// 驗證 JSON
const { valid: jsonValid, data } = InputValidator.validateJSON(jsonString);
if (!jsonValid) {
  console.error('JSON 無效:', data);
}
```

### 7. cache/TranslationCache.js - 翻譯緩存

**職責**: 實現 LRU 緩存機制，減少重複的 API 請求

**主要類**:
- `CacheItem` - 緩存項目類
- `TranslationCache` - 翻譯緩存類
  - `constructor(maxSize, ttl)` - 構造函數
  - `generateKey(text, sourceLang, targetLang, model)` - 生成緩存鍵
  - `get(key)` - 獲取緩存結果
  - `set(key, result)` - 設置緩存結果
  - `has(key)` - 檢查緩存是否存在
  - `delete(key)` - 刪除緩存項目
  - `clear()` - 清空緩存
  - `size()` - 獲取緩存大小
  - `getStats()` - 獲取緩存統計
  - `cleanupExpired()` - 清理過期緩存
  - `keys()` - 獲取所有緩存鍵
  - `values()` - 獲取所有緩存值
  - `export()` - 導出緩存數據
  - `import(data)` - 導入緩存數據
  - `getMemoryUsage()` - 計算內存使用量
  - `compress(targetSize)` - 壓縮緩存

**主要功能**:
- LRU 緩存機制（最近最少使用）
- 自動過期清理（基於 TTL）
- 緩存統計（命中率、錯失率）
- 內存使用量監控
- 緩存數據導入/導出

**使用示例**:
```javascript
import { getTranslationCache } from './src/cache/TranslationCache.js';

// 獲取實例
const cache = getTranslationCache();

// 生成緩存鍵
const key = cache.generateKey('你好', 'zh-TW', 'en-US', 'gpt-5-mini');

// 設置緩存
cache.set(key, 'Hello');

// 獲取緩存
const cached = cache.get(key);
if (cached) {
  console.log('緩存命中:', cached);
}

// 檢查緩存是否存在
if (cache.has(key)) {
  console.log('緩存存在');
}

// 獲取統計
const stats = cache.getStats();
console.log(`命中率: ${stats.hitRate}%`);

// 清理過期緩存
const expiredCount = cache.cleanupExpired();
console.log(`清理了 ${expiredCount} 個過期項`);

// 導出緩存數據
const data = cache.export();
console.log('導出數據:', data);
```

### 8. error/ErrorClassifier.js - 錯誤分類

**職責**: 統一的錯誤分類和處理機制

**主要類**:
- `ErrorClassifier` - 錯誤分類器
  - `constructor(interfaceLanguage)` - 構造函數
  - `initializeErrorTypes()` - 初始化錯誤類型定義
  - `classify(error)` - 分類錯誤
  - `createError(code, message)` - 創建標準錯誤對象
  - `isRetryable(error)` - 檢查錯誤是否可重試
  - `getSeverity(error)` - 獲取錯誤嚴重程度
  - `getUserAction(error)` - 獲取用戶操作建議
  - `getRetryDelay(error)` - 獲取重試延遲時間
  - `formatForLog(error)` - 格式化日誌訊息
  - `formatForUser(error)` - 格式化用戶顯示訊息
  - `isNetworkError(error)` - 檢查是否為網路錯誤
  - `isPermissionError(error)` - 檢查是否為權限錯誤
  - `isAPIError(error)` - 檢查是否為 API 錯誤
  - `isSpeechRecognitionError(error)` - 檢查是否為語音辨識錯誤
  - `isHardwareError(error)` - 檢查是否為硬體錯誤
  - `setInterfaceLanguage(language)` - 設置介面語言
  - `getErrorTypes()` - 獲取所有錯誤類型
  - `classifyBatch(errors)` - 批量分類錯誤
  - `createErrorReport(errors)` - 創建錯誤報告
  - `exportErrorReport(report)` - 導出錯誤報告

**主要功能**:
- 細緻的錯誤分類（網路、權限、API、硬體等）
- 多語言錯誤訊息支持
- 錯誤重試機制支持
- 錯誤統計和報告
- 友好的用戶提示

**使用示例**:
```javascript
import { getErrorClassifier } from './src/error/ErrorClassifier.js';

// 獲取實例
const errorClassifier = getErrorClassifier();

// 分類錯誤
const error = new Error('網路連線失敗');
const errorInfo = errorClassifier.classify(error);

console.log('錯誤類型:', errorInfo.type);
console.log('錯誤嚴重程度:', errorInfo.severity);
console.log('是否可重試:', errorInfo.retryable);
console.log('用戶操作建議:', errorInfo.userAction);

// 檢查錯誤類型
if (errorClassifier.isNetworkError(error)) {
  console.log('這是網路錯誤');
}

if (errorClassifier.isPermissionError(error)) {
  console.log('這是權限錯誤');
}

if (errorClassifier.isAPIError(error)) {
  console.log('這是 API 錯誤');
}

// 批量分類
const errors = [error1, error2, error3];
const report = errorClassifier.createErrorReport(errors);
console.log(errorClassifier.exportErrorReport(report));
```

### 9. speech/VoiceActivityDetector.js - 語音活動檢測

**職責**: 實現語音活動檢測（VAD），自動檢測語音開始和結束

**主要類**:
- `VoiceActivityDetector` - 語音活動檢測器
  - `constructor(options)` - 構造函數
  - `detect(audioBuffer)` - 檢測音頻緩衝區中的語音活動
  - `calculateRMS(buffer)` - 計算音頻的均方根（RMS）
  - `updateOptions(options)` - 更新配置選項
  - `getStatus()` - 獲取當前狀態
  - `reset()` - 重置檢測器狀態
  - `on(event, callback)` - 添加事件監聽器
  - `off(event, callback)` - 移除事件監聽器

**主要功能**:
- RMS 基礎的語音檢測
- 可配置的靜音閾值和持續時間
- 語音開始/結束事件
- 統計信息追蹤

**使用示例**:
```javascript
import { getVoiceActivityDetector } from './src/speech/VoiceActivityDetector.js';

// 獲取實例
const vad = getVoiceActivityDetector({
  threshold: 0.02,
  silenceDuration: 1000,
  speechDuration: 300
});

// 監聽語音事件
vad.on('speechStart', () => {
  console.log('語音開始');
});

vad.on('speechEnd', () => {
  console.log('語音結束');
});

vad.on('silence', () => {
  console.log('檢測到靜音');
});

// 檢測音頻
const audioBuffer = new Float32Array(1000);
const result = vad.detect(audioBuffer);
console.log('是否檢測到語音:', result.isSpeech);
console.log('音量:', result.rms);
```

### 10. network/RequestQueue.js - 請求隊列管理

**職責**: 管理並發請求，實現請求隊列和重試機制

**主要類**:
- `RequestQueue` - 請求隊列類
  - `constructor(options)` - 構造函數
  - `add(requestFn, options)` - 添加請求到隊列
  - `cancel(id)` - 取消指定請求
  - `clear()` - 清空隊列
  - `getStatus()` - 獲取隊列狀態
  - `getStats()` - 獲取統計信息
  - `pause()` - 暫停隊列
  - `resume()` - 恢復隊列
  - `on(event, callback)` - 添加事件監聽器
  - `off(event, callback)` - 移除事件監聽器

**主要功能**:
- 並發請求限制
- 優先級隊列
- 指數退避重試
- 自動重試可重試錯誤
- 請求統計

**使用示例**:
```javascript
import { getRequestQueue } from './src/network/RequestQueue.js';

// 獲取實例
const queue = getRequestQueue({
  maxConcurrent: 3,
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true
});

// 添加請求
const result = await queue.add(
  async () => {
    const response = await fetch('https://api.example.com/data');
    return response.json();
  },
  { priority: 1 }
);

// 監聽事件
queue.on('start', (request) => {
  console.log('請求開始:', request.id);
});

queue.on('complete', (request) => {
  console.log('請求完成:', request.id);
});

queue.on('error', (error) => {
  console.error('請求錯誤:', error);
});
```

### 11. network/NetworkMonitor.js - 網路監控

**職責**: 監控網路連接狀態，提供實時網路信息

**主要類**:
- `NetworkMonitor` - 網路監控器
  - `constructor(options)` - 構造函數
  - `checkConnection()` - 檢查網路連接
  - `getStatus()` - 獲取當前狀態
  - `getConnectionInfo()` - 獲取連接信息
  - `onStatusChange(callback)` - 添加狀態變化監聽器
  - `startMonitoring()` - 開始監控
  - `stopMonitoring()` - 停止監控
  - `getStats()` - 獲取統計信息
  - `on(event, callback)` - 添加事件監聽器
  - `off(event, callback)` - 移除事件監聽器

**主要功能**:
- 實時網路狀態監控
- 網路連接信息獲取
- 在線/離線事件
- 連接質量評估
- 統計信息追蹤

**使用示例**:
```javascript
import { getNetworkMonitor } from './src/network/NetworkMonitor.js';

// 獲取實例
const monitor = getNetworkMonitor({
  checkInterval: 30000,
  checkUrl: 'https://www.google.com/favicon.ico',
  checkTimeout: 5000
});

// 開始監控
monitor.startMonitoring();

// 監聽狀態變化
monitor.onStatusChange((status) => {
  console.log('網路狀態變化:', status);
  if (status.isOnline) {
    console.log('網路已連接');
  } else {
    console.log('網路已斷開');
  }
});

// 獲取連接信息
const connectionInfo = monitor.getConnectionInfo();
console.log('連接信息:', connectionInfo);

// 獲取統計
const stats = monitor.getStats();
console.log('在線時間:', stats.uptimePercentage);
```

### 12. speech/AudioPreprocessor.js - 音頻預處理

**職責**: 對音頻數據進行預處理，提升音頻質量

**主要類**:
- `AudioPreprocessor` - 音頻預處理器
  - `constructor(audioContext, options)` - 構造函數
  - `process(audioBuffer)` - 處理音頻緩衝區
  - `enableHighPassFilter(frequency, Q)` - 啟用高通濾波器
  - `disableHighPassFilter()` - 禁用高通濾波器
  - `enableCompressor(options)` - 啟用動態壓縮器
  - `disableCompressor()` - 禁用動態壓縮器
  - `getConfig()` - 獲取當前配置
  - `updateConfig(config)` - 更新配置
  - `getStats()` - 獲取統計信息
  - `resetStats()` - 重置統計
  - `on(event, callback)` - 添加事件監聽器
  - `off(event, callback)` - 移除事件監聽器

**主要功能**:
- 高通濾波（去除低頻噪聲）
- 動態壓縮（平衡音量）
- 實時音頻處理
- 統計信息追蹤

**使用示例**:
```javascript
import { getAudioPreprocessor } from './src/speech/AudioPreprocessor.js';

// 創建音頻上下文
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// 獲取實例
const preprocessor = getAudioPreprocessor(audioContext, {
  highPassFilter: { enabled: true, frequency: 80, Q: 1 },
  compressor: { enabled: true, threshold: -24, ratio: 12 }
});

// 處理音頻
const processedBuffer = preprocessor.process(audioBuffer);

// 獲取統計
const stats = preprocessor.getStats();
console.log('處理的樣本數:', stats.processedSamples);
```

### 13. speech/SpeechRetryHandler.js - 語音重試處理

**職責**: 實現語音辨識的智能重試機制

**主要類**:
- `SpeechRetryHandler` - 語音重試處理器
  - `constructor(options)` - 構造函數
  - `executeWithRetry(fn)` - 執行帶重試的函數
  - `calculateDelay(retryCount)` - 計算重試延遲
  - `isRetryable(error)` - 檢查錯誤是否可重試
  - `getStatus()` - 獲取當前狀態
  - `reset()` - 重置重試狀態
  - `updateOptions(options)` - 更新配置
  - `on(event, callback)` - 添加事件監聽器
  - `off(event, callback)` - 移除事件監聽器

**主要功能**:
- 指數退避重試
- 可重試錯誤分類
- 最大重試次數限制
- 重試統計

**使用示例**:
```javascript
import { getSpeechRetryHandler } from './src/speech/SpeechRetryHandler.js';

// 獲取實例
const retryHandler = getSpeechRetryHandler({
  maxRetries: 3,
  initialDelay: 1000,
  backoffMultiplier: 2,
  maxDelay: 10000
});

// 執行帶重試的函數
const result = await retryHandler.executeWithRetry(async () => {
  return await performSpeechRecognition();
});

// 監聽重試事件
retryHandler.on('retry', (info) => {
  console.log('重試中:', info);
});

retryHandler.on('success', (result) => {
  console.log('重試成功:', result);
});

retryHandler.on('failed', (error) => {
  console.error('重試失敗:', error);
});
```

### 14. performance/LazyLoader.js - 懶加載

**職責**: 實現資源的懶加載，提升頁面加載性能

**主要類**:
- `LazyLoader` - 懶加載器
  - `constructor(options)` - 構造函數
  - `observe(element, callback)` - 觀察元素
  - `unobserve(element)` - 取消觀察元素
  - `observeAll(elements, callback)` - 觀察多個元素
  - `unobserveAll()` - 取消觀察所有元素
  - `getStats()` - 獲取統計信息
  - `resetStats()` - 重置統計
  - `updateOptions(options)` - 更新配置
  - `on(event, callback)` - 添加事件監聽器
  - `off(event, callback)` - 移除事件監聽器

**主要功能**:
- IntersectionObserver 基礎的懶加載
- 可配置的加載延遲
- 自動卸載機制
- 統計信息追蹤

**使用示例**:
```javascript
import { getLazyLoader } from './src/performance/LazyLoader.js';

// 獲取實例
const lazyLoader = getLazyLoader({
  rootMargin: '50px',
  threshold: 0.1,
  loadDelay: 0,
  unloadDelay: 5000
});

// 觀察元素
const image = document.querySelector('.lazy-image');
lazyLoader.observe(image, () => {
  image.src = image.dataset.src;
  console.log('圖片已加載');
});

// 監聽事件
lazyLoader.on('loadStart', (element) => {
  console.log('開始加載:', element);
});

lazyLoader.on('loadComplete', (element) => {
  console.log('加載完成:', element);
});
```

### 15. performance/ResourceManager.js - 資源管理

**職責**: 管理應用資源，自動清理未使用的資源

**主要類**:
- `ResourceManager` - 資源管理器
  - `constructor(options)` - 構造函數
  - `register(key, resource, options)` - 註冊資源
  - `unregister(key)` - 註銷資源
  - `get(key)` - 獲取資源
  - `has(key)` - 檢查資源是否存在
  - `cleanup(key)` - 清理指定資源
  - `cleanupAll()` - 清理所有資源
  - `getStats()` - 獲取統計信息
  - `updateConfig(options)` - 更新配置
  - `on(event, callback)` - 添加事件監聽器
  - `off(event, callback)` - 移除事件監聽器

**主要功能**:
- 資源註冊和註銷
- 自動清理空閒資源
- 資源使用統計
- 可配置的清理策略

**使用示例**:
```javascript
import { getResourceManager } from './src/performance/ResourceManager.js';

// 獲取實例
const resourceManager = getResourceManager({
  maxIdleTime: 300000,
  cleanupInterval: 60000,
  maxResources: 100,
  autoCleanup: true
});

// 註冊資源
resourceManager.register('image-cache', imageCache, {
  cleanup: () => imageCache.clear()
});

// 獲取資源
const cache = resourceManager.get('image-cache');

// 監聽事件
resourceManager.on('cleanup', (key) => {
  console.log('資源已清理:', key);
});

resourceManager.on('register', (key) => {
  console.log('資源已註冊:', key);
});
```

### 16. performance/VirtualScroll.js - 虛擬滾動

**職責**: 實現虛擬滾動，優化大量數據的渲染性能

**主要類**:
- `VirtualScroll` - 虛擬滾動類
  - `constructor(container, itemHeight, renderItem, options)` - 構造函數
  - `setItems(items)` - 設置數據
  - `addItem(item)` - 添加項目
  - `removeItem(index)` - 移除項目
  - `updateItem(index, newItem)` - 更新項目
  - `scrollToIndex(index, smooth)` - 滾動到指定索引
  - `scrollToPosition(position, smooth)` - 滾動到指定位置
  - `scrollToTop()` - 滾動到頂部
  - `scrollToBottom()` - 滾動到底部
  - `getVisibleItems()` - 獲取可見項目
  - `getScrollPosition()` - 獲取滾動位置
  - `getCurrentIndex()` - 獲取當前索引
  - `getStats()` - 獲取統計信息
  - `refresh()` - 刷新渲染
  - `destroy()` - 銷毀虛擬滾動

**主要功能**:
- 只渲染可見項目
- 預渲染額外項目（overscan）
- 平滑滾動支持
- 高性能渲染

**使用示例**:
```javascript
import { getVirtualScroll } from './src/performance/VirtualScroll.js';

// 創建容器
const container = document.querySelector('.scroll-container');

// 獲取實例
const virtualScroll = getVirtualScroll(
  container,
  50, // itemHeight in pixels
  (item, index) => {
    const div = document.createElement('div');
    div.textContent = item.name;
    return div;
  },
  { overscan: 5, buffer: 10 }
);

// 設置數據
const items = Array.from({ length: 1000 }, (_, i) => ({
  id: i,
  name: `Item ${i}`
}));
virtualScroll.setItems(items);

// 滾動到指定位置
virtualScroll.scrollToIndex(500, true);

// 獲取統計
const stats = virtualScroll.getStats();
console.log('總項目:', stats.totalItems);
console.log('可見項目:', stats.visibleItems);
```

### 17. performance/WorkerManager.js - Web Worker 管理

**職責**: 管理 Web Workers，將繁重任務放到後台執行

**主要類**:
- `WorkerManager` - Web Worker 管理器
  - `constructor(options)` - 構造函數
  - `createWorker(script, name, options)` - 創建 Worker
  - `terminateWorker(name)` - 終止 Worker
  - `terminateAll()` - 終止所有 Workers
  - `getWorker(name)` - 獲取 Worker
  - `getAllWorkers()` - 獲取所有 Workers
  - `isWorkerActive(name)` - 檢查 Worker 是否活躍
  - `isWorkerIdle(name)` - 檢查 Worker 是否空閒
  - `isWorkerTerminated(name)` - 檢查 Worker 是否已終止
  - `submitTask(workerName, taskFn, taskData)` - 提交任務
  - `getStats()` - 獲取統計信息
  - `resetStats()` - 重置統計
  - `updateConfig(options)` - 更新配置
  - `getConfig()` - 獲取配置
  - `on(event, callback)` - 添加事件監聽器
  - `off(event, callback)` - 移除事件監聽器

**主要功能**:
- Worker 池管理
- 任務隊列
- 自動終止空閒 Workers
- Worker 統計
- 事件驅動架構

**使用示例**:
```javascript
import { getWorkerManager } from './src/performance/WorkerManager.js';

// 獲取實例
const workerManager = getWorkerManager({
  maxWorkers: 4,
  autoTerminate: true,
  idleTimeout: 60000
});

// 創建 Worker
const workerScript = `
  self.onmessage = function(e) {
    if (e.data.type === 'task') {
      const result = performTask(e.data.data);
      self.postMessage({
        type: 'taskComplete',
        taskId: e.data.taskId,
        result: result
      });
    }
  };
  
  function performTask(data) {
    // 執行繁重任務
    return data * 2;
  }
`;

workerManager.createWorker(workerScript, 'calculation-worker');

// 提交任務
const result = await workerManager.submitTask(
  'calculation-worker',
  (worker, data) => {
    return new Promise((resolve) => {
      worker.onmessage = (e) => {
        if (e.data.type === 'taskComplete') {
          resolve(e.data.result);
        }
      };
      worker.postMessage({ type: 'task', data });
    });
  },
  42
);

console.log('任務結果:', result);

// 監聽事件
workerManager.on('workerCreated', (info) => {
  console.log('Worker 已創建:', info.name);
});

workerManager.on('workerTerminated', (info) => {
  console.log('Worker 已終止:', info.name);
});
```

---

## 數據流

### 1. 語音識別流程

```
用戶說話 → 麥克風 → 音頻預處理 → Web Speech API → 語音文本
```

**優化**:
- 音頻預處理（高通濾波、壓縮器）
- 語音活動檢測（VAD）
- 智能重試機制

### 2. 翻譯流程

```
語音文本 → 輸入驗證 → 檢查緩存 → 調用翻譯 API → 緩存結果 → 顯示翻譯
```

**優化**:
- LRU 緩存機制
- 請求隊列管理
- 錯誤分類和重試
- 網路狀態監控

### 3. 存儲流程

```
敏感數據 → 加密 → LocalStorage → 解密 → 使用
```

**優化**:
- 用戶特定的加密密鑰
- 安全存儲 API
- 數據驗證和清理

---

## 安全架構

### 1. 數據保護

- **加密存儲** - API 金鑰使用用戶特定密鑰加密存儲
- **輸入驗證** - 所有輸入都經過驗證和淨化
- **XSS 防護** - 使用 `sanitizeHTML()` 淨化所有用戶輸入
- **CSP 策略** - 內容安全策略限制資源加載來源
- **輸入驗證** - 防止注入攻擊

### 2. API 安全

- **請求驗證** - 所有 API 請求都經過驗證
- **速率限制** - 防止 API 濫用
- **錯誤處理** - 不暴露敏感信息在錯誤日誌中
- **HTTPS** - 所有 API 請求使用 HTTPS

### 3. 隱私保護

- **最小化數據收集** - 只收集必要的數據
- **本地存儲** - 數據存儲在本地，不上傳到伺服器
- **隱私同意** - 用戶需要同意隱私政策
- **數據刪除** - 提供清除所有數據的功能

---

## 性能優化

### 1. 緩存策略

- **LRU 緩存** - 翻譯結果使用 LRU 緩存
- **TTL 過期** - 緩存項目 1 小時後自動過期
- **緩存大小限制** - 最多緩存 100 個翻譯結果

### 2. 請求優化

- **防抖** - 搜索和輸入使用 300ms 防抖
- **節流** - 滾動事件使用 50ms 節流
- **請求隊列** - 最多 3 個並發請求
- **自動重試** - 網路錯誤自動重試（指數退避）

### 3. 資源管理

- **懶加載** - 按需加載模塊和資源
- **資源清理** - 及時清理不再使用的資源
- **Web Workers** - 繁重任務使用 Web Workers
- **虛擬滾動** - 長列表使用虛擬滾動

---

## 遷移策略

### 階段 1: 過渡期（當前）

1. **保持兼容性** - 舊代碼繼續正常工作
2. **逐步引入新模塊** - 新功能使用新模塊
3. **逐步替換舊代碼** - 舊功能逐步使用新模塊重寫
4. **並行開發** - 舊代碼和新模塊並行存在

### 階段 2: 穩定期（短期）

1. **完全重寫核心功能** - 使用新模塊重寫核心功能
2. **移除舊代碼** - 清理不再使用的舊代碼
3. **統一代碼風格** - 所有代碼使用統一的風格
4. **添加單元測試** - 為所有模塊添加測試

### 階段 3: 穩定期（長期）

1. **完全模塊化** - 所有功能都使用模塊化架構
2. **性能優化** - 實現所有性能優化建議
3. **增強功能** - 實現所有增強功能建議
4. **文檔完善** - 完善所有文檔

---

## 最佳實踐

### 1. 代碼組織

- ✅ 使用有意義的變數和函數名稱
- ✅ 遵循命名規範
- ✅ 保持函數簡短和專注
- ✅ 避免過深的嵌套
- ✅ 使用註釋解釋複雜邏輯

### 2. 錯誤處理

- ✅ 統一使用錯誤分類器
- ✅ 提供清晰的錯誤訊息
- ✅ 記錄所有錯誤
- ✅ 不暴露敏感信息

### 3. 性能優化

- ✅ 使用緩存減少重複計算
- ✅ 使用防抖和節流減少事件處理
- ✅ 懶加載資源
- ✅ 及時清理資源

### 4. 安全性

- ✅ 驗證所有輸入
- ✅ 使用加密存儲敏感數據
- ✅ 實施 CSP 策略
- ✅ 最小化數據收集

### 5. 測試

- ✅ 為每個模塊編寫單元測試
- ✅ 測試覆蓋率達到 80% 以上
- ✅ 測試邊界情況和錯誤情況
- ✅ 使用測試驅證功能正確性

---

## 版本歷史

### v1.0.0 (原始版本)
- 單一文件架構
- 基本功能實現
- 無模塊化

### v2.0.0 (模塊化架構)
- ✅ 模塊化架構
- ✅ 配置管理模塊
- ✅ 常量定義模塊
- ✅ 工具函數模塊
- ✅ 安全存儲模塊
- ✅ 輸入驗證模塊
- ✅ 翻譯緩存模塊
- ✅ 錯誤分類模塊
- ✅ 統一導入文件
- ✅ 完整的文檔

### v2.2.0 (性能優化版本)
- ✅ 語音活動檢測（VAD）模塊
- ✅ 請求隊列管理模塊
- ✅ 網路監控模塊
- ✅ 音頻預處理模塊
- ✅ 語音重試處理模塊
- ✅ 懶加載模塊
- ✅ 資源管理模塊
- ✅ 虛擬滾動模塊
- ✅ Web Worker 管理模塊
- ✅ 完整的測試套件
- ✅ 更新的配置和常量
- ✅ 完整的文檔更新

---

## 總結

模塊化架構為 Kilo 即時語音翻譯機提供了以下優勢：

1. **可維護性** - 清晰的模塊職責分離
2. **可測試性** - 易於編寫和執行單元測試
3. **可擴展性** - 模塊化架構便於添加新功能
4. **安全性** - 統一的安全機制保護用戶數據
5. **性能** - 緩存、防抖、節流等優化提升響應速度
6. **代碼質量** - 統一的編碼規範和錯誤處理

---

**文檔版本**: 1.0  
**最後更新**: 2026-01-03  
**維護者**: Kilo Code Team
