import { AccessibilityInfo, Dimensions, Platform } from 'react-native';

// Accessibility constants
export const ACCESSIBILITY_CONSTANTS = {
  // Minimum touch target size (44dp as per Android guidelines)
  MIN_TOUCH_TARGET_SIZE: 44,

  // High contrast colors
  HIGH_CONTRAST_COLORS: {
    PRIMARY: '#0066CC',
    SECONDARY: '#FF6600',
    SUCCESS: '#006600',
    ERROR: '#CC0000',
    WARNING: '#CC6600',
    TEXT_PRIMARY: '#000000',
    TEXT_SECONDARY: '#333333',
    BACKGROUND_PRIMARY: '#FFFFFF',
    BACKGROUND_SECONDARY: '#F0F0F0',
  },

  // Font sizes for better readability
  ACCESSIBLE_FONT_SIZES: {
    SMALL: 14,
    MEDIUM: 16,
    LARGE: 18,
    EXTRA_LARGE: 20,
  },
} as const;

// Accessibility utility functions
export class AccessibilityUtils {
  private static highContrastEnabled = false;
  private static largeTextEnabled = false;
  private static screenReaderEnabled = false;
  private static screenReaderSubscription: any = null;

  /**
   * Initialize accessibility settings
   */
  static async initialize(): Promise<void> {
    try {
      // Check if screen reader is enabled
      this.screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();

      // Check if high contrast is enabled (Android only)
      if (Platform.OS === 'android') {
        // Note: React Native doesn't have direct API for high contrast detection
        // This would need to be implemented with native modules
        this.highContrastEnabled = false;
      }

      // Listen for accessibility changes
      this.screenReaderSubscription = AccessibilityInfo.addEventListener(
        'screenReaderChanged',
        this.handleScreenReaderChange
      );
    } catch (error) {
      console.warn('Failed to initialize accessibility settings:', error);
    }
  }

  /**
   * Handle screen reader state changes
   */
  private static handleScreenReaderChange = (isEnabled: boolean): void => {
    this.screenReaderEnabled = isEnabled;
  };

  /**
   * Get accessible colors based on current settings
   */
  static getAccessibleColors() {
    if (this.highContrastEnabled) {
      return ACCESSIBILITY_CONSTANTS.HIGH_CONTRAST_COLORS;
    }

    // Return default colors if high contrast is not enabled
    return {
      PRIMARY: '#2196F3',
      SECONDARY: '#FFC107',
      SUCCESS: '#4CAF50',
      ERROR: '#F44336',
      WARNING: '#FF9800',
      TEXT_PRIMARY: '#212121',
      TEXT_SECONDARY: '#666666',
      BACKGROUND_PRIMARY: '#FFFFFF',
      BACKGROUND_SECONDARY: '#F5F5F5',
    };
  }

  /**
   * Get accessible font size based on current settings
   */
  static getAccessibleFontSize(baseSize: number): number {
    if (this.largeTextEnabled) {
      return Math.max(baseSize * 1.2, ACCESSIBILITY_CONSTANTS.ACCESSIBLE_FONT_SIZES.MEDIUM);
    }
    return baseSize;
  }

  /**
   * Ensure minimum touch target size
   */
  static ensureMinimumTouchTarget(size: number): number {
    return Math.max(size, ACCESSIBILITY_CONSTANTS.MIN_TOUCH_TARGET_SIZE);
  }

  /**
   * Generate accessibility label for form inputs
   */
  static generateInputLabel(label: string, required: boolean = false, error?: string): string {
    let accessibilityLabel = label;

    if (required) {
      accessibilityLabel += ', required';
    }

    if (error) {
      accessibilityLabel += `, error: ${error}`;
    }

    return accessibilityLabel;
  }

  /**
   * Generate accessibility hint for buttons
   */
  static generateButtonHint(action: string, context?: string): string {
    let hint = `Tap to ${action}`;

    if (context) {
      hint += ` ${context}`;
    }

    return hint;
  }

