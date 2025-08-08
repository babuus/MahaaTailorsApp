import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Customer } from '../types';
import { COLORS, SPACING } from '../constants';
import { useThemeContext } from '../contexts/ThemeContext';

interface DuplicateWarningDialogProps {
  visible: boolean;
  duplicateCustomers: Customer[];
  onProceed: () => void;
  onCancel: () => void;
}

const DuplicateWarningDialog: React.FC<DuplicateWarningDialogProps> = ({
  visible,
  duplicateCustomers,
  onProceed,
  onCancel,
}) => {
  const { isDarkMode } = useThemeContext();

  const overlayStyle = {
    backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)',
  };

  const dialogStyle = {
    backgroundColor: isDarkMode ? '#333333' : '#FFFFFF',
  };

  const textStyle = {
    color: isDarkMode ? COLORS.LIGHT : COLORS.DARK,
  };

  const subtextStyle = {
    color: isDarkMode ? '#B0B0B0' : '#666666',
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={[styles.overlay, overlayStyle]}>
        <View style={[styles.dialog, dialogStyle]}>
          <View style={styles.header}>
            <Text style={[styles.title, textStyle]}>Duplicate Customer Detected</Text>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={[styles.message, textStyle]}>
              A customer with this phone number already exists:
            </Text>

            {duplicateCustomers.map((customer, index) => (
              <View key={customer.id} style={styles.customerCard}>
                <Text style={[styles.customerName, textStyle]}>
                  {customer.personalDetails.name}
                </Text>
                <Text style={[styles.customerPhone, subtextStyle]}>
                  {customer.personalDetails.phone}
                </Text>
                {customer.personalDetails.email && (
                  <Text style={[styles.customerEmail, subtextStyle]}>
                    {customer.personalDetails.email}
                  </Text>
                )}
                {customer.personalDetails.address && (
                  <Text style={[styles.customerAddress, subtextStyle]}>
                    {customer.personalDetails.address}
                  </Text>
                )}
              </View>
            ))}

            <Text style={[styles.warningText, textStyle]}>
              Do you want to proceed with creating a new customer with the same phone number?
            </Text>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.proceedButton]}
              onPress={onProceed}
            >
              <Text style={styles.proceedButtonText}>Proceed Anyway</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.LG,
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  header: {
    padding: SPACING.LG,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  content: {
    padding: SPACING.LG,
    maxHeight: 300,
  },
  message: {
    fontSize: 16,
    marginBottom: SPACING.MD,
    textAlign: 'center',
  },
  customerCard: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
    padding: SPACING.MD,
    marginVertical: SPACING.SM,
    borderRadius: 4,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.XS,
  },
  customerPhone: {
    fontSize: 14,
    marginBottom: SPACING.XS,
  },
  customerEmail: {
    fontSize: 14,
    marginBottom: SPACING.XS,
  },
  customerAddress: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  warningText: {
    fontSize: 14,
    marginTop: SPACING.MD,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    padding: SPACING.LG,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: SPACING.MD,
  },
  button: {
    flex: 1,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.SM,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#CCCCCC',
  },
  cancelButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '600',
  },
  proceedButton: {
    backgroundColor: '#FF9800',
  },
  proceedButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DuplicateWarningDialog;