import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useThemeContext } from '../../contexts/ThemeContext';
import { ModernCard, CustomDatePicker } from '../index';
import MaterialIcon from '../MaterialIcon';
import { DeliveryStatus } from '../../types';
import { BillWizardData } from '../../screens/CreateBillWizardScreen';

interface BasicInfoStepProps {
  wizardData: BillWizardData;
  updateWizardData: (updates: Partial<BillWizardData>) => void;
  isEditMode?: boolean;
}

const BasicInfoStep: React.FC<BasicInfoStepProps> = ({
  wizardData,
  updateWizardData,
}) => {
  const { isDarkMode } = useThemeContext();
  const [showBillingDatePicker, setShowBillingDatePicker] = useState(false);
  const [showDeliveryDatePicker, setShowDeliveryDatePicker] = useState(false);
  const [deliveryCounts, setDeliveryCounts] = useState<{ [dateString: string]: number }>({});
  const [overdueDeliveries, setOverdueDeliveries] = useState<{ [dateString: string]: number }>({});

  const formatDateWithDay = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };

  // Function to get delivery counts from API
  const getDeliveryCounts = useCallback(async () => {
    try {
      // Get current month and next month date range
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);
      
      const startDate = startOfMonth.toISOString().split('T')[0];
      const endDate = endOfNextMonth.toISOString().split('T')[0];

      // Fetch bills with delivery dates in the range
      const { getBills } = await import('../../services/api');
      const response = await getBills({
        deliveryStartDate: startDate,
        deliveryEndDate: endDate,
        limit: 1000, // Get all bills in range
      });

      // Count deliveries by date and calculate overdue deliveries
      const counts: { [dateString: string]: number } = {};
      const overdue: { [dateString: string]: number } = {};
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      response.items.forEach(bill => {
        if (bill.deliveryDate) {
          const dateKey = bill.deliveryDate;
          const deliveryDate = new Date(bill.deliveryDate);
          deliveryDate.setHours(0, 0, 0, 0);
          
          // Count total deliveries for this date
          counts[dateKey] = (counts[dateKey] || 0) + 1;
          
          // Count overdue deliveries (past dates that are not delivered)
          if (deliveryDate < today && bill.deliveryStatus !== 'delivered') {
            overdue[dateKey] = (overdue[dateKey] || 0) + 1;
          }
        }
      });

      setDeliveryCounts(counts);
      setOverdueDeliveries(overdue);
    } catch (error) {
      console.error('Error fetching delivery counts:', error);
      // Fallback to empty counts if API fails
      setDeliveryCounts({});
    }
  }, []);

  useEffect(() => {
    getDeliveryCounts();
  }, [getDeliveryCounts]);

  const deliveryStatusOptions: { key: DeliveryStatus; label: string; icon: string; color: string }[] = [
    { key: 'pending', label: 'Pending', icon: 'time', color: '#FF9500' },
    { key: 'in_progress', label: 'In Progress', icon: 'sync', color: '#007AFF' },
    { key: 'ready_for_delivery', label: 'Ready for Delivery', icon: 'check-circle', color: '#34C759' },
    { key: 'delivered', label: 'Delivered', icon: 'check', color: '#30D158' },
  ];

  const styles = createStyles(isDarkMode);

  return (
    <View style={styles.container}>
      <ModernCard style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Basic Information</Text>
          <Text style={styles.subtitle}>
            Set billing and delivery dates, initial status, and notes for this bill.
          </Text>
        </View>

        {/* Dates Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcon name="calendar-today" size={20} color="#007AFF" />
            <Text style={styles.sectionTitle}>Dates</Text>
          </View>
          
          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={styles.fieldLabel}>Billing Date</Text>
              <TouchableOpacity
                style={[
                  styles.dateInput,
                  !wizardData.billingDate && styles.dateInputEmpty
                ]}
                onPress={() => setShowBillingDatePicker(true)}
              >
                <Text style={[
                  styles.dateInputText,
                  !wizardData.billingDate && styles.placeholderText
                ]}>
                  {wizardData.billingDate 
                    ? formatDateWithDay(wizardData.billingDate)
                    : 'Select billing date'
                  }
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dateField}>
              <Text style={styles.fieldLabel}>Delivery Date</Text>
              <TouchableOpacity
                style={[
                  styles.dateInput,
                  !wizardData.deliveryDate && styles.dateInputEmpty
                ]}
                onPress={() => setShowDeliveryDatePicker(true)}
              >
                <Text style={[
                  styles.dateInputText,
                  !wizardData.deliveryDate && styles.placeholderText
                ]}>
                  {wizardData.deliveryDate 
                    ? formatDateWithDay(wizardData.deliveryDate)
                    : 'Select delivery date'
                  }
                </Text>
              </TouchableOpacity>
              {wizardData.deliveryDate && deliveryCounts[wizardData.deliveryDate] > 0 && (
                <Text style={styles.deliveryCountHint}>
                  {deliveryCounts[wizardData.deliveryDate]} other delivery(s)
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Delivery Status Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcon name="check-circle" size={20} color="#007AFF" />
            <Text style={styles.sectionTitle}>Initial Delivery Status</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            This will be the starting status for all items in this bill.
          </Text>
          
          <View style={styles.statusOptions}>
            {deliveryStatusOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.statusOption,
                  wizardData.deliveryStatus === option.key && styles.statusOptionSelected,
                ]}
                onPress={() => updateWizardData({ deliveryStatus: option.key })}
              >
                <View style={[
                  styles.statusIconContainer,
                  { backgroundColor: wizardData.deliveryStatus === option.key ? '#FFFFFF20' : `${option.color}20` }
                ]}>
                  <MaterialIcon 
                    name={option.icon} 
                    size={18} 
                    color={wizardData.deliveryStatus === option.key ? '#FFF' : option.color} 
                  />
                </View>
                <Text style={[
                  styles.statusOptionText,
                  wizardData.deliveryStatus === option.key && styles.statusOptionTextSelected,
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notes Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcon name="edit" size={20} color="#007AFF" />
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.optionalBadge}>
              <Text style={styles.optionalText}>Optional</Text>
            </View>
          </View>
          <TextInput
            style={[
              styles.notesInput,
              isDarkMode && styles.notesInputDark
            ]}
            value={wizardData.notes}
            onChangeText={(text) => updateWizardData({ notes: text })}
            placeholder="Add any additional notes for this bill..."
            placeholderTextColor={isDarkMode ? '#666' : '#999'}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </ModernCard>

      {/* Date Pickers */}
      <CustomDatePicker
        visible={showBillingDatePicker}
        value={wizardData.billingDate ? new Date(wizardData.billingDate) : new Date()}
        onDateChange={(date) => {
          updateWizardData({ billingDate: date.toISOString().split('T')[0] });
          setShowBillingDatePicker(false);
        }}
        onCancel={() => setShowBillingDatePicker(false)}
      />

      <CustomDatePicker
        visible={showDeliveryDatePicker}
        value={wizardData.deliveryDate ? new Date(wizardData.deliveryDate) : new Date()}
        onDateChange={(date) => {
          updateWizardData({ deliveryDate: date.toISOString().split('T')[0] });
          setShowDeliveryDatePicker(false);
        }}
        onCancel={() => setShowDeliveryDatePicker(false)}
        minimumDate={new Date()}
        deliveryCounts={deliveryCounts}
        overdueDeliveries={overdueDeliveries}
      />
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
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: isDarkMode ? '#FFF' : '#000',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: isDarkMode ? '#999' : '#666',
    marginBottom: 16,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: isDarkMode ? '#FFF' : '#000',
    marginBottom: 8,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F9FA',
    borderWidth: 1,
    borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
    borderRadius: 12,
    padding: 16,
  },
  dateInputEmpty: {
    borderColor: isDarkMode ? '#FF950040' : '#FF950040',
    borderWidth: 1,
  },
  dateInputContent: {
    flex: 1,
  },
  dateInputText: {
    fontSize: 16,
    color: isDarkMode ? '#FFF' : '#000',
    fontWeight: '500',
  },
  dateInputDay: {
    fontSize: 12,
    color: isDarkMode ? '#999' : '#666',
    marginTop: 2,
  },
  placeholderText: {
    color: isDarkMode ? '#666' : '#999',
    fontWeight: '400',
  },
  deliveryCountHint: {
    fontSize: 12,
    color: '#FF9500',
    marginTop: 2,
    fontWeight: '500',
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? '#2C2C2E' : '#FFF',
    borderWidth: 1,
    borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
    borderRadius: 12,
    padding: 12,
    minWidth: 120,
    gap: 8,
  },
  statusOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: isDarkMode ? '#FFF' : '#000',
  },
  statusOptionTextSelected: {
    color: '#FFF',
  },
  statusIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionalBadge: {
    backgroundColor: isDarkMode ? '#38383A' : '#E5E5EA',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  optionalText: {
    fontSize: 12,
    fontWeight: '500',
    color: isDarkMode ? '#999' : '#666',
  },
  notesInput: {
    backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F9FA',
    borderWidth: 1,
    borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: isDarkMode ? '#FFF' : '#000',
    minHeight: 100,
  },
  notesInputDark: {
    backgroundColor: '#1C1C1E',
  },
});

export default BasicInfoStep;