/**
 * Material Icons Configuration for Mahaa Tailors App
 * This file replaces the previous FontAwesome configuration
 */

import { MATERIAL_ICONS, getMaterialIcon, MaterialIconName } from './materialIconsConfig';

// Legacy icon name mappings for backward compatibility
export const LEGACY_ICON_MAPPINGS = {
  // FontAwesome to Material Icons mapping
  'faEdit': 'edit',
  'faTrash': 'delete',
  'faUser': 'person',
  'faPhone': 'phone',
  'faEnvelope': 'email',
  'faHome': 'home',
  'faCog': 'settings',
  'faSearch': 'search',
  'faPlus': 'add',
  'faChevronRight': 'right',
  'faChevronLeft': 'left',
  'faBars': 'menu',
  'faTimes': 'close',
  'faSync': 'sync',
  'faDownload': 'download',
  'faUpload': 'upload',
  'faCheck': 'check',
  'faExclamationTriangle': 'warning',
  'faInfoCircle': 'info',
  'faHeart': 'favorite',
  'faShoppingCart': 'shopping',
  'faCalendar': 'calendar',
  'faMapMarkerAlt': 'location',
  'faCamera': 'camera',
  'faImage': 'image',
  'faFile': 'file',
  'faSave': 'save',
  'faShare': 'share',
  'faStar': 'star',
  'faFilter': 'filter',
  'faSort': 'sort',
  'faEye': 'visible',
  'faEyeSlash': 'hidden',
  'faLock': 'lock',
  'faUnlock': 'unlock',
  'faArrowUp': 'up',
  'faArrowDown': 'down',
  'faArrowLeft': 'left',
  'faArrowRight': 'right',
  'faRefresh': 'refresh',
  'faPowerOff': 'power',
  'faQuestionCircle': 'help',
  'faExclamationCircle': 'error',
  'faCheckCircle': 'success',
  'faPlusCircle': 'add',
  'faMinusCircle': 'remove',
  'faTimesCircle': 'cancel',
  'faComment': 'message',
  'faComments': 'chat',
  'faBell': 'notifications',
  'faBookmark': 'bookmark',
  'faTag': 'tag',
  'faFolder': 'folder',
  'faCopy': 'copy',
  'faPaste': 'paste',
  'faReceipt': 'receipt',
  'faCloud': 'cloud',
  'faCloudDownload': 'cloudDownload',
  'faCloudUpload': 'cloudUpload',
  'faWifi': 'wifi',
  'faSignal': 'signal',
  'faBattery': 'battery',
  'faCar': 'car',
} as const;

/**
 * Get icon name with legacy support
 */
export const getIconName = (iconName: string): string => {
  // Check if it's a legacy FontAwesome icon name
  if (iconName in LEGACY_ICON_MAPPINGS) {
    const mappedName = LEGACY_ICON_MAPPINGS[iconName as keyof typeof LEGACY_ICON_MAPPINGS];
    return getMaterialIcon(mappedName as MaterialIconName);
  }
  
  // Check if it's a Material icon name
  if (iconName in MATERIAL_ICONS) {
    return getMaterialIcon(iconName as MaterialIconName);
  }
  
  // Return as-is if not found in mappings
  return iconName;
};

// Export for backward compatibility
export const library = {
  add: () => {
    console.log('Material Icons are loaded automatically');
  }
};