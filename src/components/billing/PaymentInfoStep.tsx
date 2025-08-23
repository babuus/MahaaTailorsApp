import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { useThemeContext } from '../../contexts/ThemeContext';
import { ModernCard, CustomDatePicker, PaymentTrackingComponent } from '../index';
import ModernButton from '../ModernButton';
import MaterialIcon from '../MaterialIcon';
import { Payment } from '../../types';
import { BillWizardData } from '../../screens/CreateBillWizardScreen';

interface PaymentInfoStepProps {
  wizardData: BillWizardData;
  updateWizardData: (updates: Partial<BillWizardData>) => void;
  isEditMode?: boolean;
}

const PaymentInfoStep: React.FC<PaymentInfoStepProps> = ({
  wizardData,
  updateWizardData,
  isEditMode = false,
}) => {
  const { isDarkMode } = useThemeContext();
  const [showDatePicker, setShowDatePicker] = useState<number | null>(null);

  const paymentMethods = [
    { key: 'cash', label: 'Cash', icon: 'money' },
    { key: 'card', label: 'Card', icon: 'credit-card' },
    { key: 'upi', label: 'UPI', icon: 'smartphone' },
    { key: 'bank_transfer', label: 'Bank Transfer', icon: 'account-balance' },
    { key: 'other', label: 'Other', icon: 'more-horiz' },
  ];

  const totalAmount = wizardData.billItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const totalPaid = wizardData.payments.reduce((sum, payment) => sum + payment.amount, 0);
  const outstandingAmount = totalAmount - totalPaid;

  const handleAddPayment = () => {
    const newPayment: Omit<Payment, 'id' | 'createdAt'> = {
      amount: 0,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'cash',
      discount: 0,
      notes: '',
    };
    
    updateWizardData({
      payments: [...wizardData.payments, newPayment]
    });
  };

  const handleUpdatePayment = (index: number, field: string, value: any) => {
    const updatedPayments = wizardData.payments.map((payment, i) => {
      if (i === index) {
        const updatedPayment = { ...payment, [field]: value };
        
        // Validate payment amount
        if (field === 'amount') {
          const amount = parseFloat(value) || 0;
          const otherPaymentsTotal = wizardData.payments
            .filter((_, idx) => idx !== index)
            .reduce((sum, p) => sum + p.amount, 0);
          const maxAmount = totalAmount - otherPaymentsTotal;
          
          if (amount > maxAmount) {
            Alert.alert(
              'Invalid Amount',
              `Payment amount cannot exceed ₹${maxAmount.toFixed(2)} (remaining balance)`
            );
            return payment;
          }
          
          updatedPayment.amount = Math.max(0, amount);
        }
        
        return updatedPayment;
      }
      return payment;
    });
    
    updateWizardData({ payments: updatedPayments });
  };

  const handleRemovePayment = (index: number) => {
    Alert.alert(
      'Remove Payment',
      'Are you sure you want to remove this payment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updatedPayments = wizardData.payments.filter((_, i) => i !== index);
            updateWizardData({ payments: updatedPayments });
          }
        }
      ]
    );
  };

  const handleQuickPayment = (percentage: number) => {
    const amount = (totalAmount * percentage) / 100;
    const newPayment: Omit<Payment, 'id' | 'createdAt'> = {
      amount: amount,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'cash',
      discount: 0,
      notes: `${percentage}% payment`,
    };
    
    updateWizardData({
      payments: [...wizardData.payments, newPayment]
    });
  };

  const handleBillUpdate = (updatedBill: any) => {
    // Update wizard data with the updated bill information
    updateWizardData({
      payments: updatedBill.payments || [],
      originalBill: updatedBill,
    });
  };

  const styles = createStyles(isDarkMode);

  if (isEditMode && wizardData.originalBill) {
    // In edit mode, use PaymentTrackingComponent for full payment management
    return (
      <View style={styles.container}>
        <ModernCard style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Payment Management</Text>
            <Text style={styles.subtitle}>
              Manage payments for this bill. You can add, edit, or remove payments.
            </Text>
          </View>

          <PaymentTrackingComponent
            bill={wizardData.originalBill}
            onBillUpdate={handleBillUpdate}
          />
        </ModernCard>
      </View>
    );
  }

  // Create mode - use the simple payment form
  return (
    <View style={styles.container}>
      <ModernCard style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Payment Information</Text>
          <Text style={styles.subtitle}>
            Add payments received for this bill (optional). You can add multiple payments.
          </Text>
        </View>

        {/* Bill Summary */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Bill Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Amount:</Text>
            <Text style={styles.summaryAmount}>₹{totalAmount.toFixed(2)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Paid:</Text>
            <Text style={[styles.summaryAmount, { color: '#34C759' }]}>
              ₹{totalPaid.toFixed(2)}
            </Text>
          </View>
          
          <View style={[styles.summaryRow, styles.summaryRowTotal]}>
            <Text style={styles.summaryLabelTotal}>Outstanding:</Text>
            <Text style={[
              styles.summaryAmountTotal,
              { color: outstandingAmount > 0 ? '#FF3B30' : '#34C759' }
            ]}>
              ₹{outstandingAmount.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Quick Payment Buttons */}
        {wizardData.payments.length === 0 && totalAmount > 0 && (
          <View style={styles.quickPaymentContainer}>
            <Text style={styles.quickPaymentTitle}>Quick Payment</Text>
            <View style={styles.quickPaymentButtons}>
              <TouchableOpacity
                style={styles.quickPaymentButton}
                onPress={() => handleQuickPayment(25)}
              >
                <Text style={styles.quickPaymentButtonText}>25%</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickPaymentButton}
                onPress={() => handleQuickPayment(50)}
              >
                <Text style={styles.quickPaymentButtonText}>50%</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickPaymentButton}
                onPress={() => handleQuickPayment(100)}
              >
                <Text style={styles.quickPaymentButtonText}>Full</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Add Payment Button */}
        <ModernButton
          title="Add Payment"
          onPress={handleAddPayment}
          variant="outline"
          style={styles.addPaymentButton}
        />

        {/* Payments List */}
        <ScrollView style={styles.paymentsList} showsVerticalScrollIndicator={false}>
          {wizardData.payments.map((payment, index) => (
            <View key={index} style={styles.paymentCard}>
              <View style={styles.paymentHeader}>
                <Text style={styles.paymentTitle}>Payment {index + 1}</Text>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemovePayment(index)}
                >
                  <MaterialIcon name="close" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>

              {/* Amount */}
              <View style={styles.paymentField}>
                <Text style={styles.fieldLabel}>Amount (₹)</Text>
                <TextInput
                  style={styles.amountInput}
                  value={payment.amount.toString()}
                  onChangeText={(text) => handleUpdatePayment(index, 'amount', text)}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={isDarkMode ? '#666' : '#999'}
                />
              </View>

              {/* Discount */}
              <View style={styles.paymentField}>
                <Text style={styles.fieldLabel}>Discount (₹)</Text>
                <TextInput
                  style={styles.discountInput}
                  value={(payment.discount || 0).toString()}
                  onChangeText={(text) => handleUpdatePayment(index, 'discount', text)}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={isDarkMode ? '#666' : '#999'}
                />
              </View>

              {/* Payment Method */}
              <View style={styles.paymentField}>
                <Text style={styles.fieldLabel}>Payment Method</Text>
                <View style={styles.paymentMethods}>
                  {paymentMethods.map((method) => (
                    <TouchableOpacity
                      key={method.key}
                      style={[
                        styles.paymentMethodOption,
                        payment.paymentMethod === method.key && styles.paymentMethodOptionSelected,
                      ]}
                      onPress={() => handleUpdatePayment(index, 'paymentMethod', method.key)}
                    >
                      <MaterialIcon 
                        name={method.icon} 
                        size={16} 
                        color={payment.paymentMethod === method.key ? '#FFF' : '#666'} 
                      />
                      <Text style={[
                        styles.paymentMethodText,
                        payment.paymentMethod === method.key && styles.paymentMethodTextSelected,
                      ]}>
                        {method.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Payment Date */}
              <View style={styles.paymentField}>
                <Text style={styles.fieldLabel}>Payment Date</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowDatePicker(index)}
                >
                  <Text style={styles.dateInputText}>
                    {new Date(payment.paymentDate).toLocaleDateString()}
                  </Text>
                  <MaterialIcon name="calendar-today" size={16} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Notes */}
              <View style={styles.paymentField}>
                <Text style={styles.fieldLabel}>Notes (Optional)</Text>
                <TextInput
                  style={styles.notesInput}
                  value={payment.notes || ''}
                  onChangeText={(text) => handleUpdatePayment(index, 'notes', text)}
                  placeholder="Payment notes..."
                  placeholderTextColor={isDarkMode ? '#666' : '#999'}
                  multiline
                />
              </View>
            </View>
          ))}
        </ScrollView>

        {wizardData.payments.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcon name="payment" size={48} color="#C7C7CC" />
            <Text style={styles.emptyStateText}>No payments added yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Add payments to track what has been received from the customer
            </Text>
          </View>
        )}
      </ModernCard>

      {/* Date Picker */}
      {showDatePicker !== null && (
        <CustomDatePicker
          visible={true}
          value={new Date(wizardData.payments[showDatePicker].paymentDate)}
          onDateChange={(date) => {
            handleUpdatePayment(showDatePicker, 'paymentDate', date.toISOString().split('T')[0]);
            setShowDatePicker(null);
          }}
          onCancel={() => setShowDatePicker(null)}
          maximumDate={new Date()}
        />
      )}
    </View>
  );
};

const createStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    padding: 20,
    flex: 1,
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
  summaryContainer: {
    backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? '#FFF' : '#000',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryRowTotal: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: isDarkMode ? '#38383A' : '#E5E5EA',
    marginTop: 8,
    marginBottom: 0,
  },
  summaryLabel: {
    fontSize: 16,
    color: isDarkMode ? '#FFF' : '#000',
  },
  summaryLabelTotal: {
    fontSize: 18,
    fontWeight: '600',
    color: isDarkMode ? '#FFF' : '#000',
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? '#FFF' : '#000',
  },
  summaryAmountTotal: {
    fontSize: 20,
    fontWeight: '700',
  },
  quickPaymentContainer: {
    marginBottom: 20,
  },
  quickPaymentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? '#FFF' : '#000',
    marginBottom: 12,
  },
  quickPaymentButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  quickPaymentButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  quickPaymentButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  addPaymentButton: {
    marginBottom: 20,
  },
  paymentsList: {
    flex: 1,
    maxHeight: 400,
  },
  paymentCard: {
    backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: isDarkMode ? '#FFF' : '#000',
  },
  removeButton: {
    padding: 8,
  },
  paymentField: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: isDarkMode ? '#FFF' : '#000',
    marginBottom: 8,
  },
  amountInput: {
    fontSize: 18,
    fontWeight: '600',
    color: isDarkMode ? '#FFF' : '#000',
    backgroundColor: isDarkMode ? '#1C1C1E' : '#FFF',
    borderWidth: 1,
    borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
    borderRadius: 8,
    padding: 16,
    textAlign: 'right',
  },
  discountInput: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? '#FFF' : '#000',
    backgroundColor: isDarkMode ? '#1C1C1E' : '#FFF',
    borderWidth: 1,
    borderColor: '#FF950040',
    borderRadius: 8,
    padding: 16,
    textAlign: 'right',
  },
  paymentMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? '#1C1C1E' : '#FFF',
    borderWidth: 1,
    borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
    borderRadius: 8,
    padding: 10,
    gap: 6,
    minWidth: 80,
  },
  paymentMethodOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  paymentMethodText: {
    fontSize: 12,
    color: isDarkMode ? '#FFF' : '#000',
  },
  paymentMethodTextSelected: {
    color: '#FFF',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: isDarkMode ? '#1C1C1E' : '#FFF',
    borderWidth: 1,
    borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
    borderRadius: 8,
    padding: 12,
  },
  dateInputText: {
    fontSize: 16,
    color: isDarkMode ? '#FFF' : '#000',
  },
  notesInput: {
    fontSize: 14,
    color: isDarkMode ? '#FFF' : '#000',
    backgroundColor: isDarkMode ? '#1C1C1E' : '#FFF',
    borderWidth: 1,
    borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: isDarkMode ? '#999' : '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: isDarkMode ? '#666' : '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default PaymentInfoStep;