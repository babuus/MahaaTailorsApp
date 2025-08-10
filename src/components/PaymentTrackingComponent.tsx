import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import MaterialIcon from './MaterialIcon';
import { ModernCard, ModernButton, LoadingSpinner } from './';
import { 
  Payment, 
  Bill,
  BillStatus,
  CreatePaymentRequest,
  UpdatePaymentRequest 
} from '../types';
import { addPayment, updatePayment, deletePayment } from '../services/api';
import { useFormValidation } from '../hooks/useFormValidation';
import { VALIDATION_MESSAGES } from '../types/validation';

interface PaymentTrackingComponentProps {
  bill: Bill;
  onBillUpdate: (updatedBill: Bill) => void;
  editable?: boolean;
  testID?: string;
}

interface PaymentFormData {
  amount: number;
  paymentDate: string;
  paymentMethod: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'other';
  notes: string;
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' },
] as const;

export const PaymentTrackingComponent: React.FC<PaymentTrackingComponentProps> = ({
  bill,
  onBillUpdate,
  editable = true,
  testID = 'payment-tracking-component',
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);

  // Force re-render when bill data changes
  useEffect(() => {
    console.log('PaymentTrackingComponent - Bill prop changed:', {
      billId: bill.id,
      totalAmount: bill.totalAmount,
      paidAmount: bill.paidAmount,
      outstandingAmount: bill.outstandingAmount,
      status: bill.status,
      paymentsCount: bill.payments?.length || 0
    });
    setForceUpdate(prev => prev + 1);
  }, [bill.id, bill.totalAmount, bill.paidAmount, bill.outstandingAmount, bill.status, bill.payments]);

  const {
    data: formData,
    validation: { errors, touched },
    updateField,
    markFieldAsTouched,
    validateForm,
    resetForm,
  } = useFormValidation<PaymentFormData>({
    initialData: {
      amount: 0,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'cash',
      notes: '',
    },
    validator: (data) => {
      const validationErrors: any[] = [];
      
      // Calculate current outstanding amount dynamically
      const currentPaidAmount = bill.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
      const currentOutstandingAmount = bill.totalAmount - currentPaidAmount;
      
      if (data.amount <= 0) {
        validationErrors.push({ 
          field: 'amount', 
          message: VALIDATION_MESSAGES.PRICE_REQUIRED 
        });
      }
      
      if (data.amount > currentOutstandingAmount) {
        validationErrors.push({ 
          field: 'amount', 
          message: VALIDATION_MESSAGES.PAYMENT_EXCEEDS_OUTSTANDING 
        });
      }
      
      if (!data.paymentDate) {
        validationErrors.push({ 
          field: 'paymentDate', 
          message: VALIDATION_MESSAGES.REQUIRED 
        });
      } else {
        const paymentDate = new Date(data.paymentDate);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        
        if (paymentDate > today) {
          validationErrors.push({ 
            field: 'paymentDate', 
            message: VALIDATION_MESSAGES.FUTURE_DATE 
          });
        }
      }
      
      if (!data.paymentMethod) {
        validationErrors.push({ 
          field: 'paymentMethod', 
          message: VALIDATION_MESSAGES.INVALID_PAYMENT_METHOD 
        });
      }
      
      return {
        isValid: validationErrors.length === 0,
        errors: validationErrors,
      };
    },
  });

  const calculateBillStatus = (totalAmount: number, paidAmount: number): BillStatus => {
    if (paidAmount === 0) return 'unpaid';
    if (paidAmount >= totalAmount) return 'fully_paid';
    return 'partially_paid';
  };

  const startAddingPayment = () => {
    resetForm();
    // Calculate current outstanding amount dynamically
    const currentPaidAmount = bill.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
    const currentOutstandingAmount = bill.totalAmount - currentPaidAmount;
    updateField('amount', currentOutstandingAmount);
    setEditingPayment(null);
    setShowAddForm(true);
  };

  const startEditingPayment = (payment: Payment) => {
    updateField('amount', payment.amount);
    updateField('paymentDate', payment.paymentDate);
    updateField('paymentMethod', payment.paymentMethod);
    updateField('notes', payment.notes || '');
    setEditingPayment(payment);
    setShowAddForm(true);
  };

  const cancelForm = () => {
    setShowAddForm(false);
    setEditingPayment(null);
    resetForm();
  };

  const savePayment = async () => {
    const isValid = validateForm();
    if (!isValid) {
      Alert.alert('Validation Error', 'Please fix the errors in the form.');
      return;
    }

    setIsSubmitting(true);
    try {
      const paymentData: CreatePaymentRequest = {
        amount: formData.amount,
        paymentDate: formData.paymentDate,
        paymentMethod: formData.paymentMethod,
        notes: formData.notes.trim() || undefined,
      };

      if (editingPayment) {
        // For editing, we still need to implement the update functionality
        const updatedPayment = await updatePayment(bill.id, editingPayment.id, {
          ...paymentData,
          id: editingPayment.id,
        });

        // Update the bill with the updated payment (manual calculation for now)
        const updatedPayments = bill.payments.map(p => p.id === editingPayment.id ? updatedPayment : p);
        const newPaidAmount = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
        const newOutstandingAmount = bill.totalAmount - newPaidAmount;
        const newStatus = calculateBillStatus(bill.totalAmount, newPaidAmount);

        const updatedBill: Bill = {
          ...bill,
          payments: updatedPayments,
          paidAmount: newPaidAmount,
          outstandingAmount: newOutstandingAmount,
          status: newStatus,
        };

        onBillUpdate(updatedBill);
      } else {
        // For adding new payment, use the updated API that returns complete bill info
        console.log('PaymentTrackingComponent - About to call addPayment with:', {
          billId: bill.id,
          paymentData: paymentData,
          currentBillState: {
            totalAmount: bill.totalAmount,
            paidAmount: bill.paidAmount,
            outstandingAmount: bill.outstandingAmount,
            status: bill.status,
            paymentsCount: bill.payments?.length || 0
          }
        });
        
        const response = await addPayment(bill.id, paymentData);
        console.log('PaymentTrackingComponent - Raw API response:', response);
        
        const { payment: newPayment, bill: updatedBill } = response;
        
        console.log('PaymentTrackingComponent - Destructured response:', {
          payment: newPayment,
          bill: {
            totalAmount: updatedBill.totalAmount,
            paidAmount: updatedBill.paidAmount,
            outstandingAmount: updatedBill.outstandingAmount,
            status: updatedBill.status,
            paymentsCount: updatedBill.payments?.length || 0,
            payments: updatedBill.payments?.map(p => ({ id: p.id, amount: p.amount, date: p.paymentDate })) || []
          }
        });
        
        // Use the updated bill data from the backend (this ensures outstanding amount is correct)
        onBillUpdate(updatedBill);
      }

      cancelForm();

      Alert.alert(
        'Success',
        `Payment ${editingPayment ? 'updated' : 'added'} successfully!`
      );
    } catch (error) {
      console.error('Error saving payment:', error);
      Alert.alert(
        'Error',
        `Failed to ${editingPayment ? 'update' : 'add'} payment. Please try again.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const removePayment = (payment: Payment) => {
    Alert.alert(
      'Remove Payment',
      'Are you sure you want to remove this payment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePayment(bill.id, payment.id);

              const updatedPayments = bill.payments.filter(p => p.id !== payment.id);
              const newPaidAmount = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
              const newOutstandingAmount = bill.totalAmount - newPaidAmount;
              const newStatus = calculateBillStatus(bill.totalAmount, newPaidAmount);

              const updatedBill: Bill = {
                ...bill,
                payments: updatedPayments,
                paidAmount: newPaidAmount,
                outstandingAmount: newOutstandingAmount,
                status: newStatus,
              };

              onBillUpdate(updatedBill);
              Alert.alert('Success', 'Payment removed successfully!');
            } catch (error) {
              console.error('Error removing payment:', error);
              Alert.alert('Error', 'Failed to remove payment. Please try again.');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: BillStatus) => {
    switch (status) {
      case 'fully_paid': return '#34C759';
      case 'partially_paid': return '#FF9500';
      case 'unpaid': return '#FF3B30';
      default: return '#666';
    }
  };

  const getStatusLabel = (status: BillStatus) => {
    switch (status) {
      case 'fully_paid': return 'Fully Paid';
      case 'partially_paid': return 'Partially Paid';
      case 'unpaid': return 'Unpaid';
      case 'draft': return 'Draft';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const methodObj = PAYMENT_METHODS.find(m => m.value === method);
    return methodObj?.label || method;
  };

  const renderPaymentSummary = () => {
    // Calculate amounts dynamically to ensure accuracy
    const calculatedPaidAmount = bill.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
    const calculatedOutstandingAmount = bill.totalAmount - calculatedPaidAmount;
    
    // Determine status based on calculated amounts
    const calculatedStatus = calculateBillStatus(bill.totalAmount, calculatedPaidAmount);
    
    // Debug logging to help identify the issue
    console.log('PaymentTrackingComponent - Bill data:', {
      totalAmount: bill.totalAmount,
      storedPaidAmount: bill.paidAmount,
      calculatedPaidAmount: calculatedPaidAmount,
      storedOutstandingAmount: bill.outstandingAmount,
      calculatedOutstandingAmount: calculatedOutstandingAmount,
      storedStatus: bill.status,
      calculatedStatus: calculatedStatus,
      paymentsCount: bill.payments?.length || 0,
      payments: bill.payments?.map(p => ({ amount: p.amount, date: p.paymentDate })) || []
    });

    // Use calculated values for display to ensure accuracy
    const displayPaidAmount = calculatedPaidAmount;
    const displayOutstandingAmount = calculatedOutstandingAmount;
    const displayStatus = calculatedStatus;

    // Additional debug to verify values being used for display
    console.log('PaymentTrackingComponent - Display values:', {
      displayPaidAmount,
      displayOutstandingAmount,
      displayStatus,
      forceUpdateCounter: forceUpdate
    });

    return (
      <ModernCard style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryTitle}>Payment Summary</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(displayStatus) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(displayStatus) }]}>
              {getStatusLabel(displayStatus)}
            </Text>
          </View>
        </View>
        
        <View style={styles.summaryContent}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Amount:</Text>
            <Text style={styles.summaryValue}>₹{bill.totalAmount.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Paid Amount:</Text>
            <Text style={[styles.summaryValue, { color: '#34C759' }]}>
              ₹{displayPaidAmount.toFixed(2)}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.outstandingRow]}>
            <Text style={styles.summaryLabel}>Outstanding:</Text>
            <Text style={[styles.summaryValue, { 
              color: displayOutstandingAmount > 0 ? '#FF3B30' : '#34C759',
              fontWeight: '700',
            }]}>
              ₹{displayOutstandingAmount.toFixed(2)}
            </Text>
          </View>
        </View>
      </ModernCard>
    );
  };

  const renderPaymentHistory = () => (
    <ModernCard style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>Payment History</Text>
        {editable && (() => {
          const currentPaidAmount = bill.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
          const currentOutstandingAmount = bill.totalAmount - currentPaidAmount;
          return currentOutstandingAmount > 0;
        })() && (
          <TouchableOpacity
            style={styles.addPaymentButton}
            onPress={startAddingPayment}
            testID="add-payment-button"
          >
            <MaterialIcon name="add" size={16} color="#007AFF" />
            <Text style={styles.addPaymentText}>Add Payment</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {bill.payments.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcon name="payment" size={48} color="#C7C7CC" />
          <Text style={styles.emptyStateText}>No payments recorded yet</Text>
          {editable && (
            <Text style={styles.emptyStateSubtext}>
              Add a payment to track bill status
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.paymentsList}>
          {bill.payments
            .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
            .map((payment, index) => (
              <View key={payment.id} style={styles.paymentItem}>
                <View style={styles.paymentInfo}>
                  <View style={styles.paymentHeader}>
                    <Text style={styles.paymentAmount}>₹{payment.amount.toFixed(2)}</Text>
                    <Text style={styles.paymentDate}>
                      {new Date(payment.paymentDate).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.paymentDetails}>
                    <Text style={styles.paymentMethod}>
                      {getPaymentMethodLabel(payment.paymentMethod)}
                    </Text>
                    {payment.notes && (
                      <Text style={styles.paymentNotes}>{payment.notes}</Text>
                    )}
                  </View>
                </View>
                
                {editable && (
                  <View style={styles.paymentActions}>
                    <TouchableOpacity
                      onPress={() => startEditingPayment(payment)}
                      style={styles.actionButton}
                      testID={`edit-payment-${index}`}
                    >
                      <MaterialIcon name="edit" size={18} color="#007AFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => removePayment(payment)}
                      style={styles.actionButton}
                      testID={`remove-payment-${index}`}
                    >
                      <MaterialIcon name="delete" size={18} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
        </View>
      )}
    </ModernCard>
  );

  const renderPaymentForm = () => {
    if (!showAddForm) return null;

    return (
      <ModernCard style={styles.formCard}>
        <View style={styles.formHeader}>
          <Text style={styles.formTitle}>
            {editingPayment ? 'Edit Payment' : 'Add Payment'}
          </Text>
          <TouchableOpacity
            onPress={cancelForm}
            style={styles.closeButton}
            testID="close-payment-form"
          >
            <MaterialIcon name="close" size={20} color="#666" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.formContent}>
          <View style={styles.formRow}>
            <View style={[styles.formField, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.fieldLabel}>Amount *</Text>
              <TextInput
                style={[
                  styles.textInput,
                  errors.amount && styles.inputError,
                ]}
                value={formData.amount.toString()}
                onChangeText={(text) => updateField('amount', parseFloat(text) || 0)}
                onBlur={() => markFieldAsTouched('amount')}
                keyboardType="numeric"
                placeholder="0.00"
                testID="payment-amount-input"
              />
              {errors.amount && touched.amount && (
                <Text style={styles.errorText}>{errors.amount}</Text>
              )}
              <Text style={styles.helperText}>
                Max: ₹{(() => {
                  const currentPaidAmount = bill.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
                  const currentOutstandingAmount = bill.totalAmount - currentPaidAmount;
                  return currentOutstandingAmount.toFixed(2);
                })()}
              </Text>
            </View>
            
            <View style={[styles.formField, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.fieldLabel}>Payment Date *</Text>
              <TextInput
                style={[
                  styles.textInput,
                  errors.paymentDate && styles.inputError,
                ]}
                value={formData.paymentDate}
                onChangeText={(text) => updateField('paymentDate', text)}
                onBlur={() => markFieldAsTouched('paymentDate')}
                placeholder="YYYY-MM-DD"
                testID="payment-date-input"
              />
              {errors.paymentDate && touched.paymentDate && (
                <Text style={styles.errorText}>{errors.paymentDate}</Text>
              )}
            </View>
          </View>
          
          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Payment Method *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.methodButtons}>
                {PAYMENT_METHODS.map((method) => (
                  <TouchableOpacity
                    key={method.value}
                    style={[
                      styles.methodButton,
                      formData.paymentMethod === method.value && styles.methodButtonActive,
                    ]}
                    onPress={() => updateField('paymentMethod', method.value)}
                    testID={`payment-method-${method.value}`}
                  >
                    <Text style={[
                      styles.methodButtonText,
                      formData.paymentMethod === method.value && styles.methodButtonTextActive,
                    ]}>
                      {method.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
          
          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              style={[styles.textInput, styles.notesInput]}
              value={formData.notes}
              onChangeText={(text) => updateField('notes', text)}
              placeholder="Payment notes (optional)"
              multiline
              numberOfLines={3}
              testID="payment-notes-input"
            />
          </View>
          
          <View style={styles.formActions}>
            <ModernButton
              title="Cancel"
              onPress={cancelForm}
              variant="secondary"
              style={styles.cancelButton}
              testID="cancel-payment"
            />
            <ModernButton
              title={editingPayment ? 'Update Payment' : 'Add Payment'}
              onPress={savePayment}
              loading={isSubmitting}
              style={styles.saveButton}
              testID="save-payment"
            />
          </View>
        </View>
      </ModernCard>
    );
  };

  return (
    <View style={styles.container} testID={testID}>
      {renderPaymentSummary()}
      {renderPaymentForm()}
      {renderPaymentHistory()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 16,
  },
  summaryCard: {
    padding: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  summaryContent: {
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  outstandingRow: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E1E1E1',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  historyCard: {
    padding: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  addPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  addPaymentText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  paymentsList: {
    gap: 12,
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#34C759',
  },
  paymentDate: {
    fontSize: 14,
    color: '#666',
  },
  paymentDetails: {
    gap: 2,
  },
  paymentMethod: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  paymentNotes: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  paymentActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 12,
  },
  actionButton: {
    padding: 4,
  },
  formCard: {
    padding: 16,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  formContent: {
    gap: 16,
  },
  formField: {
    flex: 1,
  },
  formRow: {
    flexDirection: 'row',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E1E1E1',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#FFF',
    color: '#000',
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  methodButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  methodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E1E1E1',
    backgroundColor: '#FFF',
  },
  methodButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  methodButtonText: {
    fontSize: 14,
    color: '#666',
  },
  methodButtonTextActive: {
    color: '#007AFF',
    fontWeight: '500',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
  },
});