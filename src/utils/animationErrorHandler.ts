// Animation error handling and graceful degradation system
import { Animated } from 'react-native';
import { animationManager } from './AnimationManager';
import { performanceMonitor } from './performanceMonitor';
import { animationConfig } from '../config/animationConfig';

export interface AnimationError extends Error {
  animationId?: string;
  animationType?: string;
  context?: string;
  recoverable?: boolean;
}

export interface ErrorRecoveryOptions {
  fallbackAnimation?: boolean;
  disableAnimations?: boolean;
  simplifyAnimations?: boolean;
  reportError?: boolean;
}

class AnimationErrorHandler {
  private static instance: AnimationErrorHandler;
  private errorCount: number = 0;
  private errorThreshold: number = 5;
  private lastErrorTime: number = 0;
  private errorCooldown: number = 5000; // 5 seconds
  private fallbackMode: boolean = false;

  private constructor() {}

  static getInstance(): AnimationErrorHandler {
    if (!AnimationErrorHandler.instance) {
      AnimationErrorHandler.instance = new AnimationErrorHandler();
    }
    return AnimationErrorHandler.instance;
  }

  // Handle animation errors with graceful degradation
  handleAnimationError(
    error: AnimationError,
    options: ErrorRecoveryOptions = {}
  ): void {
    const currentTime = Date.now();
    
    // Increment error count
    this.errorCount++;
    
    // Log error details
    this.logError(error);
    
    // Check if we're in error cooldown period
    if (currentTime - this.lastErrorTime < this.errorCooldown) {
      console.warn('⚠️ Animation errors occurring too frequently, entering fallback mode');
      this.enterFallbackMode();
    }
    
    this.lastErrorTime = currentTime;
    
    // Apply recovery strategy based on error severity
    this.applyRecoveryStrategy(error, options);
    
    // Report error if enabled
    if (options.reportError !== false) {
      this.reportError(error);
    }
  }

  // Log error with context
  private logError(error: AnimationError): void {
    console.group('🚨 Animation Error');
    console.error('Error:', error.message);
    console.log('Animation ID:', error.animationId || 'unknown');
    console.log('Animation Type:', error.animationType || 'unknown');
    console.log('Context:', error.context || 'unknown');
    console.log('Recoverable:', error.recoverable !== false);
    console.log('Error Count:', this.errorCount);
    console.log('Fallback Mode:', this.fallbackMode);
    console.groupEnd();
  }

  // Apply appropriate recovery strategy
  private applyRecoveryStrategy(
    error: AnimationError,
    options: ErrorRecoveryOptions
  ): void {
    // If too many errors, enter fallback mode
    if (this.errorCount >= this.errorThreshold) {
      this.enterFallbackMode();
      return;
    }

    // Apply specific recovery options
    if (options.disableAnimations) {
      this.disableAnimations();
    } else if (options.simplifyAnimations) {
      this.simplifyAnimations();
    } else if (options.fallbackAnimation && error.recoverable !== false) {
      this.createFallbackAnimation();
    }

    // Optimize performance if error is performance-related
    if (this.isPerformanceRelatedError(error)) {
      this.optimizeForPerformance();
    }
  }

  // Check if error is performance-related
  private isPerformanceRelatedError(error: AnimationError): boolean {
    const performanceKeywords = [
      'frame', 'fps', 'memory', 'timeout', 'lag', 'slow', 'performance'
    ];
    
    const errorMessage = error.message.toLowerCase();
    return performanceKeywords.some(keyword => errorMessage.includes(keyword));
  }

  // Enter fallback mode with simplified animations
  private enterFallbackMode(): void {
    if (this.fallbackMode) return;
    
    console.warn('🔄 Entering animation fallback mode');
    this.fallbackMode = true;
    
    // Stop all current animations
    animationManager.stopAllAnimations();
    
    // Simplify animation configuration
    animationConfig.updateConfig({
      animationDuration: {
        fast: 100,
        normal: 150,
        slow: 200,
      },
      performance: {
        maxConcurrentAnimations: 3,
        frameDropThreshold: 10,
        memoryWarningThreshold: 50,
      },
    });
    
    // Set a timer to exit fallback mode
    setTimeout(() => {
      this.exitFallbackMode();
    }, 30000); // 30 seconds
  }

  // Exit fallback mode
  private exitFallbackMode(): void {
    if (!this.fallbackMode) return;
    
    console.log('✅ Exiting animation fallback mode');
    this.fallbackMode = false;
    this.errorCount = 0;
    
    // Reset animation configuration
    animationConfig.resetToDefaults();
  }

