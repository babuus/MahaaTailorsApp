import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  StatusBar,
  Platform,
  BackHandler,
  Alert,
} from 'react-native';
import { MaterialIcon, SwipeBackGesture, ScreenTransition, ConfirmDialog } from '../components';

import { COLORS, SPACING } from '../constants';
import { Logo } from '../components';
import { useThemeContext } from '../contexts/ThemeContext';
import { useAccessibility } from '../utils/accessibility';

import { animationManager } from '../utils/AnimationManager';
import { performanceMonitor } from '../utils/performanceMonitor';
import { MATERIAL_EASING, ANIMATION_TIMINGS } from '../config/animationConfig';

import DashboardScreen from '../screens/DashboardScreen';
import CustomerManagementScreen from '../screens/CustomerManagementScreen';
import CustomerDetailScreen from '../screens/CustomerDetailScreen';
import CustomerFormScreen from '../screens/CustomerFormScreen';
import MeasurementConfigScreen from '../screens/MeasurementConfigScreen';
import MeasurementConfigFormScreen from '../screens/MeasurementConfigFormScreen';
import { BillingScreen } from '../screens/BillingScreen';
import { BillingFormScreen } from '../screens/BillingFormScreen';
import { BillPrintScreen } from '../screens/BillPrintScreen';
import { ReceivedItemsScreen } from '../screens/ReceivedItemsScreen';
import { BillingConfigScreen } from '../screens/BillingConfigScreen';
import { BillingConfigItemForm } from '../screens/BillingConfigItemForm';
import { ReceivedItemTemplateForm } from '../screens/ReceivedItemTemplateForm';
import { CalendarScreen } from '../screens/CalendarScreen';
import SettingsScreen from '../screens/SettingsScreen';



type Screen = 'Dashboard' | 'CustomerManagement' | 'CustomerDetail' | 'CustomerForm' | 'MeasurementConfig' | 'MeasurementConfigForm' | 'Billing' | 'BillingForm' | 'BillPrint' | 'ReceivedItems' | 'BillingConfig' | 'BillingConfigItemForm' | 'ReceivedItemTemplateForm' | 'Calendar' | 'Settings';

const { width: screenWidth } = Dimensions.get('window');
const DRAWER_WIDTH = screenWidth * 0.7; // Reduced width to add space on the right

interface NavigationState {
  screen: Screen;
  params?: any;
}

