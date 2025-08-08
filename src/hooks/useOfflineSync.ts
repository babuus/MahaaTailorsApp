import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { offlineManager, SyncResult, OfflineAction } from '../services/offlineManager';
import { networkService } from '../services/networkService';

export interface OfflineSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingActions: number;
  lastSyncAttempt?: Date;
  lastSuccessfulSync?: Date;
  syncErrors: Array<{ action: OfflineAction; error: string }>;
}

export interface OfflineSyncActions {
  syncNow: () => Promise<SyncResult>;
  clearSyncErrors: () => void;
  refreshSyncStatus: () => Promise<void>;
}

export const useOfflineSync = (): OfflineSyncState & OfflineSyncActions => {
  const [state, setState] = useState<OfflineSyncState>({
    isOnline: networkService.isOnline(),
    isSyncing: false,
    pendingActions: 0,
    syncErrors: [],
  });

  // Refresh sync status from storage
  const refreshSyncStatus = useCallback(async () => {
    try {
      const syncStatus = await offlineManager.getSyncStatus();
      const queueSize = await offlineManager.getQueueSize();
      
      setState(prev => ({
        ...prev,
        pendingActions: queueSize,
        lastSyncAttempt: syncStatus.lastSyncAttempt,
        lastSuccessfulSync: syncStatus.lastSuccessfulSync,
      }));
    } catch (error) {
      console.error('Failed to refresh sync status:', error);
    }
  }, []);

  // Sync now function
  const syncNow = useCallback(async (): Promise<SyncResult> => {
    if (!networkService.isOnline()) {
      throw new Error('Cannot sync while offline');
    }

    setState(prev => ({ ...prev, isSyncing: true, syncErrors: [] }));

    try {
      const result = await offlineManager.syncOfflineData();
      
      setState(prev => ({
        ...prev,
        isSyncing: false,
        syncErrors: result.errors,
      }));

      // Refresh status after sync
      await refreshSyncStatus();
      
      return result;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isSyncing: false,
        syncErrors: [{ 
          action: {} as OfflineAction, 
          error: error instanceof Error ? error.message : String(error) 
        }],
      }));
      throw error;
    }
  }, [refreshSyncStatus]);

  // Clear sync errors
  const clearSyncErrors = useCallback(() => {
    setState(prev => ({ ...prev, syncErrors: [] }));
  }, []);

  useEffect(() => {
    // Initialize sync status
    refreshSyncStatus();

    // Listen to network changes
    const unsubscribeNetwork = networkService.addListener((networkState) => {
      setState(prev => ({
        ...prev,
        isOnline: networkService.isOnline(),
      }));
    });

    // Listen to sync results
    const unsubscribeSync = offlineManager.addSyncListener(async (result) => {
      setState(prev => ({
        ...prev,
        isSyncing: false,
        syncErrors: result.errors,
      }));
      
      // Refresh status after sync - use inline async function to avoid dependency issues
      try {
        const syncStatus = await offlineManager.getSyncStatus();
        const queueSize = await offlineManager.getQueueSize();
        
        setState(prev => ({
          ...prev,
          pendingActions: queueSize,
          lastSyncAttempt: syncStatus.lastSyncAttempt,
          lastSuccessfulSync: syncStatus.lastSuccessfulSync,
        }));
      } catch (error) {
        console.error('Failed to refresh sync status after sync:', error);
      }
    });

    // Start auto-sync
    offlineManager.startAutoSync();

    return () => {
      unsubscribeNetwork();
      unsubscribeSync();
    };
  }, []); // Remove refreshSyncStatus from dependencies

  return {
    ...state,
    syncNow,
    clearSyncErrors,
    refreshSyncStatus,
  };
};

