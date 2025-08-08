import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Text, Banner, IconButton } from 'react-native-paper';
import { networkService, NetworkState } from '../services/networkService';
import { useOfflineSync } from '../hooks/useOfflineSync';

interface OfflineIndicatorProps {
  style?: any;
  showBanner?: boolean;
  compact?: boolean;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  style,
  showBanner = true,
  compact = false,
}) => {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isConnected: true,
    type: 'unknown',
    isInternetReachable: true,
  });
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Get initial network state
    const initialState = networkService.getCurrentState();
    setNetworkState(initialState);
    setShowOfflineBanner(!networkService.isOnline());

    // Subscribe to network changes
    const unsubscribe = networkService.addListener((state) => {
      setNetworkState(state);
      const isOffline = !networkService.isOnline();
      setShowOfflineBanner(isOffline);

      // Animate banner appearance/disappearance
      Animated.timing(fadeAnim, {
        toValue: isOffline ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });

    return unsubscribe;
  }, [fadeAnim]);

  const getConnectionStatus = () => {
    if (!networkState.isConnected) {
      return 'No Connection';
    }
    if (networkState.isInternetReachable === false) {
      return 'No Internet';
    }
    if (networkState.isInternetReachable === null) {
      return 'Checking Connection...';
    }
    return 'Connected';
  };

  const getConnectionIcon = () => {
    if (!networkState.isConnected) {
      return 'wifi-off';
    }
    if (networkState.isInternetReachable === false) {
      return 'web-off';
    }
    if (networkState.isInternetReachable === null) {
      return 'wifi-strength-outline';
    }
    return 'wifi';
  };

  const getConnectionColor = () => {
    if (!networkState.isConnected || networkState.isInternetReachable === false) {
      return '#f44336';
    }
    if (networkState.isInternetReachable === null) {
      return '#ff9800';
    }
    return '#4caf50';
  };

  const handleRetryConnection = async () => {
    try {
      await networkService.checkConnection();
    } catch (error) {
      console.error('Failed to check connection:', error);
    }
  };

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <IconButton
          icon={getConnectionIcon()}
          size={16}
          iconColor={getConnectionColor()}
        />
        <Text style={[styles.compactText, { color: getConnectionColor() }]}>
          {getConnectionStatus()}
        </Text>
      </View>
    );
  }

  if (!showBanner || networkService.isOnline()) {
    return null;
  }

  return (
    <Animated.View 
      style={[
        styles.container, 
        style,
        { opacity: fadeAnim }
      ]}
    >
      <Banner
        visible={showOfflineBanner}
        actions={[
          {
            label: 'Retry',
            onPress: handleRetryConnection,
          },
          {
            label: 'Dismiss',
            onPress: () => setShowOfflineBanner(false),
          },
        ]}
        icon={getConnectionIcon()}
        style={[
          styles.banner,
          { backgroundColor: getConnectionColor() + '20' }
        ]}
      >
        <View style={styles.bannerContent}>
          <Text style={styles.bannerTitle}>
            {getConnectionStatus()}
          </Text>
          <Text style={styles.bannerMessage}>
            {!networkState.isConnected 
              ? 'You are not connected to any network. Some features may not work.'
              : 'You are connected to a network but cannot reach the internet. Data may not sync.'
            }
          </Text>
        </View>
      </Banner>
    </Animated.View>
  );
};

// Hook for using network state in components
export const useNetworkState = () => {
  const [networkState, setNetworkState] = useState<NetworkState>(
    networkService.getCurrentState()
  );

  useEffect(() => {
    const unsubscribe = networkService.addListener(setNetworkState);
    return unsubscribe;
  }, []);

  return {
    ...networkState,
    isOnline: networkService.isOnline(),
    checkConnection: networkService.checkConnection,
  };
};

// Offline message component for specific features
interface OfflineMessageProps {
  feature: string;
  message?: string;
  style?: any;
}

export const OfflineMessage: React.FC<OfflineMessageProps> = ({
  feature,
  message,
  style,
}) => {
  const { isOnline } = useNetworkState();

  if (isOnline) {
    return null;
  }

  const defaultMessage = `${feature} requires an internet connection. Please check your connection and try again.`;

  return (
    <View style={[styles.offlineMessageContainer, style]}>
      <IconButton
        icon="wifi-off"
        size={32}
        iconColor="#f44336"
      />
      <Text style={styles.offlineMessageTitle}>
        {feature} Unavailable
      </Text>
      <Text style={styles.offlineMessageText}>
        {message || defaultMessage}
      </Text>
    </View>
  );
};

// Cached data indicator
interface CachedDataIndicatorProps {
  lastUpdated?: Date;
  style?: any;
}

export const CachedDataIndicator: React.FC<CachedDataIndicatorProps> = ({
  lastUpdated,
  style,
}) => {
  const { isOnline } = useNetworkState();

  if (isOnline || !lastUpdated) {
    return null;
  }

  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  return (
    <View style={[styles.cachedIndicator, style]}>
      <IconButton
        icon="cached"
        size={16}
        iconColor="#ff9800"
      />
      <Text style={styles.cachedText}>
        Showing cached data from {formatLastUpdated(lastUpdated)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  banner: {
    elevation: 4,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bannerMessage: {
    fontSize: 14,
    opacity: 0.8,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  compactText: {
    fontSize: 12,
    marginLeft: 4,
  },
  offlineMessageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  offlineMessageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  offlineMessageText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    color: '#666',
  },
  cachedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    margin: 8,
  },
  cachedText: {
    fontSize: 12,
    color: '#e65100',
    marginLeft: 4,
  },
});

export default OfflineIndicator;