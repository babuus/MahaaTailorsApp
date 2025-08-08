import React from 'react';
import { StyleSheet } from 'react-native';
import { FAB } from 'react-native-paper';

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
    margin: 16,
    right: 0,
    bottom: 0,
    elevation: 8,
  },
});

export default FloatingActionButton;