import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text, ProgressBar } from 'react-native-paper';
import { useAccessibility } from '../utils/accessibility';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  message?: string;
  color?: string;
  style?: any;
  overlay?: boolean;
  progress?: number; // 0-1 for progress bar
  showProgress?: boolean;
  inline?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  message,
  color,
  style,
  overlay = false,
  progress,
  showProgress = false,
  inline = false,
}) => {
  const { announceForAccessibility } = useAccessibility();
  
  const containerStyle = [
    inline ? styles.inlineContainer : styles.container,
    overlay && styles.overlay,
    style,
  ];

  // Announce loading state for screen readers
  React.useEffect(() => {
    if (message) {
      announceForAccessibility(`Loading: ${message}`);
    }
  }, [message, announceForAccessibility]);

  const accessibilityLabel = message ? `Loading: ${message}` : 'Loading';
  const progressText = showProgress && progress !== undefined ? `, ${Math.round(progress * 100)} percent complete` : '';

  return (
    <View 
      style={containerStyle}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel + progressText}
      accessibilityLiveRegion="polite"
    >
      {overlay && <View style={styles.overlayBackground} />}
      <View style={styles.content}>
        <ActivityIndicator 
          size={size} 
          color={color}
          accessibilityElementsHidden={true}
          importantForAccessibility="no"
        />
        {message && (
          <Text 
            style={[
              styles.message,
              inline && styles.inlineMessage,
            ]}
            accessibilityElementsHidden={true}
            importantForAccessibility="no"
          >
            {message}
          </Text>
        )}
        {showProgress && progress !== undefined && (
          <View 
            style={styles.progressContainer}
            accessibilityElementsHidden={true}
            importantForAccessibility="no"
          >
            <ProgressBar 
              progress={progress} 
              color={color}
              style={styles.progressBar}
            />
            <Text style={styles.progressText}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

// Enhanced loading component for specific operations
interface OperationLoadingProps {
  operation: 'saving' | 'loading' | 'deleting' | 'syncing' | 'uploading';
  message?: string;
  progress?: number;
  style?: any;
}

export const OperationLoading: React.FC<OperationLoadingProps> = ({
  operation,
  message,
  progress,
  style,
}) => {
  const getOperationMessage = () => {
    if (message) return message;
    
    switch (operation) {
      case 'saving':
        return 'Saving...';
      case 'loading':
        return 'Loading...';
      case 'deleting':
        return 'Deleting...';
      case 'syncing':
        return 'Syncing...';
      case 'uploading':
        return 'Uploading...';
      default:
        return 'Processing...';
    }
  };

  const getOperationColor = () => {
    switch (operation) {
      case 'saving':
        return '#4caf50';
      case 'deleting':
        return '#f44336';
      case 'syncing':
        return '#2196f3';
      case 'uploading':
        return '#ff9800';
      default:
        return undefined;
    }
  };

  return (
    <LoadingSpinner
      message={getOperationMessage()}
      color={getOperationColor()}
      progress={progress}
      showProgress={progress !== undefined}
      style={style}
    />
  );
};

// Inline loading component for buttons and small spaces
interface InlineLoadingProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({
  message = 'Loading...',
  size = 'small',
  color,
}) => {
  return (
    <LoadingSpinner
      size={size}
      message={message}
      color={color}
      inline
    />
  );
};

// Overlay loading component
interface OverlayLoadingProps {
  visible: boolean;
  message?: string;
  progress?: number;
  onCancel?: () => void;
}

export const OverlayLoading: React.FC<OverlayLoadingProps> = ({
  visible,
  message = 'Loading...',
  progress,
  onCancel,
}) => {
  if (!visible) return null;

  return (
    <LoadingSpinner
      message={message}
      progress={progress}
      showProgress={progress !== undefined}
      overlay
      style={styles.overlayContainer}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  message: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 16,
  },
  inlineMessage: {
    marginTop: 0,
    marginLeft: 8,
    fontSize: 14,
  },
  progressContainer: {
    marginTop: 16,
    width: 200,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
  },
  progressText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
});

export default LoadingSpinner;