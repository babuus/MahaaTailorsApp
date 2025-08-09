// Environment-based configuration
// This file can be dynamically updated during build/deployment

export interface EnvironmentConfig {
  API_BASE_URL: string;
  ENVIRONMENT: 'development' | 'production';
  TIMEOUT: number;
  RETRY_ATTEMPTS: number;
  RETRY_DELAY: number;
}

// Environment detection - will be updated by deploy script
const DEPLOYMENT_ENVIRONMENT = 'development'; // This will be replaced by deploy script

// Default configuration - will be updated by deploy script
export const ENV_CONFIG: EnvironmentConfig = {
  API_BASE_URL: DEPLOYMENT_ENVIRONMENT === 'development'
    ? 'https://hkz1miqelc.execute-api.ap-south-1.amazonaws.com/Prod' // Development
    : 'https://j4wtfrpivd.execute-api.ap-south-1.amazonaws.com/Prod', // Production
  ENVIRONMENT: DEPLOYMENT_ENVIRONMENT === 'development' ? 'development' : 'production',
  TIMEOUT: 15000, // Increased timeout for mobile networks
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

// Export individual values for backward compatibility
export const API_BASE_URL = ENV_CONFIG.API_BASE_URL;
export const ENVIRONMENT = ENV_CONFIG.ENVIRONMENT;
export const TIMEOUT = ENV_CONFIG.TIMEOUT;
export const RETRY_ATTEMPTS = ENV_CONFIG.RETRY_ATTEMPTS;
export const RETRY_DELAY = ENV_CONFIG.RETRY_DELAY;