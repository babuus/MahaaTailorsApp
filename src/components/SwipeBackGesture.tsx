// Swipe-back gesture handler for navigation
import React, { useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, PanResponder } from 'react-native';
import { MATERIAL_EASING, ANIMATION_TIMINGS } from '../config/animationConfig';
import { performanceMonitor } from '../utils/performanceMonitor';

interface SwipeBackGestureProps {
  children: React.ReactNode;
  onSwipeBack?: () => void;
  enabled?: boolean;
  threshold?: number;
  style?: any;
}

const { width: screenWidth } = Dimensions.get('window');
const SWIPE_THRESHOLD = screenWidth * 0.3; // 30% of screen width

const SwipeBackGesture: React.FC<SwipeBackGestureProps> = ({
  children,
  onSwipeBack,
  enabled = true,
  threshold = SWIPE_THRESHOLD,
  style,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const isGesturing = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to horizontal swipes from the left edge
        if (!enabled) return false;
        
        const { dx, dy } = gestureState;
        const isHorizontalSwipe = Math.abs(dx) > Math.abs(dy);
        const isFromLeftEdge = evt.nativeEvent.pageX < 50; // Within 50px of left edge
        const isRightwardSwipe = dx > 0;
        
        return isHorizontalSwipe && isFromLeftEdge && isRightwardSwipe;
      },

      onPanResponderGrant: () => {
        isGesturing.current = true;
        performanceMonitor.startAnimation('swipe-back-gesture');
        
        // Stop any existing animations
        translateX.stopAnimation();
        opacity.stopAnimation();
      },

      onPanResponderMove: (evt, gestureState) => {
        if (!isGesturing.current) return;

        const { dx } = gestureState;
        const progress = Math.min(dx / screenWidth, 1);
        
        // Update transform values
        translateX.setValue(dx);
        
        // Fade out slightly as user swipes
        const opacityValue = 1 - (progress * 0.3);
        opacity.setValue(Math.max(opacityValue, 0.7));
      },

      onPanResponderRelease: (evt, gestureState) => {
        if (!isGesturing.current) return;
        
        isGesturing.current = false;
        performanceMonitor.endAnimation('swipe-back-gesture');

        const { dx, vx } = gestureState;
        const shouldComplete = dx > threshold || vx > 0.5;

        if (shouldComplete && onSwipeBack) {
          // Complete the swipe back
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: screenWidth,
              duration: ANIMATION_TIMINGS.SCREEN_TRANSITION * 0.7,
              easing: MATERIAL_EASING.accelerate,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: ANIMATION_TIMINGS.SCREEN_TRANSITION * 0.7,
              easing: MATERIAL_EASING.accelerate,
              useNativeDriver: true,
            }),
          ]).start((finished) => {
            if (finished) {
              onSwipeBack();
            }
          });
        } else {
          // Snap back to original position
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: 0,
              tension: 100,
              friction: 8,
              useNativeDriver: true,
            }),
            Animated.spring(opacity, {
              toValue: 1,
              tension: 100,
              friction: 8,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },

      onPanResponderTerminate: () => {
        // Reset if gesture is terminated
        if (isGesturing.current) {
          isGesturing.current = false;
          performanceMonitor.endAnimation('swipe-back-gesture');
          
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: 0,
              tension: 100,
              friction: 8,
              useNativeDriver: true,
            }),
            Animated.spring(opacity, {
              toValue: 1,
              tension: 100,
              friction: 8,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  return (
    <View style={[styles.container, style]} {...panResponder.panHandlers}>
      <Animated.View
        style={[
          styles.content,
          {
            transform: [{ translateX }],
            opacity,
          },
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

export default SwipeBackGesture;