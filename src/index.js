/**
 * Kilo Translation App - Unified Module Exports
 *
 * This file serves as the main entry point for all application modules.
 */

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
    description: 'Real-time voice translation application with OpenRouter API support',
    author: 'Kilo Code',
    homepage: 'https://github.com/kilo-code/translation-app'
};

export const SUPPORTED_SERVICES = {
    OPENROUTER: 'openrouter'
};

export const FEATURE_FLAGS = {
    STREAMING_TRANSLATION: true,
    DUAL_MODE: true,
    TEXT_INPUT: true,
    VOICE_RECOGNITION: true,
    SPEECH_SYNTHESIS: true,
    TRANSLATION_HISTORY: true,
    MODEL_SELECTION: true,
    INTERFACE_LANGUAGES: true
};

export function getAvailableServices() {
    return Object.values(SUPPORTED_SERVICES);
}

export function getServiceInfo(serviceId) {
    const services = {
        [SUPPORTED_SERVICES.OPENROUTER]: {
            id: SUPPORTED_SERVICES.OPENROUTER,
            name: 'OpenRouter API',
            description: 'High-quality AI translation service',
            features: ['streaming', 'model-selection', 'server-api-key']
        }
    };

    return services[serviceId] || null;
}

export default {
    VERSION,
    APP_METADATA,
    SUPPORTED_SERVICES,
    FEATURE_FLAGS,
    getAvailableServices,
    getServiceInfo
};
