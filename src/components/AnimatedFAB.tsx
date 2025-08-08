import React, { useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  Animated,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import MaterialIcon from './MaterialIcon';
import { COLORS, SPACING } from '../constants';
import { MATERIAL_EASING, ANIMATION_TIMINGS } from '../config/animationConfig';

interface AnimatedFABProps {
  onPress: () => void;
  icon: string;
  visible?: boolean;
  style?: ViewStyle;
  size?: number;
  color?: string;
  backgroundColor?: string;
}

export const AnimatedFAB: React.FC<AnimatedFABProps> = ({
  onPress,
  icon,
  visible = true,
  style,
  size = 24,
  color = COLORS.LIGHT,
  backgroundColor = COLORS.PRIMARY,
}) => {
  const scaleAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const rippleScale = useRef(new Animated.Value(0)).current;
  const rippleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: visible ? 1 : 0,
      damping: 15,
      stiffness: 150,
      mass: 1,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  const handlePress = () => {
    // Button press animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        easing: MATERIAL_EASING.accelerate,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        easing: MATERIAL_EASING.decelerate,
        useNativeDriver: true,
      }),
    ]).start();

    // Ripple effect
    rippleScale.setValue(0);
    rippleOpacity.setValue(0.3);

    Animated.parallel([
      Animated.timing(rippleScale, {
        toValue: 1,
        duration: 300,
        easing: MATERIAL_EASING.decelerate,
        useNativeDriver: true,
      }),
      Animated.timing(rippleOpacity, {
        toValue: 0,
        duration: 300,
        easing: MATERIAL_EASING.decelerate,
        useNativeDriver: true,
      }),
    ]).start();

    // Rotation animation
    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 200,
      easing: MATERIAL_EASING.standard,
      useNativeDriver: true,
    }).start(() => {
      rotateAnim.setValue(0);
    });

    onPress();
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        style,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Ripple Effect */}
      <Animated.View
        style={[
          styles.ripple,
          {
            backgroundColor,
            opacity: rippleOpacity,
            transform: [{ scale: rippleScale }],
          },
        ]}
      />
      
      {/* FAB Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor }]}
        onPress={handlePress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Floating action button"
      >
        <Animated.View
          style={{
            transform: [{ rotate: rotation }],
          }}
        >
          <MaterialIcon name={icon} size={size} color={color} />
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: SPACING.XL,
    right: SPACING.XL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  ripple: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
});