import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Customer } from '../types';
import { MaterialIcon } from './';
import { COLORS, SPACING } from '../constants';
import { useThemeContext } from '../contexts/ThemeContext';

interface SwipeableCustomerItemProps {
  customer: Customer;
  onPress: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onCall?: (customer: Customer) => void;
  testID?: string;
}

const SwipeableCustomerItem: React.FC<SwipeableCustomerItemProps> = ({
  customer,
  onPress,
  onEdit,
  onDelete,
  onCall,
  testID,
}) => {
  const { isDarkMode } = useThemeContext();
  const translateX = useRef(new Animated.Value(0)).current;
  const lastOffset = useRef(0);

  const cardStyle = {
    backgroundColor: isDarkMode ? '#333333' : '#FFFFFF',
  };

  const textStyle = {
    color: isDarkMode ? COLORS.LIGHT : COLORS.DARK,
  };

  const subtextStyle = {
    color: isDarkMode ? '#B0B0B0' : '#666666',
  };

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationX } = event.nativeEvent;
      lastOffset.current += translationX;

      // Determine swipe direction and action
      if (translationX > 100) {
        // Right swipe - Call action
        if (onCall) {
          onCall(customer);
        }
        resetPosition();
      } else {
        // Return to center (removed left swipe edit action)
        resetPosition();
      }
    }
  };

  const resetPosition = () => {
    lastOffset.current = 0;
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.container}>
      {/* Background actions */}
      <View style={styles.actionsContainer}>
        {/* Left action (Call) */}
        <View style={[styles.leftAction, { backgroundColor: COLORS.SUCCESS }]}>
          <MaterialIcon name="phone" size="md" color="#FFFFFF" />
          <Text style={styles.actionText}>Call</Text>
        </View>
      </View>

      {/* Main card */}
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={10} // Only activate on right swipe (positive X >= 10)
        failOffsetX={-10} // Fail on left swipe (negative X <= -10)
      >
        <Animated.View
          style={[
            styles.card,
            cardStyle,
            {
              transform: [{ translateX }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.cardContent}
            onPress={() => onPress(customer)}
            testID={testID}
          >
            <View style={styles.customerInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {customer.personalDetails.name.charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={styles.details}>
                <Text style={[styles.name, textStyle]} numberOfLines={1}>
                  {customer.personalDetails.name}
                </Text>
                <Text style={[styles.phone, subtextStyle]} numberOfLines={1}>
                  {customer.personalDetails.phone}
                </Text>
                {customer.personalDetails.email && (
                  <Text style={[styles.email, subtextStyle]} numberOfLines={1}>
                    {customer.personalDetails.email}
                  </Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.MD,
    marginVertical: SPACING.XS,
  },
  actionsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  leftAction: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginRight: SPACING.XS,
  },
  rightAction: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginLeft: SPACING.XS,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  card: {
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.MD,
    minHeight: 72,
  },
  customerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  details: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  phone: {
    fontSize: 14,
    marginBottom: 2,
  },
  email: {
    fontSize: 12,
  },
  quickAction: {
    padding: SPACING.SM,
    borderRadius: 8,
  },
});

export default SwipeableCustomerItem;