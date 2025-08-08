import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SPACING } from '../constants';
import { useAccessibility } from '../utils/accessibility';

interface SuccessMessageProps {
  visible: boolean;
  message: string;
  onDismiss?: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
  actionText?: string;
  onActionPress?: () => void;
  testID?: string;
}

const SuccessMessage: React.FC<SuccessMessageProps> = ({
  visible,
  message,
  onDismiss,
  autoHide = true,
  autoHideDelay = 4000,
  actionText,
  onActionPress,
  testID,
}) => {
  const slideAnimation = useRef(new Animated.Value(-100)).current;
  const opacityAnimation = useRef(new Animated.Value(0)).current;
  
  const { 
    generateButtonHint, 
    announceForAccessibility,
    ensureMinimumTouchTarget 
  } = useAccessibility();

  useEffect(() => {
    if (visible) {
      // Announce success message to screen readers
      announceForAccessibility(`Success: ${message}`);
      
      // Show animation
      Animated.parallel([
        Animated.timing(slideAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide
      if (autoHide && onDismiss) {
        const timer = setTimeout(() => {
          hideMessage();
        }, autoHideDelay);

        return () => clearTimeout(timer);
      }
    } else {
      hideMessage();
    }
  }, [visible, autoHide, autoHideDelay, onDismiss, message, announceForAccessibility]);

  const hideMessage = () => {
    Animated.parallel([
      Animated.timing(slideAnimation, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnimation, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss?.();
    });
  };

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnimation }],
          opacity: opacityAnimation,
        },
      ]}
      testID={testID}
      accessibilityRole="alert"
      accessibilityLabel={`Success: ${message}`}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.content}>
        <Icon 
          name="check-circle" 
          size={24} 
          color={COLORS.SUCCESS || '#4CAF50'} 
          style={styles.icon}
          accessibilityElementsHidden={true}
          importantForAccessibility="no"
        />
        
        <Text 
          style={styles.message} 
          numberOfLines={2}
          accessibilityLabel={message}
        >
          {message}
        </Text>

        <View style={styles.actions}>
          {actionText && onActionPress && (
            <TouchableOpacity
              style={[styles.actionButton, { 
                minWidth: ensureMinimumTouchTarget(32), 
                minHeight: ensureMinimumTouchTarget(32) 
              }]}
              onPress={onActionPress}
              accessibilityLabel={actionText}
              accessibilityHint={generateButtonHint(actionText.toLowerCase())}
              accessibilityRole="button"
              testID={`${testID}-action`}
            >
              <Text style={styles.actionText}>{actionText}</Text>
            </TouchableOpacity>
          )}

          {onDismiss && (
            <TouchableOpacity
              style={[styles.dismissButton, { 
                minWidth: ensureMinimumTouchTarget(32), 
                minHeight: ensureMinimumTouchTarget(32) 
              }]}
              onPress={hideMessage}
              accessibilityLabel="Dismiss success message"
              accessibilityHint={generateButtonHint('dismiss this success message')}
              accessibilityRole="button"
              testID={`${testID}-dismiss`}
            >
              <Icon name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: SPACING.MD,
    right: SPACING.MD,
    zIndex: 1000,
    elevation: 10,
  },
  content: {
    backgroundColor: COLORS.SUCCESS || '#4CAF50',
    borderRadius: 8,
    padding: SPACING.MD,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  icon: {
    marginRight: SPACING.SM,
  },
  message: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: SPACING.SM,
  },
  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: 4,
    marginRight: SPACING.XS,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  dismissButton: {
    padding: SPACING.XS,
  },
});

export default SuccessMessage;