// React hook for easy animation management in components
import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { Animated, AccessibilityInfo } from 'react-native';
import { animationManager, TransitionType, MicroInteractionType, LoadingAnimationType } from '../utils/AnimationManager';
import { animationErrorHandler, createSafeAnimation } from '../utils/animationErrorHandler';
import { performanceMonitor } from '../utils/performanceMonitor';
import { animationConfig } from '../config/animationConfig';

export interface UseAnimationsOptions {
  respectReducedMotion?: boolean;
  enablePerformanceMonitoring?: boolean;
  context?: string;
}

export interface AnimationControls {
  // Screen transitions
  slideFromRight: (options?: { duration?: number }) => Promise<void>;
  slideFromBottom: (options?: { duration?: number }) => Promise<void>;
  fadeIn: (options?: { duration?: number }) => Promise<void>;
  scaleIn: (options?: { duration?: number }) => Promise<void>;
  
  // Micro-interactions
  buttonPress: () => Promise<void>;
  bounce: () => Promise<void>;
  shake: () => Promise<void>;
  pulse: (options?: { loop?: boolean; iterations?: number }) => Promise<void>;
  
  // Loading animations
  skeleton: () => Promise<void>;
  spinner: () => Promise<void>;
  progressive: (options?: { duration?: number }) => Promise<void>;
  
  // Utility functions
  stopAll: () => void;
  reset: () => void;
  isAnimating: () => boolean;
}

export const useAnimations = (
  initialValue: number = 0,
  options: UseAnimationsOptions = {}
): [Animated.Value, AnimationControls] => {
  const animatedValue = useRef(new Animated.Value(initialValue)).current;
  const isAnimatingRef = useRef(false);
  const activeAnimationsRef = useRef<Set<string>>(new Set());
  const componentContext = options.context || 'useAnimations';

  // Check accessibility preferences
  const [reducedMotionEnabled, setReducedMotionEnabled] = useState(false);

  useEffect(() => {
    if (options.respectReducedMotion !== false) {
      AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotionEnabled);
    }
  }, [options.respectReducedMotion]);

  // Performance monitoring
  const startPerformanceTracking = useCallback((animationType: string) => {
    if (options.enablePerformanceMonitoring !== false) {
      performanceMonitor.startAnimation(`${componentContext}_${animationType}`);
    }
  }, [componentContext, options.enablePerformanceMonitoring]);

  const endPerformanceTracking = useCallback((animationType: string) => {
    if (options.enablePerformanceMonitoring !== false) {
      performanceMonitor.endAnimation(`${componentContext}_${animationType}`);
    }
  }, [componentContext, options.enablePerformanceMonitoring]);

  // Generic animation executor
  const executeAnimation = useCallback(
    (
      animationType: string,
      animationFn: () => Animated.CompositeAnimation,
      animationOptions?: { duration?: number; loop?: boolean; iterations?: number }
    ): Promise<void> => {
      return new Promise((resolve, reject) => {
        // Check if animations should be disabled
        if (reducedMotionEnabled && options.respectReducedMotion !== false) {
          resolve();
          return;
        }

        if (!animationConfig.areAnimationsEnabled()) {
          resolve();
          return;
        }

        const animationId = `${componentContext}_${animationType}_${Date.now()}`;
        
        const safeAnimation = createSafeAnimation(
          animationFn,
          componentContext,
          animationType
        );

        if (!safeAnimation) {
          reject(new Error(`Failed to create ${animationType} animation`));
          return;
        }

        isAnimatingRef.current = true;
        activeAnimationsRef.current.add(animationId);
        startPerformanceTracking(animationType);

        safeAnimation.start((finished) => {
          isAnimatingRef.current = activeAnimationsRef.current.size > 1;
          activeAnimationsRef.current.delete(animationId);
          endPerformanceTracking(animationType);

          if (finished) {
            resolve();
          } else {
            reject(new Error(`${animationType} animation was interrupted`));
          }
        });
      });
    },
    [
      reducedMotionEnabled,
      options.respectReducedMotion,
      componentContext,
      startPerformanceTracking,
      endPerformanceTracking,
    ]
  );

  // Animation controls
  const controls: AnimationControls = useMemo(() => ({
    // Screen transitions
    slideFromRight: (animationOptions) =>
      executeAnimation('slideFromRight', () =>
        animationManager.createScreenTransition('slideFromRight', animatedValue, animationOptions)
      ),

    slideFromBottom: (animationOptions) =>
      executeAnimation('slideFromBottom', () =>
        animationManager.createScreenTransition('slideFromBottom', animatedValue, animationOptions)
      ),

    fadeIn: (animationOptions) =>
      executeAnimation('fadeIn', () =>
        animationManager.createScreenTransition('fadeIn', animatedValue, animationOptions)
      ),

    scaleIn: (animationOptions) =>
      executeAnimation('scaleIn', () =>
        animationManager.createScreenTransition('scaleIn', animatedValue, animationOptions)
      ),

    // Micro-interactions
    buttonPress: () =>
      executeAnimation('buttonPress', () =>
        animationManager.createMicroInteraction('buttonPress', animatedValue)
      ),

    bounce: () =>
      executeAnimation('bounce', () =>
        animationManager.createMicroInteraction('bounce', animatedValue)
      ),

    shake: () =>
      executeAnimation('shake', () =>
        animationManager.createMicroInteraction('shake', animatedValue)
      ),

    pulse: (animationOptions) =>
      executeAnimation('pulse', () =>
        animationManager.createMicroInteraction('pulse', animatedValue, animationOptions)
      ),

    // Loading animations
    skeleton: () =>
      executeAnimation('skeleton', () =>
        animationManager.createLoadingAnimation('skeleton', animatedValue)
      ),

    spinner: () =>
      executeAnimation('spinner', () =>
        animationManager.createLoadingAnimation('spinner', animatedValue)
      ),

    progressive: (animationOptions) =>
      executeAnimation('progressive', () =>
        animationManager.createLoadingAnimation('progressive', animatedValue, animationOptions)
      ),

    // Utility functions
    stopAll: () => {
      animatedValue.stopAnimation();
      activeAnimationsRef.current.forEach(id => {
        endPerformanceTracking(id.split('_')[1]);
      });
      activeAnimationsRef.current.clear();
      isAnimatingRef.current = false;
    },

    reset: () => {
      controls.stopAll();
      animatedValue.setValue(initialValue);
    },

    isAnimating: () => isAnimatingRef.current,
  }), [animatedValue, executeAnimation, initialValue, endPerformanceTracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      controls.stopAll();
    };
  }, [controls]);

  return [animatedValue, controls];
};

