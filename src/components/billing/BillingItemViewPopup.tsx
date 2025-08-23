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
import MaterialIcon from '../MaterialIcon';
import AnimatedModal from '../AnimatedModal';
import BillItemImageGallery from '../BillItemImageGallery';
import { BillItem, DeliveryStatus } from '../../types';

interface BillingItemViewPopupProps {
  visible: boolean;
  onClose: () => void;
  item: BillItem;
  billId?: string;
  onItemUpdate?: (updatedItem: BillItem, previousItem?: BillItem) => Promise<{ success: boolean; error?: string }>;
  editable?: boolean;
}

const BillingItemViewPopup: React.FC<BillingItemViewPopupProps> = ({
  visible,
  onClose,
  item,
  billId,
  onItemUpdate,
  editable = true,
}) => {
  const { isDarkMode } = useThemeContext();
  const [currentDeliveryStatus, setCurrentDeliveryStatus] = useState<DeliveryStatus>(item.deliveryStatus || 'pending');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [updateMessage, setUpdateMessage] = useState<string>('');

  const deliveryStatusOptions: { key: DeliveryStatus; label: string; color: string }[] = [
    { key: 'pending', label: 'Pending', color: '#FF9500' },
    { key: 'in_progress', label: 'In Progress', color: '#007AFF' },
    { key: 'ready_for_delivery', label: 'Ready', color: '#34C759' },
    { key: 'delivered', label: 'Delivered', color: '#30D158' },
  ];

  const getDeliveryStatusInfo = (status: DeliveryStatus) => {
    return deliveryStatusOptions.find(opt => opt.key === status) || deliveryStatusOptions[0];
  };

  const handleDeliveryStatusChange = async (newStatus: DeliveryStatus) => {
    if (!editable || !onItemUpdate || isUpdating) return;

    const previousStatus = currentDeliveryStatus;
    const previousItem = { ...item, deliveryStatus: previousStatus };

    // Show confirmation dialog
    Alert.alert(
      'Update Delivery Status',
      `Change status to "${getDeliveryStatusInfo(newStatus).label}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            // Optimistically update the UI
            setCurrentDeliveryStatus(newStatus);
            setIsUpdating(true);
            setUpdateStatus('idle');
            setUpdateMessage('');

            const updatedItem: BillItem = {
              ...item,
              deliveryStatus: newStatus,
              statusChangeDate: new Date().toISOString(),
            };

            try {
              const result = await onItemUpdate(updatedItem, previousItem);
              
              if (result.success) {
                setUpdateStatus('success');
                setUpdateMessage('Status updated successfully!');
                
                // Clear success message after 3 seconds
                setTimeout(() => {
                  setUpdateStatus('idle');
                  setUpdateMessage('');
                }, 3000);
              } else {
                // Revert to previous status on failure
                setCurrentDeliveryStatus(previousStatus);
                setUpdateStatus('error');
                setUpdateMessage(result.error || 'Failed to update status');
                
                // Clear error message after 5 seconds
                setTimeout(() => {
                  setUpdateStatus('idle');
                  setUpdateMessage('');
                }, 5000);
              }
            } catch (error) {
              // Revert to previous status on error
              setCurrentDeliveryStatus(previousStatus);
              setUpdateStatus('error');
              setUpdateMessage('Failed to update status. Please try again.');
              
              // Clear error message after 5 seconds
              setTimeout(() => {
                setUpdateStatus('idle');
                setUpdateMessage('');
              }, 5000);
            } finally {
              setIsUpdating(false);
            }
          }
        }
      ]
    );
  };

  const styles = createStyles(isDarkMode);

  return (
    <AnimatedModal
      visible={visible}
      onClose={onClose}
      animationType="slideFromBottom"
      contentStyle={styles.modalContent}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Item Details</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <MaterialIcon name="close" size={24} color={isDarkMode ? '#FFF' : '#000'} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Item Name */}
        <View style={styles.itemNameSection}>
          <Text style={styles.itemName}>{item.name}</Text>
          <View style={styles.itemTypeContainer}>
            <MaterialIcon 
              name={item.type === 'configured' ? 'settings' : 'edit'} 
              size={14} 
              color={item.type === 'configured' ? '#007AFF' : '#34C759'} 
            />
            <Text style={[
              styles.itemTypeText,
              { color: item.type === 'configured' ? '#007AFF' : '#34C759' }
            ]}>
              {item.type === 'configured' ? 'Template Item' : 'Custom Item'}
            </Text>
          </View>
        </View>

        {/* Description */}
        {item.description && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Description</Text>
            <Text style={styles.descriptionText}>{item.description}</Text>
          </View>
        )}

        {/* Notes */}
        {(item as any).notes && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <View style={styles.notesContainer}>
              <Text style={styles.notesText}>{(item as any).notes}</Text>
            </View>
          </View>
        )}

        {/* Internal Notes */}
        {item.internalNotes && item.internalNotes.trim() !== '' && (
          <View style={styles.section}>
            <View style={styles.internalNotesHeader}>
              <MaterialIcon name="lock" size={16} color="#FF9500" />
              <Text style={styles.internalNotesLabel}>Staff Notes</Text>
              <Text style={styles.internalNotesPrivateLabel}>PRIVATE</Text>
            </View>
            <View style={styles.internalNotesContainer}>
              <Text style={styles.internalNotesText}>{item.internalNotes}</Text>
            </View>
          </View>
        )}

        {/* Status Information */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Status Information</Text>
          <View style={styles.statusContainer}>
            {/* Material Source */}
            <View style={styles.statusItem}>
              <Text style={styles.statusItemLabel}>Material Source</Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: item.materialSource === 'customer' ? '#007AFF20' : '#34C75920' }
              ]}>
                <MaterialIcon 
                  name={item.materialSource === 'customer' ? 'person' : 'business-center'} 
                  size={16} 
                  color={item.materialSource === 'customer' ? '#007AFF' : '#34C759'} 
                />
                <Text style={[
                  styles.statusBadgeText,
                  { color: item.materialSource === 'customer' ? '#007AFF' : '#34C759' }
                ]}>
                  {item.materialSource === 'customer' ? 'Customer Provided' : 'Business Provided'}
                </Text>
              </View>
            </View>

            {/* Delivery Status */}
            <View style={styles.statusItem}>
              <View style={styles.statusHeader}>
                <Text style={styles.statusItemLabel}>Delivery Status</Text>
                {editable && onItemUpdate && (
                  <View style={styles.editableBadge}>
                    <MaterialIcon name="edit" size={12} color="#007AFF" />
                    <Text style={styles.editableHint}>Editable</Text>
                  </View>
                )}
              </View>
              
              {editable && onItemUpdate ? (
                <View style={styles.statusSelectorCard}>
                  <Text style={styles.statusSelectorTitle}>Select Status:</Text>
                  
                  {/* Status Update Feedback */}
                  {updateStatus !== 'idle' && (
                    <View style={[
                      styles.statusFeedback,
                      { 
                        backgroundColor: updateStatus === 'success' ? '#34C75915' : '#FF3B3015',
                        borderColor: updateStatus === 'success' ? '#34C759' : '#FF3B30'
                      }
                    ]}>
                      <View style={styles.statusFeedbackContent}>
                        <MaterialIcon 
                          name={updateStatus === 'success' ? 'check-circle' : 'error'} 
                          size={20} 
                          color={updateStatus === 'success' ? '#34C759' : '#FF3B30'} 
                        />
                        <Text style={[
                          styles.statusFeedbackText,
                          { color: updateStatus === 'success' ? '#34C759' : '#FF3B30' }
                        ]}>
                          {updateMessage}
                        </Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.statusGrid}>
                    {deliveryStatusOptions.map((statusOption) => {
                      const isSelected = currentDeliveryStatus === statusOption.key;
                      return (
                        <TouchableOpacity
                          key={statusOption.key}
                          style={[
                            styles.statusGridItem,
                            { 
                              backgroundColor: isSelected ? statusOption.color : statusOption.color + '15',
                              borderColor: statusOption.color,
                              borderWidth: isSelected ? 2 : 1,
                              opacity: isUpdating ? 0.6 : 1,
                            }
                          ]}
                          onPress={() => handleDeliveryStatusChange(statusOption.key)}
                          activeOpacity={0.8}
                          disabled={isUpdating}
                        >
                          <View style={styles.statusGridContent}>
                            {isUpdating && currentDeliveryStatus === statusOption.key ? (
                              <View style={styles.loadingIndicator}>
                                <MaterialIcon 
                                  name="refresh" 
                                  size={20} 
                                  color={isSelected ? '#FFF' : statusOption.color} 
                                />
                              </View>
                            ) : (
                              <MaterialIcon 
                                name="receipt" 
                                size={20} 
                                color={isSelected ? '#FFF' : statusOption.color} 
                              />
                            )}
                            <Text style={[
                              styles.statusGridText,
                              { 
                                color: isSelected ? '#FFF' : statusOption.color,
                                fontWeight: isSelected ? '600' : '500'
                              }
                            ]}>
                              {statusOption.label}
                            </Text>
                            {isSelected && !isUpdating && (
                              <View style={styles.selectedIndicator}>
                                <MaterialIcon name="check-circle" size={16} color="#FFF" />
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ) : (
                <View style={[
                  styles.statusDisplayCard,
                  { backgroundColor: getDeliveryStatusInfo(currentDeliveryStatus).color + '15' }
                ]}>
                  <View style={styles.statusDisplayContent}>
                    <View style={[
                      styles.statusIconContainer,
                      { backgroundColor: getDeliveryStatusInfo(currentDeliveryStatus).color }
                    ]}>
                      <MaterialIcon 
                        name="receipt" 
                        size={24} 
                        color="#FFF" 
                      />
                    </View>
                    <View style={styles.statusDisplayInfo}>
                      <Text style={[
                        styles.statusDisplayLabel,
                        { color: getDeliveryStatusInfo(currentDeliveryStatus).color }
                      ]}>
                        {getDeliveryStatusInfo(currentDeliveryStatus).label}
                      </Text>
                      <Text style={styles.statusDisplaySubtext}>Current Status</Text>
                    </View>
                  </View>
                </View>
              )}
              
              {(item as any).statusChangeDate && (
                <View style={styles.statusDateContainer}>
                  <MaterialIcon name="time" size={14} color="#666" />
                  <Text style={styles.statusChangeDate}>
                    Last updated: {new Date((item as any).statusChangeDate).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Images */}
        {item.id && billId && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Images</Text>
            <BillItemImageGallery
              billId={billId}
              itemId={item.id}
              itemName={item.name || 'Item'}
            />
          </View>
        )}

        {/* Pricing Information - Moved to Bottom */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Pricing</Text>
          <View style={styles.pricingCard}>
            <View style={styles.pricingRow}>
              <View style={styles.pricingDetail}>
                <Text style={styles.pricingDetailLabel}>Quantity</Text>
                <Text style={styles.pricingDetailValue}>{item.quantity}</Text>
              </View>
              <Text style={styles.pricingMultiplier}>×</Text>
              <View style={styles.pricingDetail}>
                <Text style={styles.pricingDetailLabel}>Unit Price</Text>
                <Text style={styles.pricingDetailValue}>₹{item.unitPrice.toFixed(2)}</Text>
              </View>
            </View>
            <View style={styles.pricingDivider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>₹{(item.quantity * item.unitPrice).toFixed(2)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </AnimatedModal>
  );
};

const createStyles = (isDarkMode: boolean) => StyleSheet.create({
  modalContent: {
    width: '95%',
    height: '90%',
    maxHeight: '90%',
    backgroundColor: isDarkMode ? '#1C1C1E' : '#FFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#38383A' : '#E5E5EA',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: isDarkMode ? '#FFF' : '#000',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  section: {
    marginBottom: 20,
  },
  itemNameSection: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#38383A' : '#E5E5EA',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? '#FFF' : '#000',
    marginBottom: 12,
  },
  itemName: {
    fontSize: 24,
    fontWeight: '700',
    color: isDarkMode ? '#FFF' : '#000',
    marginBottom: 8,
  },
  itemTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemTypeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  descriptionText: {
    fontSize: 16,
    color: isDarkMode ? '#E5E5E7' : '#333',
    lineHeight: 22,
    backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
  },
  internalNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  internalNotesLabel: {
    fontSize: 16,
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
  internalNotesContainer: {
    backgroundColor: isDarkMode ? '#2C2C2E' : '#FFF5E6',
    borderWidth: 1,
    borderColor: '#FF9500',
    padding: 16,
    borderRadius: 12,
  },
  internalNotesText: {
    fontSize: 15,
    color: isDarkMode ? '#E5E5E7' : '#333',
    lineHeight: 22,
  },
  notesContainer: {
    backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
  },
  notesText: {
    fontSize: 16,
    color: isDarkMode ? '#E5E5E7' : '#333',
    lineHeight: 22,
  },
  pricingCard: {
    backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  pricingDetail: {
    flex: 1,
    alignItems: 'center',
  },
  pricingDetailLabel: {
    fontSize: 14,
    color: isDarkMode ? '#999' : '#666',
    fontWeight: '500',
    marginBottom: 4,
  },
  pricingDetailValue: {
    fontSize: 18,
    color: isDarkMode ? '#FFF' : '#000',
    fontWeight: '600',
  },
  pricingMultiplier: {
    fontSize: 20,
    color: isDarkMode ? '#666' : '#999',
    fontWeight: '600',
    marginHorizontal: 16,
  },
  pricingDivider: {
    height: 1,
    backgroundColor: isDarkMode ? '#38383A' : '#E5E5EA',
    marginBottom: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: isDarkMode ? '#1D3A5F' : '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: -4,
  },
  totalLabel: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 24,
    color: '#007AFF',
    fontWeight: '700',
  },
  statusContainer: {
    gap: 16,
  },
  statusItem: {
    gap: 8,
  },
  statusItemLabel: {
    fontSize: 14,
    color: isDarkMode ? '#999' : '#666',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusChangeDate: {
    fontSize: 12,
    color: isDarkMode ? '#999' : '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  editableHint: {
    fontSize: 12,
    color: '#007AFF',
    fontStyle: 'italic',
  },
  statusOptionsContainer: {
    gap: 8,
  },
  statusOptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  editableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#007AFF15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusSelectorCard: {
    backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
  },
  statusSelectorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? '#FFF' : '#000',
    marginBottom: 12,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusGridItem: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  statusGridContent: {
    alignItems: 'center',
    gap: 6,
    position: 'relative',
  },
  statusGridText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  selectedIndicator: {
    position: 'absolute',
    top: -6,
    right: -6,
  },
  statusDisplayCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
  },
  statusDisplayContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDisplayInfo: {
    flex: 1,
  },
  statusDisplayLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  statusDisplaySubtext: {
    fontSize: 14,
    color: isDarkMode ? '#999' : '#666',
  },
  statusDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  additionalInfoContainer: {
    backgroundColor: isDarkMode ? '#2C2C2E' : '#F0F9FF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? '#38383A' : '#B3E5FC',
  },
  additionalInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  additionalInfoText: {
    fontSize: 14,
    color: isDarkMode ? '#E5E5E7' : '#333',
    flex: 1,
  },
  statusFeedback: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  statusFeedbackContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusFeedbackText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  loadingIndicator: {
    transform: [{ rotate: '45deg' }],
  },
});

export default BillingItemViewPopup;