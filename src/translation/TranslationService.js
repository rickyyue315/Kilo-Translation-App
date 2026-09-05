/**
 * 翻譯服務統一接口
 * 支援多個翻譯服務提供商（OpenRouter、BigModel）
 * 
 * @module translation/TranslationService
 */

import { getBigModelTranslator } from './BigModelTranslator.js';
import { TRANSLATION_SERVICES, EVENTS } from '../constants.js';

/**
 * 翻譯服務類
 * 
 * @class TranslationService
 */
export class TranslationService {
  /**
   * 構造函數
   * 
   * @param {Object} config - 配置對象
   */
  constructor(config = {}) {
    this.currentService = config.service || TRANSLATION_SERVICES.OPENROUTER;
    this.bigModelTranslator = null;
    this.openRouterTranslator = null;
    this.eventListeners = new Map();
  }

  /**
   * 初始化翻譯服務
   * 
   * @param {string} serviceType - 服務類型
   * @param {Object} config - 配置對象
   */
  init(serviceType, config = {}) {
    this.currentService = serviceType;

    if (serviceType === TRANSLATION_SERVICES.BIGMODEL) {
      this.bigModelTranslator = getBigModelTranslator({
        apiKey: config.apiKey,
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        timeout: config.timeout,
        interfaceLanguage: config.interfaceLanguage
      });
    } else if (serviceType === TRANSLATION_SERVICES.OPENROUTER) {
      // OpenRouter 翻譯器由外部提供（在主代碼中實現）
      this.openRouterTranslator = config.openRouterTranslator;
    }

    this.emit(EVENTS.SERVICE_CHANGE, { service: serviceType });
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
    this.emit(EVENTS.TRANSLATION_START, { text, sourceLang, targetLang });

    try {
      if (this.currentService === TRANSLATION_SERVICES.BIGMODEL) {
        if (!this.bigModelTranslator) {
          throw new Error('BigModel 翻譯器未初始化');
        }

        await this.bigModelTranslator.translateStream(
          text,
          sourceLang,
          targetLang,
          (chunk, fullText) => {
            this.emit(EVENTS.TRANSLATION_PROGRESS, { chunk, fullText });
            if (onChunk) onChunk(chunk, fullText);
          },
          (fullText) => {
            this.emit(EVENTS.TRANSLATION_COMPLETE, { result: fullText });
            if (onComplete) onComplete(fullText);
          },
          (error) => {
            this.emit(EVENTS.TRANSLATION_ERROR, { error });
            if (onError) onError(error);
          }
        );
      } else {
        // 使用 OpenRouter 實現（由外部提供）
        if (this.openRouterTranslator && this.openRouterTranslator.translateStream) {
          await this.openRouterTranslator.translateStream(
            text,
            sourceLang,
            targetLang,
            (chunk, fullText) => {
              this.emit(EVENTS.TRANSLATION_PROGRESS, { chunk, fullText });
              if (onChunk) onChunk(chunk, fullText);
            },
            (fullText) => {
              this.emit(EVENTS.TRANSLATION_COMPLETE, { result: fullText });
              if (onComplete) onComplete(fullText);
            },
            (error) => {
              this.emit(EVENTS.TRANSLATION_ERROR, { error });
              if (onError) onError(error);
            }
          );
        } else {
          throw new Error('OpenRouter 翻譯器未初始化');
        }
      }
    } catch (error) {
      this.emit(EVENTS.TRANSLATION_ERROR, { error });
      if (onError) onError(error);
      else throw error;
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
        null,  // 流式回調（標準模式不使用）
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
   * 切換翻譯服務
   * 
   * @param {string} serviceType - 服務類型
   * @param {Object} config - 配置對象
   */
  switchService(serviceType, config = {}) {
    this.init(serviceType, config);
  }

  /**
   * 獲取當前服務類型
   * 
   * @returns {string} 服務類型
   */
  getCurrentService() {
    return this.currentService;
  }

  /**
   * 獲取當前翻譯器實例
   * 
   * @returns {Object|null} 翻譯器實例
   */
  getCurrentTranslator() {
    if (this.currentService === TRANSLATION_SERVICES.BIGMODEL) {
      return this.bigModelTranslator;
    } else {
      return this.openRouterTranslator;
    }
  }

  /**
   * 獲取支持的模型列表
   * 
   * @returns {Array<string>} 模型 ID 列表
   */
  getSupportedModels() {
    if (this.currentService === TRANSLATION_SERVICES.BIGMODEL && this.bigModelTranslator) {
      return this.bigModelTranslator.getSupportedModels();
    } else {
      // OpenRouter 模型列表由外部提供
      return [];
    }
  }

  /**
   * 獲取模型信息
   * 
   * @param {string} modelId - 模型 ID
   * @returns {Object|null} 模型信息
   */
  getModelInfo(modelId) {
    if (this.currentService === TRANSLATION_SERVICES.BIGMODEL && this.bigModelTranslator) {
      return this.bigModelTranslator.getModelInfo(modelId);
    } else {
      return null;
    }
  }

  /**
   * 測試連接
   * 
   * @returns {Promise<{success: boolean, message: string}>} 測試結果
   */
  async testConnection() {
    if (this.currentService === TRANSLATION_SERVICES.BIGMODEL && this.bigModelTranslator) {
      return await this.bigModelTranslator.testConnection();
    } else {
      return {
        success: false,
        message: 'OpenRouter 連接測試需要實現'
      };
    }
  }

  /**
   * 添加事件監聽器
   * 
   * @param {string} event - 事件名稱
   * @param {Function} callback - 回調函數
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
   * 移除事件監聽器
   * 
   * @param {string} event - 事件名稱
   * @param {Function} callback - 回調函數
   */
  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 觸發事件
   * 
   * @private
   * @param {string} event - 事件名稱
   * @param {Object} data - 事件數據
   */
  emit(event, data) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`事件監聽器錯誤 [${event}]:`, error);
        }
      });
    }
  }

  /**
   * 移除所有事件監聽器
   */
  removeAllListeners() {
    this.eventListeners.clear();
  }

  /**
   * 銷毀服務
   */
  destroy() {
    this.removeAllListeners();
    this.bigModelTranslator = null;
    this.openRouterTranslator = null;
  }
}

// 單例模式
let translationServiceInstance = null;

/**
 * 獲取翻譯服務實例（單例）
 * 
 * @param {Object} config - 配置對象
 * @returns {TranslationService} 翻譯服務實例
 */
export function getTranslationService(config) {
  if (!translationServiceInstance) {
    translationServiceInstance = new TranslationService(config);
  }
  return translationServiceInstance;
}

/**
 * 重置翻譯服務實例
 * 用於測試或重新初始化
 */
export function resetTranslationService() {
  if (translationServiceInstance) {
    translationServiceInstance.destroy();
  }
  translationServiceInstance = null;
}

/**
 * 創建新的翻譯服務實例
 * 
 * @param {Object} config - 配置對象
 * @returns {TranslationService} 翻譯服務實例
 */
export function createTranslationService(config) {
  return new TranslationService(config);
}

/**
 * 導出默認實例
 */
export default TranslationService;
