// Performance monitoring utility for animations and app performance
import { InteractionManager, PixelRatio } from 'react-native';

export interface PerformanceMetrics {
  // Rendering performance
  averageFPS: number;
  frameDrops: number;
  renderTime: number;
  
  // Memory usage
  memoryUsage: number;
  memoryLeaks: number;
  
  // Animation performance
  animationFrameDrops: number;
  animationDuration: number;
  concurrentAnimations: number;
  
  // User interaction metrics
  touchResponseTime: number;
  navigationTime: number;
  loadingTime: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics;
  private frameCount: number = 0;
  private lastFrameTime: number = 0;
  private frameDropCount: number = 0;
  private animationStartTimes: Map<string, number> = new Map();
  private activeAnimations: Set<string> = new Set();
  private touchStartTime: number = 0;
  private navigationStartTime: number = 0;

  private constructor() {
    this.metrics = {
      averageFPS: 60,
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
    };
    
    this.startFrameMonitoring();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Start monitoring frame rate
  private startFrameMonitoring(): void {
    const monitorFrame = () => {
      const currentTime = Date.now();
      
      if (this.lastFrameTime > 0) {
        const frameDuration = currentTime - this.lastFrameTime;
        const expectedFrameDuration = 1000 / 60; // 60 FPS
        
        // Count frame drops (frames taking longer than expected)
        if (frameDuration > expectedFrameDuration * 1.5) {
          this.frameDropCount++;
        }
        
        // Calculate average FPS
        this.frameCount++;
        if (this.frameCount % 60 === 0) {
          const avgFrameDuration = (currentTime - (this.lastFrameTime - (59 * expectedFrameDuration))) / 60;
          this.metrics.averageFPS = Math.min(60, 1000 / avgFrameDuration);
          this.metrics.frameDrops = this.frameDropCount;
        }
      }
      
      this.lastFrameTime = currentTime;
      requestAnimationFrame(monitorFrame);
    };
    
    requestAnimationFrame(monitorFrame);
  }

  // Track animation start
  startAnimation(animationId: string): void {
    this.animationStartTimes.set(animationId, Date.now());
    this.activeAnimations.add(animationId);
    this.metrics.concurrentAnimations = this.activeAnimations.size;
  }

  // Track animation end
  endAnimation(animationId: string): void {
    const startTime = this.animationStartTimes.get(animationId);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.metrics.animationDuration = duration;
      this.animationStartTimes.delete(animationId);
    }
    
    this.activeAnimations.delete(animationId);
    this.metrics.concurrentAnimations = this.activeAnimations.size;
  }

  // Track touch response time
  startTouchTracking(): void {
    this.touchStartTime = Date.now();
  }

  endTouchTracking(): void {
    if (this.touchStartTime > 0) {
      this.metrics.touchResponseTime = Date.now() - this.touchStartTime;
      this.touchStartTime = 0;
    }
  }

  // Track navigation performance
  startNavigation(): void {
    this.navigationStartTime = Date.now();
  }

  endNavigation(): void {
    if (this.navigationStartTime > 0) {
      this.metrics.navigationTime = Date.now() - this.navigationStartTime;
      this.navigationStartTime = 0;
    }
  }

  // Track loading performance
  trackLoadingTime(startTime: number): void {
    this.metrics.loadingTime = Date.now() - startTime;
  }

  // Get current metrics
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  // Check if performance is acceptable
  isPerformanceAcceptable(): boolean {
    return (
      this.metrics.averageFPS >= 55 &&
      this.metrics.touchResponseTime <= 100 &&
      this.metrics.navigationTime <= 300 &&
      this.metrics.concurrentAnimations <= 10
    );
  }

