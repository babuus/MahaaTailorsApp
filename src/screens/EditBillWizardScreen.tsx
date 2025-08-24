import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  RefreshControl,
  TextInput,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcon from '../components/MaterialIcon';
import { useThemeContext } from '../contexts/ThemeContext';
import {
  LoadingSpinner,
  ModernCard,
  ModernButton,
} from '../components';
import {
  Customer,
  BillingConfigItem,
  ReceivedItemTemplate,
  BillItem,
  ReceivedItem,
  Payment,
  DeliveryStatus,
  Bill
} from '../types';
import { getBillingConfigItems, getReceivedItemTemplates, updateBill, getBillById, getCustomerById } from '../services/api';

// Import components for item editing
import BillingItemPopup from '../components/billing/BillingItemPopup';

interface EditBillWizardScreenProps {
  navigation: any;
  route: {
    params: {
      billId: string;
      bill?: Bill;
    };
  };
}

export interface EditBillWizardData {
  // Customer info (read-only in edit mode)
  selectedCustomer: Customer | null;

  // Basic info
  billingDate: string;
  deliveryDate: string;
  notes: string;
  deliveryStatus: DeliveryStatus;

  // Items
  billItems: Omit<BillItem, 'totalPrice'>[];
  receivedItems: ReceivedItem[];

  // Payments (handled separately in edit mode)
  payments: Payment[];

  // Temporary image storage for items during editing
  itemImages: { [itemIndex: number]: string[] };

  // Original bill data for comparison
  originalBill: Bill | null;
}

