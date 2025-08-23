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
  PaymentTrackingComponent,
  BillItemImageGallery
} from '../components';
import BillingItemViewPopup from '../components/billing/BillingItemViewPopup';
import {
  Bill,
  BillItem,
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
  const [showItemPopup, setShowItemPopup] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);

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

      // Debug: Log internal notes data
      console.log('BillDetailScreen - Loaded bill data:', {
        billId: billData.id,
        itemsCount: billData.items?.length || 0,
        itemsWithInternalNotes: billData.items?.filter(item => item.internalNotes).length || 0,
        firstItemInternalNotes: billData.items?.[0]?.internalNotes,
        allItemsInternalNotes: billData.items?.map(item => ({ 
          id: item.id, 
          name: item.name, 
          hasInternalNotes: !!item.internalNotes,
          internalNotes: item.internalNotes 
        }))
      });

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
            onPress={refreshImages}
            style={styles.headerButton}
            testID="header-refresh-button"
          >
            <MaterialIcon name="refresh" size={24} color="#007AFF" />
          </TouchableOpacity>
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
    navigation.navigate('EditBillWizard', {
      billId: bill.id,
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

  const calculateOverallDeliveryStatus = useCallback((items: BillItem[]): DeliveryStatus => {
    if (items.length === 0) return 'pending';

    // Filter out cancelled items for overall status calculation
    const activeItems = items.filter(item => (item.deliveryStatus || 'pending') !== 'cancelled');

    // If all items are cancelled, overall status is cancelled
    if (activeItems.length === 0) {
      return 'cancelled';
    }

    const activeItemStatuses = activeItems.map(item => item.deliveryStatus || 'pending');

    // If all active items are delivered, overall status is delivered
    if (activeItemStatuses.every(status => status === 'delivered')) {
      return 'delivered';
    }

    // If any active item is ready for delivery and none are pending/in_progress, overall is ready
    if (activeItemStatuses.some(status => status === 'ready_for_delivery') &&
      !activeItemStatuses.some(status => status === 'pending' || status === 'in_progress')) {
      return 'ready_for_delivery';
    }

    // If any active item is in progress, overall status is in progress
    if (activeItemStatuses.some(status => status === 'in_progress')) {
      return 'in_progress';
    }

    // Default to pending
    return 'pending';
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

  const renderBillHeader = () => {
    if (!bill) return null;

    return (
      <View style={styles.headerSection}>
        {/* Bill Title & Status */}
        <ModernCard style={styles.billTitleCard}>
          <View style={styles.billTitleContent}>
            <View style={styles.billNumberSection}>
              <Text style={styles.billNumberLabel}>Bill</Text>
              <Text style={styles.billNumber}>{bill.billNumber}</Text>
            </View>
            <View style={styles.statusSection}>
              <View style={[
                styles.primaryStatusBadge,
                { backgroundColor: getStatusColor(bill.status) }
              ]}>
                <MaterialIcon
                  name={bill.status === 'fully_paid' ? 'check-circle' : bill.status === 'partially_paid' ? 'payment' : 'error'}
                  size={16}
                  color="#FFF"
                />
                <Text style={styles.primaryStatusText}>
                  {getStatusLabel(bill.status)}
                </Text>
              </View>
            </View>
          </View>
        </ModernCard>

        {/* Bill Info Grid */}
        <View style={styles.billInfoGrid}>
          <ModernCard style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <MaterialIcon name="calendar-today" size={20} color="#007AFF" />
              <Text style={styles.infoCardTitle}>Billing Date</Text>
            </View>
            <Text style={styles.infoCardValue}>
              {new Date(bill.billingDate).toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </Text>
          </ModernCard>

          <ModernCard style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <MaterialIcon name="receipt" size={20} color="#34C759" />
              <Text style={styles.infoCardTitle}>Delivery Date</Text>
            </View>
            <Text style={styles.infoCardValue}>
              {new Date(bill.deliveryDate).toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </Text>
          </ModernCard>

          <ModernCard style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <MaterialIcon
                name="receipt"
                size={20}
                color={getDeliveryStatusColor(bill.deliveryStatus)}
              />
              <Text style={styles.infoCardTitle}>Delivery Status</Text>
            </View>
            <Text style={[
              styles.infoCardValue,
              { color: getDeliveryStatusColor(bill.deliveryStatus) }
            ]}>
              {getDeliveryStatusLabel(bill.deliveryStatus)}
            </Text>
          </ModernCard>

          <ModernCard style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <MaterialIcon name="money" size={20} color="#FF9500" />
              <Text style={styles.infoCardTitle}>Total Amount</Text>
            </View>
            <Text style={styles.infoCardAmount}>
              ₹{bill.totalAmount.toFixed(2)}
            </Text>
          </ModernCard>
        </View>
      </View>
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
            <MaterialIcon name="right" size={16} color="#007AFF" />
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

  const testImageAPI = async () => {
    if (!bill?.items?.length) return;

    console.log('=== TESTING IMAGE API FOR ALL ITEMS ===');
    for (let i = 0; i < bill.items.length; i++) {
      const item = bill.items[i];
      console.log(`Testing item ${i}: ${item.name} (ID: ${item.id})`);

      try {
        const { getBillItemImages } = await import('../services/api');
        const result = await getBillItemImages(bill.id, item.id);
        console.log(`Item ${i} (${item.name}) images:`, result);
      } catch (error) {
        console.error(`Error loading images for item ${i} (${item.name}):`, error);
      }
    }
    console.log('=== END IMAGE API TEST ===');
  };

  const refreshImages = async () => {
    console.log('=== REFRESHING IMAGES ===');

    // Clear all image caches
    try {
      const { clearCache } = await import('../services/api');
      await clearCache();

      const cacheManager = (await import('../services/cacheManager')).default;
      if (bill?.items) {
        for (const item of bill.items) {
          if (item.id) {
            const cacheKey = `bill_item_images_${bill.id}_${item.id}`;
            await cacheManager.remove(cacheKey);
            console.log(`Cleared cache for ${item.name}: ${cacheKey}`);
          }
        }
      }

      console.log('All image caches cleared');

      // Force reload the bill data
      await loadBill();

      console.log('Bill data reloaded');
    } catch (error) {
      console.error('Error refreshing images:', error);
    }

    console.log('=== END REFRESH ===');
  };

  const handleViewItem = (index: number) => {
    setSelectedItemIndex(index);
    setShowItemPopup(true);
  };

  const renderBillingItems = () => {
    if (!bill?.items?.length) return null;

    console.log('Rendering billing items:', bill.items.length);
    bill.items.forEach((item, index) => {
      console.log(`Item ${index}: ID=${item.id}, Name=${item.name}`);
    });

    // Test API calls for debugging (remove this in production)
    if (bill.items.length > 1) {
      testImageAPI();
    }

    return (
      <ModernCard style={styles.itemsCard}>
        <Text style={styles.sectionTitle}>Billing Items</Text>

        <View style={styles.itemsList}>
          {bill.items.map((item, index) => (
            <TouchableOpacity
              key={item.id || index}
              style={styles.itemCard}
              onPress={() => handleViewItem(index)}
              activeOpacity={0.7}
            >
              <View style={styles.itemCardContent}>
                <View style={styles.itemCardInfo}>
                  <Text style={styles.itemCardName}>{item.name}</Text>
                  <Text style={styles.itemCardDescription} numberOfLines={2}>
                    {item.description || 'No description'}
                  </Text>

                  {/* Internal Notes */}
                  {item.internalNotes && item.internalNotes.trim() !== '' && (
                    <View style={styles.internalNotesContainer}>
                      <View style={styles.internalNotesHeader}>
                        <MaterialIcon name="lock" size={14} color="#FF9500" />
                        <Text style={styles.internalNotesLabel}>Staff Notes</Text>
                        <Text style={styles.internalNotesPrivateLabel}>PRIVATE</Text>
                      </View>
                      <Text style={styles.internalNotesText} numberOfLines={2}>
                        {item.internalNotes}
                      </Text>
                    </View>
                  )}

                  <View style={styles.itemCardDetails}>
                    <Text style={styles.itemCardQuantity}>{item.quantity} × ₹{item.unitPrice.toFixed(2)}</Text>
                  </View>
                </View>
                <View style={styles.itemCardActions}>
                  <View style={styles.itemCardStatusTags}>
                    <View style={[
                      styles.statusBadgeSmall,
                      { backgroundColor: item.materialSource === 'customer' ? '#007AFF20' : '#34C75920' }
                    ]}>
                      <Text style={[
                        styles.statusBadgeSmallText,
                        { color: item.materialSource === 'customer' ? '#007AFF' : '#34C759' }
                      ]}>
                        {item.materialSource === 'customer' ? 'Customer' : 'Business'}
                      </Text>
                    </View>
                    {item.deliveryStatus && (
                      <View style={[
                        styles.statusBadgeSmall,
                        { backgroundColor: getDeliveryStatusColor(item.deliveryStatus) + '20' }
                      ]}>
                        <Text style={[
                          styles.statusBadgeSmallText,
                          { color: getDeliveryStatusColor(item.deliveryStatus) }
                        ]}>
                          {getDeliveryStatusLabel(item.deliveryStatus)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.itemCardTotal}>₹{(item.quantity * item.unitPrice).toFixed(2)}</Text>
                  <MaterialIcon name="right" size={20} color="#007AFF" />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Payment Management */}
        <PaymentTrackingComponent
          bill={bill}
          onBillUpdate={handleBillUpdate}
          editable={true}
        />
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
                  <MaterialIcon name="back" size={16} color="#666" />
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


      </ScrollView>

      {renderActionButtons()}

      {/* Billing Item View Popup */}
      {selectedItemIndex !== null && bill.items[selectedItemIndex] && (
        <BillingItemViewPopup
          visible={showItemPopup}
          onClose={() => setShowItemPopup(false)}
          item={bill.items[selectedItemIndex]}
          billId={bill.id}
          onItemUpdate={async (updatedItem, previousItem) => {
            try {
              // Update the item in the backend first
              if (updatedItem.id) {
                const { updateBillItem } = await import('../services/api');
                await updateBillItem(updatedItem.id, {
                  name: updatedItem.name,
                  description: updatedItem.description,
                  quantity: updatedItem.quantity,
                  unitPrice: updatedItem.unitPrice,
                  materialSource: updatedItem.materialSource,
                  deliveryStatus: updatedItem.deliveryStatus,
                  statusChangeDate: updatedItem.statusChangeDate,
                  internalNotes: updatedItem.internalNotes,
                });
              }

              // Update the item in the local bill state
              const updatedItems = bill.items.map((item, index) =>
                index === selectedItemIndex ? updatedItem : item
              );

              // Calculate the new overall delivery status based on all items
              const newOverallDeliveryStatus = calculateOverallDeliveryStatus(updatedItems);

              // Update the overall bill delivery status if it changed
              if (newOverallDeliveryStatus !== bill.deliveryStatus) {
                try {
                  const { updateBill } = await import('../services/api');
                  await updateBill(bill.id, {
                    id: bill.id,
                    customerId: bill.customerId,
                    billingDate: bill.billingDate,
                    deliveryDate: bill.deliveryDate,
                    deliveryStatus: newOverallDeliveryStatus,
                    items: updatedItems.map(item => ({
                      name: item.name,
                      description: item.description,
                      quantity: item.quantity,
                      unitPrice: item.unitPrice,
                      materialSource: item.materialSource,
                      deliveryStatus: item.deliveryStatus,
                      type: item.type,
                      configItemId: item.configItemId,
                    })),
                    receivedItems: bill.receivedItems || [],
                    notes: bill.notes,
                  });
                } catch (updateError) {
                  console.warn('Failed to update overall bill status, continuing with item update:', updateError);
                  // Don't throw here - the item update was successful, just the overall status update failed
                }
              }

              // Update the local bill state with both item changes and overall status
              const updatedBill = {
                ...bill,
                items: updatedItems,
                deliveryStatus: newOverallDeliveryStatus
              };
              setBill(updatedBill);

              return { success: true };
            } catch (error) {
              console.error('Error updating item status:', error);

              // Revert to previous state on failure
              if (previousItem) {
                const revertedItems = bill.items.map((item, index) =>
                  index === selectedItemIndex ? previousItem : item
                );
                const revertedBill = { ...bill, items: revertedItems };
                setBill(revertedBill);
              }

              return { success: false, error: error.message || 'Failed to update item status' };
            }
          }}

          editable={true}
        />
      )}
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
    marginBottom: 32,
  },
  itemsList: {
    paddingTop: 16,
  },
  itemCard: {
    backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
  },
  itemCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itemCardInfo: {
    flex: 1,
    marginRight: 16,
  },
  itemCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? '#FFF' : '#000',
    marginBottom: 4,
  },
  itemCardDescription: {
    fontSize: 14,
    color: isDarkMode ? '#999' : '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  itemNotesContainer: {
    backgroundColor: isDarkMode ? '#2C2C2E' : '#FFF8E1',
    borderLeftWidth: 3,
    borderLeftColor: '#FF9500',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    borderRadius: 6,
  },
  itemNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  itemNotesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF9500',
    textTransform: 'uppercase',
  },
  itemNotesText: {
    fontSize: 13,
    color: isDarkMode ? '#E5E5E7' : '#333',
    lineHeight: 16,
    fontStyle: 'italic',
  },
  itemCardDetails: {
    marginTop: 8,
  },
  itemCardQuantity: {
    fontSize: 14,
    color: isDarkMode ? '#999' : '#666',
    fontWeight: '500',
    marginBottom: 12,
  },
  itemCardStatusTags: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusBadgeSmallText: {
    fontSize: 11,
    fontWeight: '500',
  },
  itemCardActions: {
    alignItems: 'flex-end',
    gap: 8,
    minWidth: 120,
  },
  itemCardTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
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
  internalNotesContainer: {
    backgroundColor: isDarkMode ? '#2C2C2E' : '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FF9500',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  internalNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  internalNotesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: isDarkMode ? '#FFF' : '#000',
    flex: 1,
  },
  internalNotesPrivateLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF3B30',
    backgroundColor: isDarkMode ? '#3A3A3C' : '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  internalNotesText: {
    fontSize: 13,
    color: isDarkMode ? '#E5E5E7' : '#333333',
    lineHeight: 18,
    lineHeight: 18,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: isDarkMode ? '#2C2C2E' : '#F0F9FF',
    borderRadius: 8,
  },
  materialSourceText: {
    fontSize: 12,
    color: '#666',
  },

  // New Modern Header Design Styles
  headerSection: {
    marginBottom: 20,
  },
  billTitleCard: {
    marginBottom: 16,
    backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  billTitleContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billNumberSection: {
    flex: 1,
  },
  billNumberLabel: {
    fontSize: 14,
    color: isDarkMode ? '#999' : '#666',
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusSection: {
    alignItems: 'flex-end',
  },
  primaryStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  primaryStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  billInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoCardTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: isDarkMode ? '#999' : '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCardValue: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? '#FFF' : '#000',
    lineHeight: 18,
  },
  infoCardAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
  },
  receivedItemRow: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#38383A' : '#E5E5EA',
  },
  receivedItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  receivedStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
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
    color: isDarkMode ? '#999' : '#666',
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
    borderTopColor: isDarkMode ? '#38383A' : '#E5E5EA',
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