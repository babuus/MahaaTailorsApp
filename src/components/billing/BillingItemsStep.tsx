import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useThemeContext } from '../../contexts/ThemeContext';
import { ModernCard } from '../index';
import MaterialIcon from '../MaterialIcon';
import BillingItemPopup from './BillingItemPopup';
import { BillingConfigItem, BillItem, DeliveryStatus } from '../../types';
import { BillWizardData } from '../../screens/CreateBillWizardScreen';
import { EditBillWizardData } from '../../screens/EditBillWizardScreen';

interface BillingItemsStepProps {
  wizardData: BillWizardData | EditBillWizardData;
  updateWizardData: (updates: Partial<BillWizardData | EditBillWizardData>) => void;
  billingConfigItems: BillingConfigItem[];
  isEditMode?: boolean;
}

const BillingItemsStep: React.FC<BillingItemsStepProps> = ({
  wizardData,
  updateWizardData,
  billingConfigItems,
  isEditMode = false,
}) => {
  const { isDarkMode } = useThemeContext();
  const [showItemPopup, setShowItemPopup] = useState(false);
  const [popupMode, setPopupMode] = useState<'create' | 'update' | 'view'>('create');
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);

  const deliveryStatusOptions: { key: DeliveryStatus; label: string; color: string }[] = [
    { key: 'pending', label: 'Pending', color: '#FF9500' },
    { key: 'in_progress', label: 'In Progress', color: '#007AFF' },
    { key: 'ready_for_delivery', label: 'Ready', color: '#34C759' },
    { key: 'delivered', label: 'Delivered', color: '#30D158' },
  ];



  const handleAddItem = () => {
    setPopupMode('create');
    setSelectedItemIndex(null);
    setShowItemPopup(true);
  };

  const handleEditItem = (index: number) => {
    setPopupMode('update');
    setSelectedItemIndex(index);
    setShowItemPopup(true);
  };

  const handleViewItem = (index: number) => {
    setPopupMode('view');
    setSelectedItemIndex(index);
    setShowItemPopup(true);
  };

  const handleSaveNewItem = (item: Omit<BillItem, 'id' | 'totalPrice'>) => {
    updateWizardData({
      billItems: [...wizardData.billItems, item]
    });
  };

  const handleUpdateItem = (item: BillItem) => {
    if (selectedItemIndex !== null) {
      const updatedItems = wizardData.billItems.map((existingItem, i) => 
        i === selectedItemIndex ? item : existingItem
      );
      updateWizardData({ billItems: updatedItems });
    }
  };

  const handleRemoveItem = (index: number) => {
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
  };

  const calculateTotal = () => {
    return wizardData.billItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const styles = createStyles(isDarkMode);

  return (
    <View style={styles.container}>
      <ModernCard style={styles.card}>
        <View style={styles.compactHeader}>
          <Text style={styles.title}>Billing Items</Text>
          <TouchableOpacity
            style={styles.singleAddButton}
            onPress={handleAddItem}
          >
            <MaterialIcon name="add" size={18} color="#FFF" />
            <Text style={styles.singleAddText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Items List */}
        <ScrollView style={styles.itemsList} showsVerticalScrollIndicator={false}>
          {wizardData.billItems.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.itemCard}
              onPress={() => handleEditItem(index)}
              activeOpacity={0.7}
            >
              <View style={styles.itemContent}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name || 'Unnamed Item'}</Text>
                  <Text style={styles.itemDescription} numberOfLines={2}>
                    {item.description || 'No description'}
                  </Text>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemQuantity}>{item.quantity} × ₹{item.unitPrice.toFixed(2)}</Text>
                    <View style={styles.itemStatusTags}>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: item.materialSource === 'customer' ? '#007AFF20' : '#34C75920' }
                      ]}>
                        <Text style={[
                          styles.statusBadgeText,
                          { color: item.materialSource === 'customer' ? '#007AFF' : '#34C759' }
                        ]}>
                          {item.materialSource === 'customer' ? 'Customer' : 'Business'}
                        </Text>
                      </View>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: deliveryStatusOptions.find(opt => opt.key === item.deliveryStatus)?.color + '20' }
                      ]}>
                        <Text style={[
                          styles.statusBadgeText,
                          { color: deliveryStatusOptions.find(opt => opt.key === item.deliveryStatus)?.color }
                        ]}>
                          {deliveryStatusOptions.find(opt => opt.key === item.deliveryStatus)?.label}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View style={styles.itemActions}>
                  <Text style={styles.itemTotal}>₹{(item.quantity * item.unitPrice).toFixed(2)}</Text>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleRemoveItem(index);
                    }}
                  >
                    <MaterialIcon name="close" size={18} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {/* Total Amount - Now inside ScrollView */}
          {wizardData.billItems.length > 0 && (
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.totalAmount}>₹{calculateTotal().toFixed(2)}</Text>
            </View>
          )}
        </ScrollView>

        {wizardData.billItems.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcon name="receipt" size={48} color="#C7C7CC" />
            <Text style={styles.emptyStateText}>No items added yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Add configured items or create custom ones to get started
            </Text>
          </View>
        )}
      </ModernCard>

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
        isEditMode={isEditMode}
        billId={isEditMode ? (wizardData as EditBillWizardData).originalBill?.id : undefined}
        itemId={selectedItemIndex !== null && isEditMode ? (wizardData.billItems[selectedItemIndex] as any).id : undefined}
        defaultDeliveryStatus={wizardData.deliveryStatus}
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
    flex: 1,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: isDarkMode ? '#FFF' : '#000',
  },
  addButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  compactAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F9FA',
    borderWidth: 1,
    borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  compactAddText: {
    fontSize: 14,
    fontWeight: '500',
    color: isDarkMode ? '#FFF' : '#000',
  },
  singleAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  singleAddText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },

  itemsList: {
    flex: 1,
  },
  itemCard: {
    backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? '#FFF' : '#000',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: isDarkMode ? '#999' : '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  itemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemQuantity: {
    fontSize: 14,
    color: isDarkMode ? '#999' : '#666',
    fontWeight: '500',
  },
  itemStatusTags: {
    flexDirection: 'row',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  itemActions: {
    alignItems: 'flex-end',
    gap: 8,
  },

  itemTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  removeButton: {
    padding: 6,
    marginLeft: 8,
  },

  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F9FA',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: isDarkMode ? '#FFF' : '#000',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
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

export default BillingItemsStep;