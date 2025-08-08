# Core Animation Management System

This document describes the core animation management system implemented for the Mahaa Tailors mobile app.

## 🎯 Overview

The animation system provides a centralized, performance-aware, and accessibility-compliant animation management solution with the following key components:

- **AnimationManager**: Central animation controller
- **AnimationErrorHandler**: Graceful error handling and fallback system
- **PerformanceMonitor**: Real-time performance tracking
- **useAnimations Hook**: React integration for components

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Animation System                         │
├─────────────────────────────────────────────────────────────┤
│  AnimationManager                                           │
│  ├── Screen Transitions (slideFromRight, fadeIn, etc.)     │
│  ├── Micro-interactions (buttonPress, shake, pulse)        │
│  ├── Loading Animations (skeleton, spinner, progressive)   │
│  └── Staggered Animations (list items, cards)              │
├─────────────────────────────────────────────────────────────┤
│  AnimationErrorHandler                                      │
│  ├── Error Detection & Recovery                            │
│  ├── Fallback Mode Management                              │
│  ├── Performance-based Degradation                         │
│  └── Error Reporting & Analytics                           │
├─────────────────────────────────────────────────────────────┤
│  PerformanceMonitor                                         │
│  ├── FPS Tracking                                          │
│  ├── Memory Usage Monitoring                               │
│  ├── Animation Performance Metrics                         │
│  └── Optimization Triggers                                 │
├─────────────────────────────────────────────────────────────┤
│  React Integration                                          │
│  ├── useAnimations Hook                                    │
│  ├── useStaggeredAnimations Hook                           │
│  ├── useRippleAnimation Hook                               │
│  └── usePerformanceAwareAnimations Hook                    │
└─────────────────────────────────────────────────────────────┘
```

## 🎬 Animation Types

### Screen Transitions
- **slideFromRight**: Standard navigation transition
- **slideFromBottom**: Modal presentation
- **fadeIn**: Content loading
- **scaleIn**: Attention-grabbing entrance
- **slideUp/slideDown**: Contextual content

### Micro-interactions
- **buttonPress**: Touch feedback with scale animation
- **bounce**: Playful spring animation
- **shake**: Error indication
- **pulse**: Attention-grabbing loop animation
- **ripple**: Material Design touch feedback

### Loading Animations
- **skeleton**: Shimmer loading placeholders
- **spinner**: Rotating loading indicator
- **progressive**: Progress bar animations
- **dots**: Animated loading dots

## 🚀 Usage Examples

### Basic Animation Hook
```typescript
import { useAnimations } from '../hooks/useAnimations';

