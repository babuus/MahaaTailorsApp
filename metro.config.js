const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration optimized for animation libraries
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  transformer: {
    // Enable hermes for better performance
    hermesCommand: 'hermes',
    // Optimize for animation libraries
    minifierConfig: {
      // Preserve function names for better debugging
      keep_fnames: true,
      // Optimize for animation performance
      mangle: {
        keep_fnames: true,
      },
    },
  },
  resolver: {
    // Optimize asset resolution for fast-image
    assetExts: [
      'bmp', 'gif', 'jpg', 'jpeg', 'png', 'psd', 'svg', 'webp', // Image formats
      'mp4', 'webm', 'mov', 'avi', // Video formats for potential future use
      'ttf', 'otf', 'woff', 'woff2', // Font formats
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