const EditBillWizardScreen: React.FC<EditBillWizardScreenProps> = ({
  navigation,
  route,
}) => {
  const { billId, bill: passedBill } = route.params;
  const { isDarkMode } = useThemeContext();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [billingConfigItems, setBillingConfigItems] = useState<BillingConfigItem[]>([]);
  const [receivedItemTemplates, setReceivedItemTemplates] = useState<ReceivedItemTemplate[]>([]);
  
  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'billing' | 'delivery'>('billing');

  // Item editing state
  const [showItemPopup, setShowItemPopup] = useState(false);
  const [popupMode, setPopupMode] = useState<'create' | 'update' | 'view'>('create');
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);

  const [wizardData, setWizardData] = useState<EditBillWizardData>({
    selectedCustomer: null,
    billingDate: '',
    deliveryDate: '',
    notes: '',
    deliveryStatus: 'pending',
    billItems: [],
    receivedItems: [],
    payments: [],
    itemImages: {},
    originalBill: null,
  });

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // Load form data and bill data in parallel
        const [configItems, templates, billData] = await Promise.all([
          getBillingConfigItems(),
          getReceivedItemTemplates(),
          passedBill ? Promise.resolve(passedBill) : getBillById(billId),
        ]);

        setBillingConfigItems(configItems);
        setReceivedItemTemplates(templates);

        // Load customer data
        let customerData = billData.customer;
        if (billData.customerId && (!customerData || !customerData.personalDetails)) {
          try {
            customerData = await getCustomerById(billData.customerId);
          } catch (error) {
            console.warn('Failed to fetch customer data:', error);
            customerData = billData.customer;
          }
        }

        // Load existing images for bill items
        const itemImages: { [itemIndex: number]: string[] } = {};
        const items = billData.items || [];

        // Load images for each item in parallel
        const imageLoadPromises = items.map(async (item, index) => {
          if (item.id && billData.id) {
            try {
              const { getBillItemImages } = await import('../services/api');
              const result = await getBillItemImages(billData.id, item.id);
              if (result.images && result.images.length > 0) {
                itemImages[index] = result.images;
              }
            } catch (error) {
              console.warn(`Failed to load images for item ${item.id}:`, error);
              // Continue without images for this item
            }
          }
        });

        // Wait for all image loading to complete
        await Promise.all(imageLoadPromises);

        // Debug: Log the bill data to see what we're getting from API
        console.log('EditBillWizard - Loading bill data:', {
          billId: billData.id,
          itemsCount: billData.items?.length || 0,
          firstItem: billData.items?.[0],
          firstItemInternalNotes: billData.items?.[0]?.internalNotes
        });

        // Initialize wizard data with bill data and loaded images
        setWizardData({
          selectedCustomer: customerData,
          billingDate: billData.billingDate,
          deliveryDate: billData.deliveryDate,
          notes: billData.notes || '',
          deliveryStatus: billData.deliveryStatus || 'pending',
          billItems: billData.items || [],
          receivedItems: billData.receivedItems || [],
          payments: billData.payments || [],
          itemImages: itemImages,
          originalBill: billData,
        });

      } catch (error) {
        console.error('Error loading edit wizard data:', error);
        Alert.alert('Error', 'Failed to load bill data. Please try again.');
        navigation.goBack();
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [billId, passedBill]);

  // Set navigation header
  useEffect(() => {
    navigation.setOptions({
      title: `Edit Bill ${wizardData.originalBill?.billNumber || ''}`,
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <MaterialIcon name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity
          onPress={handleSubmit}
          style={styles.headerButton}
          disabled={isSubmitting}
        >
          <Text style={[styles.saveButtonText, isSubmitting && styles.disabledText]}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, wizardData.originalBill, isSubmitting]);

  const updateWizardData = useCallback((updates: Partial<EditBillWizardData>) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  }, []);

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const billData = await getBillById(billId);

      // Load customer data
      let customerData = billData.customer;
      if (billData.customerId && (!customerData || !customerData.personalDetails)) {
        try {
          customerData = await getCustomerById(billData.customerId);
        } catch (error) {
          console.warn('Failed to fetch customer data:', error);
          customerData = billData.customer;
        }
      }

      setWizardData(prev => ({
        ...prev,
        selectedCustomer: customerData,
        billingDate: billData.billingDate,
        deliveryDate: billData.deliveryDate,
        notes: billData.notes || '',
        deliveryStatus: billData.deliveryStatus || 'pending',
        billItems: billData.items || [],
        receivedItems: billData.receivedItems || [],
        payments: billData.payments || [],
        originalBill: billData,
      }));
    } catch (error) {
      console.error('Error refreshing bill data:', error);
      Alert.alert('Error', 'Failed to refresh bill data.');
    } finally {
      setIsRefreshing(false);
    }
  }, [billId]);

  const validateData = useCallback((): boolean => {
    // Customer validation
    if (!wizardData.selectedCustomer) {
      Alert.alert('Required', 'Customer information is required.');
      return false;
    }

    // Basic Info validation
    if (!wizardData.billingDate) {
      Alert.alert('Required', 'Please select a billing date.');
      return false;
    }
    if (!wizardData.deliveryDate) {
      Alert.alert('Required', 'Please select a delivery date.');
      return false;
    }

    // Billing Items validation
    if (wizardData.billItems.length === 0) {
      Alert.alert('Required', 'Please add at least one billing item.');
      return false;
    }

    // Validate each item
    for (let i = 0; i < wizardData.billItems.length; i++) {
      const item = wizardData.billItems[i];
      if (!item.name || item.name.trim() === '') {
        Alert.alert('Invalid Item', `Item ${i + 1} is missing a name.`);
        return false;
      }
      if (item.quantity <= 0) {
        Alert.alert('Invalid Item', `Item ${i + 1} must have a quantity greater than 0.`);
        return false;
      }
      if (item.unitPrice < 0) {
        Alert.alert('Invalid Item', `Item ${i + 1} cannot have a negative price.`);
        return false;
      }
    }

    // Validate received items if any exist
    for (let i = 0; i < wizardData.receivedItems.length; i++) {
      const item = wizardData.receivedItems[i];
      if (!item.name || item.name.trim() === '') {
        Alert.alert('Invalid Item', `Received item ${i + 1} is missing a name.`);
        return false;
      }
      if (item.quantity <= 0) {
        Alert.alert('Invalid Item', `Received item ${i + 1} must have a quantity greater than 0.`);
        return false;
      }
    }

    return true;
  }, [wizardData]);

  // Item editing handlers
  const handleAddItem = useCallback(() => {
    setPopupMode('create');
    setSelectedItemIndex(null);
    setShowItemPopup(true);
  }, []);

  const handleEditItem = useCallback((index: number) => {
    setPopupMode('update');
    setSelectedItemIndex(index);
    setShowItemPopup(true);
  }, []);

  const handleSaveNewItem = useCallback((item: Omit<BillItem, 'id' | 'totalPrice'>) => {
    updateWizardData({
      billItems: [...wizardData.billItems, item as Omit<BillItem, 'totalPrice'>]
    });
    setShowItemPopup(false);
  }, [wizardData.billItems, updateWizardData]);

  const handleUpdateItem = useCallback((item: BillItem) => {
    if (selectedItemIndex !== null) {
      const updatedItems = wizardData.billItems.map((existingItem, i) =>
        i === selectedItemIndex ? (item as Omit<BillItem, 'totalPrice'>) : existingItem
      );
      updateWizardData({ billItems: updatedItems });
      setShowItemPopup(false);
    }
  }, [selectedItemIndex, wizardData.billItems, updateWizardData]);

  const handleRemoveItem = useCallback((index: number) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updatedItems = wizardData.billItems.filter((_, i) => i !== index);
            updateWizardData({ billItems: updatedItems });
          }
        }
      ]
    );
  }, [wizardData.billItems, updateWizardData]);

  const handleSubmit = useCallback(async () => {
    if (!validateData()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const billData = {
        id: billId,
        customerId: wizardData.selectedCustomer!.id,
        billingDate: wizardData.billingDate,
        deliveryDate: wizardData.deliveryDate,
        deliveryStatus: wizardData.deliveryStatus,
        items: wizardData.billItems.map(item => ({
          id: item.id, // Keep existing IDs for updates
          type: item.type || 'custom',
          name: item.name,
          description: item.description || '',
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          configItemId: item.configItemId,
          materialSource: item.materialSource || 'customer',
          deliveryStatus: item.deliveryStatus || 'pending',
          internalNotes: item.internalNotes || '' // Include internal notes
        })),
        receivedItems: wizardData.receivedItems.map(item => ({
          id: item.id, // Keep existing IDs for updates
          name: item.name,
          description: item.description || '',
          quantity: Number(item.quantity),
          receivedDate: item.receivedDate,
          status: item.status || 'received'
        })),
        notes: wizardData.notes || '',
      };

      // Debug: Log the data being sent to API
      console.log('EditBillWizard - Submitting bill data:', {
        billId: billData.id,
        itemsCount: billData.items.length,
        firstItemInternalNotes: billData.items[0]?.internalNotes,
        allItemsInternalNotes: billData.items.map(item => ({ id: item.id, name: item.name, internalNotes: item.internalNotes }))
      });

      await updateBill(billId, billData);

      Alert.alert('Success', 'Bill updated successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('Billing') }
      ]);
    } catch (error) {
      console.error('Error updating bill:', error);
      Alert.alert('Error', 'Failed to update bill. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [wizardData, validateData, navigation, billId]);

  const renderEditForm = () => {
    const commonProps = {
      wizardData,
      updateWizardData,
      navigation,
      billingConfigItems,
      receivedItemTemplates,
      isEditMode: true,
    };

    return (
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshData}
          />
        }
      >
        {/* Bill Summary Header */}
        <View style={styles.billSummaryHeader}>
          <View style={styles.billNumberContainer}>
            <Text style={styles.billNumberLabel}>Bill #</Text>
            <Text style={styles.billNumber}>{wizardData.originalBill?.billNumber || 'Loading...'}</Text>
          </View>
          <View style={styles.billStatusContainer}>
            <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(wizardData.deliveryStatus) }]} />
            <Text style={styles.billStatus}>{getStatusLabel(wizardData.deliveryStatus)}</Text>
          </View>
        </View>

        {/* Customer Information - Compact Design */}
        <View style={styles.compactSection}>
          <View style={styles.compactSectionHeader}>
            <MaterialIcon name="person" size={18} color="#007AFF" />
            <Text style={styles.compactSectionTitle}>Customer</Text>
          </View>
          {wizardData.selectedCustomer ? (
            <TouchableOpacity
              style={styles.customerCompactCard}
              onPress={() => navigation.navigate('CustomerDetail', {
                customerId: wizardData.selectedCustomer.id,
                customer: wizardData.selectedCustomer
              })}
              activeOpacity={0.7}
            >
              <View style={styles.customerCompactInfo}>
                <Text style={styles.customerCompactName}>
                  {wizardData.selectedCustomer.personalDetails?.name || 'Unknown Customer'}
                </Text>
                <Text style={styles.customerCompactPhone}>
                  {wizardData.selectedCustomer.personalDetails?.phone || 'No phone'}
                </Text>
              </View>
              <MaterialIcon name="chevron-right" size={16} color="#999" />
            </TouchableOpacity>
          ) : (
            <Text style={styles.noDataText}>No customer information</Text>
          )}
        </View>

        {/* Bill Details - Two Column Layout */}
        <View style={styles.compactSection}>
          <View style={styles.compactSectionHeader}>
            <MaterialIcon name="calendar-today" size={18} color="#34C759" />
            <Text style={styles.compactSectionTitle}>Bill Details</Text>
          </View>
          <View style={styles.twoColumnRow}>
            <View style={styles.columnItem}>
              <Text style={styles.columnLabel}>Billing Date</Text>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => openDatePicker('billing')}
              >
                <Text style={styles.dateButtonText}>
                  {wizardData.billingDate ? formatDate(wizardData.billingDate) : 'Not set'}
                </Text>
                <MaterialIcon name="calendar-today" size={16} color="#007AFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.columnItem}>
              <Text style={styles.columnLabel}>Delivery Date</Text>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => openDatePicker('delivery')}
              >
                <Text style={styles.dateButtonText}>
                  {wizardData.deliveryDate ? formatDate(wizardData.deliveryDate) : 'Not set'}
                </Text>
                <MaterialIcon name="calendar-today" size={16} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.columnLabel}>Delivery Status</Text>
            <View style={styles.statusSelector}>
              {['pending', 'in_progress', 'ready_for_delivery', 'delivered'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusChip,
                    wizardData.deliveryStatus === status && styles.statusChipActive
                  ]}
                  onPress={() => updateWizardData({ deliveryStatus: status as DeliveryStatus })}
                >
                  <Text style={[
                    styles.statusChipText,
                    wizardData.deliveryStatus === status && styles.statusChipTextActive
                  ]}>
                    {getStatusLabel(status as DeliveryStatus)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Billing Items - Enhanced Design */}
        <View style={styles.compactSection}>
          <View style={styles.compactSectionHeader}>
            <MaterialIcon name="receipt" size={18} color="#FF9500" />
            <Text style={styles.compactSectionTitle}>Items ({wizardData.billItems.length})</Text>
            <TouchableOpacity style={styles.addItemButton} onPress={handleAddItem}>
              <MaterialIcon name="add" size={16} color="#007AFF" />
              <Text style={styles.addItemText}>Add Item</Text>
            </TouchableOpacity>
          </View>

          {wizardData.billItems.length > 0 ? (
            <View style={styles.itemsContainer}>
              {wizardData.billItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.itemCompactCard}
                  onPress={() => handleEditItem(index)}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemCompactInfo}>
                    <Text style={styles.itemCompactName}>{item.name}</Text>
                    <Text style={styles.itemCompactDetails}>
                      {item.quantity} × ₹{item.unitPrice.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.itemCompactActions}>
                    <Text style={styles.itemCompactTotal}>₹{(item.quantity * item.unitPrice).toFixed(2)}</Text>
                    <View style={styles.itemCompactStatus}>
                      <View style={[styles.itemStatusDot, { backgroundColor: getStatusColor(item.deliveryStatus || 'pending') }]} />
                      <TouchableOpacity
                        style={styles.removeItemButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleRemoveItem(index);
                        }}
                      >
                        <MaterialIcon name="close" size={14} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}

              {/* Total Summary */}
              <View style={styles.totalSummary}>
                <Text style={styles.totalSummaryLabel}>Total Amount</Text>
                <Text style={styles.totalSummaryAmount}>
                  ₹{wizardData.billItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toFixed(2)}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyItemsState}>
              <MaterialIcon name="receipt" size={32} color="#C7C7CC" />
              <Text style={styles.emptyStateText}>No items added</Text>
            </View>
          )}
        </View>

        {/* Received Items - Compact */}
        {wizardData.receivedItems.length > 0 && (
          <View style={styles.compactSection}>
            <View style={styles.compactSectionHeader}>
              <MaterialIcon name="inventory" size={18} color="#FF3B30" />
              <Text style={styles.compactSectionTitle}>Received Items ({wizardData.receivedItems.length})</Text>
            </View>
            <View style={styles.receivedItemsList}>
              {wizardData.receivedItems.map((item, index) => (
                <View key={index} style={styles.receivedItemCard}>
                  <Text style={styles.receivedItemName}>{item.name}</Text>
                  <Text style={styles.receivedItemQuantity}>Qty: {item.quantity}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Notes Section */}
        <View style={styles.compactSection}>
          <View style={styles.compactSectionHeader}>
            <MaterialIcon name="edit" size={18} color="#5856D6" />
            <Text style={styles.compactSectionTitle}>Notes</Text>
          </View>
          <TextInput
            style={styles.notesInput}
            value={wizardData.notes}
            onChangeText={(text) => updateWizardData({ notes: text })}
            placeholder="Add notes for this bill..."
            placeholderTextColor={isDarkMode ? '#666' : '#999'}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Preview</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.primaryButtonText}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const getStatusColor = (status: DeliveryStatus) => {
    switch (status) {
      case 'pending': return '#FF9500';
      case 'in_progress': return '#007AFF';
      case 'ready_for_delivery': return '#34C759';
      case 'delivered': return '#30D158';
      default: return '#999';
    }
  };

  const getStatusLabel = (status: DeliveryStatus) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'in_progress': return 'In Progress';
      case 'ready_for_delivery': return 'Ready';
      case 'delivered': return 'Delivered';
      default: return 'Unknown';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const openDatePicker = (mode: 'billing' | 'delivery') => {
    setDatePickerMode(mode);
    setShowDatePicker(true);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || new Date();
    
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (event.type === 'set' && selectedDate) {
      const dateString = selectedDate.toISOString();
      
      if (datePickerMode === 'billing') {
        updateWizardData({ billingDate: dateString });
      } else {
        updateWizardData({ deliveryDate: dateString });
      }
    }
    
    if (Platform.OS === 'ios') {
      setShowDatePicker(false);
    }
  };

  const styles = createStyles(isDarkMode);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner message="Loading bill data..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderEditForm()}

      {/* Billing Item Popup */}
      <BillingItemPopup
        visible={showItemPopup}
        onClose={() => setShowItemPopup(false)}
        mode={popupMode}
        item={selectedItemIndex !== null ? wizardData.billItems[selectedItemIndex] : undefined}
        billingConfigItems={billingConfigItems}
        onSave={handleSaveNewItem}
        onUpdate={handleUpdateItem}
        images={selectedItemIndex !== null ? wizardData.itemImages[selectedItemIndex] || [] : []}
        onImagesChange={(images) => {
          if (selectedItemIndex !== null) {
            const updatedItemImages = { ...wizardData.itemImages };
            if (images.length === 0) {
              delete updatedItemImages[selectedItemIndex];
            } else {
              updatedItemImages[selectedItemIndex] = images;
            }
            updateWizardData({ itemImages: updatedItemImages });
          }
        }}
        isEditMode={true}
        billId={wizardData.originalBill?.id}
        itemId={selectedItemIndex !== null ? (wizardData.billItems[selectedItemIndex] as any).id : undefined}
        defaultDeliveryStatus={wizardData.deliveryStatus}
      />

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={datePickerMode === 'billing' 
            ? (wizardData.billingDate ? new Date(wizardData.billingDate) : new Date())
            : (wizardData.deliveryDate ? new Date(wizardData.deliveryDate) : new Date())
          }
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}
    </SafeAreaView>
  );
};

const createStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? '#000' : '#F2F2F7',
  },
  headerButton: {
    padding: 8,
  },
  saveButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledText: {
    color: '#999',
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },

  // Bill Summary Header
  billSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: isDarkMode ? '#1C1C1E' : '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  billNumberContainer: {
    flex: 1,
  },
  billNumberLabel: {
    fontSize: 14,
    color: isDarkMode ? '#999' : '#666',
    fontWeight: '500',
    marginBottom: 4,
  },
  billNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: isDarkMode ? '#FFF' : '#000',
  },
  billStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  billStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? '#FFF' : '#000',
  },

  // Compact Sections
  compactSection: {
    backgroundColor: isDarkMode ? '#1C1C1E' : '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  compactSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  compactSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? '#FFF' : '#000',
    flex: 1,
  },

  // Customer Section
  customerCompactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
  },
  customerCompactInfo: {
    flex: 1,
  },
  customerCompactName: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? '#FFF' : '#000',
    marginBottom: 2,
  },
  customerCompactPhone: {
    fontSize: 14,
    color: isDarkMode ? '#999' : '#666',
  },
  noDataText: {
    fontSize: 14,
    color: isDarkMode ? '#666' : '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },

  // Bill Details Section
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  columnItem: {
    flex: 1,
  },
  columnLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: isDarkMode ? '#999' : '#666',
    marginBottom: 6,
  },
  dateButton: {
    backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateButtonText: {
    fontSize: 14,
    color: isDarkMode ? '#FFF' : '#000',
    fontWeight: '500',
  },
  statusRow: {
    marginTop: 8,
  },
  statusSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  statusChip: {
    backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F9FA',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
  },
  statusChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: isDarkMode ? '#FFF' : '#000',
  },
  statusChipTextActive: {
    color: '#FFF',
  },

  // Items Section
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  addItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  itemsContainer: {
    gap: 8,
  },
  itemCompactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
  },
  itemCompactInfo: {
    flex: 1,
  },
  itemCompactName: {
    fontSize: 15,
    fontWeight: '600',
    color: isDarkMode ? '#FFF' : '#000',
    marginBottom: 2,
  },
  itemCompactDetails: {
    fontSize: 13,
    color: isDarkMode ? '#999' : '#666',
  },
  itemCompactActions: {
    alignItems: 'flex-end',
    gap: 4,
  },
  itemCompactTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  itemCompactStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  removeItemButton: {
    padding: 4,
    marginLeft: 4,
  },
  totalSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: isDarkMode ? '#007AFF20' : '#007AFF10',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#007AFF40',
  },
  totalSummaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? '#FFF' : '#000',
  },
  totalSummaryAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
  },
  emptyItemsState: {
    alignItems: 'center',
    padding: 24,
  },
  emptyStateText: {
    fontSize: 14,
    color: isDarkMode ? '#666' : '#999',
    marginTop: 8,
  },

  // Received Items
  receivedItemsList: {
    gap: 8,
  },
  receivedItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
  },
  receivedItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: isDarkMode ? '#FFF' : '#000',
    flex: 1,
  },
  receivedItemQuantity: {
    fontSize: 13,
    color: isDarkMode ? '#999' : '#666',
  },

  // Notes Section
  notesInput: {
    backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: isDarkMode ? '#FFF' : '#000',
    minHeight: 80,
    borderWidth: 1,
    borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
    textAlignVertical: 'top',
  },

  // Action Buttons
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 32,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? '#FFF' : '#000',
  },
  primaryButton: {
    flex: 2,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: '#999',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default EditBillWizardScreen;