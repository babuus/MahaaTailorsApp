import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  AppState,
  AppStateStatus,
} from 'react-native';
import {
  Modal,
  Portal,
  Card,
  Title,
  Paragraph,
  Button,
  ProgressBar,
  Chip,
  List,
  Divider,
} from 'react-native-paper';
import { updateService, UpdateInfo, UpdateCheckResponse } from '../services/updateService';
import { COLORS } from '../constants';

interface UpdateManagerProps {
  visible: boolean;
  onDismiss: () => void;
  autoCheck?: boolean;
}

export const UpdateManager: React.FC<UpdateManagerProps> = ({
  visible,
  onDismiss,
  autoCheck = true,
}) => {
  const [updates, setUpdates] = useState<UpdateInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [currentUpdate, setCurrentUpdate] = useState<UpdateInfo | null>(null);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (visible && !hasChecked) {
      checkForUpdates();
    }
  }, [visible]);

  useEffect(() => {
    if (autoCheck) {
      const handleAppStateChange = (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          checkForUpdates();
        }
      };

      const subscription = AppState.addEventListener('change', handleAppStateChange);
      return () => subscription?.remove();
    }
  }, [autoCheck]);

  const checkForUpdates = async () => {
    setLoading(true);
    try {
      const response: UpdateCheckResponse = await updateService.checkForUpdates();
      setUpdates(response.updates);
      setHasChecked(true);

      // Show critical updates immediately
      const criticalUpdates = response.updates.filter(update => update.critical);
      if (criticalUpdates.length > 0) {
        showCriticalUpdateAlert(criticalUpdates[0]);
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
      Alert.alert('Update Check Failed', 'Unable to check for updates. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const showCriticalUpdateAlert = (update: UpdateInfo) => {
    Alert.alert(
      'Critical Update Available',
      `A critical update (v${update.version}) is available for ${update.component}. This update is required for security and stability.`,
      [
        {
          text: 'Update Now',
          onPress: () => downloadUpdate(update),
          style: 'default',
        },
        {
          text: 'Later',
          style: 'cancel',
        },
      ],
      { cancelable: !update.critical }
    );
  };

  const downloadUpdate = async (update: UpdateInfo) => {
    setCurrentUpdate(update);
    setDownloading(true);
    setDownloadProgress(0);

    try {
      await updateService.downloadAndApplyUpdate(update);
      
      Alert.alert(
        'Update Complete',
        `${update.component} has been updated to version ${update.version}. Please restart the app to apply changes.`,
        [
          {
            text: 'Restart Later',
            style: 'cancel',
          },
          {
            text: 'Restart Now',
            onPress: () => {
              // In a real app, you'd implement app restart logic here
              Alert.alert('Restart Required', 'Please manually restart the app to complete the update.');
            },
          },
        ]
      );

      // Remove the updated item from the list
      setUpdates(prev => prev.filter(u => u.version !== update.version || u.component !== update.component));
    } catch (error) {
      console.error('Update failed:', error);
      Alert.alert('Update Failed', 'Failed to download and apply update. Please try again.');
    } finally {
      setDownloading(false);
      setCurrentUpdate(null);
      setDownloadProgress(0);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getComponentIcon = (component: string): string => {
    switch (component) {
      case 'screens': return 'monitor';
      case 'components': return 'puzzle';
      case 'services': return 'cog';
      case 'navigation': return 'navigation';
      case 'all': return 'update';
      default: return 'package';
    }
  };

  const renderUpdateItem = (update: UpdateInfo) => (
    <Card key={`${update.component}-${update.version}`} style={styles.updateCard}>
      <Card.Content>
        <View style={styles.updateHeader}>
          <View style={styles.updateInfo}>
            <Title style={styles.updateTitle}>
              {update.component.charAt(0).toUpperCase() + update.component.slice(1)} v{update.version}
            </Title>
            <View style={styles.chipContainer}>
              {update.critical && (
                <Chip icon="alert" mode="flat" style={styles.criticalChip}>
                  Critical
                </Chip>
              )}
              <Chip icon="download" mode="outlined" style={styles.sizeChip}>
                {formatFileSize(update.size)}
              </Chip>
            </View>
          </View>
        </View>
        
        <Paragraph style={styles.description}>{update.description}</Paragraph>
        
        {update.dependencies.length > 0 && (
          <View style={styles.dependenciesContainer}>
            <Paragraph style={styles.dependenciesTitle}>Dependencies:</Paragraph>
            {update.dependencies.map((dep, index) => (
              <Chip key={index} mode="outlined" style={styles.dependencyChip}>
                {dep}
              </Chip>
            ))}
          </View>
        )}
        
        <View style={styles.updateActions}>
          <Button
            mode="contained"
            onPress={() => downloadUpdate(update)}
            disabled={downloading}
            loading={downloading && currentUpdate?.version === update.version}
            style={[styles.updateButton, update.critical && styles.criticalButton]}
          >
            {update.critical ? 'Install Critical Update' : 'Update'}
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>App Updates</Title>
            
            {loading && (
              <View style={styles.loadingContainer}>
                <ProgressBar indeterminate color={COLORS.PRIMARY} />
                <Paragraph style={styles.loadingText}>Checking for updates...</Paragraph>
              </View>
            )}

            {downloading && currentUpdate && (
              <View style={styles.downloadContainer}>
                <Paragraph style={styles.downloadText}>
                  Updating {currentUpdate.component} v{currentUpdate.version}...
                </Paragraph>
                <ProgressBar progress={downloadProgress} color={COLORS.PRIMARY} />
              </View>
            )}

            {!loading && updates.length === 0 && hasChecked && (
              <View style={styles.noUpdatesContainer}>
                <Paragraph style={styles.noUpdatesText}>
                  Your app is up to date! 🎉
                </Paragraph>
              </View>
            )}

            {!loading && updates.length > 0 && (
              <View style={styles.updatesContainer}>
                <Paragraph style={styles.updatesCount}>
                  {updates.length} update{updates.length > 1 ? 's' : ''} available
                </Paragraph>
                {updates.map(renderUpdateItem)}
              </View>
            )}
          </Card.Content>
          
          <Card.Actions style={styles.actions}>
            <Button onPress={checkForUpdates} disabled={loading || downloading}>
              Refresh
            </Button>
            <Button onPress={onDismiss} disabled={downloading}>
              Close
            </Button>
          </Card.Actions>
        </Card>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    margin: 20,
  },
  card: {
    maxHeight: '80%',
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
    color: COLORS.PRIMARY,
  },
  loadingContainer: {
    paddingVertical: 20,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 12,
    color: COLORS.TEXT_SECONDARY,
  },
  downloadContainer: {
    paddingVertical: 16,
    marginBottom: 16,
    backgroundColor: COLORS.BACKGROUND_LIGHT,
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  downloadText: {
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '500',
  },
  noUpdatesContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  noUpdatesText: {
    fontSize: 16,
    textAlign: 'center',
    color: COLORS.TEXT_SECONDARY,
  },
  updatesContainer: {
    maxHeight: 400,
  },
  updatesCount: {
    marginBottom: 16,
    fontWeight: '500',
    color: COLORS.PRIMARY,
  },
  updateCard: {
    marginBottom: 12,
    elevation: 2,
  },
  updateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  updateInfo: {
    flex: 1,
  },
  updateTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  criticalChip: {
    backgroundColor: COLORS.ERROR,
  },
  sizeChip: {
    borderColor: COLORS.PRIMARY,
  },
  description: {
    marginBottom: 12,
    color: COLORS.TEXT_SECONDARY,
  },
  dependenciesContainer: {
    marginBottom: 16,
  },
  dependenciesTitle: {
    fontWeight: '500',
    marginBottom: 8,
  },
  dependencyChip: {
    marginRight: 8,
    marginBottom: 4,
  },
  updateActions: {
    alignItems: 'flex-end',
  },
  updateButton: {
    minWidth: 120,
  },
  criticalButton: {
    backgroundColor: COLORS.ERROR,
  },
  actions: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
});

export default UpdateManager;