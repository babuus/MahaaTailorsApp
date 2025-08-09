import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    View,
} from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../constants';
import { useThemeContext } from '../contexts/ThemeContext';
import { SimpleIcon } from './SimpleIcon';

interface ModernButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'small' | 'medium' | 'large';
    icon?: string;
    iconPosition?: 'left' | 'right';
    loading?: boolean;
    disabled?: boolean;
    fullWidth?: boolean;
    style?: any;
    testID?: string;
}

const ModernButton: React.FC<ModernButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    size = 'medium',
    icon,
    iconPosition = 'left',
    loading = false,
    disabled = false,
    fullWidth = false,
    style,
    testID,
}) => {
    const { isDarkMode } = useThemeContext();

    const getButtonStyles = () => {
        const baseStyle = {
            backgroundColor: 'transparent',
            borderWidth: 0,
            borderColor: 'transparent',
        };

        switch (variant) {
            case 'primary':
                return {
                    ...baseStyle,
                    backgroundColor: disabled ? COLORS.TEXT_LIGHT : COLORS.PRIMARY,
                };
            case 'secondary':
                return {
                    ...baseStyle,
                    backgroundColor: disabled ? COLORS.TEXT_LIGHT : COLORS.SECONDARY,
                };
            case 'outline':
                return {
                    ...baseStyle,
                    borderWidth: 2,
                    borderColor: disabled ? COLORS.TEXT_LIGHT : COLORS.PRIMARY,
                    backgroundColor: 'transparent',
                };
            case 'ghost':
                return {
                    ...baseStyle,
                    backgroundColor: disabled
                        ? 'transparent'
                        : isDarkMode
                            ? 'rgba(255,255,255,0.1)'
                            : 'rgba(0,0,0,0.05)',
                };
            default:
                return baseStyle;
        }
    };

    const getTextStyles = () => {
        const baseColor = isDarkMode ? COLORS.TEXT_DARK_PRIMARY : COLORS.TEXT_PRIMARY;

        switch (variant) {
            case 'primary':
            case 'secondary':
                return { color: '#FFFFFF' };
            case 'outline':
                return { color: disabled ? COLORS.TEXT_LIGHT : COLORS.PRIMARY };
            case 'ghost':
                return { color: disabled ? COLORS.TEXT_LIGHT : baseColor };
            default:
                return { color: baseColor };
        }
    };

    const getSizeStyles = () => {
        switch (size) {
            case 'small':
                return {
                    paddingHorizontal: SPACING.MD,
                    paddingVertical: SPACING.SM,
                    borderRadius: BORDER_RADIUS.SM,
                    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
                };
            case 'large':
                return {
                    paddingHorizontal: SPACING.XL,
                    paddingVertical: SPACING.LG,
                    borderRadius: BORDER_RADIUS.LG,
                    fontSize: TYPOGRAPHY.FONT_SIZE.LG,
                };
            case 'medium':
            default:
                return {
                    paddingHorizontal: SPACING.LG,
                    paddingVertical: SPACING.MD,
                    borderRadius: BORDER_RADIUS.MD,
                    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
                };
        }
    };

    const buttonStyles = getButtonStyles();
    const textStyles = getTextStyles();
    const sizeStyles = getSizeStyles();

    const renderContent = () => {
        if (loading) {
            return (
                <ActivityIndicator
                    size="small"
                    color={textStyles.color}
                />
            );
        }

        const iconElement = icon ? (
            <SimpleIcon
                name={icon}
                size={sizeStyles.fontSize}
                color={textStyles.color}
                style={{ marginHorizontal: SPACING.XS }}
            />
        ) : null;

        const textElement = (
            <Text style={[styles.text, textStyles, { fontSize: sizeStyles.fontSize }]}>
                {title}
            </Text>
        );

        if (!icon) return textElement;

        return (
            <View style={styles.contentContainer}>
                {iconPosition === 'left' && iconElement}
                {textElement}
                {iconPosition === 'right' && iconElement}
            </View>
        );
    };

    return (
        <TouchableOpacity
            style={[
                styles.button,
                buttonStyles,
                {
                    paddingHorizontal: sizeStyles.paddingHorizontal,
                    paddingVertical: sizeStyles.paddingVertical,
                    borderRadius: sizeStyles.borderRadius,
                    width: fullWidth ? '100%' : 'auto',
                    opacity: disabled ? 0.6 : 1,
                },
                style,
            ]}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}
            testID={testID}
            accessibilityRole="button"
            accessibilityLabel={title}
            accessibilityState={{ disabled: disabled || loading }}
        >
            {renderContent()}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    contentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        fontWeight: TYPOGRAPHY.FONT_WEIGHT.SEMIBOLD,
        textAlign: 'center',
    },
});

export default ModernButton;