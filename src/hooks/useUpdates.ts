import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { updateService, UpdateInfo, UpdateCheckResponse } from '../services/updateService';

interface UseUpdatesReturn {
  updates: UpdateInfo[];
  hasUpdates: boolean;
  criticalUpdates: UpdateInfo[];
  loading: boolean;
  error: string | null;
  checkForUpdates: () => Promise<void>;
  downloadUpdate: (update: UpdateInfo) => Promise<boolean>;
  isUpdateInProgress: boolean;
  currentVersion: string;
}

export const useUpdates = (autoCheck: boolean = true): UseUpdatesReturn => {
  const [updates, setUpdates] = useState<UpdateInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUpdateInProgress, setIsUpdateInProgress] = useState(false);
  const [currentVersion, setCurrentVersion] = useState('0.0.1');

  const checkForUpdates = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response: UpdateCheckResponse = await updateService.checkForUpdates();
      setUpdates(response.updates);
      setCurrentVersion(response.current_version);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check for updates';
      setError(errorMessage);
      console.error('Update check failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadUpdate = useCallback(async (update: UpdateInfo): Promise<boolean> => {
    setIsUpdateInProgress(true);
    setError(null);

    try {
      const success = await updateService.downloadAndApplyUpdate(update);
      
      if (success) {
        // Remove the updated item from the list
        setUpdates(prev => 
          prev.filter(u => !(u.version === update.version && u.component === update.component))
        );
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download update';
      setError(errorMessage);
      console.error('Update download failed:', err);
      return false;
    } finally {
      setIsUpdateInProgress(false);
    }
  }, []);

  // Auto-check for updates when app becomes active
  useEffect(() => {
    if (autoCheck) {
      const handleAppStateChange = (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          checkForUpdates();
        }
      };

      // Initial check
      checkForUpdates();

      const subscription = AppState.addEventListener('change', handleAppStateChange);
      return () => subscription?.remove();
    }
  }, [autoCheck, checkForUpdates]);

  // Load current version on mount
  useEffect(() => {
    const loadCurrentVersion = async () => {
      try {
        const version = await updateService.getCurrentVersion();
        setCurrentVersion(version);
      } catch (err) {
        console.error('Failed to load current version:', err);
      }
    };

    loadCurrentVersion();
  }, []);

  const hasUpdates = updates.length > 0;
  const criticalUpdates = updates.filter(update => update.critical);

  return {
    updates,
    hasUpdates,
    criticalUpdates,
    loading,
    error,
    checkForUpdates,
    downloadUpdate,
    isUpdateInProgress,
    currentVersion,
  };
};