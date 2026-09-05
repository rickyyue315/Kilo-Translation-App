/**
 * BigModel API 翻譯模塊
 * 支援流式和非流式翻譯
 * 
 * @module translation/BigModelTranslator
 */

import {
  BIGMODEL_CONFIG,
  BIGMODEL_ERROR_CODES,
  BIGMODEL_ERROR_MESSAGES,
  TRANSLATION_SYSTEM_PROMPT
} from '../constants.js';

/**
 * BigModel 翻譯器類
 * 
 * @class BigModelTranslator
 */
export class BigModelTranslator {
  /**
   * 構造函數
   * 
   * @param {Object} config - 配置對象
   * @param {string} config.apiKey - API 金鑰
   * @param {string} config.apiUrl - API 端點 URL
   * @param {string} config.model - 模型名稱
   * @param {number} config.temperature - 溫度參數
   * @param {number} config.maxTokens - 最大 token 數
   * @param {number} config.timeout - 請求超時時間（毫秒）
   */
  constructor(config = {}) {
    this.apiKey = config.apiKey || '';
    this.apiUrl = config.apiUrl || BIGMODEL_CONFIG.API_URL;
    this.model = config.model || BIGMODEL_CONFIG.DEFAULT_MODEL;
    this.temperature = config.temperature || 0.3;
    this.maxTokens = config.maxTokens || 2000;
    this.timeout = config.timeout || 30000;
    this.interfaceLanguage = config.interfaceLanguage || 'zh-TW';
  }

  /**
   * 翻譯文本（流式模式）
   * 
   * @param {string} text - 要翻譯的文本
   * @param {string} sourceLang - 源語言
   * @param {string} targetLang - 目標語言
   * @param {Function} onChunk - 流式回調函數 (chunk, fullText) => void
   * @param {Function} onComplete - 完成回調函數 (fullText) => void
   * @param {Function} onError - 錯誤回調函數 (error) => void
   * @returns {Promise<void>}
   */
  async translateStream(text, sourceLang, targetLang, onChunk, onComplete, onError) {
    try {
      const systemPrompt = TRANSLATION_SYSTEM_PROMPT(sourceLang, targetLang);
      
      const requestBody = {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: text
          }
        ],
        stream: true,
        temperature: this.temperature,
        max_tokens: this.maxTokens
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await this.handleErrorResponse(response);
        throw error;
      }

