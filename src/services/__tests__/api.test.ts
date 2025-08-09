import { apiService } from '../api';
import { API_CONFIG } from '../apiConfig';
import { ApiServiceError, NetworkError } from '../errorHandler';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiRemove: jest.fn(),
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(() => Promise.resolve({
    isConnected: true,
    type: 'wifi',
    isInternetReachable: true,
  })),
}));

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  })),
  isAxiosError: jest.fn(),
}));

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should have correct default configuration', () => {
      // Should use environment-based configuration
      expect(API_CONFIG.BASE_URL).toBeDefined();
      expect(API_CONFIG.BASE_URL).toContain('amazonaws.com');
      expect(API_CONFIG.TIMEOUT).toBe(15000);
      expect(API_CONFIG.RETRY_ATTEMPTS).toBe(3);
      expect(API_CONFIG.RETRY_DELAY).toBe(1000);
    });
  });

  describe('Customer API', () => {
    it('should have all required customer methods', () => {
      expect(typeof apiService.getCustomers).toBe('function');
      expect(typeof apiService.getCustomerById).toBe('function');
      expect(typeof apiService.createCustomer).toBe('function');
      expect(typeof apiService.updateCustomer).toBe('function');
      expect(typeof apiService.deleteCustomer).toBe('function');
      // checkCustomerExists method was removed as it doesn't exist in backend
      // expect(typeof apiService.checkCustomerExists).toBe('function');
    });
  });

  describe('Measurement Config API', () => {
    it('should have all required measurement config methods', () => {
      expect(typeof apiService.getMeasurementConfigs).toBe('function');
      expect(typeof apiService.getMeasurementConfigById).toBe('function');
      expect(typeof apiService.createMeasurementConfig).toBe('function');
      expect(typeof apiService.updateMeasurementConfig).toBe('function');
      expect(typeof apiService.deleteMeasurementConfig).toBe('function');
    });
  });

  describe('Services API', () => {
    it('should have all required service methods', () => {
      expect(typeof apiService.getServices).toBe('function');
      expect(typeof apiService.getServiceById).toBe('function');
      expect(typeof apiService.createService).toBe('function');
      expect(typeof apiService.updateService).toBe('function');
      expect(typeof apiService.deleteService).toBe('function');
    });
  });

  describe('Utility methods', () => {
    it('should have utility methods', () => {
      expect(typeof apiService.clearCache).toBe('function');
      expect(typeof apiService.ping).toBe('function');
    });
  });
});

describe('Error Handling', () => {
  it('should export error classes', () => {
    expect(ApiServiceError).toBeDefined();
    expect(NetworkError).toBeDefined();
  });

  it('should create proper error instances', () => {
    const apiError = new ApiServiceError('Test error', 400, 'TEST_CODE', 'validation');
    expect(apiError.message).toBe('Test error');
    expect(apiError.status).toBe(400);
    expect(apiError.code).toBe('TEST_CODE');
    expect(apiError.type).toBe('validation');

    const networkError = new NetworkError('Network error');
    expect(networkError.message).toBe('Network error');
    expect(networkError.name).toBe('NetworkError');
  });
});