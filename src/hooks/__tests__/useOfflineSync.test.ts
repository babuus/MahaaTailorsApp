import { renderHook, act } from '@testing-library/react-native';
import { useOfflineSync } from '../useOfflineSync';
import OfflineManager from '../../services/offlineManager';

// Mock OfflineManager
jest.mock('../../services/offlineManager');
const mockOfflineManager = OfflineManager as jest.Mocked<typeof OfflineManager>;

describe('useOfflineSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockOfflineManager.isOnline.mockReturnValue(true);
    mockOfflineManager.isSyncInProgress.mockReturnValue(false);
    mockOfflineManager.getNetworkState.mockReturnValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    });
    mockOfflineManager.hasPendingChanges.mockResolvedValue(false);
    mockOfflineManager.getLastSyncTimestamp.mockResolvedValue(0);
    mockOfflineManager.getPendingActions.mockResolvedValue([]);
    mockOfflineManager.getOfflineDataSize.mockResolvedValue(0);
    mockOfflineManager.validateOfflineData.mockResolvedValue({
      isValid: true,
      errors: [],
    });
    mockOfflineManager.addNetworkListener.mockReturnValue(() => {});
    mockOfflineManager.addSyncListener.mockReturnValue(() => {});
  });

  it('should initialize with correct default state', async () => {
    const { result } = renderHook(() => useOfflineSync());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isSyncing).toBe(false);
    expect(result.current.hasPendingChanges).toBe(false);
    expect(result.current.pendingActions).toBe(0);
    expect(result.current.syncErrors).toEqual([]);
    expect(result.current.conflicts).toEqual([]);
  });

  it('should load initial data on mount', async () => {
    mockOfflineManager.hasPendingChanges.mockResolvedValue(true);
    mockOfflineManager.getPendingActions.mockResolvedValue([
      { id: '1', type: 'CREATE', entity: 'bill', data: {}, timestamp: new Date(), retryCount: 0 },
      { id: '2', type: 'UPDATE', entity: 'bill', data: {}, timestamp: new Date(), retryCount: 0 },
    ]);
    mockOfflineManager.getLastSyncTimestamp.mockResolvedValue(1640995200000);
    mockOfflineManager.getOfflineDataSize.mockResolvedValue(1024);

    const { result, waitForNextUpdate } = renderHook(() => useOfflineSync());

    await waitForNextUpdate();

    expect(result.current.hasPendingChanges).toBe(true);
    expect(result.current.pendingActions).toBe(2);
    expect(result.current.lastSyncTimestamp).toBe(1640995200000);
    expect(result.current.dataSize).toBe(1024);
  });

  it('should handle network state changes', async () => {
    let networkListener: (state: any) => void;
    mockOfflineManager.addNetworkListener.mockImplementation((listener) => {
      networkListener = listener;
      return () => {};
    });

    const { result } = renderHook(() => useOfflineSync());

    // Simulate network state change
    act(() => {
      networkListener!({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      });
    });

    expect(result.current.isOnline).toBe(false);
    expect(result.current.networkState).toEqual({
      isConnected: false,
      isInternetReachable: false,
      type: 'none',
    });
  });

  it('should handle sync completion', async () => {
    let syncListener: (result: any) => void;
    mockOfflineManager.addSyncListener.mockImplementation((listener) => {
      syncListener = listener;
      return () => {};
    });

    const { result } = renderHook(() => useOfflineSync());

    const syncResult = {
      success: true,
      syncedActions: 3,
      failedActions: [],
      conflicts: [],
    };

    // Simulate sync completion
    act(() => {
      syncListener!(syncResult);
    });

    expect(result.current.isSyncing).toBe(false);
    expect(result.current.syncResult).toEqual(syncResult);
    expect(result.current.syncErrors).toEqual([]);
  });

  it('should handle sync with conflicts', async () => {
    let syncListener: (result: any) => void;
    mockOfflineManager.addSyncListener.mockImplementation((listener) => {
      syncListener = listener;
      return () => {};
    });

    const { result } = renderHook(() => useOfflineSync());

    const conflicts = [
      {
        actionId: 'action1',
        entityType: 'bill',
        entityId: 'bill1',
        localData: { name: 'Local Bill' },
        serverData: { name: 'Server Bill' },
        resolution: 'manual' as const,
      },
    ];

    const syncResult = {
      success: true,
      syncedActions: 2,
      failedActions: [],
      conflicts,
    };

    act(() => {
      syncListener!(syncResult);
    });

    expect(result.current.conflicts).toEqual(conflicts);
  });

  it('should perform manual sync', async () => {
    const syncResult = {
      success: true,
      syncedActions: 5,
      failedActions: [],
      conflicts: [],
    };

    mockOfflineManager.syncPendingActions.mockResolvedValue(syncResult);
    mockOfflineManager.hasPendingChanges.mockResolvedValue(false);
    mockOfflineManager.getPendingActions.mockResolvedValue([]);

    const { result } = renderHook(() => useOfflineSync());

    let syncPromise: Promise<any>;
    act(() => {
      syncPromise = result.current.syncNow();
    });

    expect(result.current.isSyncing).toBe(true);
    expect(result.current.lastSyncAttempt).toBeInstanceOf(Date);

    const actualResult = await syncPromise!;

    expect(actualResult).toEqual(syncResult);
    expect(mockOfflineManager.syncPendingActions).toHaveBeenCalled();
  });

  it('should handle sync errors', async () => {
    const error = new Error('Sync failed');
    mockOfflineManager.syncPendingActions.mockRejectedValue(error);

    const { result } = renderHook(() => useOfflineSync());

    let syncPromise: Promise<any>;
    act(() => {
      syncPromise = result.current.syncNow();
    });

    const actualResult = await syncPromise!;

    expect(actualResult.success).toBe(false);
    expect(result.current.syncErrors).toContain('Sync failed');
    expect(result.current.isSyncing).toBe(false);
  });

  it('should force sync', async () => {
    const syncResult = {
      success: true,
      syncedActions: 3,
      failedActions: [],
      conflicts: [],
    };

    mockOfflineManager.syncPendingActions.mockResolvedValue(syncResult);

    const { result } = renderHook(() => useOfflineSync());

    let forcSyncPromise: Promise<any>;
    act(() => {
      forcSyncPromise = result.current.forcSync();
    });

    expect(result.current.isSyncing).toBe(true);

    const actualResult = await forcSyncPromise!;

    expect(actualResult).toEqual(syncResult);
    expect(mockOfflineManager.syncPendingActions).toHaveBeenCalled();
  });

  it('should clear offline data', async () => {
    mockOfflineManager.clearOfflineData.mockResolvedValue();

    const { result } = renderHook(() => useOfflineSync());

    await act(async () => {
      await result.current.clearOfflineData();
    });

    expect(mockOfflineManager.clearOfflineData).toHaveBeenCalled();
    expect(result.current.hasPendingChanges).toBe(false);
    expect(result.current.pendingActions).toBe(0);
    expect(result.current.lastSyncTimestamp).toBe(0);
    expect(result.current.syncErrors).toEqual([]);
  });

  it('should clear sync errors', () => {
    const { result } = renderHook(() => useOfflineSync());

    // Set some errors first
    act(() => {
      (result.current as any).setState({ syncErrors: ['Error 1', 'Error 2'] });
    });

    act(() => {
      result.current.clearSyncErrors();
    });

    expect(result.current.syncErrors).toEqual([]);
  });

  it('should validate data', async () => {
    const validationResult = {
      isValid: false,
      errors: ['Data corruption detected'],
    };

    mockOfflineManager.validateOfflineData.mockResolvedValue(validationResult);

    const { result } = renderHook(() => useOfflineSync());

    let validatePromise: Promise<any>;
    act(() => {
      validatePromise = result.current.validateData();
    });

    const actualResult = await validatePromise!;

    expect(actualResult).toEqual(validationResult);
    expect(result.current.isDataValid).toBe(false);
    expect(result.current.validationErrors).toEqual(['Data corruption detected']);
  });

  it('should get data size', async () => {
    mockOfflineManager.getOfflineDataSize.mockResolvedValue(2048);

    const { result } = renderHook(() => useOfflineSync());

    let sizePromise: Promise<number>;
    act(() => {
      sizePromise = result.current.getDataSize();
    });

    const size = await sizePromise!;

    expect(size).toBe(2048);
    expect(result.current.dataSize).toBe(2048);
  });

  it('should resolve conflicts', async () => {
    const conflicts = [
      {
        actionId: 'action1',
        entityType: 'bill',
        entityId: 'bill1',
        localData: { name: 'Local' },
        serverData: { name: 'Server' },
        resolution: 'manual' as const,
      },
    ];

    mockOfflineManager.resolveConflict.mockResolvedValue();
    mockOfflineManager.hasPendingChanges.mockResolvedValue(false);
    mockOfflineManager.getPendingActions.mockResolvedValue([]);

    const { result } = renderHook(() => useOfflineSync());

    // Set conflicts first
    act(() => {
      (result.current as any).setState({ conflicts });
    });

    await act(async () => {
      await result.current.resolveConflicts('local');
    });

    expect(mockOfflineManager.resolveConflict).toHaveBeenCalledWith(conflicts[0], 'local');
    expect(result.current.conflicts).toEqual([]);
  });

  it('should refresh offline data', async () => {
    mockOfflineManager.hasPendingChanges.mockResolvedValue(true);
    mockOfflineManager.getPendingActions.mockResolvedValue([
      { id: '1', type: 'CREATE', entity: 'bill', data: {}, timestamp: new Date(), retryCount: 0 },
    ]);
    mockOfflineManager.getOfflineDataSize.mockResolvedValue(512);
    mockOfflineManager.validateOfflineData.mockResolvedValue({
      isValid: true,
      errors: [],
    });

    const { result } = renderHook(() => useOfflineSync());

    await act(async () => {
      await result.current.refreshOfflineData();
    });

    expect(result.current.hasPendingChanges).toBe(true);
    expect(result.current.pendingActions).toBe(1);
    expect(result.current.dataSize).toBe(512);
    expect(result.current.isDataValid).toBe(true);
  });

  it('should handle errors during data loading', async () => {
    mockOfflineManager.hasPendingChanges.mockRejectedValue(new Error('Storage error'));

    const { result, waitForNextUpdate } = renderHook(() => useOfflineSync());

    await waitForNextUpdate();

    expect(result.current.syncErrors).toContain('Failed to load offline data');
  });

  it('should handle errors during conflict resolution', async () => {
    const conflicts = [
      {
        actionId: 'action1',
        entityType: 'bill',
        entityId: 'bill1',
        localData: { name: 'Local' },
        serverData: { name: 'Server' },
        resolution: 'manual' as const,
      },
    ];

    mockOfflineManager.resolveConflict.mockRejectedValue(new Error('Resolve error'));

    const { result } = renderHook(() => useOfflineSync());

    // Set conflicts first
    act(() => {
      (result.current as any).setState({ conflicts });
    });

    await act(async () => {
      await result.current.resolveConflicts('local');
    });

    expect(result.current.syncErrors).toContain('Failed to resolve conflicts');
  });

  it('should handle errors during data refresh', async () => {
    mockOfflineManager.hasPendingChanges.mockRejectedValue(new Error('Refresh error'));

    const { result } = renderHook(() => useOfflineSync());

    await act(async () => {
      await result.current.refreshOfflineData();
    });

    expect(result.current.syncErrors).toContain('Failed to refresh offline data');
  });

  it('should cleanup listeners on unmount', () => {
    const removeNetworkListener = jest.fn();
    const removeSyncListener = jest.fn();

    mockOfflineManager.addNetworkListener.mockReturnValue(removeNetworkListener);
    mockOfflineManager.addSyncListener.mockReturnValue(removeSyncListener);

    const { unmount } = renderHook(() => useOfflineSync());

    unmount();

    expect(removeNetworkListener).toHaveBeenCalled();
    expect(removeSyncListener).toHaveBeenCalled();
  });

  it('should periodically check sync status', async () => {
    jest.useFakeTimers();

    mockOfflineManager.isSyncInProgress
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    const { result } = renderHook(() => useOfflineSync());

    expect(result.current.isSyncing).toBe(false);

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.isSyncing).toBe(true);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.isSyncing).toBe(false);

    jest.useRealTimers();
  });
});