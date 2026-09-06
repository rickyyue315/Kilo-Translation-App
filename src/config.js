/**
 * Kilo Translation App - Configuration File
 * 
 * This file contains application-wide configuration settings
 * for different translation services and features.
 */

// Import constants
import {
    TRANSLATION_SERVICES,
    OPENROUTER_CONFIG
} from './constants.js';

/**
 * Translation Service Configuration
 * Defines configuration for each supported translation service
 */
export const TRANSLATION_SERVICE_CONFIG = {
    [TRANSLATION_SERVICES.OPENROUTER]: {
        name: 'OpenRouter API',
        description: 'High-quality AI translation service',
        apiUrl: OPENROUTER_CONFIG.API_URL,
        defaultModel: 'google/gemini-3.1-flash-lite',
        timeout: 35000,
        retryAttempts: 3,
        retryDelay: 1000
    }
};

/**
 * OpenRouter API Configuration
 * Extended configuration for OpenRouter service
 */
export const OPENROUTER_EXTENDED_CONFIG = {
    // API Configuration
    api: {
        url: OPENROUTER_CONFIG.API_URL,
        timeout: 35000,
        maxRetries: 3,
        retryDelay: 1000
    },
    
    // Model Configuration
    models: {
        default: 'google/gemini-3.1-flash-lite',
        freeOnly: false
    },
    
    // Request Configuration
    request: {
        temperature: 0.3,
        maxTokens: 2000,
        stream: true
    },
    
    // Feature Flags
    features: {
        streaming: true,
        cache: true,
        errorHandling: true,
        serverApiKey: true
    }
};

/**
 * Speech Recognition Configuration
 */
export const SPEECH_CONFIG = {
    continuous: true,
    interimResults: true,
    maxAlternatives: 1,
    lang: 'zh-TW',
    autoRestart: true
};

/**
 * Speech Synthesis Configuration
 */
export const SPEECH_SYNTHESIS_CONFIG = {
    rate: 0.9,
    pitch: 1,
    volume: 1,
    lang: 'zh-TW'
};

/**
 * Application Configuration
 * General application settings
 */
export const APP_CONFIG = {
    // Translation Settings
    translation: {
        defaultService: TRANSLATION_SERVICES.OPENROUTER,
        defaultMode: 'single', // 'single' or 'dual'
        defaultInputMode: 'voice', // 'voice' or 'text'
        defaultStreamMode: true,
        maxTextLength: 5000,
        maxHistoryItems: 50
    },
    
    // Storage Keys
    storage: {
        apiKey: 'openrouter_api_key',
        apiKeySource: 'api_key_source',
        selectedModel: 'selected_ai_model',
        customModel: 'custom_ai_model',
        translationMode: 'translation_mode',
        translationModeType: 'translation_mode_type',
        inputMode: 'input_mode',
        interfaceLanguage: 'interface_language',
        translationHistory: 'translation_history'
    },
    
    // UI Settings
    ui: {
        animationDuration: 600,
        errorDisplayDuration: 3000,
        successDisplayDuration: 2000,
        volumeIndicatorBars: 20
    },
    
    // Feature Flags
    features: {
        voiceRecognition: true,
        speechSynthesis: true,
        textInput: true,
        dualMode: true,
        streaming: true,
        history: true,
        languageSwap: true,
        modelSelection: true
    }
};

/**
 * Get configuration for a specific translation service
 * @param {string} service - The translation service identifier
 * @returns {Object} The service configuration
 */
export function getServiceConfig(service) {
    return TRANSLATION_SERVICE_CONFIG[service] || TRANSLATION_SERVICE_CONFIG[TRANSLATION_SERVICES.OPENROUTER];
}

/**
 * Get OpenRouter configuration
 * @returns {Object} OpenRouter configuration object
 */
export function getOpenRouterConfig() {
    return OPENROUTER_EXTENDED_CONFIG;
}

/**
 * Get speech recognition configuration
 * @returns {Object} Speech recognition configuration
 */
export function getSpeechConfig() {
    return SPEECH_CONFIG;
}

/**
 * Get speech synthesis configuration
 * @returns {Object} Speech synthesis configuration
 */
export function getSpeechSynthesisConfig() {
    return SPEECH_SYNTHESIS_CONFIG;
}

/**
 * Get application configuration
 * @returns {Object} Application configuration
 */
export function getAppConfig() {
    return APP_CONFIG;
}

/**
 * Validate service configuration
 * @param {string} service - The translation service identifier
 * @returns {boolean} True if configuration is valid
 */
export function validateServiceConfig(service) {
    const config = getServiceConfig(service);
    return config && config.apiUrl && config.defaultModel;
}

/**
 * Get available models for a service
 * @param {string} service - The translation service identifier
 * @returns {Array} Array of available model IDs
 */
export function getAvailableModels(service) {
    // For OpenRouter, return empty array (models are dynamically loaded)
    return [];
}

/**
 * Get model category for a service
 * @param {string} service - The translation service identifier
 * @param {string} modelId - The model identifier
 * @returns {string|null} The category of the model
 */
export function getModelCategory(service, modelId) {
    return null;
}

/**
 * Get model description for a service
 * @param {string} service - The translation service identifier
 * @param {string} modelId - The model identifier
 * @returns {string} The model description
 */
export function getModelDescription(service, modelId) {
    return '選擇一個 AI 模型進行翻譯';
}

/**
 * Check if streaming is supported by a service
 * @param {string} service - The translation service identifier
 * @returns {boolean} True if streaming is supported
 */
export function isStreamingSupported(service) {
    const config = getServiceConfig(service);
    return config && config.features && config.features.streaming;
}

/**
 * Check if server API key is supported by a service
 * @param {string} service - The translation service identifier
 * @returns {boolean} True if server API key is supported
 */
export function isServerApiKeySupported(service) {
    const config = getServiceConfig(service);
    return config && config.features && config.features.serverApiKey;
}

/**
 * Get timeout for a service
 * @param {string} service - The translation service identifier
 * @returns {number} Timeout in milliseconds
 */
export function getServiceTimeout(service) {
    const config = getServiceConfig(service);
    return config ? config.timeout : 30000;
}

/**
 * Get retry configuration for a service
 * @param {string} service - The translation service identifier
 * @returns {Object} Retry configuration
 */
export function getRetryConfig(service) {
    const config = getServiceConfig(service);
    return {
        attempts: config ? config.retryAttempts : 3,
        delay: config ? config.retryDelay : 1000
    };
}

/**
 * Merge configuration with user overrides
 * @param {Object} baseConfig - Base configuration object
 * @param {Object} overrides - User-defined overrides
 * @returns {Object} Merged configuration
 */
export function mergeConfig(baseConfig, overrides) {
    return {
        ...baseConfig,
        ...overrides,
        api: {
            ...baseConfig.api,
            ...overrides.api
        },
        request: {
            ...baseConfig.request,
            ...overrides.request
        },
        features: {
            ...baseConfig.features,
            ...overrides.features
        }
    };
}

export default {
    TRANSLATION_SERVICE_CONFIG,
    OPENROUTER_EXTENDED_CONFIG,
    SPEECH_CONFIG,
    SPEECH_SYNTHESIS_CONFIG,
    APP_CONFIG,
    getServiceConfig,
    getOpenRouterConfig,
    getSpeechConfig,
    getSpeechSynthesisConfig,
    getAppConfig,
    validateServiceConfig,
    getAvailableModels,
    getModelCategory,
    getModelDescription,
    isStreamingSupported,
    isServerApiKeySupported,
    getServiceTimeout,
    getRetryConfig,
    mergeConfig
};
