import React from 'react';
import { View, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface SimpleIconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
  testID?: string;
  accessibilityLabel?: string;
}

export type SimpleIconName = keyof typeof ICON_MAPPING;

// Professional MaterialIcons mapping
const ICON_MAPPING = {
  // Navigation
  menu: 'menu',
  close: 'close',
  back: 'arrow-back',
  'arrow-back': 'arrow-back',
  home: 'home',
  dashboard: 'dashboard',
  settings: 'settings',
  search: 'search',

  // Actions
  add: 'add',
  edit: 'edit',
  delete: 'delete',
  save: 'save',
  check: 'check',
  refresh: 'refresh',
  sync: 'sync',
  upload: 'upload',
  download: 'download',
  share: 'share',
  copy: 'content-copy',
  print: 'print',

  // People & Communication
  person: 'person',
  'person-add': 'person-add',
  people: 'people',
  phone: 'phone',
  email: 'email',
  message: 'message',
  notifications: 'notifications',

  // Status & Feedback
  star: 'star',
  heart: 'favorite',
  success: 'check-circle',
  'check-circle': 'check-circle',
  error: 'error',
  warning: 'warning',
  info: 'info',
  help: 'help',
  history: 'history',

  // Business & Commerce
  shopping: 'shopping-cart',
  'shopping-cart': 'shopping-cart',
  payment: 'payment',
  receipt: 'receipt',
  money: 'attach-money',
  inventory: 'inventory',

  // Time & Location
  calendar: 'calendar-today',
  'calendar-today': 'calendar-today',
  time: 'access-time',
  location: 'location-on',

  // Media & Files
  camera: 'camera-alt',
  image: 'image',
  file: 'description',
  folder: 'folder',

  // Visibility & Security
  visible: 'visibility',
  'visibility-off': 'visibility-off',
  hidden: 'visibility-off',
  lock: 'lock',
  unlock: 'lock-open',

  // Checkboxes
  'check-box': 'check-box',
  'check-box-outline-blank': 'check-box-outline-blank',

  // Directional
  up: 'keyboard-arrow-up',
  down: 'keyboard-arrow-down',
  left: 'keyboard-arrow-left',
  right: 'keyboard-arrow-right',

  // Connectivity
  power: 'power',
  wifi: 'wifi',
  cloud: 'cloud',
  cloudOff: 'cloud-off',

  // Tailoring specific
  straighten: 'straighten',
  ruler: 'straighten',
  measure: 'straighten',
  scissors: 'content-cut',

  // Additional professional icons
  badge: 'badge',
  cake: 'cake',
  call: 'call',
  'mail-outline': 'mail-outline',
  'location-on': 'location-on',
  comment: 'comment',
  checkroom: 'checkroom',
  'business-center': 'business-center',
  woman: 'woman',
  'keyboard-arrow-up': 'keyboard-arrow-up',
  'keyboard-arrow-down': 'keyboard-arrow-down',
  'keyboard-arrow-left': 'keyboard-arrow-left',
  'keyboard-arrow-right': 'keyboard-arrow-right',

  // Additional missing icons
  filter: 'filter-list',
  sort: 'sort',
  today: 'today',
  'chevron-left': 'chevron-left',
  'chevron-right': 'chevron-right',
  'event-available': 'event-available',
  'expand-more': 'expand-more',
  'expand-less': 'expand-less',
} as const;

const SimpleIcon: React.FC<SimpleIconProps> = ({
  name,
  size = 24,
  color = '#000000',
  style,
  testID,
  accessibilityLabel,
}) => {
  const iconName = ICON_MAPPING[name as keyof typeof ICON_MAPPING] || 'help-outline';

  return (
    <View style={[styles.container, style]}>
      <Icon
        name={iconName}
        size={size}
        color={color}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
      />
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