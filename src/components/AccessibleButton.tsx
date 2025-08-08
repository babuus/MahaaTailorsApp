import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAccessibility } from '../utils/accessibility';
import { COLORS } from '../constants';

interface AccessibleButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'text' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  fullWidth?: boolean;
}

const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
  testID,
  fullWidth = false,
}) => {
  const { 
    generateButtonHint, 
    ensureMinimumTouchTarget,
    getAccessibleColors 
  } = useAccessibility();

  const colors = getAccessibleColors();

  const getButtonStyles = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: 8,
      paddingHorizontal: size === 'small' ? 12 : size === 'large' ? 20 : 16,
      paddingVertical: size === 'small' ? 8 : size === 'large' ? 16 : 12,
      minHeight: ensureMinimumTouchTarget(size === 'small' ? 36 : size === 'large' ? 56 : 44),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: disabled || loading ? 0.6 : 1,
    };

    if (fullWidth) {
      baseStyle.width = '100%';
    }

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: colors.PRIMARY,
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: colors.BACKGROUND_SECONDARY,
          borderWidth: 1,
          borderColor: colors.PRIMARY,
        };
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: colors.PRIMARY,
        };
      case 'text':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          paddingHorizontal: size === 'small' ? 8 : size === 'large' ? 16 : 12,
        };
      case 'danger':
        return {
          ...baseStyle,
          backgroundColor: colors.ERROR || COLORS.ERROR,
        };
      default:
        return baseStyle;
    }
  };

  const getTextStyles = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontSize: size === 'small' ? 14 : size === 'large' ? 18 : 16,
      fontWeight: '600',
      textAlign: 'center',
    };

    switch (variant) {
      case 'primary':
      case 'danger':
        return {
          ...baseStyle,
          color: '#FFFFFF',
        };
      case 'secondary':
      case 'outline':
      case 'text':
        return {
          ...baseStyle,
          color: colors.PRIMARY,
        };
      default:
        return baseStyle;
    }
  };

  const renderIcon = () => {
    if (!icon || loading) return null;

    const iconSize = size === 'small' ? 16 : size === 'large' ? 24 : 20;
    const iconColor = variant === 'primary' || variant === 'danger' ? '#FFFFFF' : colors.PRIMARY;
    const marginStyle = iconPosition === 'left' ? { marginRight: 8 } : { marginLeft: 8 };

    return (
      <Icon 
        name={icon} 
        size={iconSize} 
        color={iconColor} 
        style={marginStyle}
        accessibilityElementsHidden={true}
        importantForAccessibility="no"
      />
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={[getTextStyles(), textStyle]}>Loading...</Text>
        </View>
      );
    }

    return (
      <>
        {iconPosition === 'left' && renderIcon()}
        <Text style={[getTextStyles(), textStyle]}>{title}</Text>
        {iconPosition === 'right' && renderIcon()}
      </>
    );
  };

  return (
    <TouchableOpacity
      style={[getButtonStyles(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint || generateButtonHint(title.toLowerCase())}
      accessibilityState={{
        disabled: disabled || loading,
        busy: loading,
      }}
      testID={testID}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default AccessibleButton;