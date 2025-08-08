import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface SimpleIconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
  testID?: string;
  accessibilityLabel?: string;
}

export type SimpleIconName = keyof typeof SIMPLE_ICONS;

// Simple text-based icons that will definitely display
const SIMPLE_ICONS = {
  menu: '☰',
  close: '✕',
  back: '←',
  home: '🏠',
  dashboard: '📊',
  settings: '⚙️',
  search: '🔍',
  add: '+',
  edit: '✏️',
  delete: '🗑️',
  save: '💾',
  check: '✓',
  person: '👤',
  people: '👥',
  phone: '📞',
  email: '📧',
  message: '💬',
  notifications: '🔔',
  star: '⭐',
  heart: '❤️',
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  help: '❓',
  shopping: '🛒',
  payment: '💳',
  receipt: '🧾',
  money: '💰',
  calendar: '📅',
  time: '🕐',
  location: '📍',
  camera: '📷',
  image: '🖼️',
  file: '📄',
  folder: '📁',
  sync: '🔄',
  upload: '⬆️',
  download: '⬇️',
  share: '📤',
  copy: '📋',
  visible: '👁️',
  hidden: '🙈',
  lock: '🔒',
  unlock: '🔓',
  up: '⬆️',
  down: '⬇️',
  left: '⬅️',
  right: '➡️',
  refresh: '🔄',
  power: '⚡',
  wifi: '📶',
  cloud: '☁️',
  cloudOff: '⛅',
  straighten: '📏',
  ruler: '📐',
  measure: '📏',
  scissors: '✂️',
} as const;

const SimpleIcon: React.FC<SimpleIconProps> = ({
  name,
  size = 24,
  color = '#000000',
  style,
}) => {
  const iconSymbol = SIMPLE_ICONS[name as keyof typeof SIMPLE_ICONS] || '?';

  return (
    <View style={[styles.container, style]}>
      <Text 
        style={[
          styles.icon, 
          { 
            fontSize: size, 
            color: color,
            lineHeight: size + 2,
          }
        ]}
      >
        {iconSymbol}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    textAlign: 'center',
    includeFontPadding: false,
  },
});

export default SimpleIcon;