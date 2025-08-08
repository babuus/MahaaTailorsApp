import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Card, IconButton } from 'react-native-paper';
import { ApiError } from '../services/errorHandler';

interface RetryHandlerProps {
  error: ApiError;
  onRetry: () => Promise<void>;
  maxRetries?: number;
  retryDelay?: number;
  onMaxRetriesReached?: () => void;
  style?: any;
}

const RetryHandler: React.FC<RetryHandlerProps> = ({
  error,
  onRetry,
  maxRetries = 3,
  retryDelay = 1000,
  onMaxRetriesReached,
  style,
}) => {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(0);

  const handleRetry = useCallback(async () => {
    if (retryCount >= maxRetries) {
      onMaxRetriesReached?.();
      return;
    }

    setIsRetrying(true);
    
    try {
      await onRetry();
      // Reset retry count on successful retry
      setRetryCount(0);
    } catch (retryError) {
      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);
      
      if (newRetryCount >= maxRetries) {
        onMaxRetriesReached?.();
      } else {
        // Start countdown for next retry
        const delay = retryDelay * Math.pow(2, newRetryCount - 1); // Exponential backoff
        setRetryCountdown(Math.ceil(delay / 1000));
        
        const countdownInterval = setInterval(() => {
          setRetryCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } finally {
      setIsRetrying(false);
    }
  }, [retryCount, maxRetries, onRetry, retryDelay, onMaxRetriesReached]);

  const canRetry = retryCount < maxRetries && !isRetrying && retryCountdown === 0;
  const hasReachedMaxRetries = retryCount >= maxRetries;

  return (
    <View style={[styles.container, style]}>
      <Card style={styles.retryCard}>
        <Card.Content>
          <View style={styles.header}>
            <IconButton
              icon="refresh"
              size={24}
              iconColor={hasReachedMaxRetries ? '#666' : '#2196f3'}
            />
            <Text style={styles.title}>
              {hasReachedMaxRetries ? 'Max Retries Reached' : 'Retry Operation'}
            </Text>
          </View>

          <Text style={styles.errorMessage}>
            {error.message}
          </Text>

          <View style={styles.retryInfo}>
            <Text style={styles.retryCount}>
              Attempts: {retryCount}/{maxRetries}
            </Text>
            
            {retryCountdown > 0 && (
              <Text style={styles.countdown}>
                Next retry in {retryCountdown}s
              </Text>
            )}
          </View>

          <View style={styles.actions}>
            {!hasReachedMaxRetries && (
              <Button
                mode="contained"
                onPress={handleRetry}
                disabled={!canRetry}
                loading={isRetrying}
                style={styles.retryButton}
                accessibilityLabel={`Retry operation (${retryCount}/${maxRetries} attempts)`}
              >
                {isRetrying ? 'Retrying...' : 
                 retryCountdown > 0 ? `Retry in ${retryCountdown}s` : 
                 'Retry'}
              </Button>
            )}
            
            {hasReachedMaxRetries && (
              <Text style={styles.maxRetriesText}>
                Unable to complete operation after {maxRetries} attempts.
                Please check your connection and try again later.
              </Text>
            )}
          </View>
        </Card.Content>
      </Card>
    </View>
  );
};

// Hook for managing retry logic
export const useRetry = (
  operation: () => Promise<void>,
  maxRetries: number = 3,
  retryDelay: number = 1000
) => {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const executeWithRetry = useCallback(async () => {
    setIsRetrying(true);
    setError(null);
    
    let currentRetry = 0;
    
    while (currentRetry <= maxRetries) {
      try {
        await operation();
        setRetryCount(0);
        setIsRetrying(false);
        return;
      } catch (err) {
        const error = err as Error;
        setError(error);
        currentRetry++;
        setRetryCount(currentRetry);
        
        if (currentRetry <= maxRetries) {
          // Wait before retrying with exponential backoff
          const delay = retryDelay * Math.pow(2, currentRetry - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    setIsRetrying(false);
  }, [operation, maxRetries, retryDelay]);

  const reset = useCallback(() => {
    setRetryCount(0);
    setIsRetrying(false);
    setError(null);
  }, []);

  return {
    executeWithRetry,
    retryCount,
    isRetrying,
    error,
    hasReachedMaxRetries: retryCount >= maxRetries,
    reset,
  };
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  retryCard: {
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    flex: 1,
  },
  errorMessage: {
    fontSize: 14,
    marginBottom: 12,
    color: '#666',
  },
  retryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  retryCount: {
    fontSize: 12,
    color: '#666',
  },
  countdown: {
    fontSize: 12,
    color: '#2196f3',
    fontWeight: 'bold',
  },
  actions: {
    alignItems: 'center',
  },
  retryButton: {
    minWidth: 120,
  },
  maxRetriesText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#d32f2f',
    lineHeight: 20,
  },
});

export default RetryHandler;