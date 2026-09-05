/**
 * BigModel ASR 客戶端
 * 在瀏覽器中調用 Netlify 函數進行語音識別
 * 
 * @module translation/BigModelASRClient
 */

/**
 * BigModel ASR 客戶端類
 * 
 * @class BigModelASRClient
 */
export class BigModelASRClient {
  /**
   * 構造函數
   * 
   * @param {Object} config - 配置對象
   * @param {string} config.apiEndpoint - API 端點（默認：/api/transcribe，Zeabur）
   * @param {number} config.timeout - 請求超時時間（毫秒）
   */
  constructor(config = {}) {
    this.apiEndpoint = config.apiEndpoint || '/api/transcribe';
    this.timeout = config.timeout || 60000; // 60 秒超時
  }

  /**
   * 驗證音頻文件
   * 
   * @param {File|Blob} audioFile - 音頻文件
   * @throws {Error} 如果文件格式或大小不符合要求
   */
  validateAudioFile(audioFile) {
    const supportedMimeTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3'];
    const maxFileSize = 25 * 1024 * 1024; // 25 MB
    const maxDuration = 30 * 1000; // 30 秒

    // 檢查 MIME 類型
    if (!supportedMimeTypes.includes(audioFile.type)) {
      throw new Error(
        `不支持的音頻格式: ${audioFile.type}。支持的格式: ${supportedMimeTypes.join(', ')}`
      );
    }

    // 檢查文件大小
    if (audioFile.size > maxFileSize) {
      throw new Error(
        `音頻文件過大: ${(audioFile.size / (1024 * 1024)).toFixed(2)} MB > 25 MB`
      );
    }
  }

  /**
   * 轉錄音頻文件為文本（非流式）
   * 
   * @param {File|Blob} audioFile - 音頻文件
   * @param {Object} options - 額外選項
   * @param {string} options.prompt - 上下文信息（可選）
   * @param {Array<string>} options.hotwords - 熱詞列表（可選）
   * @param {Function} options.onProgress - 進度回調（可選）
   * @returns {Promise<Object>} 轉錄結果 { text, model, id, created }
   * @throws {Error} 如果轉錄失敗
   */
  async transcribe(audioFile, options = {}) {
    try {
      // 驗證音頻文件
      this.validateAudioFile(audioFile);

      // 構建 FormData
      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('stream', 'false');

      if (options.prompt) {
        formData.append('prompt', options.prompt);
      }

      if (options.hotwords && Array.isArray(options.hotwords)) {
        formData.append('hotwords', JSON.stringify(options.hotwords));
      }

      // 設定超時
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      // 調用 API
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: '未知錯誤' }));
        throw new Error(error.error || `API 錯誤: ${response.status}`);
      }

      const result = await response.json();
      return {
        text: result.text,
        model: result.model || 'glm-asr-2512',
        id: result.id,
        created: result.created
      };

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('語音識別請求超時 (> 60秒)');
      }
      throw error;
    }
  }

  /**
   * 流式轉錄音頻文件
   * 
   * @param {File|Blob} audioFile - 音頻文件
   * @param {Function} onChunk - 流式回調函數，接收轉錄的文本片段
   * @param {Function} onComplete - 完成回調函數
   * @param {Function} onError - 錯誤回調函數
   * @param {Object} options - 額外選項
   * @returns {Promise<string>} 完整的轉錄文本
   */
  async transcribeStream(audioFile, onChunk, onComplete, onError, options = {}) {
    try {
      // 驗證音頻文件
      this.validateAudioFile(audioFile);

      // 構建 FormData
      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('stream', 'true');

      if (options.prompt) {
        formData.append('prompt', options.prompt);
      }

      if (options.hotwords && Array.isArray(options.hotwords)) {
        formData.append('hotwords', JSON.stringify(options.hotwords));
      }

      // 設定超時
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      // 調用 API
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: '未知錯誤' }));
        throw new Error(error.error || `API 錯誤: ${response.status}`);
      }

      // 解析 JSON 響應（即使是流式，Netlify 函數返回單個 JSON）
      const result = await response.json();
      
      // 返回完整文本
      if (onChunk) {
        onChunk(result.text);
      }

      if (onComplete) {
        onComplete(result.text);
      }

      return result.text;

    } catch (error) {
      if (onError) {
        if (error.name === 'AbortError') {
          onError(new Error('語音識別請求超時 (> 60秒)'));
        } else {
          onError(error);
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * 獲取支持的語言列表
   * 
   * @returns {Array<string>} 支持的語言代碼
   */
  getSupportedLanguages() {
    return [
      'zh-CN', // 中文（普通話、方言）
      'en-US', // 英文（多口音）
      'ja-JP', // 日文
      'ko-KR', // 韓文
      'fr-FR', // 法文
      'de-DE', // 德文
      'es-ES', // 西班牙文
      'ar-SA', // 阿拉伯文
      'pt-BR', // 葡萄牙文
      'ru-RU'  // 俄文
    ];
  }

  /**
   * 獲取支持的方言列表（針對中文）
   * 
   * @returns {Array<string>} 支持的方言
   */
  getSupportedDialects() {
    return [
      '普通話',
      '四川話',
      '粵語',
      '閩南語',
      '吳語'
    ];
  }

  /**
   * 獲取 GLM-ASR-2512 模型信息
   * 
   * @returns {Object} 模型信息
   */
  getModelInfo() {
    return {
      name: 'GLM-ASR-2512',
      description: '新一代語音識別模型，支持實時轉錄高質量文字',
      maxAudioDuration: 30, // 秒
      maxFileSize: 25 * 1024 * 1024, // 25 MB
      supportedFormats: ['audio/wav', 'audio/mpeg', 'audio/mp3'],
      characterErrorRate: '0.0717',
      features: ['streaming', 'multilingual', 'hotwords', 'context'],
      recommendations: [
        '實時會議紀要',
        '客服質檢與工單處理',
        '視頻直播字幕',
        '辦公文檔輸入',
        '多語言溝通與翻譯',
        '醫療病歷錄入'
      ]
    };
  }
}

/**
 * 工廠函數 - 創建 ASR 客戶端實例
 * 
 * @param {Object} config - 配置對象
 * @returns {BigModelASRClient} ASR 客戶端實例
 */
export function getBigModelASRClient(config = {}) {
  return new BigModelASRClient(config);
}

/**
 * 便利函數 - 快速進行語音轉錄
 * 
 * @param {File|Blob} audioFile - 音頻文件
 * @param {Object} options - 選項
 * @returns {Promise<string>} 轉錄的文本
 */
export async function quickTranscribe(audioFile, options = {}) {
  const client = new BigModelASRClient(options.config);
  return client.transcribe(audioFile, options);
}
