import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useThemeContext } from '../../contexts/ThemeContext';
import { ModernCard, CustomerSearchComponent } from '../index';
import MaterialIcon from '../MaterialIcon';
import { Customer } from '../../types';
import { BillWizardData } from '../../screens/CreateBillWizardScreen';

interface CustomerSelectionStepProps {
  wizardData: BillWizardData;
  updateWizardData: (updates: Partial<BillWizardData>) => void;
  navigation: any;
  isEditMode?: boolean;
}

const CustomerSelectionStep: React.FC<CustomerSelectionStepProps> = ({
  wizardData,
  updateWizardData,
  navigation,
  isEditMode = false,
}) => {
  const { isDarkMode } = useThemeContext();

  const handleCustomerSelect = (customer: Customer) => {
    updateWizardData({ selectedCustomer: customer });
  };

  const handleViewCustomer = () => {
    if (wizardData.selectedCustomer?.id) {
      navigation.navigate('CustomerDetail', {
        customerId: wizardData.selectedCustomer.id,
        customer: wizardData.selectedCustomer
      });
    }
  };

  const styles = createStyles(isDarkMode);

  return (
    <View style={styles.container}>
      <ModernCard style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {isEditMode ? 'Customer Information' : 'Select Customer'}
          </Text>
          <Text style={styles.subtitle}>
            {isEditMode 
              ? 'Customer information cannot be changed when editing a bill.'
              : 'Choose the customer for this bill. You can search by name or phone number.'
            }
          </Text>
        </View>

        {isEditMode ? (
          // Read-only customer display for edit mode
          wizardData.selectedCustomer ? (
            <TouchableOpacity
              style={styles.editModeCustomerCard}
              onPress={handleViewCustomer}
              activeOpacity={0.7}
            >
              <View style={styles.customerHeader}>
                <View style={styles.customerAvatar}>
                  <MaterialIcon name="person" size={24} color="#007AFF" />
                </View>
                <View style={styles.customerInfo}>
                  <View style={styles.customerNameRow}>
                    <Text style={styles.customerName}>
                      {wizardData.selectedCustomer.personalDetails?.name || 'Unknown Customer'}
                    </Text>
                    <View style={styles.customerActions}>
                      <MaterialIcon name="lock" size={14} color="#999" />
                      <MaterialIcon name="chevron-right" size={16} color="#999" />
                    </View>
                  </View>
                  <Text style={styles.customerPhone}>
                    {wizardData.selectedCustomer.personalDetails?.phone || 'No phone number'}
                  </Text>
                </View>
              </View>

              {wizardData.selectedCustomer.personalDetails?.email && (
                <View style={styles.customerDetail}>
                  <MaterialIcon name="email" size={16} color="#666" />
                  <Text style={styles.customerDetailText}>
                    {wizardData.selectedCustomer.personalDetails.email}
                  </Text>
                </View>
              )}

              {wizardData.selectedCustomer.personalDetails?.address && (
                <View style={styles.customerDetail}>
                  <MaterialIcon name="location-on" size={16} color="#666" />
                  <Text style={styles.customerDetailText}>
                    {wizardData.selectedCustomer.personalDetails.address}
                  </Text>
                </View>
              )}

              <View style={styles.customerNote}>
                <MaterialIcon name="info" size={14} color="#999" />
                <Text style={styles.customerNoteText}>
                  Tap to view customer details
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.noCustomerCard}>
              <MaterialIcon name="person-off" size={48} color="#999" />
              <Text style={styles.noCustomerText}>No customer information available</Text>
            </View>
          )
        ) : (
          // Editable customer search for create mode
          <>
            <CustomerSearchComponent
              onCustomerSelect={handleCustomerSelect}
              selectedCustomer={wizardData.selectedCustomer}
              navigation={navigation}
            />

            {wizardData.selectedCustomer && (
              <View style={styles.selectedCustomerInfo}>
                <Text style={styles.selectedLabel}>Selected Customer:</Text>
                <View style={styles.customerCard}>
                  <Text style={styles.customerName}>
                    {wizardData.selectedCustomer.personalDetails.name}
                  </Text>
                  <Text style={styles.customerPhone}>
                    {wizardData.selectedCustomer.personalDetails.phone}
                  </Text>
                  {wizardData.selectedCustomer.personalDetails.email && (
                    <Text style={styles.customerEmail}>
                      {wizardData.selectedCustomer.personalDetails.email}
                    </Text>
                  )}
                </View>
              </View>
            )}
          </>
        )}
      </ModernCard>
    </View>
  );
};

const createStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: isDarkMode ? '#FFF' : '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: isDarkMode ? '#999' : '#666',
    lineHeight: 22,
  },
  selectedCustomerInfo: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: isDarkMode ? '#38383A' : '#E5E5EA',
  },
  selectedLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? '#FFF' : '#000',
    marginBottom: 12,
  },
  customerCard: {
    backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#34C759',
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: isDarkMode ? '#FFF' : '#000',
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 16,
    color: isDarkMode ? '#999' : '#666',
    marginBottom: 2,
  },
  customerEmail: {
    fontSize: 14,
    color: isDarkMode ? '#999' : '#666',
  },
  // Edit mode styles
  editModeCustomerCard: {
    backgroundColor: isDarkMode ? '#1C1C1E' : '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: isDarkMode ? '#2C2C2E' : '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  customerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  customerDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingLeft: 4,
  },
  customerDetailText: {
    fontSize: 14,
    color: isDarkMode ? '#999' : '#666',
    marginLeft: 8,
    flex: 1,
  },
  customerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: isDarkMode ? '#38383A' : '#E5E5EA',
  },
  customerNoteText: {
    fontSize: 12,
    color: isDarkMode ? '#999' : '#666',
    marginLeft: 6,
    fontStyle: 'italic',
  },
  noCustomerCard: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: isDarkMode ? '#1C1C1E' : '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
    borderStyle: 'dashed',
  },
  noCustomerText: {
    fontSize: 16,
    color: isDarkMode ? '#999' : '#666',
    marginTop: 12,
    textAlign: 'center',
  },
});

export default CustomerSelectionStep;