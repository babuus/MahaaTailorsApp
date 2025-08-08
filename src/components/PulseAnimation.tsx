import React, { useRef, useEffect } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { COLORS } from '../constants';
import { MATERIAL_EASING } from '../config/animationConfig';

interface PulseAnimationProps {
  children?: React.ReactNode;
  color?: string;
  size?: number;
  duration?: number;
  pulseMaxSize?: number;
  avatar?: React.ReactNode;
  style?: ViewStyle;
  enabled?: boolean;
}

export const PulseAnimation: React.FC<PulseAnimationProps> = ({
  children,
  color = COLORS.PRIMARY,
  size = 100,
  duration = 1000,
  pulseMaxSize = 1.2,
  avatar,
  style,
  enabled = true,
}) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!enabled) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: duration / 2,
          easing: MATERIAL_EASING.decelerate,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: duration / 2,
          easing: MATERIAL_EASING.accelerate,
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();

    return () => {
      pulse.stop();
    };
  }, [enabled, duration]);

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, pulseMaxSize],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {/* Pulse rings */}
      {enabled && (
        <>
          <Animated.View
            style={[
              styles.pulse,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: color,
                transform: [{ scale: pulseScale }],
                opacity: pulseOpacity,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.pulse,
              {
                width: size * 0.8,
                height: size * 0.8,
                borderRadius: (size * 0.8) / 2,
                backgroundColor: color,
                transform: [{ scale: pulseScale }],
                opacity: pulseOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.7, 0],
                }),
              },
            ]}
          />
        </>
      )}
      
      {/* Center content */}
      <View style={styles.center}>
        {avatar || children}
      </View>
    </View>
  );
};

interface NotificationDotProps {
  visible?: boolean;
  color?: string;
  size?: number;
  style?: ViewStyle;
}

export const NotificationDot: React.FC<NotificationDotProps> = ({
  visible = true,
  color = COLORS.ERROR,
  size = 12,
  style,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Entry animation
      Animated.spring(scaleAnim, {
        toValue: 1,
        damping: 10,
        stiffness: 100,
        useNativeDriver: true,
      }).start();

      // Pulse animation
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: MATERIAL_EASING.decelerate,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1000,
            easing: MATERIAL_EASING.accelerate,
            useNativeDriver: true,
          }),
        ])
      );

      pulse.start();

      return () => {
        pulse.stop();
      };
    } else {
      Animated.spring(scaleAnim, {
        toValue: 0,
        damping: 15,
        stiffness: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.5],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 0],
  });

  return (
    <View style={[styles.notificationContainer, style]}>
      {/* Pulse ring */}
      <Animated.View
        style={[
          styles.notificationPulse,
          {
            width: size * 2,
            height: size * 2,
            borderRadius: size,
            backgroundColor: color,
            transform: [{ scale: pulseScale }],
            opacity: pulseOpacity,
          },
        ]}
      />
      
      {/* Dot */}
      <Animated.View
        style={[
          styles.notificationDot,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  notificationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationPulse: {
    position: 'absolute',
  },
  notificationDot: {
    zIndex: 1,
  },
});