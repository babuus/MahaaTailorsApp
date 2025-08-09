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
  PRIMARY: '#1565C0', // Deeper, more professional blue
  SECONDARY: '#D4AF37', // Elegant gold instead of yellow
  SUCCESS: '#2E7D32', // Deeper green
  ERROR: '#D32F2F', // Refined red
  WARNING: '#F57C00', // Warmer orange
  INFO: '#0288D1', // Lighter info blue
  ACCENT: '#7E57C2', // Purple accent for highlights
  MINT: '#26A69A', // Mint green for success states
  
  // Background colors
  LIGHT: '#F8F9FA', // Softer light background
  DARK: '#1A1A1A', // Deeper dark background
  BACKGROUND: '#FFFFFF',
  BACKGROUND_LIGHT: '#FFFFFF',
  SURFACE_LIGHT: '#FFFFFF',
  SURFACE_DARK: '#2A2A2A',
  
  // Text colors
  TEXT_PRIMARY: '#1A1A1A',
  TEXT_SECONDARY: '#6B7280',
  TEXT_LIGHT: '#9CA3AF',
  TEXT_DARK_PRIMARY: '#FFFFFF',
  TEXT_DARK_SECONDARY: '#D1D5DB',
  
  // Semantic colors
  ERROR_LIGHT: '#FFEBEE',
  SUCCESS_LIGHT: '#E8F5E8',
  WARNING_LIGHT: '#FFF3E0',
  INFO_LIGHT: '#E3F2FD',
  
  // Border colors
  BORDER_LIGHT: '#E5E7EB',
  BORDER_DARK: '#374151',
} as const;

export const SPACING = {
  XS: 4,
  SM: 8,
  MD: 16,
  LG: 24,
  XL: 32,
  XXL: 48,
} as const;

// Typography system
export const TYPOGRAPHY = {
  // Font sizes
  FONT_SIZE: {
    XS: 12,
    SM: 14,
    MD: 16,
    LG: 18,
    XL: 20,
    XXL: 24,
    XXXL: 28,
    DISPLAY: 32,
  },
  
  // Font weights
  FONT_WEIGHT: {
    LIGHT: '300',
    REGULAR: '400',
    MEDIUM: '500',
    SEMIBOLD: '600',
    BOLD: '700',
  },
  
  // Line heights
  LINE_HEIGHT: {
    TIGHT: 1.2,
    NORMAL: 1.4,
    RELAXED: 1.6,
    LOOSE: 1.8,
  },
} as const;

// Border radius system
export const BORDER_RADIUS = {
  XS: 4,
  SM: 8,
  MD: 12,
  LG: 16,
  XL: 20,
  XXL: 28,
  FULL: 9999,
} as const;

// Form validation
export const VALIDATION = {
  PHONE_MIN_LENGTH: 10,
  NAME_MIN_LENGTH: 2,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;