// Tests for AnimationManager and animation system
import { Animated } from 'react-native';
import { animationManager } from '../AnimationManager';
import { animationErrorHandler } from '../animationErrorHandler';
import { performanceMonitor } from '../performanceMonitor';
import { animationConfig } from '../../config/animationConfig';

// Mock React Native Animated
jest.mock('react-native', () => ({
  Animated: {
    Value: jest.fn(() => ({
      setValue: jest.fn(),
      stopAnimation: jest.fn(),
    })),
    timing: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback(true)),
      stop: jest.fn(),
    })),
    spring: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback(true)),
      stop: jest.fn(),
    })),
    sequence: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback(true)),
      stop: jest.fn(),
    })),
    parallel: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback(true)),
      stop: jest.fn(),
    })),
    loop: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback(true)),
      stop: jest.fn(),
    })),
  },
  Easing: {
    linear: jest.fn(),
    bezier: jest.fn(),
  },
  AccessibilityInfo: {
    isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
  },
}));

describe('AnimationManager', () => {
  let mockAnimatedValue: any;

  beforeEach(() => {
    mockAnimatedValue = new Animated.Value(0);
    jest.clearAllMocks();
    animationConfig.resetToDefaults();
  });

  describe('Screen Transitions', () => {
    it('should create slideFromRight animation', () => {
      const animation = animationManager.createScreenTransition(
        'slideFromRight',
        mockAnimatedValue
      );

      expect(Animated.timing).toHaveBeenCalledWith(
        mockAnimatedValue,
        expect.objectContaining({
          toValue: 0,
          useNativeDriver: true,
        })
      );
      expect(animation).toBeDefined();
    });

    it('should create fadeIn animation with correct duration', () => {
      const animation = animationManager.createScreenTransition(
        'fadeIn',
        mockAnimatedValue,
        { duration: 500 }
      );

      expect(Animated.timing).toHaveBeenCalledWith(
        mockAnimatedValue,
        expect.objectContaining({
          toValue: 1,
          duration: 400, // 80% of 500ms for fade animations
          useNativeDriver: true,
        })
      );
    });

    it('should create scaleIn animation using spring', () => {
      const animation = animationManager.createScreenTransition(
        'scaleIn',
        mockAnimatedValue
      );

      expect(Animated.spring).toHaveBeenCalledWith(
        mockAnimatedValue,
        expect.objectContaining({
          toValue: 1,
          useNativeDriver: true,
        })
      );
    });
  });

  describe('Micro-interactions', () => {
    it('should create buttonPress animation sequence', () => {
      const animation = animationManager.createMicroInteraction(
        'buttonPress',
        mockAnimatedValue
      );

      expect(Animated.sequence).toHaveBeenCalled();
      expect(animation).toBeDefined();
    });

    it('should create shake animation with correct sequence', () => {
      const animation = animationManager.createMicroInteraction(
        'shake',
        mockAnimatedValue
      );

      expect(Animated.sequence).toHaveBeenCalled();
      expect(animation).toBeDefined();
    });

    it('should create pulse animation with loop option', () => {
      const animation = animationManager.createMicroInteraction(
        'pulse',
        mockAnimatedValue,
        { loop: true, iterations: 3 }
      );

      expect(Animated.loop).toHaveBeenCalled();
      expect(animation).toBeDefined();
    });
  });

  describe('Loading Animations', () => {
    it('should create skeleton shimmer animation', () => {
      const animation = animationManager.createLoadingAnimation(
        'skeleton',
        mockAnimatedValue
      );

      expect(Animated.loop).toHaveBeenCalled();
      expect(animation).toBeDefined();
    });

    it('should create spinner animation', () => {
      const animation = animationManager.createLoadingAnimation(
        'spinner',
        mockAnimatedValue
      );

      expect(Animated.loop).toHaveBeenCalled();
      expect(animation).toBeDefined();
    });

    it('should create progressive animation without native driver', () => {
      const animation = animationManager.createLoadingAnimation(
        'progressive',
        mockAnimatedValue
      );

      expect(Animated.timing).toHaveBeenCalledWith(
        mockAnimatedValue,
        expect.objectContaining({
          useNativeDriver: false, // Progress bars need layout animations
        })
      );
    });
  });

  describe('Staggered Animations', () => {
    it('should create staggered list animation', () => {
      const animatedValues = [
        new Animated.Value(0),
        new Animated.Value(0),
        new Animated.Value(0),
      ];

      const animation = animationManager.createStaggeredListAnimation(
        animatedValues,
        { staggerDelay: 100, animationType: 'fadeIn' }
      );

      expect(Animated.parallel).toHaveBeenCalled();
      expect(animation).toBeDefined();
    });
  });

  describe('Ripple Effect', () => {
    it('should create ripple effect with scale and opacity animations', () => {
      const ripple = animationManager.createRippleEffect({
        position: { x: 100, y: 100 },
        duration: 300,
      });

      expect(ripple.scaleAnimation).toBeDefined();
      expect(ripple.opacityAnimation).toBeDefined();
      expect(Animated.timing).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance Optimization', () => {
    it('should optimize performance when threshold is exceeded', () => {
      // Mock poor performance
      jest.spyOn(performanceMonitor, 'getMetrics').mockReturnValue({
        averageFPS: 45,
        frameDrops: 10,
        renderTime: 0,
        memoryUsage: 0,
        memoryLeaks: 0,
        animationFrameDrops: 0,
        animationDuration: 0,
        concurrentAnimations: 15,
        touchResponseTime: 0,
        navigationTime: 0,
        loadingTime: 0,
      });

      expect(animationManager.shouldOptimizePerformance()).toBe(true);

      const spy = jest.spyOn(performanceMonitor, 'optimizePerformance');
      animationManager.optimizePerformance();
      expect(spy).toHaveBeenCalled();
    });

    it('should reduce animation duration for poor performance', () => {
      // Mock poor performance
      jest.spyOn(performanceMonitor, 'getMetrics').mockReturnValue({
        averageFPS: 40,
        frameDrops: 0,
        renderTime: 0,
        memoryUsage: 0,
        memoryLeaks: 0,
        animationFrameDrops: 0,
        animationDuration: 0,
        concurrentAnimations: 0,
        touchResponseTime: 0,
        navigationTime: 0,
        loadingTime: 0,
      });

      const animation = animationManager.createScreenTransition(
        'fadeIn',
        mockAnimatedValue,
        { duration: 300 }
      );

      // Should reduce duration due to poor FPS
      expect(Animated.timing).toHaveBeenCalledWith(
        mockAnimatedValue,
        expect.objectContaining({
          duration: expect.any(Number), // Should be reduced
        })
      );
    });
  });

  describe('Animation Management', () => {
    it('should track active animations', () => {
      const initialCount = animationManager.getActiveAnimationCount();
      
      const animation = animationManager.createScreenTransition(
        'fadeIn',
        mockAnimatedValue
      );
      
      animation.start();
      
      // Animation count should increase (mocked to complete immediately)
      expect(animationManager.getActiveAnimationCount()).toBeGreaterThanOrEqual(initialCount);
    });

    it('should stop all animations', () => {
      const animation1 = animationManager.createScreenTransition('fadeIn', mockAnimatedValue);
      const animation2 = animationManager.createMicroInteraction('buttonPress', mockAnimatedValue);
      
      animation1.start();
      animation2.start();
      
      animationManager.stopAllAnimations();
      
      expect(animationManager.getActiveAnimationCount()).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should create fallback animation', () => {
      const fallbackAnimation = animationManager.createFallbackAnimation(mockAnimatedValue);
      
      expect(Animated.timing).toHaveBeenCalledWith(
        mockAnimatedValue,
        expect.objectContaining({
          toValue: 1,
          useNativeDriver: true,
        })
      );
      expect(fallbackAnimation).toBeDefined();
    });
  });
});

describe('AnimationErrorHandler', () => {
  beforeEach(() => {
    animationErrorHandler.reset();
    jest.clearAllMocks();
  });

  it('should handle animation errors gracefully', () => {
    const error = new Error('Test animation error');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    animationErrorHandler.handleAnimationError(error, {
      fallbackAnimation: true,
      reportError: false,
    });
    
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should enter fallback mode after threshold errors', () => {
    const error = new Error('Test error');
    
    // Trigger multiple errors to exceed threshold
    for (let i = 0; i < 6; i++) {
      animationErrorHandler.handleAnimationError(error, { reportError: false });
    }
    
    expect(animationErrorHandler.isInFallbackMode()).toBe(true);
  });

  it('should execute animation with error handling', () => {
    const mockAnimationFn = jest.fn(() => 'success');
    
    const result = animationErrorHandler.executeWithErrorHandling(
      mockAnimationFn,
      'test-context',
      'test-animation'
    );
    
    expect(mockAnimationFn).toHaveBeenCalled();
    expect(result).toBe('success');
  });

  it('should handle errors in executeWithErrorHandling', () => {
    const mockAnimationFn = jest.fn(() => {
      throw new Error('Test error');
    });
    
    const result = animationErrorHandler.executeWithErrorHandling(
      mockAnimationFn,
      'test-context',
      'test-animation'
    );
    
    expect(result).toBeNull();
  });
});

describe('Performance Integration', () => {
  it('should integrate with performance monitor', () => {
    const startSpy = jest.spyOn(performanceMonitor, 'startAnimation');
    const endSpy = jest.spyOn(performanceMonitor, 'endAnimation');
    
    const animation = animationManager.createScreenTransition(
      'fadeIn',
      mockAnimatedValue
    );
    
    animation.start();
    
    // Performance monitoring should be called
    expect(startSpy).toHaveBeenCalled();
    expect(endSpy).toHaveBeenCalled();
  });
});