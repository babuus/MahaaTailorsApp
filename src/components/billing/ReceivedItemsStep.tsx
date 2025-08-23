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
import { ModernCard, CustomDatePicker } from '../index';
import MaterialIcon from '../MaterialIcon';
import { ReceivedItemTemplate, ReceivedItem } from '../../types';
import { BillWizardData } from '../../screens/CreateBillWizardScreen';

interface ReceivedItemsStepProps {
  wizardData: BillWizardData;
  updateWizardData: (updates: Partial<BillWizardData>) => void;
  receivedItemTemplates: ReceivedItemTemplate[];
  isEditMode?: boolean;
}

const ReceivedItemsStep: React.FC<ReceivedItemsStepProps> = ({
  wizardData,
  updateWizardData,
  receivedItemTemplates,
}) => {
  const { isDarkMode } = useThemeContext();

  const [showDatePicker, setShowDatePicker] = useState<number | null>(null);
  const [showAddOptions, setShowAddOptions] = useState(false);

  const handleAddTemplateItem = (template: ReceivedItemTemplate) => {
    const newItem: Omit<ReceivedItem, 'id'> = {
      name: template.name,
      description: template.description,
      quantity: 1,
      receivedDate: new Date().toISOString().split('T')[0],
      status: 'received',
    };
    
    updateWizardData({
      receivedItems: [...wizardData.receivedItems, newItem]
    });
  };

  const handleAddCustomItem = () => {
    const newItem: Omit<ReceivedItem, 'id'> = {
      name: '',
      description: '',
      quantity: 1,
      receivedDate: new Date().toISOString().split('T')[0],
      status: 'received',
    };
    
    updateWizardData({
      receivedItems: [...wizardData.receivedItems, newItem]
    });
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const updatedItems = wizardData.receivedItems.map((item, i) => {
      if (i === index) {
        const updatedItem = { ...item, [field]: value };
        
        // Ensure quantity is properly converted
        if (field === 'quantity') {
          updatedItem.quantity = Math.max(1, parseInt(value) || 1);
        }
        
        return updatedItem;
      }
      return item;
    });
    
    updateWizardData({ receivedItems: updatedItems });
  };

  const handleRemoveItem = (index: number) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this received item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updatedItems = wizardData.receivedItems.filter((_, i) => i !== index);
            updateWizardData({ receivedItems: updatedItems });
          }
        }
      ]
    );
  };

  const styles = createStyles(isDarkMode);

  return (
    <View style={styles.container}>
      <ModernCard style={styles.card}>
        <View style={styles.compactHeader}>
          <Text style={styles.title}>Received Items</Text>
          <TouchableOpacity
            style={styles.singleAddButton}
            onPress={() => setShowAddOptions(true)}
          >
            <MaterialIcon name="add" size={18} color="#FFF" />
            <Text style={styles.singleAddText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Items List */}
        <ScrollView style={styles.itemsList} showsVerticalScrollIndicator={false}>
          {wizardData.receivedItems.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              {/* Item Header with Name and Remove Button */}
              <View style={styles.itemHeader}>
                <View style={styles.itemTitleSection}>
                  <TextInput
                    style={styles.itemNameInput}
                    value={item.name}
                    onChangeText={(text) => handleUpdateItem(index, 'name', text)}
                    placeholder="Item name"
                    placeholderTextColor={isDarkMode ? '#666' : '#999'}
                  />
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveItem(index)}
                >
                  <MaterialIcon name="close" size={18} color="#FF3B30" />
                </TouchableOpacity>
              </View>

              {/* Description */}
              <TextInput
                style={styles.itemDescriptionInput}
                value={item.description || ''}
                onChangeText={(text) => handleUpdateItem(index, 'description', text)}
                placeholder="Description (optional)"
                placeholderTextColor={isDarkMode ? '#666' : '#999'}
                multiline
                numberOfLines={2}
              />

              {/* Compact Details Row */}
              <View style={styles.compactDetailsRow}>
                <View style={styles.quantityDateSection}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.compactLabel}>Quantity</Text>
                    <TextInput
                      style={styles.compactInput}
                      value={item.quantity.toString()}
                      onChangeText={(text) => handleUpdateItem(index, 'quantity', text)}
                      keyboardType="numeric"
                      placeholderTextColor={isDarkMode ? '#666' : '#999'}
                    />
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.compactLabel}>Received Date</Text>
                    <TouchableOpacity
                      style={styles.compactDateInput}
                      onPress={() => setShowDatePicker(index)}
                    >
                      <Text style={styles.compactDateText}>
                        {new Date(item.receivedDate).toLocaleDateString()}
                      </Text>
                      <MaterialIcon name="calendar-today" size={14} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Status Tag */}
              <View style={styles.statusTagRow}>
                <TouchableOpacity
                  style={[
                    styles.statusTag,
                    { backgroundColor: item.status === 'received' ? '#34C75920' : '#FF950020' }
                  ]}
                  onPress={() => handleUpdateItem(index, 'status', 
                    item.status === 'received' ? 'returned' : 'received')}
                >
                  <MaterialIcon 
                    name={item.status === 'received' ? 'check-circle' : 'undo'} 
                    size={14} 
                    color={item.status === 'received' ? '#34C759' : '#FF9500'} 
                  />
                  <Text style={[
                    styles.statusTagText,
                    { color: item.status === 'received' ? '#34C759' : '#FF9500' }
                  ]}>
                    {item.status === 'received' ? 'Received' : 'Returned'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>

        {wizardData.receivedItems.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcon name="inventory" size={48} color="#C7C7CC" />
            <Text style={styles.emptyStateText}>No received items yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Add items received from the customer to track materials and samples
            </Text>
          </View>
        )}
      </ModernCard>

      {/* Unified Item Selector Modal */}
      {showAddOptions && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Item</Text>
              <TouchableOpacity
                onPress={() => setShowAddOptions(false)}
                style={styles.modalCloseButton}
              >
                <MaterialIcon name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              {/* Custom Item Option - appears first like a template */}
              <TouchableOpacity
                style={[styles.templateCard, styles.customItemCard]}
                onPress={() => {
                  setShowAddOptions(false);
                  handleAddCustomItem();
                }}
              >
                <View style={styles.templateInfo}>
                  <Text style={styles.templateName}>Custom Item</Text>
                  <Text style={styles.templateDescription}>Create a new item with custom details</Text>
                </View>
                <MaterialIcon name="add" size={24} color="#34C759" />
              </TouchableOpacity>

              {/* Template Items */}
              {receivedItemTemplates.map((template) => (
                <TouchableOpacity
                  key={template.id}
                  style={styles.templateCard}
                  onPress={() => {
                    setShowAddOptions(false);
                    handleAddTemplateItem(template);
                  }}
                >
                  <View style={styles.templateInfo}>
                    <Text style={styles.templateName}>{template.name}</Text>
                    {template.description && (
                      <Text style={styles.templateDescription}>{template.description}</Text>
                    )}
                    <Text style={styles.templateCategory}>
                      Category: {template.category}
                    </Text>
                  </View>
                  <MaterialIcon name="add" size={24} color="#007AFF" />
                </TouchableOpacity>
              ))}
              
              {receivedItemTemplates.length === 0 && (
                <View style={styles.noTemplatesState}>
                  <Text style={styles.noTemplatesText}>No templates available</Text>
                  <Text style={styles.noTemplatesSubtext}>
                    You can create templates in the billing configuration
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Date Picker */}
      {showDatePicker !== null && (
        <CustomDatePicker
          visible={true}
          value={new Date(wizardData.receivedItems[showDatePicker].receivedDate)}
          onDateChange={(date) => {
            handleUpdateItem(showDatePicker, 'receivedDate', date.toISOString().split('T')[0]);
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
    maxHeight: 400,
  },
  itemCard: {
    backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemTitleSection: {
    flex: 1,
  },
  itemNameInput: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? '#FFF' : '#000',
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
  },
  removeButton: {
    padding: 6,
    marginLeft: 8,
  },
  itemDescriptionInput: {
    fontSize: 14,
    color: isDarkMode ? '#FFF' : '#000',
    backgroundColor: isDarkMode ? '#1C1C1E' : '#FFF',
    borderWidth: 1,
    borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  compactDetailsRow: {
    marginBottom: 12,
  },
  quantityDateSection: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
  },
  compactLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: isDarkMode ? '#999' : '#666',
    marginBottom: 4,
  },
  compactInput: {
    fontSize: 16,
    color: isDarkMode ? '#FFF' : '#000',
    backgroundColor: isDarkMode ? '#1C1C1E' : '#FFF',
    borderWidth: 1,
    borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    textAlign: 'center',
  },
  compactDateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: isDarkMode ? '#1C1C1E' : '#FFF',
    borderWidth: 1,
    borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
    borderRadius: 8,
    padding: 12,
  },
  compactDateText: {
    fontSize: 14,
    color: isDarkMode ? '#FFF' : '#000',
  },
  statusTagRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusTagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  itemDetailsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  quantityContainer: {
    flex: 1,
  },
  dateContainer: {
    flex: 2,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: isDarkMode ? '#FFF' : '#000',
    marginBottom: 8,
  },
  quantityInput: {
    fontSize: 16,
    color: isDarkMode ? '#FFF' : '#000',
    backgroundColor: isDarkMode ? '#1C1C1E' : '#FFF',
    borderWidth: 1,
    borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    textAlign: 'center',
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
  statusContainer: {
    marginBottom: 8,
  },
  statusOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  statusOption: {
    flex: 1,
    backgroundColor: isDarkMode ? '#1C1C1E' : '#FFF',
    borderWidth: 1,
    borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  statusOptionSelected: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  statusOptionText: {
    fontSize: 14,
    color: isDarkMode ? '#FFF' : '#000',
  },
  statusOptionTextSelected: {
    color: '#FFF',
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
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    maxHeight: 400,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  templateCategory: {
    fontSize: 12,
    color: '#999',
    textTransform: 'capitalize',
  },
  customItemCard: {
    backgroundColor: '#F0F9FF',
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  customItemCategory: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34C759',
    fontStyle: 'italic',
  },
  noTemplatesState: {
    alignItems: 'center',
    padding: 40,
  },
  noTemplatesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  noTemplatesSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  // Add Options Modal styles
  addOptionsModal: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    margin: 20,
    width: '90%',
    maxWidth: 400,
  },
  addOptionsContent: {
    padding: 20,
    gap: 16,
  },
  addOptionCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  addOptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginTop: 12,
    marginBottom: 8,
  },
  addOptionSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ReceivedItemsStep;