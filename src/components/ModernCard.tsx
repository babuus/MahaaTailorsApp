import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants';
import { useThemeContext } from '../contexts/ThemeContext';

interface ModernCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'small' | 'medium' | 'large';
  style?: any;
  testID?: string;
}

const ModernCard: React.FC<ModernCardProps> = ({
  children,
  onPress,
  variant = 'elevated',
  padding = 'medium',
  style,
  testID,
}) => {
  const { isDarkMode } = useThemeContext();

  const getCardStyles = () => {
    const baseStyle = {
      backgroundColor: isDarkMode ? COLORS.SURFACE_DARK : COLORS.SURFACE_LIGHT,
      borderRadius: BORDER_RADIUS.LG,
    };

    switch (variant) {
      case 'elevated':
        return {
          ...baseStyle,
          elevation: 4,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          borderWidth: 0,
        };
      case 'outlined':
        return {
          ...baseStyle,
          borderWidth: 1,
          borderColor: isDarkMode ? COLORS.BORDER_DARK : COLORS.BORDER_LIGHT,
          elevation: 0,
          shadowOpacity: 0,
        };
      case 'filled':
        return {
          ...baseStyle,
          backgroundColor: isDarkMode 
            ? 'rgba(255,255,255,0.05)' 
            : 'rgba(0,0,0,0.02)',
          elevation: 0,
          shadowOpacity: 0,
          borderWidth: 0,
        };
      default:
        return baseStyle;
    }
  };

  const getPaddingStyles = () => {
    switch (padding) {
      case 'none':
        return { padding: 0 };
      case 'small':
        return { padding: SPACING.MD };
      case 'large':
        return { padding: SPACING.XL };
      case 'medium':
      default:
        return { padding: SPACING.LG };
    }
  };

  const cardStyles = getCardStyles();
  const paddingStyles = getPaddingStyles();

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.card, cardStyles, paddingStyles, style]}
        onPress={onPress}
        activeOpacity={0.8}
        testID={testID}
        accessibilityRole="button"
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[styles.card, cardStyles, paddingStyles, style]}
      testID={testID}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
});

export default ModernCard;