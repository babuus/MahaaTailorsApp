import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Badge, Snackbar } from 'react-native-paper';
import { MaterialIcon } from './';
import { useOfflineSync } from '../hooks/useOfflineSync';

interface SyncStatusIndicatorProps {
  style?: any;
  compact?: boolean;
  showBadge?: boolean;
}

const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  style,
  compact = false,
  showBadge = true,
}) => {
  const {
    isOnline,
    isSyncing,
    pendingActions,
    lastSyncAttempt,
    lastSuccessfulSync,
    syncErrors,
    syncNow,
    clearSyncErrors,
  } = useOfflineSync();

  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const handleSyncPress = async () => {
    if (!isOnline) {
      setSnackbarMessage('Cannot sync while offline');
      setShowSnackbar(true);
      return;
    }

    if (isSyncing) {
      return; // Already syncing
    }

    try {
      const result = await syncNow();
      if (result.success) {
        setSnackbarMessage(`Synced ${result.syncedActions} actions successfully`);
      } else {
        setSnackbarMessage(`Sync completed with ${result.failedActions} errors`);
      }
      setShowSnackbar(true);
    } catch (error) {
      setSnackbarMessage('Sync failed: ' + (error instanceof Error ? error.message : String(error)));
      setShowSnackbar(true);
    }
  };

  const getSyncIcon = () => {
    if (!isOnline) return 'cloudOff';
    if (isSyncing) return 'sync';
    if (syncErrors.length > 0) return 'syncAlert';
    if (pendingActions > 0) return 'cloudUpload';
    return 'cloudCheck';
  };

  const getSyncColor = () => {
    if (!isOnline) return '#757575';
    if (isSyncing) return '#2196f3';
    if (syncErrors.length > 0) return '#f44336';
    if (pendingActions > 0) return '#ff9800';
    return '#4caf50';
  };

  const getSyncStatus = () => {
    if (!isOnline) return 'Offline';
    if (isSyncing) return 'Syncing...';
    if (syncErrors.length > 0) return 'Sync Error';
    if (pendingActions > 0) return `${pendingActions} Pending`;
    return 'Synced';
  };

  const formatLastSync = (date?: Date) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <TouchableOpacity
          onPress={handleSyncPress}
          disabled={isSyncing || !isOnline}
          style={styles.compactButton}
        >
          <MaterialIcon
            name={getSyncIcon()}
            size={16}
            color={getSyncColor()}
            style={styles.compactIcon}
          />
          {showBadge && pendingActions > 0 && (
            <Badge
              size={16}
              style={[styles.badge, { backgroundColor: getSyncColor() }]}
            >
              {pendingActions}
            </Badge>
          )}
        </TouchableOpacity>
        
        <Snackbar
          visible={showSnackbar}
          onDismiss={() => setShowSnackbar(false)}
          duration={3000}
        >
          {snackbarMessage}
        </Snackbar>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        onPress={handleSyncPress}
        disabled={isSyncing || !isOnline}
        style={styles.syncButton}
      >
        <View style={styles.syncContent}>
          <MaterialIcon
            name={getSyncIcon()}
            size={24}
            color={getSyncColor()}
            style={[
              styles.syncIcon,
              isSyncing && styles.syncingIcon,
            ]}
          />
          
          <View style={styles.syncInfo}>
            <Text style={[styles.syncStatus, { color: getSyncColor() }]}>
              {getSyncStatus()}
            </Text>
            
            {lastSuccessfulSync && (
              <Text style={styles.lastSync}>
                Last sync: {formatLastSync(lastSuccessfulSync)}
              </Text>
            )}
            
            {syncErrors.length > 0 && (
              <TouchableOpacity onPress={clearSyncErrors}>
                <Text style={styles.errorText}>
                  {syncErrors.length} error{syncErrors.length > 1 ? 's' : ''} (tap to clear)
                </Text>
              </TouchableOpacity>
            )}
          </View>
          
          {showBadge && pendingActions > 0 && (
            <Badge
              size={20}
              style={[styles.badge, { backgroundColor: getSyncColor() }]}
            >
              {pendingActions}
            </Badge>
          )}
        </View>
      </TouchableOpacity>
      
      <Snackbar
        visible={showSnackbar}
        onDismiss={() => setShowSnackbar(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

// Sync status bar for showing at the top of screens
interface SyncStatusBarProps {
  style?: any;
}

export const SyncStatusBar: React.FC<SyncStatusBarProps> = ({ style }) => {
  const { isOnline, isSyncing, pendingActions, syncErrors } = useOfflineSync();

  // Don't show if online and no pending actions or errors
  if (isOnline && pendingActions === 0 && syncErrors.length === 0 && !isSyncing) {
    return null;
  }

  const getBarColor = () => {
    if (!isOnline) return '#757575';
    if (syncErrors.length > 0) return '#f44336';
    if (pendingActions > 0) return '#ff9800';
    return '#2196f3';
  };

  const getBarMessage = () => {
    if (!isOnline) return 'You are offline. Changes will sync when connection is restored.';
    if (isSyncing) return 'Syncing changes...';
    if (syncErrors.length > 0) return `${syncErrors.length} sync error${syncErrors.length > 1 ? 's' : ''}`;
    if (pendingActions > 0) return `${pendingActions} change${pendingActions > 1 ? 's' : ''} waiting to sync`;
    return '';
  };

  return (
    <View style={[styles.statusBar, { backgroundColor: getBarColor() + '20' }, style]}>
      <MaterialIcon
        name={!isOnline ? 'wifiOff' : isSyncing ? 'sync' : syncErrors.length > 0 ? 'warning' : 'cloudUpload'}
        size={16}
        color={getBarColor()}
      />
      <Text style={[styles.statusBarText, { color: getBarColor() }]}>
        {getBarMessage()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
  compactContainer: {
    position: 'relative',
  },
  compactButton: {
    position: 'relative',
  },
  compactIcon: {
    margin: 0,
  },
  syncButton: {
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f5f5f5',
  },
  syncContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncIcon: {
    margin: 0,
    marginRight: 8,
  },
  syncingIcon: {
    // Add rotation animation if needed
  },
  syncInfo: {
    flex: 1,
  },
  syncStatus: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  lastSync: {
    fontSize: 12,
    color: '#666',
  },
  errorText: {
    fontSize: 12,
    color: '#f44336',
    textDecorationLine: 'underline',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statusBarText: {
    fontSize: 14,
    flex: 1,
    marginLeft: 8,
  },
});

export default SyncStatusIndicator;