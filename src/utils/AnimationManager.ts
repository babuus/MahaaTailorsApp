// Core Animation Manager for centralized animation control
import { Animated, Easing, AccessibilityInfo } from 'react-native';
import { animationConfig, ANIMATION_TIMINGS, SPRING_CONFIGS, MATERIAL_EASING } from '../config/animationConfig';
import { performanceMonitor } from './performanceMonitor';

export type TransitionType = 'slideFromRight' | 'slideFromBottom' | 'fadeIn' | 'scaleIn' | 'slideUp' | 'slideDown';
export type MicroInteractionType = 'buttonPress' | 'ripple' | 'bounce' | 'shake' | 'pulse';
export type LoadingAnimationType = 'skeleton' | 'progressive' | 'spinner' | 'dots';

export interface AnimationOptions {
  duration?: number;
  easing?: typeof Easing.bezier;
  useNativeDriver?: boolean;
  delay?: number;
  loop?: boolean;
  iterations?: number;
}

export interface RippleEffectOptions {
  position: { x: number; y: number };
  size?: number;
  color?: string;
  duration?: number;
}

export interface StaggeredAnimationOptions {
  staggerDelay?: number;
  animationType?: 'fadeIn' | 'slideUp' | 'scaleIn';
  duration?: number;
}

class AnimationManager {
  private static instance: AnimationManager;
  private activeAnimations: Map<string, Animated.CompositeAnimation> = new Map();
  private animationCounter: number = 0;
  private reducedMotionEnabled: boolean = false;

  private constructor() {
    this.checkAccessibilityPreferences();
  }

  static getInstance(): AnimationManager {
    if (!AnimationManager.instance) {
      AnimationManager.instance = new AnimationManager();
    }
    return AnimationManager.instance;
  }

  // Check accessibility preferences
  private async checkAccessibilityPreferences(): Promise<void> {
    try {
      this.reducedMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
    } catch (error) {
      console.warn('Failed to check reduced motion preference:', error);
    }
  }

  // Generate unique animation ID
  private generateAnimationId(): string {
    return `animation_${++this.animationCounter}_${Date.now()}`;
  }

  // Check if animations should be enabled
  private shouldAnimate(): boolean {
    return animationConfig.areAnimationsEnabled() && !this.reducedMotionEnabled;
  }

  // Get optimized duration based on performance
  private getOptimizedDuration(baseDuration: number): number {
    if (!this.shouldAnimate()) return 0;
    
    const metrics = performanceMonitor.getMetrics();
    
    // Reduce duration if performance is poor
    if (metrics.averageFPS < 45) {
      return Math.max(baseDuration * 0.5, 100); // Minimum 100ms
    } else if (metrics.averageFPS < 55) {
      return baseDuration * 0.75;
    }
    
    return baseDuration;
  }

  // Create screen transition animations
  createScreenTransition(
    type: TransitionType,
    animatedValue: Animated.Value,
    options: AnimationOptions = {}
  ): Animated.CompositeAnimation {
    const animationId = this.generateAnimationId();
    performanceMonitor.startAnimation(animationId);

    const defaultDuration = this.getOptimizedDuration(ANIMATION_TIMINGS.SCREEN_TRANSITION);
    const duration = options.duration || defaultDuration;
    const easing = options.easing || MATERIAL_EASING.standard;
    const useNativeDriver = options.useNativeDriver !== false; // Default to true

    let animation: Animated.CompositeAnimation;

    switch (type) {
      case 'slideFromRight':
        animation = Animated.timing(animatedValue, {
          toValue: 0,
          duration,
          easing,
          useNativeDriver,
        });
        break;

      case 'slideFromBottom':
        animation = Animated.timing(animatedValue, {
          toValue: 0,
          duration,
          easing: MATERIAL_EASING.decelerate,
          useNativeDriver,
        });
        break;

      case 'fadeIn':
        animation = Animated.timing(animatedValue, {
          toValue: 1,
          duration: duration * 0.8, // Fade animations are typically faster
          easing: MATERIAL_EASING.decelerate,
          useNativeDriver,
        });
        break;

      case 'scaleIn':
        animation = Animated.spring(animatedValue, {
          toValue: 1,
          ...SPRING_CONFIGS.gentle,
          useNativeDriver,
        });
        break;

      case 'slideUp':
        animation = Animated.timing(animatedValue, {
          toValue: 0,
          duration,
          easing: MATERIAL_EASING.decelerate,
          useNativeDriver,
        });
        break;

      case 'slideDown':
        animation = Animated.timing(animatedValue, {
          toValue: 0,
          duration,
          easing: MATERIAL_EASING.accelerate,
          useNativeDriver,
        });
        break;

      default:
        animation = Animated.timing(animatedValue, {
          toValue: 1,
          duration,
          easing,
          useNativeDriver,
        });
    }

    // Track animation completion
    const originalStart = animation.start.bind(animation);
    animation.start = (callback) => {
      this.activeAnimations.set(animationId, animation);
      
      return originalStart((finished) => {
        performanceMonitor.endAnimation(animationId);
        this.activeAnimations.delete(animationId);
        callback?.(finished);
      });
    };

    return animation;
  }