// Hook for checking if data is cached/offline
export const useOfflineData = <T>(
  key: string,
  fetchFn: () => Promise<T>,
  dependencies: any[] = []
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(networkService.isOnline());

  // Track dependencies to avoid unnecessary re-renders
  const dependenciesRef = useRef(dependencies);
  const keyRef = useRef(key);
  const fetchFnRef = useRef(fetchFn);

  // Update refs when values change
  useEffect(() => {
    dependenciesRef.current = dependencies;
    keyRef.current = key;
    fetchFnRef.current = fetchFn;
  });

  const loadData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      // Try to get cached data first
      const cachedEntry = await offlineManager.getCachedData<T>(keyRef.current);
      
      if (cachedEntry && !forceRefresh) {
        setData(cachedEntry.data);
        setIsFromCache(true);
        setLastUpdated(cachedEntry.timestamp);
        setLoading(false);
        
        // If online, try to refresh in background
        if (networkService.isOnline()) {
          try {
            const freshData = await fetchFnRef.current();
            await offlineManager.setCachedData(keyRef.current, freshData);
            setData(freshData);
            setIsFromCache(false);
            setLastUpdated(new Date());
          } catch (refreshError) {
            // Ignore refresh errors if we have cached data
            console.warn('Failed to refresh data, using cached version:', refreshError);
          }
        }
      } else {
        // No cached data or force refresh
        if (networkService.isOnline()) {
          const freshData = await fetchFnRef.current();
          await offlineManager.setCachedData(keyRef.current, freshData);
          setData(freshData);
          setIsFromCache(false);
          setLastUpdated(new Date());
        } else {
          throw new Error('No cached data available and device is offline');
        }
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }, []);

  // Check if dependencies have actually changed
  const dependenciesChanged = useMemo(() => {
    if (!dependenciesRef.current) return true;
    if (dependenciesRef.current.length !== dependencies.length) return true;
    return dependenciesRef.current.some((dep, index) => dep !== dependencies[index]);
  }, [dependencies]);

  // Initial load and dependency-based reloads
  useEffect(() => {
    loadData();
  }, [loadData, dependenciesChanged]);

  // Listen to network changes
  useEffect(() => {
    const unsubscribe = networkService.addListener((networkState) => {
      setIsOnline(networkService.isOnline());
    });

    return unsubscribe;
  }, []);

  return {
    data,
    loading,
    error,
    isFromCache,
    lastUpdated,
    refresh: () => loadData(true),
    refetch: () => loadData(false),
  };
};

// Hook for offline-aware mutations
export const useOfflineMutation = <TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    entity: 'customer' | 'measurementConfig' | 'customerMeasurement';
    type: 'CREATE' | 'UPDATE' | 'DELETE';
    maxRetries?: number;
    onSuccess?: (data: TData) => void;
    onError?: (error: Error) => void;
    optimisticUpdate?: (variables: TVariables) => void;
    rollbackUpdate?: (variables: TVariables) => void;
  }
) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { isOnline } = useOfflineSync();

  const mutate = useCallback(async (variables: TVariables): Promise<TData | null> => {
    setLoading(true);
    setError(null);

    try {
      // Apply optimistic update if provided
      if (options.optimisticUpdate) {
        options.optimisticUpdate(variables);
      }

      if (isOnline) {
        // Online: execute mutation immediately
        const result = await mutationFn(variables);
        options.onSuccess?.(result);
        setLoading(false);
        return result;
      } else {
        // Offline: queue the action
        await offlineManager.addToOfflineQueue({
          type: options.type,
          entity: options.entity,
          data: variables,
          maxRetries: options.maxRetries || 3,
          originalId: (variables as any).id || (variables as any).originalId,
        });

        // Simulate success for offline operations
        options.onSuccess?.(variables as any);
        setLoading(false);
        return null; // Return null to indicate offline operation
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      
      // Rollback optimistic update if provided
      if (options.rollbackUpdate) {
        options.rollbackUpdate(variables);
      }
      
      setError(error);
      options.onError?.(error);
      setLoading(false);
      throw error;
    }
  }, [mutationFn, options, isOnline]);

  return {
    mutate,
    loading,
    error,
    reset: () => {
      setError(null);
      setLoading(false);
    },
  };
};