  // Disable animations temporarily
  private disableAnimations(): void {
    console.warn('⏸️ Temporarily disabling animations due to errors');
    animationConfig.setAnimationsEnabled(false);
    
    // Re-enable after cooldown
    setTimeout(() => {
      animationConfig.setAnimationsEnabled(true);
      console.log('▶️ Re-enabling animations');
    }, this.errorCooldown);
  }

  // Simplify animations to reduce complexity
  private simplifyAnimations(): void {
    console.log('🔧 Simplifying animations to improve stability');
    
    animationConfig.updateConfig({
      animationDuration: {
        fast: 100,
        normal: 200,
        slow: 300,
      },
      performance: {
        maxConcurrentAnimations: 5,
        frameDropThreshold: 8,
        memoryWarningThreshold: 75,
      },
    });
  }

  // Create a simple fallback animation
  private createFallbackAnimation(): Animated.CompositeAnimation {
    const fallbackValue = new Animated.Value(0);
    return animationManager.createFallbackAnimation(fallbackValue);
  }

  // Optimize for performance
  private optimizeForPerformance(): void {
    console.log('⚡ Optimizing animations for better performance');
    
    // Trigger performance optimization
    animationManager.optimizePerformance();
    performanceMonitor.optimizePerformance();
    
    // Reduce animation complexity
    this.simplifyAnimations();
  }

  // Report error to analytics/monitoring service
  private reportError(error: AnimationError): void {
    // In a production app, this would send to analytics service
    const errorReport = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        animationId: error.animationId,
        animationType: error.animationType,
        context: error.context,
      },
      performance: performanceMonitor.getMetrics(),
      deviceInfo: {
        fallbackMode: this.fallbackMode,
        errorCount: this.errorCount,
        activeAnimations: animationManager.getActiveAnimationCount(),
      },
    };
    
    // Log for development
    if (__DEV__) {
      console.log('📊 Animation Error Report:', errorReport);
    }
    
    // TODO: Send to analytics service in production
    // Analytics.track('animation_error', errorReport);
  }

  // Wrap animation execution with error handling
  executeWithErrorHandling<T>(
    animationFn: () => T,
    context: string,
    animationType?: string
  ): T | null {
    try {
      return animationFn();
    } catch (error) {
      const animationError: AnimationError = {
        ...error,
        context,
        animationType,
        recoverable: true,
      };
      
      this.handleAnimationError(animationError, {
        fallbackAnimation: true,
        reportError: true,
      });
      
      return null;
    }
  }

  // Wrap async animation execution
  async executeAsyncWithErrorHandling<T>(
    animationFn: () => Promise<T>,
    context: string,
    animationType?: string
  ): Promise<T | null> {
    try {
      return await animationFn();
    } catch (error) {
      const animationError: AnimationError = {
        ...error,
        context,
        animationType,
        recoverable: true,
      };
      
      this.handleAnimationError(animationError, {
        fallbackAnimation: true,
        reportError: true,
      });
      
      return null;
    }
  }

  // Check if currently in fallback mode
  isInFallbackMode(): boolean {
    return this.fallbackMode;
  }

  // Get error statistics
  getErrorStats(): {
    errorCount: number;
    fallbackMode: boolean;
    lastErrorTime: number;
    errorThreshold: number;
  } {
    return {
      errorCount: this.errorCount,
      fallbackMode: this.fallbackMode,
      lastErrorTime: this.lastErrorTime,
      errorThreshold: this.errorThreshold,
    };
  }

  // Reset error handler state
  reset(): void {
    this.errorCount = 0;
    this.lastErrorTime = 0;
    this.fallbackMode = false;
    animationConfig.resetToDefaults();
    console.log('🔄 Animation error handler reset');
  }

  // Force exit fallback mode (for testing/debugging)
  forceExitFallbackMode(): void {
    this.exitFallbackMode();
  }
}

export const animationErrorHandler = AnimationErrorHandler.getInstance();

// Utility function to create error-safe animations
export const createSafeAnimation = <T>(
  animationFn: () => T,
  context: string,
  animationType?: string
): T | null => {
  return animationErrorHandler.executeWithErrorHandling(
    animationFn,
    context,
    animationType
  );
};

// Utility function for async error-safe animations
export const createSafeAsyncAnimation = async <T>(
  animationFn: () => Promise<T>,
  context: string,
  animationType?: string
): Promise<T | null> => {
  return animationErrorHandler.executeAsyncWithErrorHandling(
    animationFn,
    context,
    animationType
  );
};