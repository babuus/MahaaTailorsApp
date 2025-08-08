import React, { useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  Animated,
  StyleSheet,
  ViewStyle,
  PanResponder,
} from 'react-native';
import { COLORS, SPACING } from '../constants';
import { MATERIAL_EASING, ANIMATION_TIMINGS } from '../config/animationConfig';

interface AnimatedCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: ViewStyle;
  elevation?: number;
  swipeEnabled?: boolean;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  animationType?: 'scale' | 'lift' | 'slide';
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  onPress,
  onLongPress,
  style,
  elevation = 2,
  swipeEnabled = false,
  onSwipeLeft,
  onSwipeRight,
  animationType = 'scale',
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const translateXAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const [isPressed, setIsPressed] = useState(false);

  // Pan responder for swipe gestures
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return swipeEnabled && Math.abs(gestureState.dx) > 10;
    },
    onPanResponderGrant: () => {
      setIsPressed(true);
      animatePress(true);
    },
    onPanResponderMove: (_, gestureState) => {
      if (swipeEnabled) {
        translateXAnim.setValue(gestureState.dx);
        const opacity = 1 - Math.abs(gestureState.dx) / 200;
        opacityAnim.setValue(Math.max(0.3, opacity));
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      setIsPressed(false);
      animatePress(false);

      if (swipeEnabled) {
        const threshold = 100;
        if (Math.abs(gestureState.dx) > threshold) {
          // Swipe detected
          const direction = gestureState.dx > 0 ? 'right' : 'left';
          animateSwipeOut(direction, () => {
            if (direction === 'left' && onSwipeLeft) {
              onSwipeLeft();
            } else if (direction === 'right' && onSwipeRight) {
              onSwipeRight();
            }
          });
        } else {
          // Return to original position
          Animated.parallel([
            Animated.spring(translateXAnim, {
              toValue: 0,
              damping: 15,
              stiffness: 150,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 1,
              duration: 200,
              easing: MATERIAL_EASING.decelerate,
              useNativeDriver: true,
            }),
          ]).start();
        }
      }
    },
  });

  const animatePress = (pressed: boolean) => {
    const animations: Animated.CompositeAnimation[] = [];

    switch (animationType) {
      case 'scale':
        animations.push(
          Animated.timing(scaleAnim, {
            toValue: pressed ? 0.95 : 1,
            duration: pressed ? 100 : 200,
            easing: pressed ? MATERIAL_EASING.accelerate : MATERIAL_EASING.decelerate,
            useNativeDriver: true,
          })
        );
        break;

      case 'lift':
        animations.push(
          Animated.timing(translateYAnim, {
            toValue: pressed ? -4 : 0,
            duration: pressed ? 100 : 200,
            easing: pressed ? MATERIAL_EASING.accelerate : MATERIAL_EASING.decelerate,
            useNativeDriver: true,
          })
        );
        break;

      case 'slide':
        animations.push(
          Animated.timing(translateXAnim, {
            toValue: pressed ? 4 : 0,
            duration: pressed ? 100 : 200,
            easing: pressed ? MATERIAL_EASING.accelerate : MATERIAL_EASING.decelerate,
            useNativeDriver: true,
          })
        );
        break;
    }

    Animated.parallel(animations).start();
  };

  const animateSwipeOut = (direction: 'left' | 'right', callback: () => void) => {
    const targetX = direction === 'left' ? -400 : 400;

    Animated.parallel([
      Animated.timing(translateXAnim, {
        toValue: targetX,
        duration: 300,
        easing: MATERIAL_EASING.accelerate,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        easing: MATERIAL_EASING.accelerate,
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback();
      // Reset position for potential reuse
      translateXAnim.setValue(0);
      opacityAnim.setValue(1);
    });
  };

  const handlePress = () => {
    if (!swipeEnabled && onPress) {
      animatePress(true);
      setTimeout(() => {
        animatePress(false);
        onPress();
      }, 100);
    }
  };

  const handleLongPress = () => {
    if (onLongPress) {
      // Haptic feedback would go here
      onLongPress();
    }
  };

  const cardStyle = [
    styles.card,
    {
      elevation,
      shadowOpacity: elevation * 0.05,
      shadowRadius: elevation * 2,
    },
    style,
  ];

  const animatedStyle = {
    transform: [
      { scale: scaleAnim },
      { translateY: translateYAnim },
      { translateX: translateXAnim },
    ],
    opacity: opacityAnim,
  };

  if (swipeEnabled) {
    return (
      <Animated.View style={[cardStyle, animatedStyle]} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={handleLongPress}
      onPressIn={() => animatePress(true)}
      onPressOut={() => animatePress(false)}
      activeOpacity={1}
      style={cardStyle}
    >
      <Animated.View style={animatedStyle}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.LIGHT,
    borderRadius: 8,
    padding: SPACING.MD,
    marginVertical: SPACING.XS,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});