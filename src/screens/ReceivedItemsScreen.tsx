import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcon from '../components/MaterialIcon';
import { LoadingSpinner, ReceivedItemsComponent } from '../components';
import { ReceivedItem, Bill } from '../types';
import { getBillById, updateBill } from '../services/api';
import OfflineApiService from '../services/offlineApiService';

interface ReceivedItemsScreenProps {
  navigation: any;
  route: {
    params: {
      billId: string;
      mode?: 'view' | 'edit';
    };
  };
}

export const ReceivedItemsScreen: React.FC<ReceivedItemsScreenProps> = ({
  navigation,
  route,
}) => {
  const { billId, mode = 'edit' } = route.params;
  const [bill, setBill] = useState<Bill | null>(null);
  const [receivedItems, setReceivedItems] = useState<ReceivedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const loadBill = useCallback(async () => {
    setIsLoading(true);
    try {
      const billData = await getBillById(billId);
      
      // Ensure customer information is loaded for the items screen
      if (billData.customerId && (!billData.customer || !billData.customer.personalDetails)) {
        try {
          const customer = await OfflineApiService.getCustomerById(billData.customerId);
          billData.customer = customer;
        } catch (customerError) {
          console.warn(`Failed to load customer ${billData.customerId} for items screen:`, customerError);
          // Try to get customer info from cache
          try {
            const cachedCustomer = await OfflineApiService.getCustomerById(billData.customerId, { useCache: true });
            billData.customer = cachedCustomer;
          } catch (cacheError) {
            console.warn(`No cached customer data for ${billData.customerId}:`, cacheError);
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
      }
      
      setBill(billData);
      setReceivedItems(billData.receivedItems || []);
    } catch (error) {
      console.error('Error loading bill:', error);
      Alert.alert(
        'Error',
        'Failed to load bill details. Please try again.',
        [
          { text: 'Retry', onPress: loadBill },
          { text: 'Go Back', onPress: () => navigation.goBack() },
        ]
      );
    } finally {
      setIsLoading(false);
    }
  }, [billId, navigation]);

  const handleBackPress = useCallback(() => {
    if (hasChanges && mode === 'edit') {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Do you want to save them before leaving?',
        [
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.goBack(),
          },
          {
            text: 'Save',
            onPress: async () => {
              await handleSave();
              navigation.goBack();
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else {
      navigation.goBack();
    }
  }, [hasChanges, mode, navigation]);

  const handleSave = useCallback(async () => {
    if (!bill || !hasChanges) return;

    setIsSaving(true);
    try {
      const updatedBill = {
        ...bill,
        receivedItems,
      };
      
      await updateBill(bill.id, updatedBill);
      setBill(updatedBill);
      setHasChanges(false);
      
      Alert.alert('Success', 'Received items updated successfully!');
    } catch (error) {
      console.error('Error saving received items:', error);
      Alert.alert(
        'Error',
        'Failed to save received items. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  }, [bill, hasChanges, receivedItems]);

  useEffect(() => {
    navigation.setOptions({
      title: mode === 'view' ? 'Received Items' : 'Manage Received Items',
      headerLeft: () => (
        <TouchableOpacity
          onPress={handleBackPress}
          style={styles.headerButton}
        >
          <MaterialIcon name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
      ),
      headerRight: () => {
        if (mode === 'edit' && hasChanges) {
          return (
            <TouchableOpacity
              onPress={handleSave}
              style={styles.headerButton}
              disabled={isSaving}
            >
              {isSaving ? (
                <LoadingSpinner size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          );
        }
        return null;
      },
    });
  }, [navigation, mode, hasChanges, isSaving, handleBackPress, handleSave]);

  useEffect(() => {
    loadBill();
  }, [loadBill]);

  const handleItemsChange = (newItems: ReceivedItem[]) => {
    setReceivedItems(newItems);
    setHasChanges(true);
  };

  const renderBillInfo = () => {
    if (!bill) return null;

    return (
      <View style={styles.billInfo}>
        <View style={styles.billHeader}>
          <Text style={styles.billTitle}>Bill #{bill.billNumber}</Text>
          <View style={styles.billMeta}>
            <Text style={styles.customerName}>{bill.customer?.personalDetails?.name || 'Unknown Customer'}</Text>
            <Text style={styles.billDate}>
              Billing Date: {new Date(bill.billingDate).toLocaleDateString()}
            </Text>
            <Text style={styles.deliveryDate}>
              Delivery Date: {new Date(bill.deliveryDate).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderStats = () => {
    const totalItems = receivedItems.length;
    const receivedCount = receivedItems.filter(item => item.status === 'received').length;
    const returnedCount = receivedItems.filter(item => item.status === 'returned').length;

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{totalItems}</Text>
          <Text style={styles.statLabel}>Total Items</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, styles.receivedStat]}>{receivedCount}</Text>
          <Text style={styles.statLabel}>Received</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, styles.returnedStat]}>{returnedCount}</Text>
          <Text style={styles.statLabel}>Returned</Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner message="Loading received items..." />
      </SafeAreaView>
    );
  }

  if (!bill) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcon name="error" size={48} color="#FF3B30" />
          <Text style={styles.errorText}>Failed to load bill details</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadBill}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {renderBillInfo()}
        {renderStats()}
        
        <View style={styles.itemsContainer}>
          <ReceivedItemsComponent
            billId={billId}
            receivedItems={receivedItems}
            onItemsChange={handleItemsChange}
            editable={mode === 'edit'}
            testID="received-items-screen-component"
          />
        </View>
      </ScrollView>
      
      {hasChanges && mode === 'edit' && (
        <View style={styles.savePrompt}>
          <View style={styles.savePromptContent}>
            <MaterialIcon name="info" size={16} color="#FF9500" />
            <Text style={styles.savePromptText}>You have unsaved changes</Text>
            <TouchableOpacity
              onPress={handleSave}
              style={styles.quickSaveButton}
              disabled={isSaving}
            >
              <Text style={styles.quickSaveButtonText}>
                {isSaving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  headerButton: {
    padding: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  content: {
    flex: 1,
  },
  billInfo: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  billHeader: {
    gap: 8,
  },
  billTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  billMeta: {
    gap: 4,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  billDate: {
    fontSize: 14,
    color: '#666',
  },
  deliveryDate: {
    fontSize: 14,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  receivedStat: {
    color: '#34C759',
  },
  returnedStat: {
    color: '#FF9500',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  itemsContainer: {
    padding: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  savePrompt: {
    backgroundColor: '#FFF3E0',
    borderTopWidth: 1,
    borderTopColor: '#FFE0B2',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  savePromptContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  savePromptText: {
    flex: 1,
    fontSize: 14,
    color: '#E65100',
    fontWeight: '500',
  },
  quickSaveButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  quickSaveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});