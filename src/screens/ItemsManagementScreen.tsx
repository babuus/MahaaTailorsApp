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
} from '../components';
import {
  Bill,
  BillItem,
  DeliveryStatus,
  ReceivedItem
} from '../types';
import { getBillById, updateBill } from '../services/api';

interface ItemsManagementScreenProps {
  navigation: any;
  route: {
    params: {
      billId: string;
      bill?: Bill;
    };
  };
}

export const ItemsManagementScreen: React.FC<ItemsManagementScreenProps> = ({
  navigation,
  route,
}) => {
  const { billId, bill: initialBill } = route.params;
  const { isDarkMode } = useThemeContext();

  const [bill, setBill] = useState<Bill | null>(initialBill || null);
  const [isLoading, setIsLoading] = useState(!initialBill);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const loadBill = useCallback(async () => {
    if (!billId) return;

    setIsLoading(true);
    try {
      const billData = await getBillById(billId);

      // Debug: Log internal notes data
      console.log('ItemsManagementScreen - Loaded bill data:', {
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
      setHasChanges(false);
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
      title: bill ? `Items - ${bill.billNumber}` : 'Items Management',
      headerRight: () => hasChanges ? (
        <TouchableOpacity
          onPress={handleSave}
          style={styles.headerButton}
          testID="save-changes-button"
        >
          <MaterialIcon name="save" size={24} color="#007AFF" />
        </TouchableOpacity>
      ) : null,
    });
  }, [navigation, bill, hasChanges]);

  useEffect(() => {
    if (!initialBill) {
      loadBill();
    }
  }, [loadBill, initialBill]);

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

  const handleItemStatusChange = useCallback((itemIndex: number, newStatus: DeliveryStatus) => {
    if (!bill) return;

    const updatedItems = [...bill.items];
    const currentItem = updatedItems[itemIndex];

    // Only update if status actually changed
    if (currentItem.deliveryStatus !== newStatus) {
      updatedItems[itemIndex] = {
        ...currentItem,
        deliveryStatus: newStatus,
        statusChangeDate: new Date().toISOString().split('T')[0] // Save current date
      };

      const newOverallStatus = calculateOverallDeliveryStatus(updatedItems);

      setBill(prev => prev ? {
        ...prev,
        items: updatedItems,
        deliveryStatus: newOverallStatus
      } : null);

      setHasChanges(true);
    }
  }, [bill, calculateOverallDeliveryStatus]);

  const handleReceivedItemStatusChange = useCallback((itemIndex: number, newStatus: 'received' | 'returned') => {
    if (!bill) return;

    const updatedReceivedItems = [...bill.receivedItems];
    updatedReceivedItems[itemIndex] = {
      ...updatedReceivedItems[itemIndex],
      status: newStatus,
      returnedDate: newStatus === 'returned' ? new Date().toISOString().split('T')[0] : undefined
    };

    setBill(prev => prev ? {
      ...prev,
      receivedItems: updatedReceivedItems
    } : null);

    setHasChanges(true);
  }, [bill]);

  const handleSave = useCallback(async () => {
    if (!bill || !hasChanges) return;

    setIsSaving(true);
    try {
      const updateData = {
        id: bill.id,
        customerId: bill.customerId,
        billingDate: bill.billingDate,
        deliveryDate: bill.deliveryDate,
        deliveryStatus: bill.deliveryStatus,
        items: bill.items.map(item => ({
          id: item.id,
          type: item.type,
          name: item.name,
          description: item.description || '',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          configItemId: item.configItemId,
          materialSource: item.materialSource || 'customer',
          deliveryStatus: item.deliveryStatus || 'pending',
          statusChangeDate: item.statusChangeDate,
          internalNotes: item.internalNotes || '' // Include internal notes
        })),
        receivedItems: bill.receivedItems || [],
        notes: bill.notes || '',
      };

      await updateBill(bill.id, updateData);
      setHasChanges(false);
      Alert.alert('Success', 'Item statuses updated successfully!');
    } catch (error) {
      console.error('Error saving changes:', error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [bill, hasChanges]);

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

  const getStatusIcon = (status: DeliveryStatus): string => {
    switch (status) {
      case 'pending': return 'schedule';
      case 'in_progress': return 'work';
      case 'ready_for_delivery': return 'check-circle';
      case 'delivered': return 'local-shipping';
      case 'cancelled': return 'cancel';
      default: return 'help';
    }
  };

  const renderOverallStatus = () => {
    if (!bill) return null;

    const statusConfig = {
      color: getDeliveryStatusColor(bill.deliveryStatus || 'pending'),
      label: getDeliveryStatusLabel(bill.deliveryStatus || 'pending'),
      icon: getStatusIcon(bill.deliveryStatus || 'pending')
    };

    return (
      <ModernCard style={styles.overallStatusCard}>
        <View style={styles.overallStatusHeader}>
          <Text style={styles.overallStatusTitle}>Overall Delivery Status</Text>
          <Text style={styles.overallStatusSubtitle}>Auto-calculated from item statuses</Text>
        </View>

        <View style={[styles.overallStatusBadge, { borderColor: statusConfig.color }]}>
          <MaterialIcon
            name={statusConfig.icon}
            size={24}
            color={statusConfig.color}
          />
          <Text style={[styles.overallStatusText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>

        <View style={styles.statusProgress}>
          <View style={styles.progressSteps}>
            {[
              { status: 'pending', label: 'Pending' },
              { status: 'in_progress', label: 'In Progress' },
              { status: 'ready_for_delivery', label: 'Ready' },
              { status: 'delivered', label: 'Delivered' }
            ].map((step, index) => {
              const isActive = bill.deliveryStatus === step.status;
              const isPassed = ['delivered'].includes(bill.deliveryStatus || '') &&
                ['pending', 'in_progress', 'ready_for_delivery'].includes(step.status);

              return (
                <View key={step.status} style={styles.progressStep}>
                  <View style={[
                    styles.progressDot,
                    isActive && { backgroundColor: getDeliveryStatusColor(step.status as DeliveryStatus) },
                    isPassed && { backgroundColor: '#34C759' }
                  ]} />
                  <Text style={[
                    styles.progressLabel,
                    (isActive || isPassed) && { color: getDeliveryStatusColor(step.status as DeliveryStatus) }
                  ]}>
                    {step.label}
                  </Text>
                  {index < 3 && <View style={[
                    styles.progressLine,
                    isPassed && { backgroundColor: '#34C759' }
                  ]} />}
                </View>
              );
            })}
          </View>
        </View>
      </ModernCard>
    );
  };

  const renderStatusButtons = (currentStatus: DeliveryStatus, onStatusChange: (status: DeliveryStatus) => void) => {
    const statuses: Array<{ value: DeliveryStatus; label: string; icon: string }> = [
      { value: 'pending', label: 'Pending', icon: 'schedule' },
      { value: 'in_progress', label: 'In Progress', icon: 'work' },
      { value: 'ready_for_delivery', label: 'Ready', icon: 'check-circle' },
      { value: 'delivered', label: 'Delivered', icon: 'local-shipping' },
      { value: 'cancelled', label: 'Cancelled', icon: 'cancel' }
    ];

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.statusButtons}>
          {statuses.map((status) => {
            const isActive = currentStatus === status.value;
            const color = getDeliveryStatusColor(status.value);

            return (
              <TouchableOpacity
                key={status.value}
                style={[
                  styles.statusButton,
                  isActive && [styles.statusButtonActive, { borderColor: color, backgroundColor: color + '20' }]
                ]}
                onPress={() => onStatusChange(status.value)}
                testID={`status-button-${status.value}`}
              >
                <MaterialIcon
                  name={status.icon}
                  size={16}
                  color={isActive ? color : '#666'}
                />
                <Text style={[
                  styles.statusButtonText,
                  isActive && { color: color, fontWeight: '600' }
                ]}>
                  {status.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  const renderBillingItems = () => {
    if (!bill?.items?.length) return null;

    return (
      <ModernCard style={styles.itemsCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Billing Items</Text>
          <Text style={styles.sectionSubtitle}>Update individual item delivery status</Text>
        </View>

        {bill.items.map((item, index) => (
          <View key={item.id || index} style={styles.itemContainer}>
            <View style={styles.itemHeader}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                {item.description && (
                  <Text style={styles.itemDescription}>{item.description}</Text>
                )}

                {/* Internal Notes */}
                {item.internalNotes && item.internalNotes.trim() !== '' && (
                  <View style={styles.internalNotesContainer}>
                    <View style={styles.internalNotesHeader}>
                      <MaterialIcon name="lock" size={12} color="#FF9500" />
                      <Text style={styles.internalNotesLabel}>Staff Notes</Text>
                      <Text style={styles.internalNotesPrivateLabel}>PRIVATE</Text>
                    </View>
                    <Text style={styles.internalNotesText} numberOfLines={2}>
                      {item.internalNotes}
                    </Text>
                  </View>
                )}

                <View style={styles.itemDetails}>
                  <Text style={styles.itemDetail}>Qty: {item.quantity}</Text>
                  <Text style={styles.itemDetail}>₹{item.unitPrice.toFixed(2)}</Text>
                  <Text style={styles.itemTotal}>₹{(item.quantity * item.unitPrice).toFixed(2)}</Text>
                </View>
                {item.materialSource && (
                  <View style={styles.materialSource}>
                    <MaterialIcon
                      name={item.materialSource === 'customer' ? 'person' : 'business'}
                      size={12}
                      color="#666"
                    />
                    <Text style={styles.materialSourceText}>
                      {item.materialSource === 'customer' ? 'Customer Materials' : 'Our Materials'}
                    </Text>
                  </View>
                )}
                {item.statusChangeDate && (
                  <View style={styles.statusChangeDate}>
                    <MaterialIcon name="schedule" size={12} color="#666" />
                    <Text style={styles.statusChangeDateText}>
                      Status updated: {new Date(item.statusChangeDate).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </View>

              <View style={[
                styles.currentStatusBadge,
                { backgroundColor: getDeliveryStatusColor(item.deliveryStatus || 'pending') + '20' }
              ]}>
                <MaterialIcon
                  name={getStatusIcon(item.deliveryStatus || 'pending')}
                  size={14}
                  color={getDeliveryStatusColor(item.deliveryStatus || 'pending')}
                />
                <Text style={[
                  styles.currentStatusText,
                  { color: getDeliveryStatusColor(item.deliveryStatus || 'pending') }
                ]}>
                  {getDeliveryStatusLabel(item.deliveryStatus || 'pending')}
                </Text>
              </View>
            </View>

            <View style={styles.statusUpdateSection}>
              <Text style={styles.statusUpdateLabel}>Update Status:</Text>
              {renderStatusButtons(
                item.deliveryStatus || 'pending',
                (newStatus) => handleItemStatusChange(index, newStatus)
              )}
            </View>
          </View>
        ))}
      </ModernCard>
    );
  };

  const renderReceivedItemStatusButtons = (currentStatus: 'received' | 'returned', onStatusChange: (status: 'received' | 'returned') => void) => {
    const statuses: Array<{ value: 'received' | 'returned'; label: string; icon: string; color: string }> = [
      { value: 'received', label: 'Received', icon: 'check-circle', color: '#34C759' },
      { value: 'returned', label: 'Returned', icon: 'undo', color: '#FF9500' }
    ];

    return (
      <View style={styles.receivedStatusButtons}>
        {statuses.map((status) => {
          const isActive = currentStatus === status.value;

          return (
            <TouchableOpacity
              key={status.value}
              style={[
                styles.receivedStatusButton,
                isActive && [styles.receivedStatusButtonActive, { borderColor: status.color, backgroundColor: status.color + '20' }]
              ]}
              onPress={() => onStatusChange(status.value)}
              testID={`received-status-button-${status.value}`}
            >
              <MaterialIcon
                name={status.icon}
                size={16}
                color={isActive ? status.color : '#666'}
              />
              <Text style={[
                styles.receivedStatusButtonText,
                isActive && { color: status.color, fontWeight: '600' }
              ]}>
                {status.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderReceivedItems = () => {
    if (!bill?.receivedItems?.length) return null;

    return (
      <ModernCard style={styles.itemsCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Received Items</Text>
          <Text style={styles.sectionSubtitle}>Update status of items received from customer</Text>
        </View>

        {bill.receivedItems.map((item, index) => (
          <View key={item.id || index} style={styles.receivedItemContainer}>
            <View style={styles.receivedItemHeader}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                {item.description && (
                  <Text style={styles.itemDescription}>{item.description}</Text>
                )}
                <View style={styles.receivedItemDetails}>
                  <View style={styles.receivedItemDetail}>
                    <MaterialIcon name="inventory" size={14} color="#666" />
                    <Text style={styles.receivedItemDetailText}>Qty: {item.quantity}</Text>
                  </View>
                  <View style={styles.receivedItemDetail}>
                    <MaterialIcon name="calendar-today" size={14} color="#666" />
                    <Text style={styles.receivedItemDetailText}>
                      Received: {new Date(item.receivedDate).toLocaleDateString()}
                    </Text>
                  </View>
                  {item.returnedDate && (
                    <View style={styles.receivedItemDetail}>
                      <MaterialIcon name="undo" size={14} color="#666" />
                      <Text style={styles.receivedItemDetailText}>
                        Returned: {new Date(item.returnedDate).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={[
                styles.currentReceivedStatusBadge,
                { backgroundColor: item.status === 'received' ? '#34C759' : '#FF9500' }
              ]}>
                <MaterialIcon
                  name={item.status === 'received' ? 'check-circle' : 'undo'}
                  size={14}
                  color="#FFFFFF"
                />
                <Text style={styles.currentReceivedStatusText}>
                  {item.status === 'received' ? 'Received' : 'Returned'}
                </Text>
              </View>
            </View>

            <View style={styles.receivedStatusUpdateSection}>
              <Text style={styles.statusUpdateLabel}>Update Status:</Text>
              {renderReceivedItemStatusButtons(
                item.status,
                (newStatus) => handleReceivedItemStatusChange(index, newStatus)
              )}
            </View>
          </View>
        ))}
      </ModernCard>
    );
  };

  const renderSaveButton = () => {
    if (!hasChanges) return null;

    return (
      <View style={styles.saveButtonContainer}>
        <ModernButton
          title="Save Changes"
          onPress={handleSave}
          loading={isSaving}
          style={styles.saveButton}
          testID="save-changes-button"
        />
      </View>
    );
  };

  const styles = createStyles(isDarkMode);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner message="Loading items..." />
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
        testID="items-management-scroll"
      >
        {renderOverallStatus()}
        {renderBillingItems()}
        {renderReceivedItems()}
      </ScrollView>

      {renderSaveButton()}
    </SafeAreaView>
  );
};

const createStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? '#000000' : '#F2F2F7',
  },
  headerButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  overallStatusCard: {
    marginBottom: 16,
  },
  overallStatusHeader: {
    marginBottom: 16,
  },
  overallStatusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: isDarkMode ? '#FFFFFF' : '#000000',
    marginBottom: 4,
  },
  overallStatusSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  overallStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: isDarkMode ? '#1C1C1E' : '#F8F9FA',
    gap: 12,
    marginBottom: 20,
  },
  overallStatusText: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusProgress: {
    marginTop: 8,
  },
  progressSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressStep: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E1E1E1',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  progressLine: {
    position: 'absolute',
    top: 6,
    left: '50%',
    right: '-50%',
    height: 2,
    backgroundColor: '#E1E1E1',
  },
  itemsCard: {
    marginBottom: 16,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: isDarkMode ? '#FFFFFF' : '#000000',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  itemContainer: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#3A3A3C' : '#E1E1E1',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? '#FFFFFF' : '#000000',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  internalNotesContainer: {
    backgroundColor: isDarkMode ? '#2C2C2E' : '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FF9500',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  internalNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  internalNotesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: isDarkMode ? '#FFF' : '#000',
    flex: 1,
  },
  internalNotesPrivateLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FF3B30',
    backgroundColor: isDarkMode ? '#3A3A3C' : '#FFFFFF',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    overflow: 'hidden',
  },
  internalNotesText: {
    fontSize: 12,
    color: isDarkMode ? '#E5E5E7' : '#333333',
    lineHeight: 16,
  },
  itemDetails: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  itemDetail: {
    fontSize: 12,
    color: '#666',
  },
  itemTotal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  materialSource: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  materialSourceText: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  statusChangeDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  statusChangeDateText: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  currentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  currentStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusUpdateSection: {
    marginTop: 8,
  },
  statusUpdateLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: isDarkMode ? '#FFFFFF' : '#000000',
    marginBottom: 12,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E1E1E1',
    backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF',
    gap: 6,
    minWidth: 100,
  },
  statusButtonActive: {
    borderWidth: 2,
  },
  statusButtonText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  receivedItemContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#3A3A3C' : '#E1E1E1',
  },
  receivedItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  receivedItemDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  receivedItemDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  receivedItemDetailText: {
    fontSize: 12,
    color: '#666',
  },
  receivedStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  receivedStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  currentReceivedStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  currentReceivedStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  receivedStatusUpdateSection: {
    marginTop: 12,
  },
  receivedStatusButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  receivedStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E1E1E1',
    backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF',
    gap: 6,
    minWidth: 100,
  },
  receivedStatusButtonActive: {
    borderWidth: 2,
  },
  receivedStatusButtonText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  saveButtonContainer: {
    padding: 16,
    backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: isDarkMode ? '#3A3A3C' : '#E1E1E1',
  },
  saveButton: {
    width: '100%',
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

export default ItemsManagementScreen;