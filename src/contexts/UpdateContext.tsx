import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import { updateService, UpdateInfo } from '../services/updateService';
import { useUpdates } from '../hooks/useUpdates';

interface UpdateContextType {
  updates: UpdateInfo[];
  hasUpdates: boolean;
  criticalUpdates: UpdateInfo[];
  loading: boolean;
  error: string | null;
  showUpdateManager: boolean;
  showUpdateNotification: boolean;
  currentNotification: UpdateInfo | null;
  checkForUpdates: () => Promise<void>;
  downloadUpdate: (update: UpdateInfo) => Promise<boolean>;
  setShowUpdateManager: (show: boolean) => void;
  dismissNotification: () => void;
  isUpdateInProgress: boolean;
  currentVersion: string;
}

const UpdateContext = createContext<UpdateContextType | undefined>(undefined);

interface UpdateProviderProps {
  children: ReactNode;
}

export const UpdateProvider: React.FC<UpdateProviderProps> = ({ children }) => {
  const [showUpdateManager, setShowUpdateManager] = useState(false);
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [currentNotification, setCurrentNotification] = useState<UpdateInfo | null>(null);

  const {
    updates,
    hasUpdates,
    criticalUpdates,
    loading,
    error,
    checkForUpdates,
    downloadUpdate,
    isUpdateInProgress,
    currentVersion,
  } = useUpdates(true);

  // Show notification for critical updates
  useEffect(() => {
    if (criticalUpdates.length > 0 && !showUpdateNotification) {
      setCurrentNotification(criticalUpdates[0]);
      setShowUpdateNotification(true);
    }
  }, [criticalUpdates, showUpdateNotification]);

  // Auto-show update manager for non-critical updates
  useEffect(() => {
    if (hasUpdates && criticalUpdates.length === 0 && !showUpdateManager) {
      // Show a subtle notification for non-critical updates
      const nonCriticalUpdates = updates.filter(u => !u.critical);
      if (nonCriticalUpdates.length > 0) {
        setTimeout(() => {
          setCurrentNotification(nonCriticalUpdates[0]);
          setShowUpdateNotification(true);
        }, 2000); // Delay to avoid overwhelming the user
      }
    }
  }, [hasUpdates, criticalUpdates, updates, showUpdateManager]);

  const dismissNotification = () => {
    setShowUpdateNotification(false);
    setCurrentNotification(null);
  };

  const handleUpdateFromNotification = async () => {
    if (currentNotification) {
      dismissNotification();
      try {
        const success = await downloadUpdate(currentNotification);
        if (success) {
          Alert.alert(
            'Update Complete',
            `${currentNotification.component} has been updated successfully. Please restart the app to apply changes.`,
            [
              {
                text: 'Restart Later',
                style: 'cancel',
              },
              {
                text: 'Restart Now',
                onPress: () => {
                  Alert.alert('Restart Required', 'Please manually restart the app to complete the update.');
                },
              },
            ]
          );
        }
      } catch (error) {
        Alert.alert('Update Failed', 'Failed to download and apply update. Please try again.');
      }
    }
  };

  const contextValue: UpdateContextType = {
    updates,
    hasUpdates,
    criticalUpdates,
    loading,
    error,
    showUpdateManager,
    showUpdateNotification,
    currentNotification,
    checkForUpdates,
    downloadUpdate: handleUpdateFromNotification,
    setShowUpdateManager,
    dismissNotification,
    isUpdateInProgress,
    currentVersion,
  };

  return (
    <UpdateContext.Provider value={contextValue}>
      {children}
    </UpdateContext.Provider>
  );
};

export const useUpdateContext = (): UpdateContextType => {
  const context = useContext(UpdateContext);
  if (context === undefined) {
    throw new Error('useUpdateContext must be used within an UpdateProvider');
  }
  return context;
};