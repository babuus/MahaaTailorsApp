// Screen transition wrapper component with Material Design animations
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { useAnimations } from '../hooks/useAnimations';
import { ANIMATION_TIMINGS } from '../config/animationConfig';

interface ScreenTransitionProps {
  children: React.ReactNode;
  transitionType?: 'slideFromRight' | 'slideFromBottom' | 'fadeIn' | 'scaleIn';
  duration?: number;
  delay?: number;
  style?: any;
  onTransitionComplete?: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ScreenTransition: React.FC<ScreenTransitionProps> = ({
  children,
  transitionType = 'slideFromRight',
  duration = ANIMATION_TIMINGS.SCREEN_TRANSITION,
  delay = 0,
  style,
  onTransitionComplete,
}) => {
  const [transitionValue, transitionControls] = useAnimations(0, {
    context: 'ScreenTransition',
    respectReducedMotion: true,
  });

  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!hasAnimated.current) {
      hasAnimated.current = true;
      
      // Set initial value based on transition type
      switch (transitionType) {
        case 'slideFromRight':
          transitionValue.setValue(screenWidth);
          break;
        case 'slideFromBottom':
          transitionValue.setValue(screenHeight);
          break;
        case 'fadeIn':
          transitionValue.setValue(0);
          break;
        case 'scaleIn':
          transitionValue.setValue(0.8);
          break;
      }

      // Start transition after delay
      const timer = setTimeout(async () => {
        try {
          switch (transitionType) {
            case 'slideFromRight':
              await transitionControls.slideFromRight({ duration });
              break;
            case 'slideFromBottom':
              await transitionControls.slideFromBottom({ duration });
              break;
            case 'fadeIn':
              await transitionControls.fadeIn({ duration });
              break;
            case 'scaleIn':
              await transitionControls.scaleIn({ duration });
              break;
          }
          onTransitionComplete?.();
        } catch (error) {
          console.error('Screen transition failed:', error);
          onTransitionComplete?.();
        }
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [transitionType, duration, delay, transitionValue, transitionControls, onTransitionComplete]);

  // Get transform style based on transition type
  const getTransformStyle = () => {
    switch (transitionType) {
      case 'slideFromRight':
        return {
          transform: [
            {
              translateX: transitionValue.interpolate({
                inputRange: [0, screenWidth],
                outputRange: [0, screenWidth],
                extrapolate: 'clamp',
              }),
            },
          ],
        };
      case 'slideFromBottom':
        return {
          transform: [
            {
              translateY: transitionValue.interpolate({
                inputRange: [0, screenHeight],
                outputRange: [0, screenHeight],
                extrapolate: 'clamp',
              }),
            },
          ],
        };
      case 'fadeIn':
        return {
          opacity: transitionValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1],
            extrapolate: 'clamp',
          }),
        };
      case 'scaleIn':
        return {
          transform: [
            {
              scale: transitionValue.interpolate({
                inputRange: [0.8, 1],
                outputRange: [0.8, 1],
                extrapolate: 'clamp',
              }),
            },
          ],
          opacity: transitionValue.interpolate({
            inputRange: [0.8, 1],
            outputRange: [0, 1],
            extrapolate: 'clamp',
          }),
        };
      default:
        return {};
    }
  };

  return (
    <Animated.View style={[styles.container, getTransformStyle(), style]}>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ScreenTransition;