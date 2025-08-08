import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Card, IconButton } from 'react-native-paper';
import { ApiError } from '../services/errorHandler';

interface NetworkErrorHandlerProps {
  error: ApiError;
  onRetry?: () => void;
  onDismiss?: () => void;
  style?: any;
  compact?: boolean;
}

const NetworkErrorHandler: React.FC<NetworkErrorHandlerProps> = ({
  error,
  onRetry,
  onDismiss,
  style,
  compact = false,
}) => {
  const getErrorIcon = () => {
    switch (error.type) {
      case 'network':
        return 'wifi-off';
      case 'validation':
        return 'alert-circle';
      case 'api':
        return 'server-network-off';
      default:
        return 'alert';
    }
  };

  const getErrorTitle = () => {
    switch (error.type) {
      case 'network':
        return 'Connection Problem';
      case 'validation':
        return 'Invalid Data';
      case 'api':
        return 'Server Error';
      default:
        return 'Error';
    }
  };

  const getUserFriendlyMessage = () => {
    switch (error.type) {
      case 'network':
        return 'Please check your internet connection and try again.';
      case 'validation':
        return error.message;
      case 'api':
        if (error.status === 500) {
          return 'Something went wrong on our end. Please try again later.';
        }
        if (error.status === 503) {
          return 'Service is temporarily unavailable. Please try again later.';
        }
        return error.message;
      default:
        return 'Something went wrong. Please try again.';
    }
  };

  const shouldShowRetry = () => {
    return error.type === 'network' || error.type === 'api';
  };

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <View style={styles.compactContent}>
          <IconButton
            icon={getErrorIcon()}
            size={20}
            iconColor="#d32f2f"
          />
          <Text style={styles.compactMessage} numberOfLines={2}>
            {getUserFriendlyMessage()}
          </Text>
        </View>
        {shouldShowRetry() && onRetry && (
          <Button
            mode="text"
            onPress={onRetry}
            compact
            accessibilityLabel="Retry"
          >
            Retry
          </Button>
        )}
        {onDismiss && (
          <IconButton
            icon="close"
            size={20}
            onPress={onDismiss}
            accessibilityLabel="Dismiss error"
          />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Card style={styles.errorCard}>
        <Card.Content>
          <View style={styles.header}>
            <IconButton
              icon={getErrorIcon()}
              size={32}
              iconColor="#d32f2f"
            />
            <Text style={styles.title}>{getErrorTitle()}</Text>
            {onDismiss && (
              <IconButton
                icon="close"
                size={24}
                onPress={onDismiss}
                style={styles.closeButton}
                accessibilityLabel="Dismiss error"
              />
            )}
          </View>
          
          <Text style={styles.message}>
            {getUserFriendlyMessage()}
          </Text>

          {error.status && (
            <Text style={styles.statusCode}>
              Error Code: {error.status}
            </Text>
          )}

          {shouldShowRetry() && onRetry && (
            <View style={styles.actions}>
              <Button
                mode="contained"
                onPress={onRetry}
                style={styles.retryButton}
                accessibilityLabel="Retry operation"
              >
                Try Again
              </Button>
            </View>
          )}
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  errorCard: {
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginLeft: 8,
    color: '#d32f2f',
  },
  closeButton: {
    margin: 0,
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  statusCode: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
  },
  actions: {
    alignItems: 'center',
    marginTop: 8,
  },
  retryButton: {
    minWidth: 120,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#ffebee',
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#d32f2f',
  },
  compactContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactMessage: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
  },
});

export default NetworkErrorHandler;