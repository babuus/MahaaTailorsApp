import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useThemeContext } from '../../contexts/ThemeContext';
import { ModernCard } from '../index';
import MaterialIcon from '../MaterialIcon';
import { BillWizardData } from '../../screens/CreateBillWizardScreen';

interface ReviewStepProps {
  wizardData: BillWizardData;
  isEditMode?: boolean;
}

const ReviewStep: React.FC<ReviewStepProps> = ({ wizardData, isEditMode = false }) => {
  const { isDarkMode } = useThemeContext();

  const totalAmount = wizardData.billItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const totalPaid = wizardData.payments.reduce((sum, payment) => sum + payment.amount, 0);
  const outstandingAmount = totalAmount - totalPaid;

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending': return '#FF9500';
      case 'in_progress': return '#007AFF';
      case 'ready_for_delivery': return '#34C759';
      case 'delivered': return '#30D158';
      case 'cancelled': return '#FF3B30';
      default: return '#666';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'in_progress': return 'In Progress';
      case 'ready_for_delivery': return 'Ready for Delivery';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const getPaymentMethodLabel = (method: string): string => {
    switch (method) {
      case 'cash': return 'Cash';
      case 'card': return 'Card';
      case 'upi': return 'UPI';
      case 'bank_transfer': return 'Bank Transfer';
      case 'other': return 'Other';
      default: return method;
    }
  };

  const styles = createStyles(isDarkMode);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Review & Confirm</Text>
        <Text style={styles.subtitle}>
          {isEditMode 
            ? 'Please review all the changes before updating the bill.'
            : 'Please review all the information before creating the bill.'
          }
        </Text>
      </View>

      {/* Customer Information */}
      <ModernCard style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcon name="person" size={20} color="#007AFF" />
          <Text style={styles.sectionTitle}>Customer Information</Text>
        </View>
        
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>
            {wizardData.selectedCustomer?.personalDetails.name}
          </Text>
          <Text style={styles.customerPhone}>
            {wizardData.selectedCustomer?.personalDetails.phone}
          </Text>
          {wizardData.selectedCustomer?.personalDetails.email && (
            <Text style={styles.customerEmail}>
              {wizardData.selectedCustomer.personalDetails.email}
            </Text>
          )}
        </View>
      </ModernCard>

      {/* Basic Information */}
      <ModernCard style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcon name="info" size={20} color="#007AFF" />
          <Text style={styles.sectionTitle}>Basic Information</Text>
        </View>
        
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Billing Date</Text>
            <Text style={styles.infoValue}>
              {new Date(wizardData.billingDate).toLocaleDateString()}
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Delivery Date</Text>
            <Text style={styles.infoValue}>
              {new Date(wizardData.deliveryDate).toLocaleDateString()}
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Initial Status</Text>
            <View style={[styles.statusBadge, { borderColor: getStatusColor(wizardData.deliveryStatus) }]}>
              <Text style={[styles.statusText, { color: getStatusColor(wizardData.deliveryStatus) }]}>
                {getStatusLabel(wizardData.deliveryStatus)}
              </Text>
            </View>
          </View>
        </View>

        {wizardData.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.infoLabel}>Notes</Text>
            <Text style={styles.notesText}>{wizardData.notes}</Text>
          </View>
        )}
      </ModernCard>

      {/* Billing Items */}
      <ModernCard style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcon name="receipt" size={20} color="#007AFF" />
          <Text style={styles.sectionTitle}>Billing Items ({wizardData.billItems.length})</Text>
        </View>
        
        {wizardData.billItems.map((item, index) => (
          <View key={index} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemTotal}>₹{(item.quantity * item.unitPrice).toFixed(2)}</Text>
            </View>
            
            {item.description && (
              <Text style={styles.itemDescription}>{item.description}</Text>
            )}
            
            <View style={styles.itemDetails}>
              <Text style={styles.itemDetail}>
                Qty: {item.quantity} × ₹{item.unitPrice.toFixed(2)}
              </Text>
              <Text style={styles.itemDetail}>
                Material: {item.materialSource === 'customer' ? 'Customer' : 'Business'}
              </Text>
              <View style={[styles.itemStatusBadge, { borderColor: getStatusColor(item.deliveryStatus || 'pending') }]}>
                <Text style={[styles.itemStatusText, { color: getStatusColor(item.deliveryStatus || 'pending') }]}>
                  {getStatusLabel(item.deliveryStatus || 'pending')}
                </Text>
              </View>
            </View>
          </View>
        ))}
        
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Amount:</Text>
          <Text style={styles.totalAmount}>₹{totalAmount.toFixed(2)}</Text>
        </View>
      </ModernCard>

      {/* Received Items */}
      {wizardData.receivedItems.length > 0 && (
        <ModernCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcon name="inventory" size={20} color="#007AFF" />
            <Text style={styles.sectionTitle}>Received Items ({wizardData.receivedItems.length})</Text>
          </View>
          
          {wizardData.receivedItems.map((item, index) => (
            <View key={index} style={styles.receivedItemCard}>
              <View style={styles.receivedItemHeader}>
                <Text style={styles.receivedItemName}>{item.name}</Text>
                <View style={[
                  styles.receivedStatusBadge,
                  { backgroundColor: item.status === 'received' ? '#34C759' : '#FF9500' }
                ]}>
                  <Text style={styles.receivedStatusText}>
                    {item.status === 'received' ? 'Received' : 'Returned'}
                  </Text>
                </View>
              </View>
              
              {item.description && (
                <Text style={styles.receivedItemDescription}>{item.description}</Text>
              )}
              
              <View style={styles.receivedItemDetails}>
                <Text style={styles.receivedItemDetail}>Quantity: {item.quantity}</Text>
                <Text style={styles.receivedItemDetail}>
                  Date: {new Date(item.receivedDate).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))}
        </ModernCard>
      )}

      {/* Payment Information */}
      <ModernCard style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcon name="payment" size={20} color="#007AFF" />
          <Text style={styles.sectionTitle}>Payment Summary</Text>
        </View>
        
        <View style={styles.paymentSummary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Amount:</Text>
            <Text style={styles.summaryValue}>₹{totalAmount.toFixed(2)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Paid:</Text>
            <Text style={[styles.summaryValue, { color: '#34C759' }]}>
              ₹{totalPaid.toFixed(2)}
            </Text>
          </View>
          
          <View style={[styles.summaryRow, styles.summaryRowTotal]}>
            <Text style={styles.summaryLabelTotal}>Outstanding:</Text>
            <Text style={[
              styles.summaryValueTotal,
              { color: outstandingAmount > 0 ? '#FF3B30' : '#34C759' }
            ]}>
              ₹{outstandingAmount.toFixed(2)}
            </Text>
          </View>
        </View>

        {wizardData.payments.length > 0 && (
          <View style={styles.paymentsContainer}>
            <Text style={styles.paymentsTitle}>Payments ({wizardData.payments.length})</Text>
            {wizardData.payments.map((payment, index) => (
              <View key={index} style={styles.paymentCard}>
                <View style={styles.paymentHeader}>
                  <Text style={styles.paymentAmount}>₹{payment.amount.toFixed(2)}</Text>
                  <Text style={styles.paymentMethod}>
                    {getPaymentMethodLabel(payment.paymentMethod)}
                  </Text>
                </View>
                <Text style={styles.paymentDate}>
                  {new Date(payment.paymentDate).toLocaleDateString()}
                </Text>
                {payment.discount && payment.discount > 0 && (
                  <View style={styles.discountContainer}>
                    <MaterialIcon name="local-offer" size={14} color="#FF9500" />
                    <Text style={styles.discountText}>Discount: ₹{payment.discount.toFixed(2)}</Text>
                  </View>
                )}
                {payment.notes && (
                  <Text style={styles.paymentNotes}>{payment.notes}</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ModernCard>

      {/* Bill Status Preview */}
      <ModernCard style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcon name="assessment" size={20} color="#007AFF" />
          <Text style={styles.sectionTitle}>Bill Status Preview</Text>
        </View>
        
        <View style={styles.statusPreview}>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Payment Status:</Text>
            <View style={[
              styles.statusBadge,
              {
                borderColor: outstandingAmount === 0 ? '#34C759' : 
                           totalPaid > 0 ? '#FF9500' : '#FF3B30'
              }
            ]}>
              <Text style={[
                styles.statusText,
                {
                  color: outstandingAmount === 0 ? '#34C759' : 
                        totalPaid > 0 ? '#FF9500' : '#FF3B30'
                }
              ]}>
                {outstandingAmount === 0 ? 'Fully Paid' : 
                 totalPaid > 0 ? 'Partially Paid' : 'Unpaid'}
              </Text>
            </View>
          </View>
          
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Delivery Status:</Text>
            <View style={[styles.statusBadge, { borderColor: getStatusColor(wizardData.deliveryStatus) }]}>
              <Text style={[styles.statusText, { color: getStatusColor(wizardData.deliveryStatus) }]}>
                {getStatusLabel(wizardData.deliveryStatus)}
              </Text>
            </View>
          </View>
        </View>
      </ModernCard>
    </ScrollView>
  );
};

const createStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: {
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
  section: {
    padding: 20,
    marginBottom: 16,
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
  customerInfo: {
    backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F9FA',
    borderRadius: 12,
    padding: 16,
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
  infoGrid: {
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 16,
    color: isDarkMode ? '#999' : '#666',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: isDarkMode ? '#FFF' : '#000',
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  notesContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: isDarkMode ? '#38383A' : '#E5E5EA',
  },
  notesText: {
    fontSize: 14,
    color: isDarkMode ? '#FFF' : '#000',
    marginTop: 8,
    lineHeight: 20,
  },
  itemCard: {
    backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? '#FFF' : '#000',
    flex: 1,
    marginRight: 12,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  itemDescription: {
    fontSize: 14,
    color: isDarkMode ? '#999' : '#666',
    marginBottom: 8,
  },
  itemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  itemDetail: {
    fontSize: 12,
    color: isDarkMode ? '#999' : '#666',
  },
  itemStatusBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  itemStatusText: {
    fontSize: 10,
    fontWeight: '500',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#007AFF',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: isDarkMode ? '#FFF' : '#000',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
  },
  receivedItemCard: {
    backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  receivedItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  receivedItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? '#FFF' : '#000',
    flex: 1,
  },
  receivedStatusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  receivedStatusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFF',
  },
  receivedItemDescription: {
    fontSize: 14,
    color: isDarkMode ? '#999' : '#666',
    marginBottom: 8,
  },
  receivedItemDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  receivedItemDetail: {
    fontSize: 12,
    color: isDarkMode ? '#999' : '#666',
  },
  paymentSummary: {
    backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F9FA',
    borderRadius: 12,
    padding: 16,
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
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? '#FFF' : '#000',
  },
  summaryValueTotal: {
    fontSize: 20,
    fontWeight: '700',
  },
  paymentsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: isDarkMode ? '#38383A' : '#E5E5EA',
  },
  paymentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? '#FFF' : '#000',
    marginBottom: 12,
  },
  paymentCard: {
    backgroundColor: isDarkMode ? '#1C1C1E' : '#FFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#34C759',
  },
  paymentMethod: {
    fontSize: 14,
    color: isDarkMode ? '#999' : '#666',
  },
  paymentDate: {
    fontSize: 12,
    color: isDarkMode ? '#999' : '#666',
    marginBottom: 4,
  },
  paymentNotes: {
    fontSize: 12,
    color: isDarkMode ? '#999' : '#666',
    fontStyle: 'italic',
  },
  discountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  discountText: {
    fontSize: 12,
    color: '#FF9500',
    fontWeight: '500',
  },
  statusPreview: {
    gap: 16,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 16,
    color: isDarkMode ? '#999' : '#666',
  },
});

export default ReviewStep;