# Mahaa Tailors Mobile App

A React Native mobile application for Android that provides core business functionality for Mahaa Tailors, including customer management, measurement configuration, and dashboard features.

## Features

- **Dashboard**: Main entry point with app branding and navigation
- **Customer Management**: Full CRUD operations for customer data
- **Measurement Configuration**: Template management for garment measurements
- **Offline Support**: Local data caching and synchronization
- **TypeScript**: Full TypeScript support for type safety

## Project Structure

```
src/
├── components/          # Reusable UI components
├── screens/            # Screen components
├── navigation/         # Navigation configuration
├── services/           # API service layer
├── utils/              # Utility functions
├── hooks/              # Custom React hooks
├── constants/          # App constants and configuration
└── types/              # TypeScript type definitions
```

## Getting Started

### Prerequisites

- Node.js >= 18
- React Native development environment set up
- Android Studio and Android SDK
- Android emulator or physical device

### Installation

1. Install dependencies:
```bash
npm install
```

2. For Android development, ensure you have:
   - Android SDK (API level 24+)
   - Android emulator running or device connected

### Running the App

#### Start Metro Bundler
```bash
npm start
```

#### Run on Android
```bash
npm run android
```

### Available Scripts

- `npm start` - Start Metro bundler
- `npm run android` - Run on Android device/emulator
- `npm run build:android` - Build Android release APK
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run clean` - Clean project cache

## Dependencies

### Core Dependencies
- React Native 0.80.2 with TypeScript
- React Navigation (Drawer + Stack)
- Axios for API communication
- AsyncStorage for local data storage
- React Native Paper for UI components
- React Native Vector Icons

### Development Dependencies
- TypeScript
- ESLint
- Jest for testing
- Prettier for code formatting

## API Integration

The app integrates with the existing Mahaa Tailors backend API:
- Customer management endpoints
- Measurement configuration endpoints
- Offline data synchronization

## Android Configuration

- **Minimum SDK**: API level 24 (Android 7.0)
- **Target SDK**: API level 35
- **Build Tools**: 35.0.0
- **Kotlin**: 2.1.20

## Development

### Code Style
- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Consistent folder structure

### Testing
- Jest for unit testing
- React Native Testing Library for component testing
- Manual testing on Android devices

## Troubleshooting

### Common Issues

1. **Metro bundler issues**: Run `npm run clean` and restart
2. **Android build issues**: Clean Android project with `cd android && ./gradlew clean`
3. **Dependency issues**: Delete `node_modules` and run `npm install`

### Android Specific

- Ensure Android SDK is properly configured
- Check that emulator is running or device is connected
- Verify USB debugging is enabled on physical devices

## Contributing

1. Follow the existing code structure
2. Use TypeScript for all new code
3. Add tests for new functionality
4. Follow the established naming conventions
5. Update documentation as needed