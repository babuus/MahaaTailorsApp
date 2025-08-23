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
import MaterialIcon from '../MaterialIcon';
import TempImagePicker from '../TempImagePicker';
import EditableImagePicker from '../EditableImagePicker';
import AnimatedModal from '../AnimatedModal';
import { BillingConfigItem, BillItem, DeliveryStatus } from '../../types';

interface BillingItemPopupProps {
    visible: boolean;
    onClose: () => void;
    mode: 'create' | 'update' | 'view';
    item?: BillItem;
    billingConfigItems: BillingConfigItem[];
    onSave: (item: Omit<BillItem, 'id' | 'totalPrice'>) => void;
    onUpdate?: (item: BillItem) => void;
    images?: string[];
    onImagesChange?: (images: string[]) => void;
    isEditMode?: boolean;
    billId?: string;
    itemId?: string;
    defaultDeliveryStatus: DeliveryStatus;
}

const BillingItemPopup: React.FC<BillingItemPopupProps> = ({
    visible,
    onClose,
    mode,
    item,
    billingConfigItems,
    onSave,
    onUpdate,
    images = [],
    onImagesChange,
    isEditMode = false,
    billId,
    itemId,
    defaultDeliveryStatus,
}) => {
    const { isDarkMode } = useThemeContext();
    const [showTemplateSelector, setShowTemplateSelector] = useState(false);

    // Calculate whether to show template selector based on current props
    const shouldShowTemplateSelector = mode === 'create' && !item && showTemplateSelector;

    // Update template selector state when popup becomes visible or props change
    React.useEffect(() => {
        console.log('BillingItemPopup useEffect:', {
            visible,
            mode,
            hasItem: !!item,
            itemName: item?.name,
            shouldShow: mode === 'create' && !item
        });

        if (visible) {
            // Only show template selector for create mode without an existing item
            if (mode === 'create' && !item) {
                console.log('Setting showTemplateSelector to TRUE');
                setShowTemplateSelector(true);
            } else {
                console.log('Setting showTemplateSelector to FALSE');
                setShowTemplateSelector(false);
            }
        } else {
            // Reset when popup is closed
            setShowTemplateSelector(false);
        }
    }, [mode, item, visible]);

    const [formData, setFormData] = useState<Omit<BillItem, 'id' | 'totalPrice'>>({
        type: 'custom',
        name: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        materialSource: 'customer',
        deliveryStatus: defaultDeliveryStatus,
        internalNotes: '',
    });

    // Update form data when item prop changes
    React.useEffect(() => {
        if (item) {
            console.log('BillingItemPopup - Loading item data:', {
                itemId: item.id,
                itemName: item.name,
                internalNotes: item.internalNotes,
                hasInternalNotes: !!item.internalNotes
            });
            
            setFormData({
                type: item.type,
                name: item.name,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                configItemId: item.configItemId,
                materialSource: item.materialSource,
                deliveryStatus: item.deliveryStatus,
                internalNotes: item.internalNotes || '',
            });
        } else if (mode === 'create') {
            setFormData({
                type: 'custom',
                name: '',
                description: '',
                quantity: 1,
                unitPrice: 0,
                materialSource: 'customer',
                deliveryStatus: defaultDeliveryStatus,
                internalNotes: '',
            });
        }
    }, [item, mode, defaultDeliveryStatus]);

    const deliveryStatusOptions: { key: DeliveryStatus; label: string; color: string }[] = [
        { key: 'pending', label: 'Pending', color: '#FF9500' },
        { key: 'in_progress', label: 'In Progress', color: '#007AFF' },
        { key: 'ready_for_delivery', label: 'Ready', color: '#34C759' },
        { key: 'delivered', label: 'Delivered', color: '#30D158' },
    ];

    const handleTemplateSelect = (template: BillingConfigItem) => {
        setFormData({
            type: 'configured',
            name: template.name,
            description: template.description,
            quantity: 1,
            unitPrice: template.price,
            configItemId: template.id,
            materialSource: 'customer',
            deliveryStatus: defaultDeliveryStatus,
            internalNotes: '',
        });
        setShowTemplateSelector(false);
    };

    const handleCustomItem = () => {
        setFormData({
            type: 'custom',
            name: '',
            description: '',
            quantity: 1,
            unitPrice: 0,
            materialSource: 'customer',
            deliveryStatus: defaultDeliveryStatus,
            internalNotes: '',
        });
        setShowTemplateSelector(false);
    };

    const handleFieldChange = (field: string, value: any) => {
        setFormData(prev => {
            const updated = { ...prev, [field]: value };

            // Ensure numeric fields are properly converted
            if (field === 'quantity') {
                updated.quantity = Math.max(1, parseInt(value) || 1);
            } else if (field === 'unitPrice') {
                updated.unitPrice = Math.max(0, parseFloat(value) || 0);
            }

            return updated;
        });
    };

    const handleSave = () => {
        if (!formData.name.trim()) {
            Alert.alert('Error', 'Please enter an item name');
            return;
        }

        // Debug: Log internal notes being saved
        if (formData.internalNotes) {
            console.log('Saving item with internal notes:', formData.internalNotes);
        }

        if (mode === 'update' && item && onUpdate) {
            onUpdate({ ...item, ...formData });
        } else {
            onSave(formData);
        }
        onClose();
    };

    const isReadOnly = mode === 'view';
    const styles = createStyles(isDarkMode);

    const renderTemplateSelector = () => (
        <View style={styles.templateSelector}>
            <Text style={styles.sectionTitle}>Select Item Type</Text>

            {/* Custom Item Option */}
            <TouchableOpacity
                style={[styles.templateCard, styles.customTemplateCard]}
                onPress={handleCustomItem}
                disabled={isReadOnly}
            >
                <View style={styles.templateInfo}>
                    <Text style={styles.templateName}>Custom Item</Text>
                    <Text style={styles.templateDescription}>Create a new item with custom details</Text>
                </View>
                <MaterialIcon name="add" size={24} color="#34C759" />
            </TouchableOpacity>

            {/* Template Items */}
            <ScrollView style={styles.templateList} showsVerticalScrollIndicator={false}>
                {billingConfigItems.map((template) => (
                    <TouchableOpacity
                        key={template.id}
                        style={styles.templateCard}
                        onPress={() => handleTemplateSelect(template)}
                        disabled={isReadOnly}
                    >
                        <View style={styles.templateInfo}>
                            <Text style={styles.templateName}>{template.name}</Text>
                            {template.description && (
                                <Text style={styles.templateDescription}>{template.description}</Text>
                            )}
                            <Text style={styles.templatePrice}>₹{template.price.toFixed(2)}</Text>
                        </View>
                        <MaterialIcon name="add" size={24} color="#007AFF" />
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {billingConfigItems.length === 0 && (
                <View style={styles.noTemplatesState}>
                    <Text style={styles.noTemplatesText}>No templates available</Text>
                    <Text style={styles.noTemplatesSubtext}>
                        You can create templates in the billing configuration
                    </Text>
                </View>
            )}
        </View>
    );

    const renderItemForm = () => (
        <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
            {/* Item Name */}
            <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Item Name *</Text>
                <TextInput
                    style={[styles.textInput, isReadOnly && styles.readOnlyInput]}
                    value={formData.name}
                    onChangeText={(text) => handleFieldChange('name', text)}
                    placeholder="Enter item name"
                    placeholderTextColor={isDarkMode ? '#666' : '#999'}
                    editable={!isReadOnly}
                />
            </View>

            {/* Description */}
            <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput
                    style={[styles.textAreaInput, isReadOnly && styles.readOnlyInput]}
                    value={formData.description || ''}
                    onChangeText={(text) => handleFieldChange('description', text)}
                    placeholder="Enter description (optional)"
                    placeholderTextColor={isDarkMode ? '#666' : '#999'}
                    multiline
                    numberOfLines={3}
                    editable={!isReadOnly}
                />
            </View>

            {/* Internal Notes */}
            <View style={styles.formField}>
                <View style={styles.internalNotesHeader}>
                    <MaterialIcon name="note" size={16} color="#FF9500" />
                    <Text style={styles.internalNotesLabel}>Internal Notes</Text>
                    <Text style={styles.internalNotesSubtitle}>(Staff Only)</Text>
                </View>
                <TextInput
                    style={[styles.internalNotesInput, isReadOnly && styles.readOnlyInput]}
                    value={formData.internalNotes || ''}
                    onChangeText={(text) => handleFieldChange('internalNotes', text)}
                    placeholder="Add internal notes for staff reference (optional)"
                    placeholderTextColor={isDarkMode ? '#666' : '#999'}
                    multiline
                    numberOfLines={3}
                    editable={!isReadOnly}
                />
            </View>

            {/* Quantity and Price Row */}
            <View style={styles.quantityPriceRow}>
                <View style={styles.quantityContainer}>
                    <Text style={styles.fieldLabel}>Quantity *</Text>
                    <TextInput
                        style={[styles.numberInput, isReadOnly && styles.readOnlyInput]}
                        value={formData.quantity.toString()}
                        onChangeText={(text) => handleFieldChange('quantity', text)}
                        keyboardType="numeric"
                        editable={!isReadOnly}
                    />
                </View>

                <Text style={styles.multiplySymbol}>×</Text>

                <View style={styles.priceContainer}>
                    <Text style={styles.fieldLabel}>Unit Price (₹) *</Text>
                    <TextInput
                        style={[styles.numberInput, isReadOnly && styles.readOnlyInput]}
                        value={formData.unitPrice.toString()}
                        onChangeText={(text) => handleFieldChange('unitPrice', text)}
                        keyboardType="decimal-pad"
                        editable={!isReadOnly}
                    />
                </View>
            </View>

            {/* Total Display */}
            <View style={styles.totalDisplay}>
                <Text style={styles.totalLabel}>Total: ₹{(formData.quantity * formData.unitPrice).toFixed(2)}</Text>
            </View>

            {/* Status Tags Row */}
            <View style={styles.statusRow}>
                {/* Material Source */}
                <TouchableOpacity
                    style={[
                        styles.statusTag,
                        { backgroundColor: formData.materialSource === 'customer' ? '#007AFF20' : '#34C75920' }
                    ]}
                    onPress={() => handleFieldChange('materialSource',
                        formData.materialSource === 'customer' ? 'business' : 'customer')}
                    disabled={isReadOnly}
                >
                    <MaterialIcon
                        name={formData.materialSource === 'customer' ? 'person' : 'business'}
                        size={16}
                        color={formData.materialSource === 'customer' ? '#007AFF' : '#34C759'}
                    />
                    <Text style={[
                        styles.statusTagText,
                        { color: formData.materialSource === 'customer' ? '#007AFF' : '#34C759' }
                    ]}>
                        {formData.materialSource === 'customer' ? 'Customer' : 'Business'}
                    </Text>
                </TouchableOpacity>

                {/* Delivery Status */}
                <TouchableOpacity
                    style={[
                        styles.statusTag,
                        { backgroundColor: deliveryStatusOptions.find(opt => opt.key === formData.deliveryStatus)?.color + '20' }
                    ]}
                    onPress={() => {
                        const currentIndex = deliveryStatusOptions.findIndex(opt => opt.key === formData.deliveryStatus);
                        const nextIndex = (currentIndex + 1) % deliveryStatusOptions.length;
                        handleFieldChange('deliveryStatus', deliveryStatusOptions[nextIndex].key);
                    }}
                    disabled={isReadOnly}
                >
                    <MaterialIcon
                        name="local-shipping"
                        size={16}
                        color={deliveryStatusOptions.find(opt => opt.key === formData.deliveryStatus)?.color}
                    />
                    <Text style={[
                        styles.statusTagText,
                        { color: deliveryStatusOptions.find(opt => opt.key === formData.deliveryStatus)?.color }
                    ]}>
                        {deliveryStatusOptions.find(opt => opt.key === formData.deliveryStatus)?.label}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Image Picker */}
            <View style={styles.imageSection}>
                <Text style={styles.fieldLabel}>Images</Text>
                {isEditMode ? (
                    <EditableImagePicker
                        images={images}
                        onImagesChange={onImagesChange || (() => { })}
                        maxImages={7}
                        isEditMode={true}
                        billId={billId}
                        itemId={itemId}
                    />
                ) : (
                    <TempImagePicker
                        images={images}
                        onImagesChange={onImagesChange || (() => { })}
                        maxImages={7}
                    />
                )}
            </View>
        </ScrollView>
    );

    return (
        <AnimatedModal
            visible={visible}
            onClose={onClose}
            animationType="slideFromBottom"
            contentStyle={styles.modalContent}
        >
            <View style={styles.header}>
                <Text style={styles.title}>
                    {mode === 'create' ? 'Add Item' : mode === 'update' ? 'Edit Item' : 'View Item'}
                </Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <MaterialIcon name="close" size={24} color={isDarkMode ? '#FFF' : '#000'} />
                </TouchableOpacity>
            </View>

            {shouldShowTemplateSelector ? renderTemplateSelector() : renderItemForm()}

            {!isReadOnly && !shouldShowTemplateSelector && (
                <View style={styles.footer}>
                    {mode === 'create' && (
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => setShowTemplateSelector(true)}
                        >
                            <MaterialIcon name="arrow-back" size={20} color="#007AFF" />
                            <Text style={styles.backButtonText}>Back to Templates</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={styles.saveButton}
                        onPress={handleSave}
                    >
                        <Text style={styles.saveButtonText}>
                            {mode === 'create' ? 'Add Item' : 'Save Changes'}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </AnimatedModal>
    );
};

const createStyles = (isDarkMode: boolean) => StyleSheet.create({
    modalContent: {
        width: '95%',
        height: '95%',
        maxHeight: '95%',
        backgroundColor: isDarkMode ? '#1C1C1E' : '#FFF',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: isDarkMode ? '#38383A' : '#E5E5EA',
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: isDarkMode ? '#FFF' : '#000',
    },
    closeButton: {
        padding: 4,
    },
    templateSelector: {
        flex: 1,
        paddingTop: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: isDarkMode ? '#FFF' : '#000',
        marginBottom: 16,
    },
    customTemplateCard: {
        backgroundColor: isDarkMode ? '#2C2C2E' : '#F0F9FF',
        borderLeftWidth: 4,
        borderLeftColor: '#34C759',
        marginBottom: 12,
    },
    templateList: {
        flex: 1,
    },
    templateCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F9FA',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
    },
    templateInfo: {
        flex: 1,
    },
    templateName: {
        fontSize: 16,
        fontWeight: '600',
        color: isDarkMode ? '#FFF' : '#000',
        marginBottom: 4,
    },
    templateDescription: {
        fontSize: 14,
        color: isDarkMode ? '#999' : '#666',
        marginBottom: 4,
    },
    templatePrice: {
        fontSize: 16,
        fontWeight: '700',
        color: '#007AFF',
    },
    noTemplatesState: {
        alignItems: 'center',
        padding: 40,
    },
    noTemplatesText: {
        fontSize: 16,
        fontWeight: '600',
        color: isDarkMode ? '#999' : '#666',
        marginBottom: 8,
    },
    noTemplatesSubtext: {
        fontSize: 14,
        color: isDarkMode ? '#666' : '#999',
        textAlign: 'center',
    },
    formContainer: {
        flex: 1,
        paddingTop: 16,
    },
    formField: {
        marginBottom: 16,
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: isDarkMode ? '#FFF' : '#000',
        marginBottom: 8,
    },
    textInput: {
        fontSize: 16,
        color: isDarkMode ? '#FFF' : '#000',
        backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F9FA',
        borderWidth: 1,
        borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
        borderRadius: 8,
        padding: 12,
    },
    textAreaInput: {
        fontSize: 14,
        color: isDarkMode ? '#FFF' : '#000',
        backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F9FA',
        borderWidth: 1,
        borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
        borderRadius: 8,
        padding: 12,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    internalNotesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 6,
    },
    internalNotesLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: isDarkMode ? '#FFF' : '#000',
    },
    internalNotesSubtitle: {
        fontSize: 12,
        color: '#FF9500',
        fontWeight: '500',
        fontStyle: 'italic',
    },
    internalNotesInput: {
        fontSize: 14,
        color: isDarkMode ? '#FFF' : '#000',
        backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F9FA',
        borderWidth: 1,
        borderColor: '#FF950040',
        borderRadius: 8,
        padding: 12,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    quantityPriceRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 12,
        marginBottom: 16,
    },
    quantityContainer: {
        flex: 1,
    },
    priceContainer: {
        flex: 2,
    },
    numberInput: {
        fontSize: 16,
        color: isDarkMode ? '#FFF' : '#000',
        backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F9FA',
        borderWidth: 1,
        borderColor: isDarkMode ? '#38383A' : '#E5E5EA',
        borderRadius: 8,
        padding: 12,
        textAlign: 'center',
    },
    multiplySymbol: {
        fontSize: 18,
        fontWeight: '600',
        color: isDarkMode ? '#999' : '#666',
        marginBottom: 12,
    },
    totalDisplay: {
        backgroundColor: isDarkMode ? '#2C2C2E' : '#F0F9FF',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: '700',
        color: '#007AFF',
    },
    statusRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    statusTag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        gap: 6,
    },
    statusTagText: {
        fontSize: 14,
        fontWeight: '500',
    },
    imageSection: {
        marginBottom: 16,
    },
    readOnlyInput: {
        backgroundColor: isDarkMode ? '#1C1C1E' : '#F5F5F5',
        color: isDarkMode ? '#999' : '#666',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: isDarkMode ? '#38383A' : '#E5E5EA',
        gap: 12,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#007AFF',
        gap: 6,
    },
    backButtonText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#007AFF',
    },
    saveButton: {
        flex: 1,
        backgroundColor: '#007AFF',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },
});

export default BillingItemPopup;