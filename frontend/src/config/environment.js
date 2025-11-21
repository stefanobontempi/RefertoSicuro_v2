/**
 * Environment configuration service
 * Handles environment-specific settings and feature flags
 */

// Environment detection
export const ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT || 'development';
export const isDevelopment = ENVIRONMENT === 'development' || import.meta.env.DEV;
export const isStaging = ENVIRONMENT === 'staging';
export const isProduction = ENVIRONMENT === 'production';

// App configuration
export const APP_CONFIG = {
  name: import.meta.env.VITE_APP_NAME || 'RefertoSicuro',
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  environment: ENVIRONMENT,
};

// API configuration with domain detection
const getCurrentDomain = () => {
  if (typeof window !== 'undefined') {
    return window.location.hostname;
  }
  return 'localhost';
};

const isExternalDevDomain = () => {
  const domain = getCurrentDomain();
  return domain.includes('deviusmedical.stech.design') ||
         domain.includes('devadminiusmedical.stech.design');
};

export const API_CONFIG = {
  baseURL: 'http://localhost:8000/api',
  backendURL: 'http://localhost:8000/api',
  timeout: 30000, // 30 seconds
};

// Feature flags
export const FEATURES = {
  debug: import.meta.env.VITE_ENABLE_DEBUG === 'true' || isDevelopment,
  consoleLogs: import.meta.env.VITE_ENABLE_CONSOLE_LOGS === 'true' || isDevelopment,
  publicRegistration: import.meta.env.VITE_ENABLE_PUBLIC_REGISTRATION === 'true',
  analytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  errorReporting: import.meta.env.VITE_ENABLE_ERROR_REPORTING === 'true',
  performanceMonitoring: import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true',

  // Development and testing features
  mockAPI: import.meta.env.VITE_MOCK_API === 'true',
  bypassAuth: import.meta.env.VITE_BYPASS_AUTH === 'true',
  testingMode: import.meta.env.VITE_TESTING_MODE === 'true',
};

// UI configuration
export const UI_CONFIG = {
  defaultTheme: import.meta.env.VITE_DEFAULT_THEME || 'light',
  showEnvironmentBadge: import.meta.env.VITE_SHOW_ENVIRONMENT_BADGE === 'true',
};

// Support and contact
export const SUPPORT_CONFIG = {
  email: import.meta.env.VITE_SUPPORT_EMAIL || 'support@refertosicuro.it',
  url: import.meta.env.VITE_SUPPORT_URL || '/docs',
};

// Environment-specific behavior
export const ENV_BEHAVIORS = {
  // Logging behavior
  enableLogging: isDevelopment || isStaging,
  logLevel: isDevelopment ? 'debug' : isStaging ? 'info' : 'error',

  // Error handling
  showDetailedErrors: isDevelopment,
  reportErrors: isProduction || isStaging,

  // Performance
  enableSourceMaps: isDevelopment,
  enableMinification: !isDevelopment,

  // Security
  enableCSP: isProduction,
  enableHTTPS: isProduction || isStaging,
};

// Environment-specific URLs
export const URLS = {
  base: (() => {
    if (isProduction) return '/api';
    if (isStaging) return '/api';
    return 'http://localhost:5173';
  })(),

  api: API_CONFIG.baseURL,

  admin: (() => {
    if (isProduction) return '/api';
    if (isStaging) return '/api';
    return 'http://localhost:5174';
  })(),

  docs: (() => {
    if (isProduction) return '/docs';
    if (isStaging) return '/docs';
    return 'http://localhost:8000/docs';
  })(),
};

// Debug helper
export const debugLog = (...args) => {
  // Silent - no console output
};

// Environment info for debugging
export const getEnvironmentInfo = () => ({
  environment: ENVIRONMENT,
  isDevelopment,
  isStaging,
  isProduction,
  appConfig: APP_CONFIG,
  apiConfig: API_CONFIG,
  features: FEATURES,
  uiConfig: UI_CONFIG,
  urls: URLS,
  behaviors: ENV_BEHAVIORS,
});

export default {
  ENVIRONMENT,
  isDevelopment,
  isStaging,
  isProduction,
  APP_CONFIG,
  API_CONFIG,
  FEATURES,
  UI_CONFIG,
  SUPPORT_CONFIG,
  ENV_BEHAVIORS,
  URLS,
  debugLog,
  getEnvironmentInfo,
};