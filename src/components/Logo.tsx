import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from 'react-native-paper';
import { LogoProps } from '../types';

const Logo: React.FC<LogoProps> = ({
  variant = 'full',
  size = 'medium',
  animated = false,
  style,
  context = 'content',
}) => {
  const theme = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const texts = ['tailors', 'designers'];
  const slideAnim = new Animated.Value(0);
  const opacityAnim = new Animated.Value(1);

  // Smooth animation for text switching between "tailors" and "designers"
  useEffect(() => {
    if (!animated || variant !== 'full') return;

    let interval: NodeJS.Timeout;

    const animateTransition = () => {
      // Create a smooth fade-out, switch, fade-in animation
      Animated.sequence([
        // Fade out current text
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        // Slide animation for smooth transition
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 0, // Instant switch
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Switch to next text
        setCurrentIndex(prev => (prev + 1) % texts.length);
        
        // Reset slide and fade in new text
        slideAnim.setValue(0);
        
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      });
    };

    // Initial delay, then repeat every 3 seconds for better readability
    const timeout = setTimeout(() => {
      animateTransition();
      interval = setInterval(animateTransition, 3000);
    }, 2000); // 2 second initial delay

    return () => {
      clearTimeout(timeout);
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [animated, variant, slideAnim, opacityAnim, texts]);

  // Get size-specific styles
  const getSizeStyles = () => {
    const baseStyles = {
      small: {
        primaryFontSize: 16,
        secondaryFontSize: 12,
        spacing: 2,
      },
      medium: {
        primaryFontSize: 24,
        secondaryFontSize: 18,
        spacing: 4,
      },
      large: {
        primaryFontSize: 32,
        secondaryFontSize: 24,
        spacing: 6,
      },
    };
    return baseStyles[size];
  };

  const sizeStyles = getSizeStyles();

  // Context-aware brand colors for proper visibility
  const isDarkMode = theme.dark;
  const getColors = () => {
    if (context === 'header') {
      // Header background is now white in light theme, dark in dark theme
      return {
        mahaa: isDarkMode ? '#ffffff' : '#2c3e50', // White for dark header, dark for light header
        tailors: isDarkMode ? '#ffffff' : '#8b4513', // White for dark header, brown for light header
        primary: isDarkMode ? '#ffffff' : '#2c3e50',
      };
    } else if (context === 'sidebar') {
      // Sidebar has dark background, so use white text
      return {
        mahaa: '#ffffff',
        tailors: '#e0e0e0',
        primary: '#ffffff',
      };
    } else {
      // Content area - use web application colors exactly
      return {
        mahaa: isDarkMode ? '#ffffff' : '#2c3e50',
        tailors: isDarkMode ? '#d4af37' : '#8b4513',
        primary: isDarkMode ? '#ffffff' : '#2c3e50',
      };
    }
  };
  
  const colors = getColors();

  // Get underline color based on context and theme
  const getUnderlineColor = () => {
    if (context === 'header') {
      // Header background is now white in light theme, dark in dark theme
      return isDarkMode ? '#ffffff' : '#8b4513'; // White for dark header, brown for light header
    } else if (context === 'sidebar') {
      return '#ffffff'; // White underline for sidebar
    } else {
      // Content area - match web application colors
      return isDarkMode ? '#d4af37' : '#8b4513'; // Golden for dark, brown for light
    }
  };

  // Render different variants
  const renderFullLogo = () => (
    <View style={[styles.container, style]}>
      <View style={styles.logoRow}>
        <View style={styles.mahaContainer}>
          <Text 
            style={[
              styles.primaryText,
              {
                fontSize: sizeStyles.primaryFontSize,
                color: colors.mahaa,
                width: sizeStyles.primaryFontSize * 4, // Increased width to prevent wrapping
              }
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
          >
            Mahaa
          </Text>
          {/* Elegant gradient-like underline below Mahaa - matching web app */}
          <View style={[
            styles.underline,
            {
              width: sizeStyles.primaryFontSize * 4, // Full width like web app
            }
          ]}>
            {/* Create gradient effect using multiple segments */}
            <View style={[styles.gradientSegment, { backgroundColor: getUnderlineColor(), opacity: 0.6, flex: 3 }]} />
            <View style={[styles.gradientSegment, { backgroundColor: getUnderlineColor(), opacity: 0.4, flex: 2 }]} />
            <View style={[styles.gradientSegment, { backgroundColor: getUnderlineColor(), opacity: 0.2, flex: 2 }]} />
            <View style={[styles.gradientSegment, { backgroundColor: getUnderlineColor(), opacity: 0.1, flex: 1 }]} />
            <View style={[styles.gradientSegment, { backgroundColor: 'transparent', flex: 2 }]} />
          </View>
        </View>
        <View style={{ 
          minWidth: sizeStyles.secondaryFontSize * 6, 
          marginLeft: sizeStyles.spacing,
          justifyContent: 'center',
          height: sizeStyles.secondaryFontSize * 1.5, // Increased height to accommodate descenders like 'g' in 'designers'
          paddingBottom: sizeStyles.secondaryFontSize * 0.1, // Small padding to ensure descenders are visible
        }}>
          <Animated.Text
            style={[
              styles.secondaryText,
              {
                fontSize: sizeStyles.secondaryFontSize,
                color: colors.tailors,
                textShadowColor: context === 'header' ? 'rgba(0, 0, 0, 0.3)' : 'transparent',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 2,
                opacity: animated ? opacityAnim : 1,
              }
            ]}
          >
            {texts[currentIndex]}
          </Animated.Text>
        </View>
      </View>
    </View>
  );

  const renderCompactLogo = () => {
    // For sidebar context, don't show anything
    if (context === 'sidebar') {
      return null;
    }
    
    // For other contexts, show "M TAILORS"
    return (
      <View style={[styles.container, style]}>
        <View style={styles.compactRow}>
          <Text style={[
            styles.compactPrimary,
            {
              fontSize: sizeStyles.primaryFontSize,
              color: colors.primary,
              marginRight: sizeStyles.spacing,
            }
          ]}>
            M
          </Text>
          <Text style={[
            styles.compactSecondary,
            {
              fontSize: sizeStyles.secondaryFontSize,
              color: colors.primary,
              opacity: 0.8,
            }
          ]}>
            TAILORS
          </Text>
        </View>
      </View>
    );
  };

  const renderIconLogo = () => (
    <View style={[styles.iconContainer, style]}>
      <Text style={[
        styles.iconText,
        {
          fontSize: sizeStyles.primaryFontSize * 1.2,
          color: colors.primary,
        }
      ]}>
        M
      </Text>
    </View>
  );

  // Render based on variant
  switch (variant) {
    case 'compact':
      return renderCompactLogo();
    case 'icon':
      return renderIconLogo();
    case 'full':
    default:
      return renderFullLogo();
  }
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  mahaContainer: {
    position: 'relative',
  },
  underline: {
    position: 'absolute',
    bottom: -2,
    left: 0,
    height: 1,
    flexDirection: 'row',
  },
  gradientSegment: {
    height: 1,
  },
  primaryText: {
    fontWeight: 'bold',
    fontFamily: 'serif',
    letterSpacing: 1,
  },
  secondaryText: {
    fontWeight: 'bold',
    fontFamily: 'serif',
    letterSpacing: 1,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  compactPrimary: {
    fontWeight: 'bold',
    fontFamily: 'serif',
    letterSpacing: 1,
  },
  compactSecondary: {
    fontWeight: '600',
    fontFamily: 'sans-serif',
    letterSpacing: 2,
  },
  compactText: {
    fontWeight: 'bold',
    letterSpacing: 2,
    fontFamily: 'sans-serif',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  iconText: {
    fontWeight: 'bold',
    fontFamily: 'serif',
    textAlign: 'center',
  },
});

export default Logo;