module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-async-storage|react-native-gesture-handler|react-native-reanimated|react-native-screens|react-native-safe-area-context|react-native-paper|react-native-vector-icons|@react-native-community)/)',
  ],
  moduleNameMapper: {
    '^react-native-gesture-handler$': '<rootDir>/node_modules/react-native-gesture-handler/jestSetup.js',
  },
};