// Hook for staggered list animations
export const useStaggeredAnimations = (
  itemCount: number,
  options: UseAnimationsOptions & {
    staggerDelay?: number;
    animationType?: 'fadeIn' | 'slideUp' | 'scaleIn';
  } = {}
): [Animated.Value[], () => Promise<void>, () => void] => {
  const animatedValues = useRef(
    Array.from({ length: itemCount }, () => new Animated.Value(0))
  ).current;

  const componentContext = options.context || 'useStaggeredAnimations';

  const startStaggeredAnimation = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!animationConfig.areAnimationsEnabled()) {
        resolve();
        return;
      }

      const safeAnimation = createSafeAnimation(
        () => animationManager.createStaggeredListAnimation(animatedValues, {
          staggerDelay: options.staggerDelay,
          animationType: options.animationType,
        }),
        componentContext,
        'staggered'
      );

      if (!safeAnimation) {
        reject(new Error('Failed to create staggered animation'));
        return;
      }

      safeAnimation.start((finished) => {
        if (finished) {
          resolve();
        } else {
          reject(new Error('Staggered animation was interrupted'));
        }
      });
    });
  }, [animatedValues, options.staggerDelay, options.animationType, componentContext]);

  const resetStaggeredAnimation = useCallback(() => {
    animatedValues.forEach(value => {
      value.stopAnimation();
      value.setValue(0);
    });
  }, [animatedValues]);

  return [animatedValues, startStaggeredAnimation, resetStaggeredAnimation];
};

// Hook for ripple effect animations
export const useRippleAnimation = (
  options: UseAnimationsOptions = {}
): [(position: { x: number; y: number }) => Promise<void>, Animated.Value, Animated.Value] => {
  const scaleValue = useRef(new Animated.Value(0)).current;
  const opacityValue = useRef(new Animated.Value(0.3)).current;
  const componentContext = options.context || 'useRippleAnimation';

  const startRipple = useCallback((position: { x: number; y: number }): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!animationConfig.areAnimationsEnabled()) {
        resolve();
        return;
      }

      // Reset values
      scaleValue.setValue(0);
      opacityValue.setValue(0.3);

      const safeAnimation = createSafeAnimation(
        () => {
          const { scaleAnimation, opacityAnimation } = animationManager.createRippleEffect({
            position,
          });
          
          return Animated.parallel([scaleAnimation, opacityAnimation]);
        },
        componentContext,
        'ripple'
      );

      if (!safeAnimation) {
        reject(new Error('Failed to create ripple animation'));
        return;
      }

      safeAnimation.start((finished) => {
        if (finished) {
          resolve();
        } else {
          reject(new Error('Ripple animation was interrupted'));
        }
      });
    });
  }, [scaleValue, opacityValue, componentContext]);

  return [startRipple, scaleValue, opacityValue];
};

// Hook for performance-aware animations
export const usePerformanceAwareAnimations = (
  initialValue: number = 0,
  options: UseAnimationsOptions = {}
): [Animated.Value, AnimationControls & { performanceStats: () => any }] => {
  const [animatedValue, controls] = useAnimations(initialValue, {
    ...options,
    enablePerformanceMonitoring: true,
  });

  const enhancedControls = useMemo(() => ({
    ...controls,
    performanceStats: () => ({
      metrics: performanceMonitor.getMetrics(),
      warnings: performanceMonitor.getPerformanceWarnings(),
      errorStats: animationErrorHandler.getErrorStats(),
      isOptimized: !animationManager.shouldOptimizePerformance(),
    }),
  }), [controls]);

  return [animatedValue, enhancedControls];
};