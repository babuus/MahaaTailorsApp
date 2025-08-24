import { useState, useEffect, useCallback, useRef } from 'react';
import OfflineManager, { SyncResult, ConflictResolution } from '../services/offlineManager';
import { NetworkState } from '../types';

export interface OfflineSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  hasPendingChanges: boolean;
  pendingActions: number;
  lastSyncTimestamp: number;
  lastSuccessfulSync: Date | null;
  lastSyncAttempt: Date | null;
  syncResult: SyncResult | null;
  syncErrors: string[];
  networkState: NetworkState;
  conflicts: ConflictResolution[];
  dataSize: number;
  isDataValid: boolean;
  validationErrors: string[];
}

export interface OfflineSyncActions {
  syncNow: () => Promise<SyncResult>;
  clearOfflineData: () => Promise<void>;
  clearSyncErrors: () => void;
  validateData: () => Promise<{ isValid: boolean; errors: string[] }>;
  getDataSize: () => Promise<number>;
  resolveConflicts: (resolution: 'local' | 'server' | 'merge') => Promise<void>;
  forcSync: () => Promise<SyncResult>;
  refreshOfflineData: () => Promise<void>;
}

export const useOfflineSync = (): OfflineSyncState & OfflineSyncActions => {
  const [state, setState] = useState<OfflineSyncState>({
    isOnline: OfflineManager.isOnline(),
    isSyncing: OfflineManager.isSyncInProgress(),
    hasPendingChanges: false,
    pendingActions: 0,
    lastSyncTimestamp: 0,
    lastSuccessfulSync: null,
    lastSyncAttempt: null,
    syncResult: null,
    syncErrors: [],
    networkState: OfflineManager.getNetworkState(),
    conflicts: [],
    dataSize: 0,
    isDataValid: true,
    validationErrors: [],
  });

  const updateState = useCallback((updates: Partial<OfflineSyncState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const loadInitialData = useCallback(async () => {
    try {
      const [
        hasPendingChanges,
        lastSyncTimestamp,
        pendingActions,
        dataSize,
        validationResult
      ] = await Promise.all([
        OfflineManager.hasPendingChanges(),
        OfflineManager.getLastSyncTimestamp(),
        OfflineManager.getPendingActions().then(actions => actions.length),
        OfflineManager.getOfflineDataSize(),
        OfflineManager.validateOfflineData(),
      ]);

      updateState({
        hasPendingChanges,
        pendingActions,
        lastSyncTimestamp,
        lastSuccessfulSync: lastSyncTimestamp > 0 ? new Date(lastSyncTimestamp) : null,
        dataSize,
        isDataValid: validationResult.isValid,
        validationErrors: validationResult.errors,
      });
    } catch (error) {
      console.error('Error loading initial offline sync data:', error);
      updateState({
        syncErrors: ['Failed to load offline data'],
      });
    }
  }, [updateState]);

  useEffect(() => {
    loadInitialData();

    // Set up network state listener
    const removeNetworkListener = OfflineManager.addNetworkListener((networkState) => {
      updateState({
        isOnline: networkState.isConnected && networkState.isInternetReachable,
        networkState,
      });
    });

    // Set up sync listener
    const removeSyncListener = OfflineManager.addSyncListener((syncResult) => {
      updateState({
        isSyncing: false,
        syncResult,
        lastSyncTimestamp: Date.now(),
      });

      // Refresh pending changes status
      OfflineManager.hasPendingChanges().then(hasPendingChanges => {
        updateState({ hasPendingChanges });
      });
    });

    return () => {
      removeNetworkListener();
      removeSyncListener();
    };
  }, [loadInitialData, updateState]);

  // Periodically check sync status
  useEffect(() => {
    const interval = setInterval(() => {
      const isSyncing = OfflineManager.isSyncInProgress();
      if (state.isSyncing !== isSyncing) {
        updateState({ isSyncing });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [state.isSyncing, updateState]);

  const syncNow = useCallback(async (): Promise<SyncResult> => {
    updateState({
      isSyncing: true,
      syncResult: null,
      lastSyncAttempt: new Date(),
      syncErrors: []
    });

    try {
      const result = await OfflineManager.syncPendingActions();

      updateState({
        lastSuccessfulSync: result.success ? new Date() : state.lastSuccessfulSync,
        conflicts: result.conflicts,
        syncErrors: result.success ? [] : ['Sync completed with errors'],
      });

      // Refresh data after sync
      await refreshOfflineData();

      return result;
    } catch (error) {
      console.error('Error during manual sync:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      const errorResult: SyncResult = {
        success: false,
        syncedActions: 0,
        failedActions: [],
        conflicts: [],
      };

      updateState({
        isSyncing: false,
        syncResult: errorResult,
        syncErrors: [errorMessage]
      });

      return errorResult;
    }
  }, [updateState, state.lastSuccessfulSync]);

  const forcSync = useCallback(async (): Promise<SyncResult> => {
    // Force sync even if already syncing
    updateState({
      isSyncing: true,
      syncResult: null,
      lastSyncAttempt: new Date(),
      syncErrors: []
    });

    try {
      const result = await OfflineManager.syncPendingActions();

      updateState({
        lastSuccessfulSync: result.success ? new Date() : state.lastSuccessfulSync,
        conflicts: result.conflicts,
        syncErrors: result.success ? [] : ['Force sync completed with errors'],
      });

      await refreshOfflineData();
      return result;
    } catch (error) {
      console.error('Error during force sync:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown force sync error';
      const errorResult: SyncResult = {
        success: false,
        syncedActions: 0,
        failedActions: [],
        conflicts: [],
      };

      updateState({
        isSyncing: false,
        syncResult: errorResult,
        syncErrors: [errorMessage]
      });

      return errorResult;
    }
  }, [updateState, state.lastSuccessfulSync]);

  const clearOfflineData = useCallback(async (): Promise<void> => {
    try {
      await OfflineManager.clearOfflineData();
      updateState({
        hasPendingChanges: false,
        pendingActions: 0,
        lastSyncTimestamp: 0,
        lastSuccessfulSync: null,
        lastSyncAttempt: null,
        syncResult: null,
        syncErrors: [],
        conflicts: [],
        dataSize: 0,
        isDataValid: true,
        validationErrors: [],
      });
    } catch (error) {
      console.error('Error clearing offline data:', error);
      updateState({
        syncErrors: ['Failed to clear offline data'],
      });
      throw error;
    }
  }, [updateState]);

  const clearSyncErrors = useCallback(() => {
    updateState({ syncErrors: [] });
  }, [updateState]);

  const validateData = useCallback(async () => {
    try {
      const result = await OfflineManager.validateOfflineData();
      updateState({
        isDataValid: result.isValid,
        validationErrors: result.errors,
      });
      return result;
    } catch (error) {
      console.error('Error validating data:', error);
      const errorResult = {
        isValid: false,
        errors: ['Failed to validate offline data'],
      };
      updateState({
        isDataValid: false,
        validationErrors: errorResult.errors,
      });
      return errorResult;
    }
  }, [updateState]);

  const getDataSize = useCallback(async () => {
    try {
      const size = await OfflineManager.getOfflineDataSize();
      updateState({ dataSize: size });
      return size;
    } catch (error) {
      console.error('Error getting data size:', error);
      return 0;
    }
  }, [updateState]);

  const resolveConflicts = useCallback(async (resolution: 'local' | 'server' | 'merge') => {
    try {
      for (const conflict of state.conflicts) {
        await OfflineManager.resolveConflict(conflict, resolution);
      }

      updateState({ conflicts: [] });
      await refreshOfflineData();
    } catch (error) {
      console.error('Error resolving conflicts:', error);
      updateState({
        syncErrors: [...state.syncErrors, 'Failed to resolve conflicts'],
      });
    }
  }, [state.conflicts, state.syncErrors, updateState]);

  const refreshOfflineData = useCallback(async () => {
    try {
      const [
        hasPendingChanges,
        pendingActions,
        dataSize,
        validationResult
      ] = await Promise.all([
        OfflineManager.hasPendingChanges(),
        OfflineManager.getPendingActions().then(actions => actions.length),
        OfflineManager.getOfflineDataSize(),
        OfflineManager.validateOfflineData(),
      ]);

      updateState({
        hasPendingChanges,
        pendingActions,
        dataSize,
        isDataValid: validationResult.isValid,
        validationErrors: validationResult.errors,
      });
    } catch (error) {
      console.error('Error refreshing offline data:', error);
      updateState({
        syncErrors: [...state.syncErrors, 'Failed to refresh offline data'],
      });
    }
  }, [updateState, state.syncErrors]);

  // Return combined state and actions
  return {
    ...state,
    syncNow,
    forcSync,
    clearOfflineData,
    clearSyncErrors,
    validateData,
    getDataSize,
    resolveConflicts,
    refreshOfflineData,
  };
};

// Hook for offline data fetching with caching
export const useOfflineData = <T>(
  key: string,
  fetchFn: () => Promise<T>,
  deps?: any[] | {
    refetchOnMount?: boolean;
    staleTime?: number;
  }
) => {
  // Handle both array deps and options object for backward compatibility
  const options = Array.isArray(deps) ? {} : deps;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const hasFetchedRef = useRef(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      // Try to get cached data first
      const cachedData = await OfflineManager.getCachedData<T>(key);

      if (cachedData && !isRefresh) {
        setData(cachedData);
        setIsLoading(false);
        return; // Don't fetch fresh data in background to avoid re-render loops
      }

      // Fetch fresh data if online
      if (OfflineManager.isOnline()) {
        try {
          const freshData = await fetchFn();
          await OfflineManager.setCachedData(key, freshData);
          setData(freshData);
        } catch (err) {
          // If fetch fails but we have cached data, use cached data
          if (cachedData) {
            setData(cachedData);
          } else {
            throw err;
          }
        }
      } else {
        if (!cachedData) {
          // No cached data and offline - set empty data instead of error for better UX
          setData(null);
        } else {
          // Use cached data when offline
          setData(cachedData);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [key, fetchFn]);

  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  const refetch = useCallback(() => {
    return fetchData(false);
  }, [fetchData]);

  useEffect(() => {
    if (options?.refetchOnMount !== false && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchData();
    }
  }, [key, fetchData]); // Include fetchData but use ref to prevent multiple calls

  return {
    data,
    loading: isLoading, // Alias for backward compatibility
    isLoading,
    error,
    isRefreshing,
    isFromCache: data !== null && !isLoading, // Simple heuristic
    lastUpdated: data ? new Date() : null, // Placeholder
    refresh,
    refetch,
  };
};

// Hook for offline mutations with queuing
export const useOfflineMutation = <TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    entity?: string;
    type?: string;
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
    onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void;
    optimisticUpdate?: (variables: TVariables) => void;
    rollbackUpdate?: () => void;
  }
) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (variables: TVariables) => {
    setIsLoading(true);
    setError(null);

    try {
      let result: TData;

      if (OfflineManager.isOnline()) {
        // Execute immediately if online
        result = await mutationFn(variables);
        options?.onSuccess?.(result, variables);
      } else {
        // Apply optimistic update if provided
        options?.optimisticUpdate?.(variables);

        // Queue for later execution if offline
        await OfflineManager.queueAction({
          type: options?.type || 'mutation',
          payload: {
            entity: options?.entity || 'unknown',
            mutationFn: mutationFn.toString(),
            variables
          },
          timestamp: Date.now(),
        });

        // Return a placeholder result for offline mutations
        result = {} as TData;
        options?.onSuccess?.(result, variables);
      }

      options?.onSettled?.(result, null, variables);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown mutation error');
      setError(error);

      // Rollback optimistic update on error
      options?.rollbackUpdate?.();

      options?.onError?.(error, variables);
      options?.onSettled?.(undefined, error, variables);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [mutationFn, options]);

  return {
    mutate,
    isLoading,
    error,
  };
};

export default useOfflineSync;