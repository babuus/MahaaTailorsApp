import AsyncStorage from '@react-native-async-storage/async-storage';
import { offlineManager, OfflineAction } from '../offlineManager';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiRemove: jest.fn(),
}));

// Mock network service
jest.mock('../networkService', () => ({
  networkService: {
    isOnline: jest.fn(() => true),
    addListener: jest.fn(() => () => {}),
  },
}));

// Mock API service
jest.mock('../api', () => ({
  apiService: {
    createCustomer: jest.fn(),
    updateCustomer: jest.fn(),
    deleteCustomer: jest.fn(),
    createMeasurementConfig: jest.fn(),
    updateMeasurementConfig: jest.fn(),
    deleteMeasurementConfig: jest.fn(),
  },
}));

describe('OfflineManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Offline Queue Management', () => {
    it('should add action to offline queue', async () => {
      const mockQueue: OfflineAction[] = [];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockQueue));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await offlineManager.addToOfflineQueue({
        type: 'CREATE',
        entity: 'customer',
        data: { name: 'Test Customer' },
        maxRetries: 3,
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_queue',
        expect.stringContaining('"type":"CREATE"')
      );
    });

    it('should get offline queue', async () => {
      const mockQueue: OfflineAction[] = [
        {
          id: 'test-id',
          type: 'CREATE',
          entity: 'customer',
          data: { name: 'Test Customer' },
          timestamp: new Date(),
          retryCount: 0,
          maxRetries: 3,
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockQueue));

      const queue = await offlineManager.getOfflineQueue();

      expect(queue).toHaveLength(1);
      expect(queue[0].type).toBe('CREATE');
      expect(queue[0].entity).toBe('customer');
    });

    it('should return empty array when no queue exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const queue = await offlineManager.getOfflineQueue();

      expect(queue).toEqual([]);
    });
  });

  describe('Cache Management', () => {
    it('should cache data with TTL', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await offlineManager.setCachedData('test-key', { data: 'test' }, 60000);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_cache_test-key',
        expect.stringContaining('"data":{"data":"test"}')
      );
    });

    it('should retrieve cached data', async () => {
      const cacheEntry = {
        data: { test: 'data' },
        timestamp: new Date().toISOString(),
        syncStatus: 'synced',
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cacheEntry));

      const result = await offlineManager.getCachedData('test-key');

      expect(result).toBeTruthy();
      expect(result?.data).toEqual({ test: 'data' });
    });

    it('should return null for expired cache', async () => {
      const expiredEntry = {
        data: { test: 'data' },
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() - 1000).toISOString(), // Expired 1 second ago
        syncStatus: 'synced',
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(expiredEntry));
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      const result = await offlineManager.getCachedData('test-key');

      expect(result).toBeNull();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('offline_cache_test-key');
    });
  });

  describe('Convenience Methods', () => {
    it('should cache customers', async () => {
      const customers = [
        {
          id: '1',
          personalDetails: { name: 'Test Customer', phone: '123456789' },
          measurements: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await offlineManager.cacheCustomers(customers);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_cache_customers',
        expect.stringContaining('"personalDetails"')
      );
    });

    it('should get cached customers', async () => {
      const customers = [
        {
          id: '1',
          personalDetails: { name: 'Test Customer', phone: '123456789' },
          measurements: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      const cacheEntry = {
        data: customers,
        timestamp: new Date().toISOString(),
        syncStatus: 'synced',
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cacheEntry));

      const result = await offlineManager.getCachedCustomers();

      expect(result).toEqual(customers);
    });

    it('should return null when no cached customers exist', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await offlineManager.getCachedCustomers();

      expect(result).toBeNull();
    });
  });
});