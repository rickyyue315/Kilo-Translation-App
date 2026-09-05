/**
 * Kilo Translation App - Unified Module Exports
 * 
 * This file serves as the main entry point for all application modules.
 * It exports all translation-related modules and utilities.
 */

// Export translation services
export { BigModelTranslator } from './translation/BigModelTranslator.js';
export { TranslationService } from './translation/TranslationService.js';
export { BigModelASR, getBigModelASR } from './translation/BigModelASR.js';
export { BigModelASRClient, getBigModelASRClient, quickTranscribe } from './translation/BigModelASRClient.js';

// Export constants
export * from './constants.js';

// Export configuration
export * from './config.js';

// Export utilities
export * from './utils.js';

/**
 * Application Version
 */
export const VERSION = '2.0.0';

/**
 * Application Metadata
 */
export const APP_METADATA = {
    name: 'Kilo Translation App',
    version: VERSION,
    description: 'Real-time voice translation application with BigModel API support',
    author: 'Kilo Code',
    homepage: 'https://github.com/kilo-code/translation-app'
};

/**
 * Supported Translation Services
 */
export const SUPPORTED_SERVICES = {
    OPENROUTER: 'openrouter',
    BIGMODEL: 'bigmodel'
};

/**
 * Feature Flags
 */
export const FEATURE_FLAGS = {
    BIGMODEL_TRANSLATION: true,
    STREAMING_TRANSLATION: true,
    DUAL_MODE: true,
    TEXT_INPUT: true,
    VOICE_RECOGNITION: true,
    SPEECH_SYNTHESIS: true,
    TRANSLATION_HISTORY: true,
    MODEL_SELECTION: true,
    INTERFACE_LANGUAGES: true
};

/**
 * Initialize all services
 * This function can be called to set up translation services
 * @param {Object} config - Configuration options
 * @returns {Promise<TranslationService>} Initialized translation service
 */
export async function initializeTranslationService(config = {}) {
    const {
        service = 'openrouter',
        apiKey = '',
        model = null,
        options = {}
    } = config;
    
    const translationService = new TranslationService({
        service,
        apiKey,
        model,
        ...options
    });
    
    await translationService.init();
    
    return translationService;
}

/**
 * Get available translation services
 * @returns {Array} Array of available service identifiers
 */
export function getAvailableServices() {
    return Object.values(SUPPORTED_SERVICES);
}

/**
 * Get service information
 * @param {string} serviceId - Service identifier
 * @returns {Object} Service information
 */
export function getServiceInfo(serviceId) {
    const services = {
        [SUPPORTED_SERVICES.OPENROUTER]: {
            id: SUPPORTED_SERVICES.OPENROUTER,
            name: 'OpenRouter API',
            description: 'High-quality AI translation service',
            features: ['streaming', 'model-selection', 'server-api-key']
        },
        [SUPPORTED_SERVICES.BIGMODEL]: {
            id: SUPPORTED_SERVICES.BIGMODEL,
            name: 'BigModel API',
            description: 'Real-time translation service by Zhipu AI',
            features: ['streaming', 'model-selection', 'real-time-translation']
        }
    };
    
    return services[serviceId] || null;
}

export default {
    VERSION,
    APP_METADATA,
    SUPPORTED_SERVICES,
    FEATURE_FLAGS,
    BigModelTranslator,
    TranslationService,
    initializeTranslationService,
    getAvailableServices,
    getServiceInfo
};