      // 處理流式響應
      await this.handleStreamResponse(response, onChunk, onComplete);

    } catch (error) {
      if (onError) {
        onError(error);
      } else {
        throw error;
      }
    }
  }

  /**
   * 翻譯文本（標準模式）
   * 
   * @param {string} text - 要翻譯的文本
   * @param {string} sourceLang - 源語言
   * @param {string} targetLang - 目標語言
   * @returns {Promise<string>} 翻譯結果
   */
  async translate(text, sourceLang, targetLang) {
    return new Promise((resolve, reject) => {
      this.translateStream(
        text,
        sourceLang,
        targetLang,
        (chunk, fullText) => {
          // 流式回調（標準模式不使用）
        },
        (fullText) => {
          resolve(fullText);
        },
        (error) => {
          reject(error);
        }
      );
    });
  }

  /**
   * 處理流式響應
   * 
   * @private
   * @param {Response} response - Fetch 響應對象
   * @param {Function} onChunk - 流式回調函數
   * @param {Function} onComplete - 完成回調函數
   * @returns {Promise<void>}
   */
  async handleStreamResponse(response, onChunk, onComplete) {
    if (!response.body) {
      throw new Error('無法讀取響應流');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              if (onChunk) {
                onChunk(content, fullText);
              }
            }
          } catch (e) {
            console.warn('解析流式數據錯誤:', e, 'Data:', data);
          }
        }
      }
    }

    if (onComplete) {
      onComplete(fullText);
    }
  }

  /**
   * 處理錯誤響應
   * 
   * @private
   * @param {Response} response - Fetch 響應對象
   * @returns {Promise<Error>} 錯誤對象
   */
  async handleErrorResponse(response) {
    const errorData = await response.json().catch(() => ({}));
    
    const error = new Error(this.getErrorMessage(errorData, response.status));
    error.statusCode = response.status;
    error.code = errorData.code || BIGMODEL_ERROR_CODES.INVALID_REQUEST;
    error.details = errorData;
    
    return error;
  }

  /**
   * 獲取錯誤訊息
   * 
   * @private
   * @param {Object} errorData - 錯誤數據
   * @param {number} statusCode - HTTP 狀態碼
   * @returns {string} 錯誤訊息
   */
  getErrorMessage(errorData, statusCode) {
    // 優先使用 API 返回的錯誤訊息
    if (errorData.message) {
      return errorData.message;
    }

    // 根據狀態碼返回預設訊息
    const errorMessages = {
      401: 'API 金鑰無效或已過期',
      403: '權限不足，無法存取此資源',
      429: '請求過於頻繁，請稍後再試',
      500: 'BigModel 伺服器錯誤，請稍後再試',
      502: 'BigModel 網關錯誤，請稍後再試',
      503: 'BigModel 服務暫時不可用，請稍後再試'
    };

    return errorMessages[statusCode] || `翻譯請求失敗 (HTTP ${statusCode})`;
  }

  /**
   * 設置 API Key
   * 
   * @param {string} apiKey - API 金鑰
   */
  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  /**
   * 設置模型
   * 
   * @param {string} model - 模型名稱
   */
  setModel(model) {
    if (BIGMODEL_CONFIG.MODELS[model]) {
      this.model = model;
    } else {
      console.warn(`未知的 BigModel 模型: ${model}`);
    }
  }

  /**
   * 設置溫度參數
   * 
   * @param {number} temperature - 溫度參數 (0-1)
   */
  setTemperature(temperature) {
    this.temperature = Math.max(0, Math.min(1, temperature));
  }

  /**
   * 設置最大 token 數
   * 
   * @param {number} maxTokens - 最大 token 數
   */
  setMaxTokens(maxTokens) {
    this.maxTokens = Math.max(1, maxTokens);
  }

  /**
   * 設置超時時間
   * 
   * @param {number} timeout - 超時時間（毫秒）
   */
  setTimeout(timeout) {
    this.timeout = Math.max(1000, timeout);
  }

  /**
   * 設置介面語言
   * 
   * @param {string} language - 語言代碼
   */
  setInterfaceLanguage(language) {
    this.interfaceLanguage = language;
  }

  /**
   * 獲取支持的模型列表
   * 
   * @returns {Array<string>} 模型 ID 列表
   */
  getSupportedModels() {
    return Object.keys(BIGMODEL_CONFIG.MODELS);
  }

  /**
   * 獲取模型信息
   * 
   * @param {string} modelId - 模型 ID
   * @returns {Object|null} 模型信息
   */
  getModelInfo(modelId) {
    return BIGMODEL_CONFIG.MODELS[modelId] || null;
  }

  /**
   * 獲取所有模型信息
   * 
   * @returns {Object} 模型信息映射
   */
  getAllModelsInfo() {
    return { ...BIGMODEL_CONFIG.MODELS };
  }

  /**
   * 驗證 API 金鑰格式
   * 
   * @param {string} apiKey - API 金鑰
   * @returns {boolean} 是否有效
   */
  static validateApiKey(apiKey) {
    // BigModel API 金鑰格式: {id}.{secret}
    const pattern = /^[a-f0-9]{32}\.[a-f0-9]{32}$/i;
    return pattern.test(apiKey);
  }

  /**
   * 測試 API 連接
   * 
   * @returns {Promise<{success: boolean, message: string}>} 測試結果
   */
  async testConnection() {
    try {
      const result = await this.translate('Hello', 'en-US', 'zh-TW');
      return {
        success: true,
        message: '連接成功'
      };
    } catch (error) {
      return {
        success: false,
        message: this.getErrorMessage(error.details || {}, error.statusCode || 500)
      };
    }
  }
}

/**
 * 獲取 BigModel 翻譯器實例
 * 
 * @param {Object} config - 配置對象
 * @returns {BigModelTranslator} BigModel 翻譯器實例
 */
export function getBigModelTranslator(config) {
  return new BigModelTranslator(config);
}

/**
 * 創建 BigModel 翻譯器實例（工廠函數）
 * 
 * @param {string} apiKey - API 金鑰
 * @param {Object} options - 可選配置
 * @returns {BigModelTranslator} BigModel 翻譯器實例
 */
export function createBigModelTranslator(apiKey, options = {}) {
  return new BigModelTranslator({
    apiKey,
    ...options
  });
}

/**
 * 導出默認實例
 */
export default BigModelTranslator;