  // Create micro-interaction animations
  createMicroInteraction(
    type: MicroInteractionType,
    animatedValue: Animated.Value,
    options: AnimationOptions = {}
  ): Animated.CompositeAnimation {
    const animationId = this.generateAnimationId();
    performanceMonitor.startAnimation(animationId);

    let animation: Animated.CompositeAnimation;
    const useNativeDriver = options.useNativeDriver !== false;

    switch (type) {
      case 'buttonPress':
        animation = Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 0.95,
            duration: this.getOptimizedDuration(ANIMATION_TIMINGS.BUTTON_PRESS),
            easing: MATERIAL_EASING.sharp,
            useNativeDriver,
          }),
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: this.getOptimizedDuration(ANIMATION_TIMINGS.BUTTON_PRESS),
            easing: MATERIAL_EASING.sharp,
            useNativeDriver,
          }),
        ]);
        break;

      case 'bounce':
        animation = Animated.spring(animatedValue, {
          toValue: 1,
          ...SPRING_CONFIGS.bouncy,
          useNativeDriver,
        });
        break;

      case 'shake':
        animation = Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 10,
            duration: 50,
            useNativeDriver,
          }),
          Animated.timing(animatedValue, {
            toValue: -10,
            duration: 50,
            useNativeDriver,
          }),
          Animated.timing(animatedValue, {
            toValue: 10,
            duration: 50,
            useNativeDriver,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 50,
            useNativeDriver,
          }),
        ]);
        break;

      case 'pulse':
        const pulseAnimation = Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1.1,
            duration: this.getOptimizedDuration(300),
            easing: MATERIAL_EASING.decelerate,
            useNativeDriver,
          }),
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: this.getOptimizedDuration(300),
            easing: MATERIAL_EASING.accelerate,
            useNativeDriver,
          }),
        ]);
        
        animation = options.loop 
          ? Animated.loop(pulseAnimation, { iterations: options.iterations || -1 })
          : pulseAnimation;
        break;

      default:
        animation = Animated.timing(animatedValue, {
          toValue: 1,
          duration: this.getOptimizedDuration(ANIMATION_TIMINGS.BUTTON_PRESS),
          useNativeDriver,
        });
    }

    // Track animation completion
    const originalStart = animation.start.bind(animation);
    animation.start = (callback) => {
      this.activeAnimations.set(animationId, animation);
      
      return originalStart((finished) => {
        performanceMonitor.endAnimation(animationId);
        this.activeAnimations.delete(animationId);
        callback?.(finished);
      });
    };

    return animation;
  }

  // Create ripple effect animation
  createRippleEffect(options: RippleEffectOptions): {
    scaleAnimation: Animated.CompositeAnimation;
    opacityAnimation: Animated.CompositeAnimation;
  } {
    const scaleValue = new Animated.Value(0);
    const opacityValue = new Animated.Value(0.3);
    
    const duration = this.getOptimizedDuration(options.duration || ANIMATION_TIMINGS.RIPPLE_EFFECT);

    const scaleAnimation = Animated.timing(scaleValue, {
      toValue: 1,
      duration,
      easing: MATERIAL_EASING.decelerate,
      useNativeDriver: true,
    });

    const opacityAnimation = Animated.timing(opacityValue, {
      toValue: 0,
      duration,
      easing: MATERIAL_EASING.accelerate,
      useNativeDriver: true,
    });

    return { scaleAnimation, opacityAnimation };
  }

  // Create loading animations
  createLoadingAnimation(
    type: LoadingAnimationType,
    animatedValue: Animated.Value,
    options: AnimationOptions = {}
  ): Animated.CompositeAnimation {
    const animationId = this.generateAnimationId();
    performanceMonitor.startAnimation(animationId);

    let animation: Animated.CompositeAnimation;
    const useNativeDriver = options.useNativeDriver !== false;

    switch (type) {
      case 'skeleton':
        const shimmerAnimation = Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: this.getOptimizedDuration(ANIMATION_TIMINGS.SKELETON_SHIMMER / 2),
            easing: MATERIAL_EASING.decelerate,
            useNativeDriver,
          }),
          Animated.timing(animatedValue, {
            toValue: 0.3,
            duration: this.getOptimizedDuration(ANIMATION_TIMINGS.SKELETON_SHIMMER / 2),
            easing: MATERIAL_EASING.accelerate,
            useNativeDriver,
          }),
        ]);
        animation = Animated.loop(shimmerAnimation);
        break;

      case 'spinner':
        const spinAnimation = Animated.timing(animatedValue, {
          toValue: 1,
          duration: this.getOptimizedDuration(ANIMATION_TIMINGS.SPINNER_ROTATION),
          easing: Easing.linear,
          useNativeDriver,
        });
        animation = Animated.loop(spinAnimation);
        break;

      case 'progressive':
        animation = Animated.timing(animatedValue, {
          toValue: 1,
          duration: this.getOptimizedDuration(options.duration || 1000),
          easing: MATERIAL_EASING.decelerate,
          useNativeDriver: false, // Progress bars often need layout animations
        });
        break;

      case 'dots':
        const dotAnimation = Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: this.getOptimizedDuration(400),
            easing: MATERIAL_EASING.decelerate,
            useNativeDriver,
          }),
          Animated.timing(animatedValue, {
            toValue: 0.3,
            duration: this.getOptimizedDuration(400),
            easing: MATERIAL_EASING.accelerate,
            useNativeDriver,
          }),
        ]);
        animation = Animated.loop(dotAnimation);
        break;

      default:
        animation = Animated.timing(animatedValue, {
          toValue: 1,
          duration: this.getOptimizedDuration(1000),
          useNativeDriver,
        });
    }

    // Track animation completion
    const originalStart = animation.start.bind(animation);
    animation.start = (callback) => {
      this.activeAnimations.set(animationId, animation);
      
      return originalStart((finished) => {
        performanceMonitor.endAnimation(animationId);
        this.activeAnimations.delete(animationId);
        callback?.(finished);
      });
    };

    return animation;
  }

  // Create staggered list animations
  createStaggeredListAnimation(
    items: Animated.Value[],
    options: StaggeredAnimationOptions = {}
  ): Animated.CompositeAnimation {
    const animationId = this.generateAnimationId();
    performanceMonitor.startAnimation(animationId);

    const staggerDelay = options.staggerDelay || 50;
    const duration = this.getOptimizedDuration(options.duration || ANIMATION_TIMINGS.FADE_IN);
    const animationType = options.animationType || 'fadeIn';

    const animations = items.map((animatedValue, index) => {
      let itemAnimation: Animated.CompositeAnimation;

      switch (animationType) {
        case 'fadeIn':
          itemAnimation = Animated.timing(animatedValue, {
            toValue: 1,
            duration,
            easing: MATERIAL_EASING.decelerate,
            useNativeDriver: true,
            delay: index * staggerDelay,
          });
          break;

        case 'slideUp':
          itemAnimation = Animated.timing(animatedValue, {
            toValue: 0,
            duration,
            easing: MATERIAL_EASING.decelerate,
            useNativeDriver: true,
            delay: index * staggerDelay,
          });
          break;

        case 'scaleIn':
          itemAnimation = Animated.spring(animatedValue, {
            toValue: 1,
            ...SPRING_CONFIGS.gentle,
            useNativeDriver: true,
            delay: index * staggerDelay,
          });
          break;

        default:
          itemAnimation = Animated.timing(animatedValue, {
            toValue: 1,
            duration,
            useNativeDriver: true,
            delay: index * staggerDelay,
          });
      }

      return itemAnimation;
    });

    const parallelAnimation = Animated.parallel(animations);

    // Track animation completion
    const originalStart = parallelAnimation.start.bind(parallelAnimation);
    parallelAnimation.start = (callback) => {
      this.activeAnimations.set(animationId, parallelAnimation);
      
      return originalStart((finished) => {
        performanceMonitor.endAnimation(animationId);
        this.activeAnimations.delete(animationId);
        callback?.(finished);
      });
    };

    return parallelAnimation;
  }

  // Stop all animations
  stopAllAnimations(): void {
    this.activeAnimations.forEach((animation, id) => {
      animation.stop();
      performanceMonitor.endAnimation(id);
    });
    this.activeAnimations.clear();
  }

  // Stop specific animation
  stopAnimation(animationId: string): void {
    const animation = this.activeAnimations.get(animationId);
    if (animation) {
      animation.stop();
      performanceMonitor.endAnimation(animationId);
      this.activeAnimations.delete(animationId);
    }
  }

  // Get active animation count
  getActiveAnimationCount(): number {
    return this.activeAnimations.size;
  }

  // Check if performance optimization is needed
  shouldOptimizePerformance(): boolean {
    const metrics = performanceMonitor.getMetrics();
    return (
      metrics.averageFPS < 55 ||
      this.activeAnimations.size > 10 ||
      metrics.frameDrops > 5
    );
  }

  // Apply performance optimizations
  optimizePerformance(): void {
    if (this.shouldOptimizePerformance()) {
      console.log('🔧 AnimationManager: Applying performance optimizations');
      
      // Stop non-essential animations if too many are running
      if (this.activeAnimations.size > 10) {
        const animationsToStop = Array.from(this.activeAnimations.keys()).slice(5);
        animationsToStop.forEach(id => this.stopAnimation(id));
      }
      
      // Trigger global performance optimization
      performanceMonitor.optimizePerformance();
    }
  }

  // Create error recovery animation (fallback)
  createFallbackAnimation(animatedValue: Animated.Value): Animated.CompositeAnimation {
    return Animated.timing(animatedValue, {
      toValue: 1,
      duration: this.getOptimizedDuration(200),
      easing: Easing.linear,
      useNativeDriver: true,
    });
  }
}

export const animationManager = AnimationManager.getInstance();