const DrawerNavigator: React.FC = () => {
  const [navigationStack, setNavigationStack] = useState<NavigationState[]>([
    { screen: 'Dashboard' }
  ]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Menu items definition (moved up to avoid reference issues)
  const menuItems = [
    {
      key: 'Dashboard' as Screen,
      title: 'Dashboard',
      icon: 'dashboard',
    },
    {
      key: 'CustomerManagement' as Screen,
      title: 'Customer Management',
      icon: 'people',
    },
    {
      key: 'Billing' as Screen,
      title: 'Billing',
      icon: 'receipt',
    },
    {
      key: 'Calendar' as Screen,
      title: 'Calendar',
      icon: 'calendar-today',
    },
    {
      key: 'MeasurementConfig' as Screen,
      title: 'Measurement Config',
      icon: 'straighten',
    },
    {
      key: 'BillingConfig' as Screen,
      title: 'Billing Config',
      icon: 'settings-applications',
    },
    {
      key: 'Settings' as Screen,
      title: 'Settings',
      icon: 'settings',
    },
  ];

  // Enhanced animations using our animation system
  const drawerTranslateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const screenTranslateX = useRef(new Animated.Value(0)).current;
  const screenScale = useRef(new Animated.Value(1)).current;

  // New animation values for enhanced interactions
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const menuItemsStagger = useRef(
    menuItems.map(() => new Animated.Value(0))
  ).current;
  const logoScale = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  const { isDarkMode } = useThemeContext();
  const {
    generateButtonHint,
    ensureMinimumTouchTarget,
    announceForAccessibility,
    generateSemanticDescription
  } = useAccessibility();

  const currentNavigation = navigationStack[navigationStack.length - 1];
  const currentScreen = currentNavigation.screen;

  // Handle hardware back button
  useEffect(() => {
    const backAction = () => {
      // If drawer is open, close it first
      if (isDrawerOpen) {
        toggleDrawer();
        return true;
      }

      // If we can go back in navigation stack, do that
      if (navigationStack.length > 1) {
        goBack();
        return true;
      }

      // If we're not on Dashboard, go to Dashboard first
      if (currentScreen !== 'Dashboard') {
        navigateToScreen('Dashboard');
        return true;
      }

      // If we're on Dashboard, show exit confirmation
      setShowExitDialog(true);
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [isDrawerOpen, navigationStack, currentScreen]);

  const headerStyle = {
    backgroundColor: isDarkMode ? COLORS.DARK : COLORS.LIGHT,
  };

  const headerTextStyle = {
    color: isDarkMode ? COLORS.LIGHT : COLORS.DARK,
  };

  const drawerStyle = {
    backgroundColor: isDarkMode ? COLORS.DARK : COLORS.LIGHT,
  };

  const drawerTextStyle = {
    color: isDarkMode ? COLORS.LIGHT : COLORS.DARK,
  };

  const toggleDrawer = async () => {
    if (isTransitioning) return;

    setIsTransitioning(true);
    performanceMonitor.startNavigation();

    const opening = !isDrawerOpen;
    setIsDrawerOpen(opening);

    try {
      // Create enhanced Material Design drawer animation
      const drawerSlide = Animated.timing(drawerTranslateX, {
        toValue: opening ? 0 : -DRAWER_WIDTH,
        duration: ANIMATION_TIMINGS.DRAWER_SLIDE,
        easing: opening ? MATERIAL_EASING.decelerate : MATERIAL_EASING.accelerate,
        useNativeDriver: true,
      });

      // Animate overlay fade
      const overlayFade = Animated.timing(overlayOpacity, {
        toValue: opening ? 1 : 0,
        duration: ANIMATION_TIMINGS.DRAWER_SLIDE,
        easing: opening ? MATERIAL_EASING.decelerate : MATERIAL_EASING.accelerate,
        useNativeDriver: true,
      });

      // Subtle screen scale and translate for depth
      const screenTransform = Animated.parallel([
        Animated.timing(screenScale, {
          toValue: opening ? 0.95 : 1,
          duration: ANIMATION_TIMINGS.DRAWER_SLIDE,
          easing: MATERIAL_EASING.standard,
          useNativeDriver: true,
        }),
        Animated.timing(screenTranslateX, {
          toValue: opening ? DRAWER_WIDTH * 0.1 : 0,
          duration: ANIMATION_TIMINGS.DRAWER_SLIDE,
          easing: MATERIAL_EASING.standard,
          useNativeDriver: true,
        }),
      ]);

      // Run animations in parallel
      await new Promise<void>((resolve) => {
        Animated.parallel([
          drawerSlide,
          overlayFade,
          screenTransform,
        ]).start((finished) => {
          if (finished) {
            performanceMonitor.endNavigation();

            // Announce state change for accessibility
            announceForAccessibility(
              opening ? 'Navigation drawer opened' : 'Navigation drawer closed'
            );
          }
          resolve();
        });
      });

      // Animate menu items with stagger effect
      animateMenuItems(opening);

    } catch (error) {
      console.error('Drawer animation failed:', error);
      // Fallback to immediate state change
      drawerTranslateX.setValue(opening ? 0 : -DRAWER_WIDTH);
      overlayOpacity.setValue(opening ? 1 : 0);
      screenScale.setValue(1);
      screenTranslateX.setValue(0);
    } finally {
      setIsTransitioning(false);
    }
  };

  const navigateToScreen = async (screen: Screen, params?: any) => {
    if (screen === currentScreen && !params) {
      // If navigating to the same screen without params, just close drawer
      if (isDrawerOpen) {
        toggleDrawer();
      }
      return;
    }

    // Start navigation performance tracking
    performanceMonitor.startNavigation();

    const newNavigation: NavigationState = { screen, params };
    const isMainScreen = ['Dashboard', 'CustomerManagement', 'Billing', 'Calendar', 'MeasurementConfig', 'BillingConfig', 'Settings'].includes(screen);
    const isForwardNavigation = !isMainScreen;

    try {
      // Create screen transition animation
      const screenTransition = new Animated.Value(isForwardNavigation ? screenWidth : 0);

      // Animate screen transition
      const transitionAnimation = animationManager.createScreenTransition(
        isForwardNavigation ? 'slideFromRight' : 'fadeIn',
        screenTransition,
        {
          duration: ANIMATION_TIMINGS.SCREEN_TRANSITION,
          easing: MATERIAL_EASING.standard,
        }
      );

      // Update navigation stack
      if (isMainScreen) {
        setNavigationStack([newNavigation]);
      } else {
        setNavigationStack(prev => [...prev, newNavigation]);
      }

      // Close drawer if open
      if (isDrawerOpen) {
        toggleDrawer();
      }

      // Start transition animation
      transitionAnimation.start((finished) => {
        if (finished) {
          performanceMonitor.endNavigation();

          // Announce navigation for accessibility
          announceForAccessibility(`Navigated to ${getScreenTitleForScreen(screen, params)}`);
        }
      });

    } catch (error) {
      console.error('Navigation transition failed:', error);

      // Fallback to immediate navigation
      if (isMainScreen) {
        setNavigationStack([newNavigation]);
      } else {
        setNavigationStack(prev => [...prev, newNavigation]);
      }

      if (isDrawerOpen) {
        toggleDrawer();
      }

      performanceMonitor.endNavigation();
    }
  };

  const goBack = () => {
    if (navigationStack.length > 1) {
      setNavigationStack(prev => prev.slice(0, -1));
    }
  };

  const renderScreen = () => {
    const mockNavigation = {
      navigate: navigateToScreen,
      goBack: goBack,
      setOptions: (options: any) => {
        // Mock implementation - in a real React Navigation setup, this would update the header
        console.log('Navigation options set:', options);
      },
    };

    const mockRoute = {
      params: currentNavigation.params || {},
    };

    switch (currentScreen) {
      case 'Dashboard':
        return <DashboardScreen navigation={mockNavigation as any} />;
      case 'CustomerManagement':
        return <CustomerManagementScreen navigation={mockNavigation as any} />;
      case 'CustomerDetail':
        return <CustomerDetailScreen navigation={mockNavigation as any} route={mockRoute as any} />;
      case 'CustomerForm':
        return <CustomerFormScreen navigation={mockNavigation as any} route={mockRoute as any} />;
      case 'Billing':
        return <BillingScreen navigation={mockNavigation as any} route={mockRoute as any} />;
      case 'BillingForm':
        return <BillingFormScreen navigation={mockNavigation as any} route={mockRoute as any} />;
      case 'BillPrint':
        return <BillPrintScreen navigation={mockNavigation as any} route={mockRoute as any} />;
      case 'ReceivedItems':
        return <ReceivedItemsScreen navigation={mockNavigation as any} route={mockRoute as any} />;
      case 'BillingConfig':
        return <BillingConfigScreen navigation={mockNavigation as any} />;
      case 'BillingConfigItemForm':
        return <BillingConfigItemForm navigation={mockNavigation as any} route={mockRoute as any} />;
      case 'ReceivedItemTemplateForm':
        return <ReceivedItemTemplateForm navigation={mockNavigation as any} route={mockRoute as any} />;
      case 'Calendar':
        return <CalendarScreen navigation={mockNavigation as any} />;
      case 'MeasurementConfig':
        return <MeasurementConfigScreen navigation={mockNavigation as any} />;
      case 'MeasurementConfigForm':
        return <MeasurementConfigFormScreen navigation={mockNavigation as any} route={mockRoute as any} />;
      case 'Settings':
        return <SettingsScreen navigation={mockNavigation as any} />;
      default:
        return <DashboardScreen navigation={mockNavigation as any} />;
    }
  };

  const getScreenTitle = () => {
    switch (currentScreen) {
      case 'Dashboard':
        return 'Dashboard';
      case 'CustomerManagement':
        return 'Customer Management';
      case 'CustomerDetail':
        return currentNavigation.params?.customer?.personalDetails?.name || 'Customer Details';
      case 'CustomerForm':
        return currentNavigation.params?.mode === 'edit' ? 'Edit Customer' : 'Add Customer';
      case 'Billing':
        return 'Billing';
      case 'BillingForm':
        return currentNavigation.params?.mode === 'edit' ? 'Edit Bill' : 'Create Bill';
      case 'BillPrint':
        return 'Print Bill';
      case 'ReceivedItems':
        return 'Received Items';
      case 'BillingConfig':
        return 'Billing Config';
      case 'BillingConfigItemForm':
        return currentNavigation.params?.mode === 'edit' ? 'Edit Billing Item' : 'Add Billing Item';
      case 'ReceivedItemTemplateForm':
        return currentNavigation.params?.mode === 'edit' ? 'Edit Template' : 'Add Template';
      case 'Calendar':
        return 'Calendar';
      case 'MeasurementConfig':
        return 'Measurement Config';
      case 'MeasurementConfigForm':
        return currentNavigation.params?.mode === 'edit' ? 'Edit Template' : 'Add Template';
      case 'Settings':
        return 'Settings';
      default:
        return 'Dashboard';
    }
  };

  const getScreenTitleForScreen = (screen: Screen, params?: any) => {
    switch (screen) {
      case 'Dashboard':
        return 'Dashboard';
      case 'CustomerManagement':
        return 'Customer Management';
      case 'CustomerDetail':
        return params?.customer?.personalDetails?.name || 'Customer Details';
      case 'CustomerForm':
        return params?.mode === 'edit' ? 'Edit Customer' : 'Add Customer';
      case 'Billing':
        return 'Billing';
      case 'BillingForm':
        return params?.mode === 'edit' ? 'Edit Bill' : 'Create Bill';
      case 'BillPrint':
        return 'Print Bill';
      case 'ReceivedItems':
        return 'Received Items';
      case 'BillingConfig':
        return 'Billing Config';
      case 'BillingConfigItemForm':
        return params?.mode === 'edit' ? 'Edit Billing Item' : 'Add Billing Item';
      case 'ReceivedItemTemplateForm':
        return params?.mode === 'edit' ? 'Edit Template' : 'Add Template';
      case 'Calendar':
        return 'Calendar';
      case 'MeasurementConfig':
        return 'Measurement Config';
      case 'MeasurementConfigForm':
        return params?.mode === 'edit' ? 'Edit Template' : 'Add Template';
      case 'Settings':
        return 'Settings';
      default:
        return 'Dashboard';
    }
  };

  const canGoBack = () => {
    return navigationStack.length > 1;
  };

  const isDetailScreen = () => {
    return currentScreen === 'CustomerDetail' || 
           currentScreen === 'CustomerForm' || 
           currentScreen === 'MeasurementConfigForm' ||
           currentScreen === 'BillingForm' ||
           currentScreen === 'BillPrint' ||
           currentScreen === 'ReceivedItems' ||
           currentScreen === 'BillingConfigItemForm' ||
           currentScreen === 'ReceivedItemTemplateForm';
  };

  // Enhanced button press animation
  const animateButtonPress = (animatedValue: Animated.Value) => {
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 0.95,
        duration: 100,
        easing: MATERIAL_EASING.accelerate,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 100,
        easing: MATERIAL_EASING.decelerate,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Staggered menu items animation
  const animateMenuItems = (opening: boolean) => {
    const animations = menuItemsStagger.map((animValue, index) =>
      Animated.timing(animValue, {
        toValue: opening ? 1 : 0,
        duration: 200,
        delay: opening ? index * 50 : 0,
        easing: opening ? MATERIAL_EASING.decelerate : MATERIAL_EASING.accelerate,
        useNativeDriver: true,
      })
    );

    Animated.stagger(50, animations).start();
  };

  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? COLORS.DARK : COLORS.LIGHT }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={headerStyle.backgroundColor}
        translucent={false}
      />
      {/* Custom Header */}
      <View style={[styles.header, headerStyle, { paddingTop: statusBarHeight + SPACING.SM }]}>
        {canGoBack() ? (
          <TouchableOpacity
            onPress={goBack}
            style={[styles.menuButton, {
              minWidth: ensureMinimumTouchTarget(40),
              minHeight: ensureMinimumTouchTarget(40)
            }]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            accessibilityHint={generateButtonHint('go back to previous screen')}
          >
            <MaterialIcon name="back" size={24} color={isDarkMode ? COLORS.LIGHT : COLORS.DARK} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={toggleDrawer}
            style={[styles.menuButton, {
              minWidth: ensureMinimumTouchTarget(40),
              minHeight: ensureMinimumTouchTarget(40)
            }]}
            accessibilityRole="button"
            accessibilityLabel={isDrawerOpen ? "Close navigation menu" : "Open navigation menu"}
            accessibilityHint={generateButtonHint(isDrawerOpen ? 'close navigation drawer' : 'open navigation drawer')}
            accessibilityState={{ expanded: isDrawerOpen }}
          >
            <MaterialIcon name="menu" size={24} color={isDarkMode ? COLORS.LIGHT : COLORS.DARK} />
          </TouchableOpacity>
        )}

        <View style={styles.headerCenter}>
          {isDetailScreen() ? (
            <Text style={[styles.headerTitle, headerTextStyle]} numberOfLines={1}>
              {getScreenTitle()}
            </Text>
          ) : (
            <Logo
              variant="full"
              size="medium"
              animated={true}
              context="header"
              style={{ marginBottom: 4 }}
            />
          )}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Screen Content with depth animation and swipe-back gesture */}
        <Animated.View
          style={[
            styles.content,
            {
              transform: [
                { translateX: screenTranslateX },
                { scale: screenScale },
              ],
            },
          ]}
        >
          <SwipeBackGesture
            enabled={canGoBack()}
            onSwipeBack={goBack}
            style={styles.swipeContainer}
          >
            <ScreenTransition
              transitionType={isDetailScreen() ? 'slideFromRight' : 'fadeIn'}
              key={`${currentScreen}-${JSON.stringify(currentNavigation.params)}`}
            >
              {renderScreen()}
            </ScreenTransition>
          </SwipeBackGesture>
        </Animated.View>

        {/* Animated Overlay - Always rendered but conditionally interactive */}
        <TouchableWithoutFeedback
          onPress={isDrawerOpen ? toggleDrawer : undefined}
          disabled={!isDrawerOpen}
        >
          <Animated.View
            style={[
              styles.overlay,
              {
                opacity: overlayOpacity,
                pointerEvents: isDrawerOpen ? 'auto' : 'none',
              }
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Sidebar Drawer */}
        <Animated.View
          style={[
            styles.drawer,
            drawerStyle,
            {
              transform: [{ translateX: drawerTranslateX }],
            },
          ]}
        >


          {/* Drawer Menu Items with Staggered Animation */}
          <View
            style={styles.drawerContent}
            accessibilityRole="menu"
            accessibilityLabel={generateSemanticDescription('navigation', 'Main navigation menu')}
          >
            {menuItems.map((item, index) => (
              <Animated.View
                key={item.key}
                style={{
                  opacity: menuItemsStagger[index],
                  transform: [
                    {
                      translateX: menuItemsStagger[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [-50, 0],
                      }),
                    },
                  ],
                }}
              >
                <TouchableOpacity
                  style={[
                    styles.drawerItem,
                    currentScreen === item.key && styles.drawerItemActive,
                    {
                      minHeight: ensureMinimumTouchTarget(48)
                    }
                  ]}
                  onPress={() => {
                    animateButtonPress(buttonScale);
                    navigateToScreen(item.key);
                  }}
                  accessibilityRole="menuitem"
                  accessibilityLabel={item.title}
                  accessibilityHint={generateButtonHint(`navigate to ${item.title.toLowerCase()}`)}
                  accessibilityState={{
                    selected: currentScreen === item.key,
                    expanded: false
                  }}
                >
                  <Animated.View
                    style={{
                      transform: [{ scale: currentScreen === item.key ? logoScale : buttonScale }],
                    }}
                  >
                    <MaterialIcon
                      name={item.icon}
                      size={20}
                      color={currentScreen === item.key ? COLORS.PRIMARY : (isDarkMode ? COLORS.LIGHT : COLORS.DARK)}
                      style={styles.drawerItemIcon}
                    />
                  </Animated.View>
                  <Text
                    style={[
                      styles.drawerItemText,
                      drawerTextStyle,
                      currentScreen === item.key && { color: COLORS.PRIMARY },
                    ]}
                    accessibilityElementsHidden={true}
                    importantForAccessibility="no"
                  >
                    {item.title}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      </View>

      <ConfirmDialog
        visible={showExitDialog}
        title="Exit App"
        message="Are you sure you want to exit?"
        confirmText="Exit"
        cancelText="Cancel"
        onConfirm={() => {
          setShowExitDialog(false);
          BackHandler.exitApp();
        }}
        onCancel={() => setShowExitDialog(false)}
        destructive={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
  menuButton: {
    padding: SPACING.XS,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 40, // Same width as menu button for centering
  },
  mainContent: {
    flex: 1,
    position: 'relative',
  },
  content: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    zIndex: 1000,
  },

  drawerContent: {
    flex: 1,
    paddingTop: SPACING.MD,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    marginHorizontal: SPACING.SM,
    borderRadius: 8,
  },
  drawerItemActive: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
  },
  drawerItemIcon: {
    marginRight: SPACING.MD,
  },
  drawerItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  menuIcon: {
    fontSize: 20,
    fontWeight: '600',
  },
  swipeContainer: {
    flex: 1,
  },
});

export default DrawerNavigator;