  // Get performance warnings
  getPerformanceWarnings(): string[] {
    const warnings: string[] = [];
    
    if (this.metrics.averageFPS < 55) {
      warnings.push(`Low FPS detected: ${this.metrics.averageFPS.toFixed(1)} FPS`);
    }
    
    if (this.metrics.touchResponseTime > 100) {
      warnings.push(`Slow touch response: ${this.metrics.touchResponseTime}ms`);
    }
    
    if (this.metrics.navigationTime > 300) {
      warnings.push(`Slow navigation: ${this.metrics.navigationTime}ms`);
    }
    
    if (this.metrics.concurrentAnimations > 10) {
      warnings.push(`Too many concurrent animations: ${this.metrics.concurrentAnimations}`);
    }
    
    if (this.metrics.frameDrops > 5) {
      warnings.push(`Frame drops detected: ${this.metrics.frameDrops} drops`);
    }
    
    return warnings;
  }

  // Reset metrics
  resetMetrics(): void {
    this.frameCount = 0;
    this.frameDropCount = 0;
    this.metrics = {
      averageFPS: 60,
      frameDrops: 0,
      renderTime: 0,
      memoryUsage: 0,
      memoryLeaks: 0,
      animationFrameDrops: 0,
      animationDuration: 0,
      concurrentAnimations: this.activeAnimations.size,
      touchResponseTime: 0,
      navigationTime: 0,
      loadingTime: 0,
    };
  }

  // Log performance report
  logPerformanceReport(): void {
    const metrics = this.getMetrics();
    const warnings = this.getPerformanceWarnings();
    
    console.group('🚀 Performance Report');
    console.log('📊 Metrics:', metrics);
    
    if (warnings.length > 0) {
      console.warn('⚠️ Performance Warnings:');
      warnings.forEach(warning => console.warn(`  - ${warning}`));
    } else {
      console.log('✅ Performance is acceptable');
    }
    
    console.groupEnd();
  }

  // Memory usage estimation (simplified)
  estimateMemoryUsage(): number {
    // This is a simplified estimation
    // In a real app, you might use native modules for accurate memory tracking
    const pixelRatio = PixelRatio.get();
    const screenPixels = pixelRatio * pixelRatio * 1000000; // Rough estimate
    const estimatedUsage = screenPixels * 4 / (1024 * 1024); // 4 bytes per pixel, convert to MB
    
    this.metrics.memoryUsage = estimatedUsage;
    return estimatedUsage;
  }

  // Check for memory leaks (simplified detection)
  checkForMemoryLeaks(): boolean {
    const currentUsage = this.estimateMemoryUsage();
    const threshold = 100; // 100MB threshold
    
    if (currentUsage > threshold) {
      this.metrics.memoryLeaks++;
      console.warn(`⚠️ Potential memory leak detected: ${currentUsage.toFixed(2)}MB`);
      return true;
    }
    
    return false;
  }

  // Optimize performance based on current metrics
  optimizePerformance(): void {
    const warnings = this.getPerformanceWarnings();
    
    if (warnings.length > 0) {
      console.log('🔧 Applying performance optimizations...');
      
      // Reduce animation complexity if FPS is low
      if (this.metrics.averageFPS < 55) {
        console.log('  - Reducing animation complexity');
        // This would trigger animation simplification in the animation manager
      }
      
      // Limit concurrent animations
      if (this.metrics.concurrentAnimations > 10) {
        console.log('  - Limiting concurrent animations');
        // This would queue animations instead of running them all at once
      }
      
      // Trigger garbage collection if memory usage is high
      if (this.metrics.memoryUsage > 80) {
        console.log('  - Triggering garbage collection');
        // Force garbage collection (if available)
        if (global.gc) {
          global.gc();
        }
      }
    }
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();

// Performance monitoring hooks for React components
export const usePerformanceMonitoring = () => {
  const startAnimation = (id: string) => performanceMonitor.startAnimation(id);
  const endAnimation = (id: string) => performanceMonitor.endAnimation(id);
  const getMetrics = () => performanceMonitor.getMetrics();
  const isAcceptable = () => performanceMonitor.isPerformanceAcceptable();
  
  return {
    startAnimation,
    endAnimation,
    getMetrics,
    isAcceptable,
    monitor: performanceMonitor,
  };
};