const MyComponent = () => {
  const [animatedValue, controls] = useAnimations(0, {
    context: 'MyComponent',
    respectReducedMotion: true,
  });

  const handlePress = async () => {
    try {
      await controls.buttonPress();
      console.log('Button animation completed');
    } catch (error) {
      console.error('Animation failed:', error);
    }
  };

  return (
    <Animated.View style={{ opacity: animatedValue }}>
      <TouchableOpacity onPress={handlePress}>
        <Text>Animated Button</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};
```

### Staggered List Animation
```typescript
import { useStaggeredAnimations } from '../hooks/useAnimations';

const AnimatedList = ({ items }) => {
  const [animatedValues, startAnimation, resetAnimation] = useStaggeredAnimations(
    items.length,
    {
      staggerDelay: 100,
      animationType: 'fadeIn',
      context: 'AnimatedList',
    }
  );

  useEffect(() => {
    startAnimation();
  }, [items]);

  return (
    <View>
      {items.map((item, index) => (
        <Animated.View
          key={item.id}
          style={{
            opacity: animatedValues[index],
            transform: [
              {
                translateY: animatedValues[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          }}
        >
          <ItemComponent item={item} />
        </Animated.View>
      ))}
    </View>
  );
};
```

### Direct AnimationManager Usage
```typescript
import { animationManager } from '../utils/AnimationManager';

const createCustomAnimation = () => {
  const animatedValue = new Animated.Value(0);
  
  const animation = animationManager.createScreenTransition(
    'slideFromRight',
    animatedValue,
    {
      duration: 300,
      easing: MATERIAL_EASING.standard,
    }
  );

  animation.start((finished) => {
    if (finished) {
      console.log('Animation completed successfully');
    }
  });
};
```

## 🛡️ Error Handling

The system includes comprehensive error handling:

### Automatic Error Recovery
```typescript
// Animations are automatically wrapped with error handling
const safeAnimation = createSafeAnimation(
  () => animationManager.createScreenTransition('fadeIn', animatedValue),
  'ComponentName',
  'fadeIn'
);
```

### Fallback Mode
When errors exceed threshold (5 errors in 5 seconds):
- Enters fallback mode with simplified animations
- Reduces animation complexity and duration
- Automatically exits after 30 seconds
- Provides graceful degradation

### Performance-based Adaptation
- Reduces animation duration when FPS < 55
- Limits concurrent animations to prevent overload
- Automatically optimizes based on device performance

## 📊 Performance Monitoring

### Real-time Metrics
- **FPS Tracking**: Target 60fps, warns below 55fps
- **Touch Response**: Target <100ms
- **Navigation Time**: Target <300ms
- **Memory Usage**: Monitors and prevents leaks
- **Animation Count**: Limits concurrent animations

### Performance Reports
```typescript
import { performanceMonitor } from '../utils/performanceMonitor';

// Get current metrics
const metrics = performanceMonitor.getMetrics();

// Get performance warnings
const warnings = performanceMonitor.getPerformanceWarnings();

// Log comprehensive report
performanceMonitor.logPerformanceReport();
```

## ♿ Accessibility Features

### Reduced Motion Support
- Automatically detects system reduced motion preference
- Disables animations when reduced motion is enabled
- Provides instant state changes instead of animations

### Screen Reader Integration
- Announces animation state changes
- Provides semantic descriptions for animated content
- Maintains focus management during transitions

## 🔧 Configuration

### Animation Timings
```typescript
// Available in animationConfig.ts
export const ANIMATION_TIMINGS = {
  BUTTON_PRESS: 100,
  SCREEN_TRANSITION: 300,
  FADE_IN: 200,
  SKELETON_SHIMMER: 1500,
  // ... more presets
};
```

### Spring Configurations
```typescript
export const SPRING_CONFIGS = {
  gentle: { damping: 20, stiffness: 120, mass: 1 },
  bouncy: { damping: 10, stiffness: 100, mass: 1 },
  stiff: { damping: 25, stiffness: 200, mass: 1 },
  wobbly: { damping: 8, stiffness: 100, mass: 1 },
};
```

### Material Design Easing
```typescript
export const MATERIAL_EASING = {
  standard: Easing.bezier(0.4, 0.0, 0.2, 1),    // Most common
  decelerate: Easing.bezier(0.0, 0.0, 0.2, 1),  // Entering elements
  accelerate: Easing.bezier(0.4, 0.0, 1, 1),    // Exiting elements
  sharp: Easing.bezier(0.4, 0.0, 0.6, 1),       // Temporary elements
};
```

## 🧪 Testing

### Unit Tests
- Comprehensive test suite in `__tests__/AnimationManager.test.ts`
- Tests all animation types and error scenarios
- Validates performance optimization logic
- Ensures accessibility compliance

### Performance Testing
```typescript
// Example performance test
it('should optimize performance when FPS drops', () => {
  // Mock poor performance
  jest.spyOn(performanceMonitor, 'getMetrics').mockReturnValue({
    averageFPS: 45,
    frameDrops: 10,
    // ... other metrics
  });

  expect(animationManager.shouldOptimizePerformance()).toBe(true);
});
```

## 🔍 Debugging

### Development Tools
```typescript
// Enable debug logging
if (__DEV__) {
  // Log animation performance
  performanceMonitor.logPerformanceReport();
  
  // Check error statistics
  console.log('Error Stats:', animationErrorHandler.getErrorStats());
  
  // Monitor active animations
  console.log('Active Animations:', animationManager.getActiveAnimationCount());
}
```

### Performance Dashboard
```typescript
import { usePerformanceAwareAnimations } from '../hooks/useAnimations';

const [animatedValue, controls] = usePerformanceAwareAnimations(0);

// Get comprehensive performance stats
const stats = controls.performanceStats();
console.log('Performance Stats:', stats);
```

## 🚨 Troubleshooting

### Common Issues

1. **Animations Not Running**
   - Check if reduced motion is enabled
   - Verify animation configuration is initialized
   - Ensure component is properly mounted

2. **Poor Performance**
   - Monitor FPS and frame drops
   - Reduce concurrent animations
   - Use native driver when possible

3. **Memory Leaks**
   - Ensure animations are properly cleaned up
   - Use the provided hooks for automatic cleanup
   - Monitor memory usage in development

### Error Recovery
```typescript
// Force exit fallback mode (for debugging)
animationErrorHandler.forceExitFallbackMode();

// Reset error handler state
animationErrorHandler.reset();

// Stop all animations
animationManager.stopAllAnimations();
```

## 🎯 Best Practices

1. **Use Appropriate Timing**
   - Fast (150ms): Micro-interactions
   - Normal (300ms): Screen transitions
   - Slow (500ms): Complex animations

2. **Choose Correct Easing**
   - Standard: Most animations
   - Decelerate: Entering elements
   - Accelerate: Exiting elements

3. **Performance Considerations**
   - Limit concurrent animations
   - Use native driver when possible
   - Monitor performance metrics
   - Respect user preferences

4. **Error Handling**
   - Always use provided hooks or safe wrappers
   - Handle animation promises properly
   - Provide fallback UI states

## 🔄 Integration with App

The animation system is automatically initialized in `App.tsx`:

```typescript
// Initialize animation configuration
animationConfig.resetToDefaults();

// Start performance monitoring
performanceMonitor.resetMetrics();

// Initialize animation error handler
const { animationErrorHandler } = await import('./src/utils/animationErrorHandler');
animationErrorHandler.reset();
```

This ensures the animation system is ready before any components attempt to use animations.

## 📈 Future Enhancements

- Gesture-based animations integration
- Advanced physics simulations
- Custom easing curve editor
- Animation recording and playback
- A/B testing for animation preferences
- Machine learning-based performance optimization