  /**
   * Generate accessibility label for list items
   */
  static generateListItemLabel(
    title: string,
    subtitle?: string,
    position?: { index: number; total: number }
  ): string {
    let label = title;

    if (subtitle) {
      label += `, ${subtitle}`;
    }

    if (position) {
      label += `, item ${position.index + 1} of ${position.total}`;
    }

    return label;
  }

  /**
   * Check if screen reader is enabled
   */
  static isScreenReaderEnabled(): boolean {
    return this.screenReaderEnabled;
  }

  /**
   * Check if high contrast is enabled
   */
  static isHighContrastEnabled(): boolean {
    return this.highContrastEnabled;
  }

  /**
   * Announce message to screen reader
   */
  static announceForAccessibility(message: string): void {
    if (this.screenReaderEnabled) {
      AccessibilityInfo.announceForAccessibility(message);
    }
  }

  /**
   * Set accessibility focus to a component
   */
  static setAccessibilityFocus(reactTag: number): void {
    if (this.screenReaderEnabled) {
      AccessibilityInfo.setAccessibilityFocus(reactTag);
    }
  }

  /**
   * Generate semantic description for complex UI elements
   */
  static generateSemanticDescription(
    type: 'form' | 'list' | 'navigation' | 'dialog',
    context: string
  ): string {
    switch (type) {
      case 'form':
        return `${context} form. Fill out the required fields and tap submit when complete.`;
      case 'list':
        return `${context} list. Swipe up and down to browse items. Tap an item to select it.`;
      case 'navigation':
        return `${context} navigation. Swipe right to open menu, tap items to navigate.`;
      case 'dialog':
        return `${context} dialog. Review the information and choose an action.`;
      default:
        return context;
    }
  }

  /**
   * Cleanup accessibility listeners
   */
  static cleanup(): void {
    if (this.screenReaderSubscription) {
      this.screenReaderSubscription.remove();
      this.screenReaderSubscription = null;
    }
  }
}

// Accessibility hook for React components
export const useAccessibility = () => {
  return {
    isScreenReaderEnabled: AccessibilityUtils.isScreenReaderEnabled(),
    isHighContrastEnabled: AccessibilityUtils.isHighContrastEnabled(),
    getAccessibleColors: AccessibilityUtils.getAccessibleColors,
    getAccessibleFontSize: AccessibilityUtils.getAccessibleFontSize,
    ensureMinimumTouchTarget: AccessibilityUtils.ensureMinimumTouchTarget,
    generateInputLabel: AccessibilityUtils.generateInputLabel,
    generateButtonHint: AccessibilityUtils.generateButtonHint,
    generateListItemLabel: AccessibilityUtils.generateListItemLabel,
    announceForAccessibility: AccessibilityUtils.announceForAccessibility,
    generateSemanticDescription: AccessibilityUtils.generateSemanticDescription,
  };
};

// Accessibility styles helper
export const getAccessibleStyles = () => {
  const colors = AccessibilityUtils.getAccessibleColors();
  const { width, height } = Dimensions.get('window');

  return {
    // Minimum touch target styles
    touchTarget: {
      minWidth: ACCESSIBILITY_CONSTANTS.MIN_TOUCH_TARGET_SIZE,
      minHeight: ACCESSIBILITY_CONSTANTS.MIN_TOUCH_TARGET_SIZE,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },

    // High contrast text styles
    accessibleText: {
      color: colors.TEXT_PRIMARY,
      fontSize: AccessibilityUtils.getAccessibleFontSize(16),
    },

    // High contrast button styles
    accessibleButton: {
      backgroundColor: colors.PRIMARY,
      minWidth: ACCESSIBILITY_CONSTANTS.MIN_TOUCH_TARGET_SIZE,
      minHeight: ACCESSIBILITY_CONSTANTS.MIN_TOUCH_TARGET_SIZE,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      borderRadius: 8,
    },

    // Focus indicator styles
    focusIndicator: {
      borderWidth: 2,
      borderColor: colors.PRIMARY,
      borderStyle: 'solid' as const,
    },

    // Error state styles
    errorState: {
      borderColor: colors.ERROR,
      borderWidth: 2,
    },

    // Success state styles
    successState: {
      borderColor: colors.SUCCESS,
      borderWidth: 2,
    },
  };
};