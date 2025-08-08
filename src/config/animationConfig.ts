// Animation configuration for the Mahaa Tailors mobile app
import { Easing } from 'react-native';
import { AccessibilityInfo } from 'react-native';

export interface AnimationConfig {
  // Global animation settings
  enableAnimations: boolean;
  respectReducedMotion: boolean;
  animationDuration: {
    fast: number;    // 150ms
    normal: number;  // 300ms
    slow: number;    // 500ms
  };
  
  // Easing curves following Material Design
  easing: {
    easeInOut: (value: number) => number;
    easeOut: (value: number) => number;
    easeIn: (value: number) => number;
    spring: {
      damping: number;
      stiffness: number;
      mass: number;
    };
  };
  
  // Performance thresholds
  performance: {
    maxConcurrentAnimations: number;
    frameDropThreshold: number;
    memoryWarningThreshold: number;
  };
}

// Material Design easing curves
export const MATERIAL_EASING = {
  // Standard easing - most common
  standard: Easing.bezier(0.4, 0.0, 0.2, 1),
  // Decelerate easing - entering elements
  decelerate: Easing.bezier(0.0, 0.0, 0.2, 1),
  // Accelerate easing - exiting elements
  accelerate: Easing.bezier(0.4, 0.0, 1, 1),
  // Sharp easing - temporary elements
  sharp: Easing.bezier(0.4, 0.0, 0.6, 1),
};

// Default animation configuration
export const DEFAULT_ANIMATION_CONFIG: AnimationConfig = {
  enableAnimations: true,
  respectReducedMotion: true,
  animationDuration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  easing: {
    easeInOut: MATERIAL_EASING.standard,
    easeOut: MATERIAL_EASING.decelerate,
    easeIn: MATERIAL_EASING.accelerate,
    spring: {
      damping: 15,
      stiffness: 150,
      mass: 1,
    },
  },
  performance: {
    maxConcurrentAnimations: 10,
    frameDropThreshold: 5, // frames
    memoryWarningThreshold: 100, // MB
  },
};

// Animation timing presets
export const ANIMATION_TIMINGS = {
  // Micro-interactions
  BUTTON_PRESS: 100,
  RIPPLE_EFFECT: 200,
  FOCUS_CHANGE: 150,
  
  // Navigation
  SCREEN_TRANSITION: 300,
  DRAWER_SLIDE: 250,
  MODAL_PRESENT: 300,
  
  // Content
  FADE_IN: 200,
  SLIDE_UP: 300,
  SCALE_IN: 250,
  
  // Loading states
  SKELETON_SHIMMER: 1500,
  PROGRESS_UPDATE: 100,
  SPINNER_ROTATION: 1000,
};

// Spring animation presets
export const SPRING_CONFIGS = {
  // Gentle spring for UI elements
  gentle: {
    damping: 20,
    stiffness: 120,
    mass: 1,
  },
  // Bouncy spring for playful interactions
  bouncy: {
    damping: 10,
    stiffness: 100,
    mass: 1,
  },
  // Stiff spring for quick responses
  stiff: {
    damping: 25,
    stiffness: 200,
    mass: 1,
  },
  // Wobbly spring for attention-grabbing
  wobbly: {
    damping: 8,
    stiffness: 100,
    mass: 1,
  },
};

// Animation configuration manager
class AnimationConfigManager {
  private static instance: AnimationConfigManager;
  private config: AnimationConfig = DEFAULT_ANIMATION_CONFIG;
  private reducedMotionEnabled: boolean = false;

  private constructor() {
    this.checkReducedMotionPreference();
  }

  static getInstance(): AnimationConfigManager {
    if (!AnimationConfigManager.instance) {
      AnimationConfigManager.instance = new AnimationConfigManager();
    }
    return AnimationConfigManager.instance;
  }

  // Check system accessibility preferences
  private async checkReducedMotionPreference(): Promise<void> {
    try {
      this.reducedMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
      if (this.reducedMotionEnabled && this.config.respectReducedMotion) {
        this.config.enableAnimations = false;
      }
    } catch (error) {
      console.warn('Failed to check reduced motion preference:', error);
    }
  }

  // Get current configuration
  getConfig(): AnimationConfig {
    return { ...this.config };
  }

  // Update configuration
  updateConfig(updates: Partial<AnimationConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  // Get animation duration based on type
  getDuration(type: 'fast' | 'normal' | 'slow'): number {
    if (!this.config.enableAnimations) return 0;
    return this.config.animationDuration[type];
  }

  // Check if animations are enabled
  areAnimationsEnabled(): boolean {
    return this.config.enableAnimations && !this.reducedMotionEnabled;
  }

  // Get easing function
  getEasing(type: 'easeInOut' | 'easeOut' | 'easeIn'): (value: number) => number {
    return this.config.easing[type];
  }

  // Get spring configuration
  getSpringConfig(): typeof SPRING_CONFIGS.gentle {
    return this.config.easing.spring;
  }

  // Enable/disable animations globally
  setAnimationsEnabled(enabled: boolean): void {
    this.config.enableAnimations = enabled;
  }

  // Reset to default configuration
  resetToDefaults(): void {
    this.config = { ...DEFAULT_ANIMATION_CONFIG };
  }
}

export const animationConfig = AnimationConfigManager.getInstance();