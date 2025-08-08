/**
 * Ionicons Configuration
 * Maps common icon names to Ionicons for better cross-platform display
 */

export const IONICONS = {
    // Navigation & UI
    menu: 'menu-outline',
    close: 'close-outline',
    back: 'arrow-back-outline',
    forward: 'arrow-forward-outline',
    home: 'home-outline',
    dashboard: 'grid-outline',
    settings: 'settings-outline',
    search: 'search-outline',
    filter: 'filter-outline',
    sort: 'swap-vertical-outline',
    more: 'ellipsis-vertical-outline',

    // Actions
    add: 'add-outline',
    edit: 'create-outline',
    delete: 'trash-outline',
    save: 'save-outline',
    cancel: 'close-circle-outline',
    check: 'checkmark-outline',
    clear: 'close-outline',
    refresh: 'refresh-outline',
    sync: 'sync-outline',
    upload: 'cloud-upload-outline',
    download: 'cloud-download-outline',
    share: 'share-outline',
    copy: 'copy-outline',
    paste: 'clipboard-outline',

    // User & People
    person: 'person-outline',
    people: 'people-outline',
    account: 'person-circle-outline',
    profile: 'person-outline',

    // Communication
    phone: 'call-outline',
    email: 'mail-outline',
    message: 'chatbubble-outline',
    chat: 'chatbubbles-outline',
    notifications: 'notifications-outline',

    // Content
    image: 'image-outline',
    camera: 'camera-outline',
    file: 'document-outline',
    folder: 'folder-outline',
    document: 'document-text-outline',

    // Status & Feedback
    success: 'checkmark-circle-outline',
    error: 'alert-circle-outline',
    warning: 'warning-outline',
    info: 'information-circle-outline',
    help: 'help-circle-outline',

    // Connectivity
    wifi: 'wifi-outline',
    wifiOff: 'wifi-outline',
    cloud: 'cloud-outline',
    cloudOff: 'cloud-offline-outline',
    signal: 'cellular-outline',

    // Business & Commerce
    shopping: 'bag-outline',
    payment: 'card-outline',
    receipt: 'receipt-outline',
    money: 'cash-outline',

    // Date & Time
    calendar: 'calendar-outline',
    time: 'time-outline',
    schedule: 'calendar-outline',

    // Location
    location: 'location-outline',
    map: 'map-outline',

    // Media Controls
    play: 'play-outline',
    pause: 'pause-outline',
    stop: 'stop-outline',

    // Visibility
    visible: 'eye-outline',
    hidden: 'eye-off-outline',

    // Security
    lock: 'lock-closed-outline',
    unlock: 'lock-open-outline',

    // Arrows & Directions
    up: 'chevron-up-outline',
    down: 'chevron-down-outline',
    left: 'chevron-back-outline',
    right: 'chevron-forward-outline',
    expand: 'chevron-down-outline',
    collapse: 'chevron-up-outline',

    // Measurement & Tools (specific to tailoring app)
    ruler: 'resize-outline',
    measure: 'resize-outline',
    scissors: 'cut-outline',

    // Favorites & Ratings
    favorite: 'heart-outline',
    star: 'star-outline',
    bookmark: 'bookmark-outline',

    // Power & System
    power: 'power-outline',
    battery: 'battery-full-outline',

    // Transportation
    car: 'car-outline',

    // Sync Status Icons
    syncAlert: 'sync-outline',
    cloudCheck: 'cloud-done-outline',
    cloudUpload: 'cloud-upload-outline',
    cloudDownload: 'cloud-download-outline',

    // Form & Input
    input: 'text-outline',
    keyboard: 'keypad-outline',

    // Tags & Labels
    tag: 'pricetag-outline',
    label: 'pricetags-outline',

    // Additional Business Icons
    business: 'business-outline',
    store: 'storefront-outline',
    inventory: 'list-outline',
    analytics: 'analytics-outline',
    trending: 'trending-up-outline',

    // Additional UI Icons
    menuOpen: 'menu-outline',
    fullscreen: 'expand-outline',
    fullscreenExit: 'contract-outline',
    zoomIn: 'add-circle-outline',
    zoomOut: 'remove-circle-outline',

    // Additional Status Icons
    pending: 'hourglass-outline',
    done: 'checkmark-done-outline',
    block: 'ban-outline',

    // Additional Navigation Icons
    firstPage: 'play-skip-back-outline',
    lastPage: 'play-skip-forward-outline',
    navigateBefore: 'chevron-back-outline',
    navigateNext: 'chevron-forward-outline',

    // Additional Content Icons
    textFields: 'text-outline',
    formatBold: 'text-outline',
    formatItalic: 'text-outline',

    // Additional System Icons
    update: 'refresh-circle-outline',
    cached: 'archive-outline',
    history: 'time-outline',
    restore: 'refresh-outline',

    // Tailoring specific icons
    straighten: 'resize-outline',
} as const;

export type IoniconsName = keyof typeof IONICONS;

/**
 * Get Ionicons icon name
 */
export const getIoniconsIcon = (iconName: IoniconsName): string => {
    return IONICONS[iconName] || iconName;
};

/**
 * Icon size constants following design guidelines
 */
export const ICON_SIZES = {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 32,
    xl: 48,
} as const;

export type IconSize = keyof typeof ICON_SIZES;

/**
 * Get icon size value
 */
export const getIconSize = (size: IconSize): number => {
    return ICON_SIZES[size];
};

// Legacy support - keep the old function names for backward compatibility
export const getMaterialIcon = getIoniconsIcon;
export type MaterialIconName = IoniconsName;