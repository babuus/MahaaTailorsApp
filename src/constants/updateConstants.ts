export const UPDATE_CONSTANTS = {
  // Update check intervals (in milliseconds)
  CHECK_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
  CRITICAL_CHECK_INTERVAL: 4 * 60 * 60 * 1000, // 4 hours for critical updates
  
  // Update types
  UPDATE_TYPES: {
    CRITICAL: 'critical',
    NORMAL: 'normal',
    OPTIONAL: 'optional',
  },
  
  // Component types
  COMPONENTS: {
    ALL: 'all',
    SCREENS: 'screens',
    COMPONENTS: 'components',
    SERVICES: 'services',
    NAVIGATION: 'navigation',
    UTILS: 'utils',
    CONSTANTS: 'constants',
  },
  
  // Storage keys
  STORAGE_KEYS: {
    APP_VERSION: 'app_version',
    LAST_UPDATE_CHECK: 'last_update_check',
    UPDATE_SETTINGS: 'update_settings',
    UPDATE_HISTORY: 'update_history',
    AUTO_UPDATE_ENABLED: 'auto_update_enabled',
    WIFI_ONLY_ENABLED: 'wifi_only_enabled',
    CRITICAL_UPDATES_ONLY: 'critical_updates_only',
  },
  
  // File size limits
  MAX_UPDATE_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_CACHE_SIZE: 500 * 1024 * 1024, // 500MB
  
  // Network timeouts
  DOWNLOAD_TIMEOUT: 5 * 60 * 1000, // 5 minutes
  CHECK_TIMEOUT: 30 * 1000, // 30 seconds
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000, // 2 seconds
};