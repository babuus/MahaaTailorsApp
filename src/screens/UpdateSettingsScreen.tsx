import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Switch,
  List,
  Button,
  Divider,
  Chip,
  ProgressBar,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants';
import { updateService, ComponentUpdate } from '../services/updateService';
import { useUpdates } from '../hooks/useUpdates';

export const UpdateSettingsScreen: React.FC = () => {
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(true);
  const [wifiOnlyEnabled, setWifiOnlyEnabled] = useState(true);
  const [criticalUpdatesOnly, setCriticalUpdatesOnly] = useState(false);
  const [updateHistory, setUpdateHistory] = useState<ComponentUpdate[]>([]);
  const [cacheSize, setCacheSize] = useState(0);
  const [clearingCache, setClearingCache] = useState(false);

  const {
    updates,
    hasUpdates,
    criticalUpdates,
    loading,
    error,
    checkForUpdates,
    currentVersion,
  } = useUpdates(false);

  useEffect(() => {
    loadSettings();
    loadUpdateHistory();
    calculateCacheSize();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.multiGet([
        'auto_update_enabled',
        'wifi_only_enabled',
        'critical_updates_only',
      ]);

      settings.forEach(([key, value]) => {
        if (value !== null) {
          const boolValue = value === 'true';
          switch (key) {
            case 'auto_update_enabled':
              setAutoUpdateEnabled(boolValue);
              break;
            case 'wifi_only_enabled':
              setWifiOnlyEnabled(boolValue);
              break;
            case 'critical_updates_only':
              setCriticalUpdatesOnly(boolValue);
              break;
          }
        }
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const loadUpdateHistory = async () => {
    try {
      const history = await updateService.getUpdateHistory();
      setUpdateHistory(history);
    } catch (error) {
      console.error('Failed to load update history:', error);
    }
  };

  const calculateCacheSize = async () => {
    try {
      // This is a simplified cache size calculation
      // In a real app, you'd calculate the actual size of cached files
      setCacheSize(Math.random() * 50 * 1024 * 1024); // Random size for demo
    } catch (error) {
      console.error('Failed to calculate cache size:', error);
    }
  };

  const saveSetting = async (key: string, value: boolean) => {
    try {
      await AsyncStorage.setItem(key, value.toString());
    } catch (error) {
      console.error(`Failed to save setting ${key}:`, error);
    }
  };

  const handleAutoUpdateToggle = (value: boolean) => {
    setAutoUpdateEnabled(value);
    saveSetting('auto_update_enabled', value);
  };

  const handleWifiOnlyToggle = (value: boolean) => {
    setWifiOnlyEnabled(value);
    saveSetting('wifi_only_enabled', value);
  };

  const handleCriticalOnlyToggle = (value: boolean) => {
    setCriticalUpdatesOnly(value);
    saveSetting('critical_updates_only', value);
  };

  const clearUpdateCache = async () => {
    Alert.alert(
      'Clear Update Cache',
      'This will remove all downloaded update files. You may need to re-download updates.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setClearingCache(true);
            try {
              await updateService.clearUpdateCache();
              setCacheSize(0);
              Alert.alert('Success', 'Update cache cleared successfully.');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear update cache.');
            } finally {
              setClearingCache(false);
            }
          },
        },
      ]
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <ScrollView style={styles.container}>
      {/* Current Version */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Current Version</Title>
          <View style={styles.versionContainer}>
            <Paragraph style={styles.versionText}>v{currentVersion}</Paragraph>
            {hasUpdates && (
              <Chip icon="update" mode="flat" style={styles.updateAvailableChip}>
                {updates.length} update{updates.length > 1 ? 's' : ''} available
              </Chip>
            )}
          </View>
          <Button
            mode="outlined"
            onPress={checkForUpdates}
            loading={loading}
            style={styles.checkButton}
          >
            Check for Updates
          </Button>
          {error && (
            <Paragraph style={styles.errorText}>{error}</Paragraph>
          )}
        </Card.Content>
      </Card>

      {/* Update Settings */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Update Settings</Title>
          
          <List.Item
            title="Auto-update"
            description="Automatically download and install updates"
            right={() => (
              <Switch
                value={autoUpdateEnabled}
                onValueChange={handleAutoUpdateToggle}
                color={COLORS.PRIMARY}
              />
            )}
          />
          
          <List.Item
            title="Wi-Fi only"
            description="Only download updates when connected to Wi-Fi"
            right={() => (
              <Switch
                value={wifiOnlyEnabled}
                onValueChange={handleWifiOnlyToggle}
                color={COLORS.PRIMARY}
              />
            )}
          />
          
          <List.Item
            title="Critical updates only"
            description="Only show notifications for critical updates"
            right={() => (
              <Switch
                value={criticalUpdatesOnly}
                onValueChange={handleCriticalOnlyToggle}
                color={COLORS.PRIMARY}
              />
            )}
          />
        </Card.Content>
      </Card>

      {/* Available Updates */}
      {hasUpdates && (
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Available Updates</Title>
            {criticalUpdates.length > 0 && (
              <View style={styles.criticalUpdatesContainer}>
                <Paragraph style={styles.criticalUpdatesText}>
                  {criticalUpdates.length} critical update{criticalUpdates.length > 1 ? 's' : ''} available
                </Paragraph>
              </View>
            )}
            <Paragraph style={styles.updatesCount}>
              {updates.length} total update{updates.length > 1 ? 's' : ''} available
            </Paragraph>
          </Card.Content>
        </Card>
      )}

      {/* Update History */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Update History</Title>
          {updateHistory.length === 0 ? (
            <Paragraph style={styles.noHistoryText}>No updates installed yet</Paragraph>
          ) : (
            updateHistory.slice(0, 5).map((update, index) => (
              <View key={index}>
                <List.Item
                  title={`${update.name} v${update.version}`}
                  description={`Updated on ${formatDate(update.version)}`}
                  left={(props) => <List.Icon {...props} icon="check-circle" color={COLORS.SUCCESS} />}
                />
                {index < updateHistory.length - 1 && <Divider />}
              </View>
            ))
          )}
        </Card.Content>
      </Card>

      {/* Storage & Cache */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Storage & Cache</Title>
          <List.Item
            title="Update cache size"
            description={formatFileSize(cacheSize)}
            right={() => (
              <Button
                mode="outlined"
                onPress={clearUpdateCache}
                loading={clearingCache}
                compact
              >
                Clear
              </Button>
            )}
          />
          {clearingCache && (
            <ProgressBar indeterminate color={COLORS.PRIMARY} style={styles.progressBar} />
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: COLORS.PRIMARY,
  },
  versionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  versionText: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 12,
  },
  updateAvailableChip: {
    backgroundColor: COLORS.WARNING,
  },
  checkButton: {
    alignSelf: 'flex-start',
  },
  errorText: {
    color: COLORS.ERROR,
    marginTop: 8,
    fontSize: 12,
  },
  criticalUpdatesContainer: {
    backgroundColor: COLORS.ERROR_LIGHT,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  criticalUpdatesText: {
    color: COLORS.ERROR,
    fontWeight: '500',
  },
  updatesCount: {
    color: COLORS.TEXT_SECONDARY,
  },
  noHistoryText: {
    color: COLORS.TEXT_SECONDARY,
    fontStyle: 'italic',
  },
  progressBar: {
    marginTop: 8,
  },
});

export default UpdateSettingsScreen;