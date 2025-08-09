import React from 'react';
import { StyleSheet } from 'react-native';
import { FAB } from 'react-native-paper';
import { COLORS } from '../constants';

interface FloatingActionButtonProps {
  icon: string;
  onPress: () => void;
  label?: string;
  disabled?: boolean;
  loading?: boolean;
  color?: string;
  style?: any;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  icon,
  onPress,
  label,
  disabled = false,
  loading = false,
  color,
  style,
  testID,
  accessibilityLabel,
  accessibilityHint,
}) => {
  return (
    <FAB
      icon={icon}
      onPress={onPress}
      label={label}
      disabled={disabled}
      loading={loading}
      color={color}
      style={[styles.fab, style]}
      accessibilityLabel={accessibilityLabel || label || 'Action button'}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      testID={testID}
    />
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    margin: 20,
    right: 0,
    bottom: 0,
    elevation: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 28,
  },
});

export default FloatingActionButton;