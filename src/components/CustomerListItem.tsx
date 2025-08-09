import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Card } from 'react-native-paper';
import { Customer } from '../types';
import { COLORS, SPACING } from '../constants';
import { useThemeContext } from '../contexts/ThemeContext';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAccessibility } from '../utils/accessibility';

interface CustomerListItemProps {
  customer: Customer;
  onPress: (customer: Customer) => void;
  onEdit?: (customer: Customer) => void;
  onDelete?: (customer: Customer) => void;
  testID?: string;
}

const CustomerListItem: React.FC<CustomerListItemProps> = ({
  customer,
  onPress,
  onEdit,
  onDelete,
  testID,
}) => {
  const { isDarkMode } = useThemeContext();
  const { 
    generateListItemLabel, 
    generateButtonHint,
    ensureMinimumTouchTarget 
  } = useAccessibility();

  const cardStyle = {
    backgroundColor: isDarkMode ? COLORS.SURFACE_DARK : COLORS.SURFACE_LIGHT,
  };

  const textStyle = {
    color: isDarkMode ? COLORS.TEXT_DARK_PRIMARY : COLORS.TEXT_PRIMARY,
  };

  const subtextStyle = {
    color: isDarkMode ? COLORS.TEXT_DARK_SECONDARY : COLORS.TEXT_SECONDARY,
  };

  const handlePress = () => {
    onPress(customer);
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(customer);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(customer);
    }
  };

  const customerInfo = `${customer.personalDetails.name}, ${customer.personalDetails.phone}${customer.personalDetails.email ? `, ${customer.personalDetails.email}` : ''}`;

  return (
    <Card 
      style={[styles.card, cardStyle]} 
      testID={testID}
    >
      <TouchableOpacity 
        onPress={handlePress}
        style={styles.touchable}
        accessibilityRole="button"
        accessibilityLabel={generateListItemLabel(
          customer.personalDetails.name,
          `Phone: ${customer.personalDetails.phone}${customer.personalDetails.email ? `, Email: ${customer.personalDetails.email}` : ''}`
        )}
        accessibilityHint="Tap to view customer details"
      >
        <View style={styles.content}>
          <View style={styles.mainInfo}>
            <Text 
              style={[styles.name, textStyle]}
              numberOfLines={1}
              ellipsizeMode="tail"
              accessibilityElementsHidden={true}
              importantForAccessibility="no"
            >
              {customer.personalDetails.name}
            </Text>
            <Text 
              style={[styles.phone, subtextStyle]}
              numberOfLines={1}
              ellipsizeMode="tail"
              accessibilityElementsHidden={true}
              importantForAccessibility="no"
            >
              {customer.personalDetails.phone}
            </Text>
            {customer.personalDetails.email && (
              <Text 
                style={[styles.email, subtextStyle]}
                numberOfLines={1}
                ellipsizeMode="tail"
                accessibilityElementsHidden={true}
                importantForAccessibility="no"
              >
                {customer.personalDetails.email}
              </Text>
            )}
          </View>
          
          <View style={styles.actions}>
            {onEdit && (
              <TouchableOpacity 
                onPress={handleEdit} 
                style={[styles.iconButton, { 
                  minWidth: ensureMinimumTouchTarget(32), 
                  minHeight: ensureMinimumTouchTarget(32) 
                }]}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${customer.personalDetails.name}`}
                accessibilityHint={generateButtonHint('edit this customer')}
              >
                <MaterialIcons 
                  name="edit" 
                  size={18} 
                  color={isDarkMode ? COLORS.LIGHT : COLORS.DARK} 
                />
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity 
                onPress={handleDelete} 
                style={[styles.iconButton, { 
                  minWidth: ensureMinimumTouchTarget(32), 
                  minHeight: ensureMinimumTouchTarget(32) 
                }]}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${customer.personalDetails.name}`}
                accessibilityHint={generateButtonHint('delete this customer')}
              >
                <MaterialIcons 
                  name="delete" 
                  size={18} 
                  color={isDarkMode ? COLORS.LIGHT : COLORS.DARK} 
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: SPACING.MD,
    marginVertical: SPACING.XS,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderRadius: 12,
  },
  touchable: {
    padding: SPACING.LG,
    borderRadius: 12,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  mainInfo: {
    flex: 1,
    marginRight: SPACING.MD,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: SPACING.XS,
    lineHeight: 24,
  },
  phone: {
    fontSize: 15,
    marginBottom: SPACING.XS,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  email: {
    fontSize: 14,
    opacity: 0.8,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.XS,
  },
  iconButton: {
    padding: SPACING.SM,
    marginLeft: SPACING.XS,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
});

export default CustomerListItem;