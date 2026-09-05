/**
 * BigModel 語音識別（ASR）模塊
 * 支援 GLM-ASR-2512 模型進行語音到文本的轉換
 * 
 * @module translation/BigModelASR
 */

import { BIGMODEL_CONFIG } from '../constants.js';

/**
 * BigModel ASR 類 - 語音識別
 * 
 * @class BigModelASR
 */
export class BigModelASR {
  /**
   * 構造函數
   * 
   * @param {Object} config - 配置對象
   * @param {string} config.apiKey - API 金鑰
   * @param {string} config.apiUrl - API 端點 URL
   * @param {string} config.model - 模型名稱（默認：glm-asr-2512）
   * @param {number} config.timeout - 請求超時時間（毫秒）
   */
  constructor(config = {}) {
    this.apiKey = config.apiKey || '';
    this.apiUrl = config.apiUrl || BIGMODEL_CONFIG.ASR_API_URL;
    this.model = config.model || BIGMODEL_CONFIG.ASR_MODEL;
    this.timeout = config.timeout || 60000; // ASR 需要更長的超時時間
  }

  /**
   * 驗證音頻文件
   * 
   * @param {Buffer|Blob} audioData - 音頻數據
   * @param {string} mimeType - MIME 類型
   * @throws {Error} 如果音頻格式不支持或大小超過限制
   */
  validateAudioFile(audioData, mimeType) {
    const supportedMimeTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3'];
    const maxFileSize = 25 * 1024 * 1024; // 25 MB
    
    if (!supportedMimeTypes.includes(mimeType)) {
      throw new Error(
        `不支持的音頻格式: ${mimeType}。支持的格式: ${supportedMimeTypes.join(', ')}`
      );
    }
    
    if (audioData.length > maxFileSize) {
      throw new Error(
        `音頻文件過大：${(audioData.length / (1024 * 1024)).toFixed(2)} MB > 25 MB 限制`
      );
    }
  }

  /**
   * 將音頻文件轉錄為文本（非流式）
   * 
   * @param {Buffer|Blob} audioData - 音頻數據
   * @param {string} mimeType - MIME 類型（例如 'audio/wav', 'audio/mpeg'）
   * @param {Object} options - 額外選項
   * @param {string} options.prompt - 上下文信息（可選），用於長文本場景
   * @param {Array<string>} options.hotwords - 熱詞列表（可選），用於提升特定領域詞彙識別率
   * @returns {Promise<Object>} 轉錄結果 { id, created, model, text }
   * @throws {Error} 如果請求失敗
   */
  async transcribe(audioData, mimeType, options = {}) {
    try {
      // 驗證音頻文件
      this.validateAudioFile(audioData, mimeType);

      const formData = new FormData();
      const audioBlob = new Blob([audioData], { type: mimeType });
      
      formData.append('file', audioBlob);
      formData.append('model', this.model);
      formData.append('stream', 'false');
      
      // 添加可選參數
      if (options.prompt) {
        formData.append('prompt', options.prompt);
      }
      
      if (options.hotwords && Array.isArray(options.hotwords)) {
        formData.append('hotwords', JSON.stringify(options.hotwords));
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await this.handleErrorResponse(response);
        throw error;
      }

      const result = await response.json();
      return {
        id: result.id,
        created: result.created,
        model: result.model,
        text: result.text
      };

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('語音識別請求超時（>60秒）');
      }
      throw error;
    }
  }

  /**
   * 流式轉錄音頻文件
   * 
   * @param {Buffer|Blob} audioData - 音頻數據
   * @param {string} mimeType - MIME 類型
   * @param {Function} onChunk - 流式回調函數，接收 (delta, type) 參數
   *                             type 可以是 'transcript.text.delta' 或 'transcript.text.done'
   * @param {Function} onComplete - 完成回調函數，接收完整文本
   * @param {Function} onError - 錯誤回調函數
   * @param {Object} options - 額外選項
   * @returns {Promise<void>}
   */
  async transcribeStream(audioData, mimeType, onChunk, onComplete, onError, options = {}) {
    try {
      // 驗證音頻文件
      this.validateAudioFile(audioData, mimeType);

      const formData = new FormData();
      const audioBlob = new Blob([audioData], { type: mimeType });
      
      formData.append('file', audioBlob);
      formData.append('model', this.model);
      formData.append('stream', 'true'); // 啟用流式模式

      if (options.prompt) {
        formData.append('prompt', options.prompt);
      }
      
      if (options.hotwords && Array.isArray(options.hotwords)) {
        formData.append('hotwords', JSON.stringify(options.hotwords));
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: formData,
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
        if (error.name === 'AbortError') {
          onError(new Error('語音識別請求超時（>60秒）'));
        } else {
          onError(error);
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * 處理流式響應
   * 
   * @private
   * @param {Response} response - 響應對象
   * @param {Function} onChunk - 流式回調函數
   * @param {Function} onComplete - 完成回調函數
   */
  async handleStreamResponse(response, onChunk, onComplete) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          if (trimmedLine.startsWith('data:')) {
            const dataStr = trimmedLine.slice(5).trim();
            
            if (dataStr === '[DONE]') {
              if (onComplete) {
                onComplete(fullText);
              }
              return;
            }

            try {
              const event = JSON.parse(dataStr);
              
              if (event.type === 'transcript.text.delta' && event.delta) {
                fullText += event.delta;
                if (onChunk) {
                  onChunk(event.delta, fullText, event.type);
                }
              } else if (event.type === 'transcript.text.done') {
                if (onChunk) {
                  onChunk('', fullText, event.type);
                }
              }
            } catch (e) {
              console.error('Failed to parse stream event:', e);
            }
          }
        }
      }

      // 處理剩餘的 buffer
      if (buffer.trim()) {
        if (buffer.trim().startsWith('data:')) {
          const dataStr = buffer.trim().slice(5).trim();
          if (dataStr !== '[DONE]') {
            try {
              const event = JSON.parse(dataStr);
              if (event.type === 'transcript.text.delta' && event.delta) {
                fullText += event.delta;
                if (onChunk) {
                  onChunk(event.delta, fullText, event.type);
                }
              }
            } catch (e) {
              console.error('Failed to parse final stream event:', e);
            }
          }
        }
      }

      if (onComplete) {
        onComplete(fullText);
      }

    } catch (error) {
      reader.cancel();
      throw error;
    }
  }

  /**
   * 處理錯誤響應
   * 
   * @private
   * @param {Response} response - 響應對象
   * @returns {Promise<Error>}
   */
  async handleErrorResponse(response) {
    const contentType = response.headers.get('content-type');
    
    try {
      let errorData;
      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json();
      } else {
        const text = await response.text();
        errorData = { message: text };
      }

      const errorMessage = errorData.error?.message || errorData.message || '未知錯誤';
      const errorCode = errorData.error?.code || response.status;

      const error = new Error(
        `語音識別 API 錯誤 (${errorCode}): ${errorMessage}`
      );
      error.status = response.status;
      error.code = errorCode;

      return error;
    } catch (e) {
      return new Error(`語音識別 API 錯誤: ${response.status} ${response.statusText}`);
    }
  }
}

/**
 * 工廠函數 - 創建 BigModel ASR 實例
 * 
 * @param {Object} config - 配置對象
 * @returns {BigModelASR} ASR 實例
 */
export function getBigModelASR(config = {}) {
  return new BigModelASR(config);
}
