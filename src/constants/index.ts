// App constants and configuration

export const APP_NAME = 'Mahaa Tailors';
export const APP_VERSION = '1.0.0';

// API Endpoints
export const API_ENDPOINTS = {
  CUSTOMERS: '/customers',
  MEASUREMENT_CONFIGS: '/measurement-configs',
  SERVICES: '/services',
  BILLS: '/bills',
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  CUSTOMERS: '@customers',
  MEASUREMENT_CONFIGS: '@measurement_configs',
  USER_PREFERENCES: '@user_preferences',
  OFFLINE_QUEUE: '@offline_queue',
} as const;

// UI Constants
export const COLORS = {
  PRIMARY: '#2196F3',
  SECONDARY: '#FFC107',
  SUCCESS: '#4CAF50',
  ERROR: '#F44336',
  WARNING: '#FF9800',
  INFO: '#2196F3',
  LIGHT: '#F5F5F5',
  DARK: '#212121',
  BACKGROUND: '#FAFAFA',
  BACKGROUND_LIGHT: '#FFFFFF',
  TEXT_PRIMARY: '#212121',
  TEXT_SECONDARY: '#757575',
  ERROR_LIGHT: '#FFEBEE',
} as const;

export const SPACING = {
  XS: 4,
  SM: 8,
  MD: 16,
  LG: 24,
  XL: 32,
} as const;

// Form validation
export const VALIDATION = {
  PHONE_MIN_LENGTH: 10,
  NAME_MIN_LENGTH: 2,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;