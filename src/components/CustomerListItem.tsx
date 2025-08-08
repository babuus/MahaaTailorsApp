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
    backgroundColor: isDarkMode ? COLORS.DARK : COLORS.LIGHT,
  };

  const textStyle = {
    color: isDarkMode ? COLORS.LIGHT : COLORS.DARK,
  };

  const subtextStyle = {
    color: isDarkMode ? '#B0B0B0' : '#666666',
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
    elevation: 2,
  },
  touchable: {
    padding: SPACING.MD,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mainInfo: {
    flex: 1,
    marginRight: SPACING.SM,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: SPACING.XS,
  },
  phone: {
    fontSize: 14,
    marginBottom: SPACING.XS,
  },
  email: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginLeft: 4,
  },
});

export default CustomerListItem;