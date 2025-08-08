/**
 * Mahaa Tailors Mobile App
 * Main App component
 *
 * @format
 */

import React, { useEffect } from 'react';
import {
  StatusBar,
  StyleSheet,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { SimpleIcon } from './src/components';

import AppNavigator from './src/navigation/AppNavigator';
import { COLORS } from './src/constants';
import { ThemeProvider, useThemeContext } from './src/contexts/ThemeContext';
import { UpdateProvider } from './src/contexts/UpdateContext';
import { offlineManager } from './src/services/offlineManager';
import { AccessibilityUtils } from './src/utils/accessibility';
import { animationConfig } from './src/config/animationConfig';
import { performanceMonitor } from './src/utils/performanceMonitor';
import UpdateIntegration from './src/components/UpdateIntegration';

// Inner component that uses the theme context
const AppContent: React.FC = () => {
  const { isDarkMode } = useThemeContext();

  // Custom theme based on app colors with icon configuration
  const lightTheme = {
    ...MD3LightTheme,
    colors: {
      ...MD3LightTheme.colors,
      primary: COLORS.PRIMARY,
      secondary: COLORS.SECONDARY,
      surface: COLORS.LIGHT,
      onSurface: COLORS.DARK,
    },
  };

  const darkTheme = {
    ...MD3DarkTheme,
    colors: {
      ...MD3DarkTheme.colors,
      primary: COLORS.PRIMARY,
      secondary: COLORS.SECONDARY,
      surface: COLORS.DARK,
      onSurface: COLORS.LIGHT,
    },
  };

  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <PaperProvider 
      theme={theme}
      settings={{
        icon: (props) => <SimpleIcon name={props.name || 'help'} size={props.size} color={props.color} />,
      }}
    >
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? COLORS.DARK : COLORS.LIGHT}
      />
      <AppNavigator />
      <UpdateIntegration />
    </PaperProvider>
  );
};

function App(): React.JSX.Element {
  // Initialize offline manager, auto-sync, accessibility, and animation systems
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize accessibility utilities
        await AccessibilityUtils.initialize();
        console.log('Accessibility utilities initialized successfully');
        
        // Initialize animation configuration
        animationConfig.resetToDefaults();
        console.log('Animation system initialized successfully');
        
        // Start performance monitoring
        performanceMonitor.resetMetrics();
        console.log('Performance monitoring started successfully');
        
        // Initialize animation error handler
        const { animationErrorHandler } = await import('./src/utils/animationErrorHandler');
        animationErrorHandler.reset();
        console.log('Animation error handler initialized successfully');
        
        // Start auto-sync when network becomes available
        await offlineManager.startAutoSync();
        console.log('Offline manager initialized successfully');
        
        // Log initial performance report after 2 seconds
        setTimeout(() => {
          performanceMonitor.logPerformanceReport();
        }, 2000);
        
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();

    // Cleanup accessibility listeners on unmount
    return () => {
      AccessibilityUtils.cleanup();
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ThemeProvider>
          <UpdateProvider>
            <AppContent />
          </UpdateProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
