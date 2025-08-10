import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcon from '../components/MaterialIcon';
import { useThemeContext } from '../contexts/ThemeContext';
import {
  LoadingSpinner,
  ModernButton,
  ModernCard,
  PaymentTrackingComponent
} from '../components';
import {
  Bill,
  BillStatus,
  DeliveryStatus,
  Customer
} from '../types';
import { getBillById } from '../services/api';
import OfflineApiService from '../services/offlineApiService';

interface BillDetailScreenProps {
  navigation: any;
  route: {
    params: {
      billId: string;
      bill?: Bill;
    };
  };
}

export const BillDetailScreen: React.FC<BillDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const { billId, bill: initialBill } = route.params;
  const { isDarkMode } = useThemeContext();
  
  const [bill, setBill] = useState<Bill | null>(initialBill || null);
  const [isLoading, setIsLoading] = useState(!initialBill);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadBill = useCallback(async () => {
    if (!billId) return;
    
    setIsLoading(true);
    try {
      const billData = await getBillById(billId);
      
      // Ensure customer information is loaded
      if (billData.customerId && (!billData.customer || !billData.customer.personalDetails)) {
        try {
          const customer = await OfflineApiService.getCustomerById(billData.customerId);
          billData.customer = customer;
        } catch (customerError) {
          console.warn(`Failed to load customer ${billData.customerId}:`, customerError);
          // Set placeholder customer data
          billData.customer = {
            id: billData.customerId,
            personalDetails: {
              name: 'Customer Name Not Available',
              phone: 'Phone Not Available',
              email: '',
              address: '',
              dob: '',
            },
            measurements: [],
            comments: '',
            createdAt: '',
            updatedAt: '',
          };
        }
      }
      
      setBill(billData);
    } catch (error) {
      console.error('Error loading bill:', error);
      Alert.alert('Error', 'Failed to load bill details. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [billId]);

  const refreshBill = useCallback(async () => {
    setIsRefreshing(true);
    await loadBill();
  }, [loadBill]);

  useEffect(() => {
    navigation.setOptions({
      title: bill ? `Bill ${bill.billNumber}` : 'Bill Details',
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handlePrint}
            style={styles.headerButton}
            testID="header-print-button"
          >
            <MaterialIcon name="print" size={24} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleEdit}
            style={styles.headerButton}
            testID="header-edit-button"
          >
            <MaterialIcon name="edit" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, bill]);

  useEffect(() => {
    if (!initialBill) {
      loadBill();
    }
  }, [loadBill, initialBill]);

  const handleEdit = () => {
    if (!bill) return;
    navigation.navigate('BillingForm', {
      mode: 'edit',
      bill,
    });
  };

  const handlePrint = () => {
    if (!bill) return;
    navigation.navigate('BillPrint', {
      billId: bill.id,
    });
  };

  const handleCustomerPress = () => {
    if (!bill?.customer?.id) return;
    navigation.navigate('CustomerDetail', {
      customerId: bill.customer.id,
      customer: bill.customer,
    });
  };

  const handleBillUpdate = useCallback((updatedBill: Bill) => {
    setBill(updatedBill);
  }, []);

  const getStatusColor = (status: BillStatus): string => {
    switch (status) {
      case 'fully_paid': return '#34C759';
      case 'partially_paid': return '#FF9500';
      case 'unpaid': return '#FF3B30';
      case 'draft': return '#666';
      case 'cancelled': return '#999';
      default: return '#666';
    }
  };

  const getStatusLabel = (status: BillStatus): string => {
    switch (status) {
      case 'fully_paid': return 'Fully Paid';
      case 'partially_paid': return 'Partially Paid';
      case 'unpaid': return 'Unpaid';
      case 'draft': return 'Draft';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const getDeliveryStatusColor = (status: DeliveryStatus): string => {
    switch (status) {
      case 'pending': return '#FF9500';
      case 'in_progress': return '#007AFF';
      case 'ready_for_delivery': return '#34C759';
      case 'delivered': return '#30D158';
      case 'cancelled': return '#FF3B30';
      default: return '#666';
    }
  };

  const getDeliveryStatusLabel = (status: DeliveryStatus): string => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'in_progress': return 'In Progress';
      case 'ready_for_delivery': return 'Ready for Delivery';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const renderBillHeader = () => {
    if (!bill) return null;

    return (
      <ModernCard style={styles.headerCard}>
        <View style={styles.billHeaderContent}>
          <View style={styles.billTitleSection}>
            <Text style={styles.billNumber}>{bill.billNumber}</Text>
            <View style={styles.statusBadges}>
              <View style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(bill.status) + '20' }
              ]}>
                <Text style={[
                  styles.statusText,
                  { color: getStatusColor(bill.status) }
                ]}>
                  {getStatusLabel(bill.status)}
                </Text>
              </View>
              {bill.deliveryStatus && (
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getDeliveryStatusColor(bill.deliveryStatus) + '20' }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: getDeliveryStatusColor(bill.deliveryStatus) }
                  ]}>
                    {getDeliveryStatusLabel(bill.deliveryStatus)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.billDates}>
            <View style={styles.dateItem}>
              <MaterialIcon name="calendar-today" size={16} color="#666" />
              <Text style={styles.dateLabel}>Billing Date</Text>
              <Text style={styles.dateValue}>
                {new Date(bill.billingDate).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.dateItem}>
              <MaterialIcon name="local-shipping" size={16} color="#666" />
              <Text style={styles.dateLabel}>Delivery Date</Text>
              <Text style={styles.dateValue}>
                {new Date(bill.deliveryDate).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>
      </ModernCard>
    );
  };

  const renderCustomerInfo = () => {
    if (!bill?.customer) return null;

    const customer = bill.customer;

    return (
      <ModernCard style={styles.customerCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <TouchableOpacity
            onPress={handleCustomerPress}
            style={styles.viewCustomerButton}
            testID="view-customer-button"
          >
            <Text style={styles.viewCustomerText}>View Details</Text>
            <MaterialIcon name="chevron-right" size={16} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleCustomerPress}
          style={styles.customerContent}
          activeOpacity={0.7}
        >
          <View style={styles.customerHeader}>
            <View style={styles.customerAvatar}>
              <MaterialIcon name="person" size={24} color="#007AFF" />
            </View>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>
                {customer.personalDetails?.name || 'Unknown Customer'}
              </Text>
              <Text style={styles.customerPhone}>
                {customer.personalDetails?.phone || 'No phone number'}
              </Text>
            </View>
          </View>

          {customer.personalDetails?.email && (
            <View style={styles.customerDetail}>
              <MaterialIcon name="email" size={16} color="#666" />
              <Text style={styles.customerDetailText}>
                {customer.personalDetails.email}
              </Text>
            </View>
          )}

          {customer.personalDetails?.address && (
            <View style={styles.customerDetail}>
              <MaterialIcon name="location-on" size={16} color="#666" />
              <Text style={styles.customerDetailText}>
                {customer.personalDetails.address}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </ModernCard>
    );
  };

  const renderBillingItems = () => {
    if (!bill?.items?.length) return null;

    return (
      <ModernCard style={styles.itemsCard}>
        <Text style={styles.sectionTitle}>Billing Items</Text>
        
        {bill.items.map((item, index) => (
          <View key={item.id || index} style={styles.itemRow}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemName}>{item.name}</Text>
              {item.deliveryStatus && (
                <View style={[
                  styles.itemStatusBadge,
                  { backgroundColor: getDeliveryStatusColor(item.deliveryStatus) + '20' }
                ]}>
                  <Text style={[
                    styles.itemStatusText,
                    { color: getDeliveryStatusColor(item.deliveryStatus) }
                  ]}>
                    {getDeliveryStatusLabel(item.deliveryStatus)}
                  </Text>
                </View>
              )}
            </View>
            
            {item.description && (
              <Text style={styles.itemDescription}>{item.description}</Text>
            )}
            
            <View style={styles.itemDetails}>
              <View style={styles.itemDetailRow}>
                <Text style={styles.itemDetailLabel}>Quantity:</Text>
                <Text style={styles.itemDetailValue}>{item.quantity}</Text>
              </View>
              <View style={styles.itemDetailRow}>
                <Text style={styles.itemDetailLabel}>Unit Price:</Text>
                <Text style={styles.itemDetailValue}>₹{item.unitPrice.toFixed(2)}</Text>
              </View>
              <View style={styles.itemDetailRow}>
                <Text style={styles.itemDetailLabel}>Total:</Text>
                <Text style={styles.itemTotalValue}>₹{(item.quantity * item.unitPrice).toFixed(2)}</Text>
              </View>
            </View>

            {item.materialSource && (
              <View style={styles.materialSourceContainer}>
                <MaterialIcon 
                  name={item.materialSource === 'customer' ? 'person' : 'business'} 
                  size={14} 
                  color="#666" 
                />
                <Text style={styles.materialSourceText}>
                  {item.materialSource === 'customer' ? 'Customer Provided' : 'Our Materials'}
                </Text>
              </View>
            )}
          </View>
        ))}

        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount:</Text>
            <Text style={styles.totalAmount}>₹{bill.totalAmount.toFixed(2)}</Text>
          </View>
        </View>
      </ModernCard>
    );
  };

  const renderReceivedItems = () => {
    if (!bill?.receivedItems?.length) return null;

    return (
      <ModernCard style={styles.itemsCard}>
        <Text style={styles.sectionTitle}>Received Items</Text>
        
        {bill.receivedItems.map((item, index) => (
          <View key={item.id || index} style={styles.receivedItemRow}>
            <View style={styles.receivedItemHeader}>
              <Text style={styles.itemName}>{item.name}</Text>
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
              <Text style={styles.itemDescription}>{item.description}</Text>
            )}
            
            <View style={styles.receivedItemDetails}>
              <View style={styles.receivedItemDetailRow}>
                <MaterialIcon name="inventory" size={16} color="#666" />
                <Text style={styles.receivedItemDetailText}>
                  Quantity: {item.quantity}
                </Text>
              </View>
              <View style={styles.receivedItemDetailRow}>
                <MaterialIcon name="calendar-today" size={16} color="#666" />
                <Text style={styles.receivedItemDetailText}>
                  Received: {new Date(item.receivedDate).toLocaleDateString()}
                </Text>
              </View>
              {item.returnedDate && (
                <View style={styles.receivedItemDetailRow}>
                  <MaterialIcon name="undo" size={16} color="#666" />
                  <Text style={styles.receivedItemDetailText}>
                    Returned: {new Date(item.returnedDate).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </ModernCard>
    );
  };

  const renderNotes = () => {
    if (!bill?.notes) return null;

    return (
      <ModernCard style={styles.notesCard}>
        <Text style={styles.sectionTitle}>Notes</Text>
        <Text style={styles.notesText}>{bill.notes}</Text>
      </ModernCard>
    );
  };

  const renderActionButtons = () => {
    if (!bill) return null;

    return (
      <View style={styles.actionButtons}>
        <ModernButton
          title="Print Bill"
          onPress={handlePrint}
          style={styles.actionButton}
          testID="print-bill-button"
        />
        <ModernButton
          title="Edit Bill"
          onPress={handleEdit}
          style={styles.actionButton}
          variant="secondary"
          testID="edit-bill-button"
        />
      </View>
    );
  };

  const styles = createStyles(isDarkMode);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner message="Loading bill details..." />
      </SafeAreaView>
    );
  }

  if (!bill) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcon name="error" size={64} color="#FF3B30" />
          <Text style={styles.errorTitle}>Bill Not Found</Text>
          <Text style={styles.errorMessage}>
            The bill you're looking for could not be found.
          </Text>
          <ModernButton
            title="Go Back"
            onPress={() => navigation.goBack()}
            style={styles.errorButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshBill}
          />
        }
        testID="bill-detail-scroll"
      >
        {renderBillHeader()}
        {renderCustomerInfo()}
        {renderBillingItems()}
        {renderReceivedItems()}
        {renderNotes()}
        
        {/* Payment Tracking Component */}
        <PaymentTrackingComponent
          bill={bill}
          onBillUpdate={handleBillUpdate}
          editable={true}
          testID="payment-tracking"
        />
      </ScrollView>

      {renderActionButtons()}
    </SafeAreaView>
  );
};

const createStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? '#000000' : '#F2F2F7',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  headerCard: {
    marginBottom: 16,
  },
  billHeaderContent: {
    gap: 16,
  },
  billTitleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  billNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: isDarkMode ? '#FFFFFF' : '#000000',
  },
  statusBadges: {
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  billDates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  dateLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? '#FFFFFF' : '#000000',
  },
  customerCard: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: isDarkMode ? '#FFFFFF' : '#000000',
  },
  viewCustomerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewCustomerText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  customerContent: {
    gap: 12,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: isDarkMode ? '#FFFFFF' : '#000000',
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: 14,
    color: '#666',
  },
  customerDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customerDetailText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  itemsCard: {
    marginBottom: 16,
  },
  itemRow: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#3A3A3C' : '#E1E1E1',
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
    color: isDarkMode ? '#FFFFFF' : '#000000',
    flex: 1,
    marginRight: 8,
  },
  itemStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  itemStatusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  itemDetails: {
    gap: 8,
  },
  itemDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemDetailLabel: {
    fontSize: 14,
    color: '#666',
  },
  itemDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: isDarkMode ? '#FFFFFF' : '#000000',
  },
  itemTotalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  materialSourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: isDarkMode ? '#3A3A3C' : '#F0F0F0',
  },
  materialSourceText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  totalSection: {
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: isDarkMode ? '#3A3A3C' : '#E1E1E1',
    marginTop: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: isDarkMode ? '#FFFFFF' : '#000000',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
  },
  receivedItemRow: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#3A3A3C' : '#E1E1E1',
  },
  receivedItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  receivedStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  receivedStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  receivedItemDetails: {
    gap: 8,
  },
  receivedItemDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  receivedItemDetailText: {
    fontSize: 14,
    color: '#666',
  },
  notesCard: {
    marginBottom: 16,
  },
  notesText: {
    fontSize: 14,
    color: isDarkMode ? '#CCCCCC' : '#333333',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: isDarkMode ? '#3A3A3C' : '#E1E1E1',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: isDarkMode ? '#FFFFFF' : '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    minWidth: 120,
  },
});

export default BillDetailScreen;