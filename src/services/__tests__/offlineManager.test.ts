import OfflineManager from '../offlineManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createMockBill, createMockBillItem } from '../../test-utils/mockData';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/netinfo');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;

describe('OfflineManager', () => {
  let offlineManager: typeof OfflineManager;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton instance
    (OfflineManager as any).instance = undefined;
    offlineManager = OfflineManager;

    // Default mock implementations
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
    mockAsyncStorage.multiRemove.mockResolvedValue();
    
    mockNetInfo.addEventListener.mockReturnValue(() => {});
  });

  describe('Network State Management', () => {
    it('should initialize with default network state', () => {
      const networkState = offlineManager.getNetworkState();
      
      expect(networkState).toEqual({
        isConnected: false,
        isInternetReachable: false,
        type: 'unknown',
      });
    });

    it('should update network state when connection changes', () => {
      const mockListener = jest.fn();
      offlineManager.addNetworkListener(mockListener);

      // Simulate network state change
      const netInfoCallback = mockNetInfo.addEventListener.mock.calls[0][0];
      netInfoCallback({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });

      expect(mockListener).toHaveBeenCalledWith({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });
    });

    it('should return correct online status', () => {
      // Initially offline
      expect(offlineManager.isOnline()).toBe(false);

      // Simulate going online
      const netInfoCallback = mockNetInfo.addEventListener.mock.calls[0][0];
      netInfoCallback({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });

      expect(offlineManager.isOnline()).toBe(true);
    });

    it('should remove network listeners correctly', () => {
      const mockListener = jest.fn();
      const removeListener = offlineManager.addNetworkListener(mockListener);

      removeListener();

      // Simulate network state change
      const netInfoCallback = mockNetInfo.addEventListener.mock.calls[0][0];
      netInfoCallback({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });

      expect(mockListener).not.toHaveBeenCalled();
    });
  });

  describe('Offline Data Management', () => {
    it('should save and retrieve offline data', async () => {
      const mockData = {
        bills: [createMockBill()],
        billingConfigItems: [],
        receivedItemTemplates: [],
        customers: [],
        lastSyncTimestamp: Date.now(),
      };

      await offlineManager.saveOfflineData(mockData);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@billing_offline_data',
        JSON.stringify(mockData)
      );
    });

    it('should merge partial data updates', async () => {
      const existingData = {
        bills: [createMockBill({ id: '1' })],
        billingConfigItems: [],
        receivedItemTemplates: [],
        customers: [],
        lastSyncTimestamp: 1000,
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingData));

      const partialUpdate = {
        bills: [createMockBill({ id: '2' })],
      };

      await offlineManager.saveOfflineData(partialUpdate);

      const savedData = JSON.parse(mockAsyncStorage.setItem.mock.calls[0][1]);
      expect(savedData.bills).toEqual(partialUpdate.bills);
      expect(savedData.billingConfigItems).toEqual(existingData.billingConfigItems);
      expect(savedData.lastSyncTimestamp).toBeGreaterThan(existingData.lastSyncTimestamp);
    });

    it('should handle missing offline data gracefully', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const data = await offlineManager.getOfflineData();

      expect(data).toBeNull();
    });

    it('should handle corrupted offline data', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('invalid json');

      const data = await offlineManager.getOfflineData();

      expect(data).toBeNull();
    });

    it('should clear all offline data', async () => {
      await offlineManager.clearOfflineData();

      expect(mockAsyncStorage.multiRemove).toHaveBeenCalledWith([
        '@billing_offline_data',
        '@billing_pending_actions',
        '@billing_last_sync',
      ]);
    });
  });

  describe('Pending Actions Management', () => {
    it('should add pending actions', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('[]');

      await offlineManager.addPendingAction({
        type: 'CREATE',
        entity: 'bill',
        data: { customerId: 'customer1' },
      });

      const savedActions = JSON.parse(mockAsyncStorage.setItem.mock.calls[0][1]);
      expect(savedActions).toHaveLength(1);
      expect(savedActions[0]).toMatchObject({
        type: 'CREATE',
        entity: 'bill',
        data: { customerId: 'customer1' },
        retryCount: 0,
      });
      expect(savedActions[0].id).toMatch(/^offline_/);
      expect(savedActions[0].timestamp).toBeInstanceOf(Date);
    });

    it('should retrieve pending actions', async () => {
      const mockActions = [
        {
          id: 'action1',
          type: 'CREATE',
          entity: 'bill',
          data: { customerId: 'customer1' },
          timestamp: new Date(),
          retryCount: 0,
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockActions));

      const actions = await offlineManager.getPendingActions();

      expect(actions).toEqual(mockActions);
    });

    it('should remove pending actions', async () => {
      const mockActions = [
        { id: 'action1', type: 'CREATE', entity: 'bill', data: {} },
        { id: 'action2', type: 'UPDATE', entity: 'bill', data: {} },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockActions));

      await offlineManager.removePendingAction('action1');

      const savedActions = JSON.parse(mockAsyncStorage.setItem.mock.calls[0][1]);
      expect(savedActions).toHaveLength(1);
      expect(savedActions[0].id).toBe('action2');
    });

    it('should update pending actions', async () => {
      const mockActions = [
        { id: 'action1', type: 'CREATE', entity: 'bill', data: {}, retryCount: 0 },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockActions));

      await offlineManager.updatePendingAction('action1', { retryCount: 1 });

      const savedActions = JSON.parse(mockAsyncStorage.setItem.mock.calls[0][1]);
      expect(savedActions[0].retryCount).toBe(1);
    });

    it('should handle empty pending actions', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const actions = await offlineManager.getPendingActions();

      expect(actions).toEqual([]);
    });
  });

  describe('Sync Management', () => {
    it('should not sync when offline', async () => {
      // Ensure offline state
      expect(offlineManager.isOnline()).toBe(false);

      const result = await offlineManager.syncPendingActions();

      expect(result).toEqual({
        success: false,
        syncedActions: 0,
        failedActions: [],
        conflicts: [],
      });
    });

    it('should not sync when already syncing', async () => {
      // Mock online state
      const netInfoCallback = mockNetInfo.addEventListener.mock.calls[0][0];
      netInfoCallback({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });

      // Start first sync
      const syncPromise1 = offlineManager.syncPendingActions();
      
      // Try to start second sync while first is in progress
      const syncPromise2 = offlineManager.syncPendingActions();

      const [result1, result2] = await Promise.all([syncPromise1, syncPromise2]);

      expect(result2).toEqual({
        success: false,
        syncedActions: 0,
        failedActions: [],
        conflicts: [],
      });
    });

    it('should track sync status correctly', () => {
      expect(offlineManager.isSyncInProgress()).toBe(false);
    });

    it('should notify sync listeners', async () => {
      const mockListener = jest.fn();
      offlineManager.addSyncListener(mockListener);

      // Mock online state
      const netInfoCallback = mockNetInfo.addEventListener.mock.calls[0][0];
      netInfoCallback({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });

      mockAsyncStorage.getItem.mockResolvedValue('[]'); // No pending actions

      await offlineManager.syncPendingActions();

      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          syncedActions: 0,
          failedActions: [],
          conflicts: [],
        })
      );
    });

    it('should remove sync listeners correctly', async () => {
      const mockListener = jest.fn();
      const removeListener = offlineManager.addSyncListener(mockListener);

      removeListener();

      // Mock online state and sync
      const netInfoCallback = mockNetInfo.addEventListener.mock.calls[0][0];
      netInfoCallback({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });

      mockAsyncStorage.getItem.mockResolvedValue('[]');

      await offlineManager.syncPendingActions();

      expect(mockListener).not.toHaveBeenCalled();
    });
  });

  describe('Utility Methods', () => {
    it('should get last sync timestamp', async () => {
      const timestamp = Date.now();
      mockAsyncStorage.getItem.mockResolvedValue(timestamp.toString());

      const result = await offlineManager.getLastSyncTimestamp();

      expect(result).toBe(timestamp);
    });

    it('should return 0 for missing sync timestamp', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await offlineManager.getLastSyncTimestamp();

      expect(result).toBe(0);
    });

    it('should check for pending changes', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('[{\"id\": \"action1\"}]');

      const hasPending = await offlineManager.hasPendingChanges();

      expect(hasPending).toBe(true);
    });

    it('should return false for no pending changes', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('[]');

      const hasPending = await offlineManager.hasPendingChanges();

      expect(hasPending).toBe(false);
    });

    it('should calculate offline data size', async () => {
      const mockOfflineData = {
        bills: [createMockBill()],
        billingConfigItems: [],
        receivedItemTemplates: [],
        customers: [],
        lastSyncTimestamp: 0,
      };
      const mockPendingActions = [{ id: 'action1', type: 'CREATE' }];

      mockAsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify(mockOfflineData))
        .mockResolvedValueOnce(JSON.stringify(mockPendingActions));

      const size = await offlineManager.getOfflineDataSize();

      const expectedSize = JSON.stringify(mockOfflineData).length + 
                          JSON.stringify(mockPendingActions).length;
      expect(size).toBe(expectedSize);
    });
  });

  describe('Data Validation', () => {
    it('should validate correct offline data structure', async () => {
      const validData = {
        bills: [],
        billingConfigItems: [],
        receivedItemTemplates: [],
        customers: [],
        lastSyncTimestamp: 0,
      };

      mockAsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify(validData))
        .mockResolvedValueOnce('[]');

      const result = await offlineManager.validateOfflineData();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect corrupted offline data', async () => {
      const invalidData = {
        bills: 'not an array',
        billingConfigItems: [],
        receivedItemTemplates: [],
        customers: [],
        lastSyncTimestamp: 0,
      };

      mockAsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify(invalidData))
        .mockResolvedValueOnce('[]');

      const result = await offlineManager.validateOfflineData();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Bills data is corrupted');
    });

    it('should handle validation errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const result = await offlineManager.validateOfflineData();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Data validation error: Storage error');
    });

    it('should validate pending actions structure', async () => {
      mockAsyncStorage.getItem
        .mockResolvedValueOnce('null')
        .mockResolvedValueOnce('not valid json');

      const result = await offlineManager.validateOfflineData();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Pending actions data is corrupted');
    });
  });

  describe('Auto-sync on Network Recovery', () => {
    it('should trigger sync when coming back online', () => {
      const syncSpy = jest.spyOn(offlineManager, 'syncPendingActions');

      // Simulate going from offline to online
      const netInfoCallback = mockNetInfo.addEventListener.mock.calls[0][0];
      
      // First offline
      netInfoCallback({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      });

      // Then online
      netInfoCallback({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });

      expect(syncSpy).toHaveBeenCalled();
    });

    it('should not trigger sync when already online', () => {
      const syncSpy = jest.spyOn(offlineManager, 'syncPendingActions');

      // Simulate staying online
      const netInfoCallback = mockNetInfo.addEventListener.mock.calls[0][0];
      
      netInfoCallback({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });

      netInfoCallback({
        isConnected: true,
        isInternetReachable: true,
        type: 'cellular',
      });

      expect(syncSpy).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle AsyncStorage errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const data = await offlineManager.getOfflineData();

      expect(data).toBeNull();
    });

    it('should handle save errors gracefully', async () => {
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Save error'));

      await expect(offlineManager.saveOfflineData({ bills: [] })).rejects.toThrow('Save error');
    });

    it('should handle network listener errors gracefully', () => {
      const mockListener = jest.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      
      offlineManager.addNetworkListener(mockListener);

      // Should not throw when listener throws
      const netInfoCallback = mockNetInfo.addEventListener.mock.calls[0][0];
      expect(() => {
        netInfoCallback({
          isConnected: true,
          isInternetReachable: true,
          type: 'wifi',
        });
      }).not.toThrow();
    });
  });
});