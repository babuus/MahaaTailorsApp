import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    ScrollView,
} from 'react-native';
import MaterialIcon from './MaterialIcon';
import { ModernCard, ModernButton, LoadingSpinner } from './';
import {
    ReceivedItem,
    ReceivedItemTemplate
} from '../types';
import { getReceivedItemTemplates } from '../services/api';
import { useFormValidation } from '../hooks/useFormValidation';
import { VALIDATION_MESSAGES } from '../types/validation';

interface ReceivedItemsComponentProps {
    billId?: string;
    receivedItems: ReceivedItem[];
    onItemsChange: (items: ReceivedItem[]) => void;
    editable?: boolean;
    testID?: string;
}

interface ReceivedItemFormData {
    name: string;
    description: string;
    quantity: number;
    receivedDate: string;
}

export const ReceivedItemsComponent: React.FC<ReceivedItemsComponentProps> = ({
    billId,
    receivedItems,
    onItemsChange,
    editable = true,
    testID = 'received-items-component',
}) => {
    const [templates, setTemplates] = useState<ReceivedItemTemplate[]>([]);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const {
        data: formData,
        validation: { errors, touched },
        updateField,
        markFieldAsTouched,
        validateForm,
        resetForm,
    } = useFormValidation<ReceivedItemFormData>({
        initialData: {
            name: '',
            description: '',
            quantity: 1,
            receivedDate: new Date().toISOString().split('T')[0],
        },
        validator: (data) => {
            const validationErrors: any[] = [];

            if (!data.name.trim()) {
                validationErrors.push({
                    field: 'name',
                    message: VALIDATION_MESSAGES.REQUIRED
                });
            }

            if (data.quantity <= 0) {
                validationErrors.push({
                    field: 'quantity',
                    message: VALIDATION_MESSAGES.QUANTITY_REQUIRED
                });
            }

            if (!data.receivedDate) {
                validationErrors.push({
                    field: 'receivedDate',
                    message: VALIDATION_MESSAGES.REQUIRED
                });
            } else {
                const receivedDate = new Date(data.receivedDate);
                const today = new Date();
                today.setHours(23, 59, 59, 999); // Allow today's date

                if (receivedDate > today) {
                    validationErrors.push({
                        field: 'receivedDate',
                        message: VALIDATION_MESSAGES.RECEIVED_DATE_FUTURE
                    });
                }
            }

            return {
                isValid: validationErrors.length === 0,
                errors: validationErrors,
            };
        },
    });

    const loadTemplates = useCallback(async () => {
        setIsLoadingTemplates(true);
        try {
            const templateList = await getReceivedItemTemplates();
            setTemplates(templateList.filter(template => template.isActive));
        } catch (error) {
            console.error('Error loading received item templates:', error);
            // Don't show alert for template loading failure, just log it
        } finally {
            setIsLoadingTemplates(false);
        }
    }, []);

    useEffect(() => {
        loadTemplates();
    }, [loadTemplates]);

    const generateId = () => {
        return `received_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    };

    const addItemFromTemplate = (template: ReceivedItemTemplate) => {
        const newItem: ReceivedItem = {
            id: generateId(),
            name: template.name,
            description: template.description || '',
            quantity: 1,
            receivedDate: new Date().toISOString().split('T')[0],
            status: 'received',
        };

        const updatedItems = [...receivedItems, newItem];
        onItemsChange(updatedItems);
    };

    const startAddingCustomItem = () => {
        resetForm();
        setEditingIndex(null);
        setShowAddForm(true);
    };

    const startEditingItem = (index: number) => {
        const item = receivedItems[index];
        updateField('name', item.name);
        updateField('description', item.description || '');
        updateField('quantity', item.quantity);
        updateField('receivedDate', item.receivedDate);
        setEditingIndex(index);
        setShowAddForm(true);
    };

    const cancelForm = () => {
        setShowAddForm(false);
        setEditingIndex(null);
        resetForm();
    };

    const saveItem = () => {
        const isValid = validateForm();
        if (!isValid) {
            Alert.alert('Validation Error', 'Please fix the errors in the form.');
            return;
        }

        const itemData: ReceivedItem = {
            id: editingIndex !== null ? receivedItems[editingIndex].id : generateId(),
            name: formData.name.trim(),
            description: formData.description.trim(),
            quantity: formData.quantity,
            receivedDate: formData.receivedDate,
            status: editingIndex !== null ? receivedItems[editingIndex].status : 'received',
            returnedDate: editingIndex !== null ? receivedItems[editingIndex].returnedDate : undefined,
        };

        let updatedItems: ReceivedItem[];
        if (editingIndex !== null) {
            updatedItems = [...receivedItems];
            updatedItems[editingIndex] = itemData;
        } else {
            updatedItems = [...receivedItems, itemData];
        }

        onItemsChange(updatedItems);
        cancelForm();
    };

    const removeItem = (index: number) => {
        Alert.alert(
            'Remove Item',
            'Are you sure you want to remove this received item?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => {
                        const updatedItems = receivedItems.filter((_, i) => i !== index);
                        onItemsChange(updatedItems);
                    },
                },
            ]
        );
    };

    const markItemAsReturned = (index: number) => {
        Alert.alert(
            'Mark as Returned',
            'Mark this item as returned to the customer?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Mark Returned',
                    onPress: () => {
                        const updatedItems = [...receivedItems];
                        updatedItems[index] = {
                            ...updatedItems[index],
                            status: 'returned',
                            returnedDate: new Date().toISOString().split('T')[0],
                        };
                        onItemsChange(updatedItems);
                    },
                },
            ]
        );
    };

    const markItemAsReceived = (index: number) => {
        const updatedItems = [...receivedItems];
        updatedItems[index] = {
            ...updatedItems[index],
            status: 'received',
            returnedDate: undefined,
        };
        onItemsChange(updatedItems);
    };

    const renderReceivedItem = (item: ReceivedItem, index: number) => {
        const isReturned = item.status === 'returned';

        return (
            <ModernCard key={item.id} style={[styles.itemCard, isReturned && styles.returnedItemCard]}>
                <View style={styles.itemHeader}>
                    <View style={styles.itemTitleContainer}>
                        <Text style={[styles.itemName, isReturned && styles.returnedText]}>
                            {item.name}
                        </Text>
                        <View style={styles.statusContainer}>
                            <View style={[
                                styles.statusBadge,
                                isReturned ? styles.returnedBadge : styles.receivedBadge
                            ]}>
                                <Text style={[
                                    styles.statusText,
                                    isReturned ? styles.returnedStatusText : styles.receivedStatusText
                                ]}>
                                    {isReturned ? 'Returned' : 'Received'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {editable && (
                        <View style={styles.itemActions}>
                            <TouchableOpacity
                                onPress={() => startEditingItem(index)}
                                style={styles.actionButton}
                                testID={`edit-received-item-${index}`}
                            >
                                <MaterialIcon name="edit" size={18} color="#007AFF" />
                            </TouchableOpacity>

                            {!isReturned ? (
                                <TouchableOpacity
                                    onPress={() => markItemAsReturned(index)}
                                    style={styles.actionButton}
                                    testID={`return-item-${index}`}
                                >
                                    <MaterialIcon name="assignment-return" size={18} color="#FF9500" />
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    onPress={() => markItemAsReceived(index)}
                                    style={styles.actionButton}
                                    testID={`unreturned-item-${index}`}
                                >
                                    <MaterialIcon name="assignment-returned" size={18} color="#34C759" />
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                onPress={() => removeItem(index)}
                                style={styles.actionButton}
                                testID={`remove-received-item-${index}`}
                            >
                                <MaterialIcon name="delete" size={18} color="#FF3B30" />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <View style={styles.itemDetails}>
                    {item.description && (
                        <Text style={[styles.itemDescription, isReturned && styles.returnedText]}>
                            {item.description}
                        </Text>
                    )}

                    <View style={styles.itemMeta}>
                        <Text style={[styles.metaText, isReturned && styles.returnedText]}>
                            Quantity: {item.quantity}
                        </Text>
                        <Text style={[styles.metaText, isReturned && styles.returnedText]}>
                            Received: {new Date(item.receivedDate).toLocaleDateString()}
                        </Text>
                        {item.returnedDate && (
                            <Text style={[styles.metaText, styles.returnedText]}>
                                Returned: {new Date(item.returnedDate).toLocaleDateString()}
                            </Text>
                        )}
                    </View>
                </View>
            </ModernCard>
        );
    };

    const renderAddForm = () => {
        if (!showAddForm) return null;

        return (
            <ModernCard style={styles.addFormCard}>
                <View style={styles.formHeader}>
                    <Text style={styles.formTitle}>
                        {editingIndex !== null ? 'Edit Received Item' : 'Add Received Item'}
                    </Text>
                    <TouchableOpacity
                        onPress={cancelForm}
                        style={styles.closeButton}
                        testID="close-add-form"
                    >
                        <MaterialIcon name="close" size={20} color="#666" />
                    </TouchableOpacity>
                </View>

                <View style={styles.formContent}>
                    <View style={styles.formField}>
                        <Text style={styles.fieldLabel}>Item Name *</Text>
                        <TextInput
                            style={[
                                styles.textInput,
                                errors.name && styles.inputError,
                            ]}
                            value={formData.name}
                            onChangeText={(text) => updateField('name', text)}
                            onBlur={() => markFieldAsTouched('name')}
                            placeholder="Enter item name"
                            testID="received-item-name-input"
                        />
                        {errors.name && touched.name && (
                            <Text style={styles.errorText}>{errors.name}</Text>
                        )}
                    </View>

                    <View style={styles.formField}>
                        <Text style={styles.fieldLabel}>Description</Text>
                        <TextInput
                            style={[styles.textInput, styles.descriptionInput]}
                            value={formData.description}
                            onChangeText={(text) => updateField('description', text)}
                            placeholder="Enter item description (optional)"
                            multiline
                            numberOfLines={3}
                            testID="received-item-description-input"
                        />
                    </View>

                    <View style={styles.formRow}>
                        <View style={[styles.formField, { flex: 1, marginRight: 8 }]}>
                            <Text style={styles.fieldLabel}>Quantity *</Text>
                            <TextInput
                                style={[
                                    styles.textInput,
                                    errors.quantity && styles.inputError,
                                ]}
                                value={formData.quantity.toString()}
                                onChangeText={(text) => updateField('quantity', parseInt(text) || 1)}
                                onBlur={() => markFieldAsTouched('quantity')}
                                keyboardType="numeric"
                                testID="received-item-quantity-input"
                            />
                            {errors.quantity && touched.quantity && (
                                <Text style={styles.errorText}>{errors.quantity}</Text>
                            )}
                        </View>

                        <View style={[styles.formField, { flex: 1, marginLeft: 8 }]}>
                            <Text style={styles.fieldLabel}>Received Date *</Text>
                            <TextInput
                                style={[
                                    styles.textInput,
                                    errors.receivedDate && styles.inputError,
                                ]}
                                value={formData.receivedDate}
                                onChangeText={(text) => updateField('receivedDate', text)}
                                onBlur={() => markFieldAsTouched('receivedDate')}
                                placeholder="YYYY-MM-DD"
                                testID="received-item-date-input"
                            />
                            {errors.receivedDate && touched.receivedDate && (
                                <Text style={styles.errorText}>{errors.receivedDate}</Text>
                            )}
                        </View>
                    </View>

                    <View style={styles.formActions}>
                        <ModernButton
                            title="Cancel"
                            onPress={cancelForm}
                            variant="secondary"
                            style={styles.cancelButton}
                            testID="cancel-add-item"
                        />
                        <ModernButton
                            title={editingIndex !== null ? 'Update Item' : 'Add Item'}
                            onPress={saveItem}
                            style={styles.saveButton}
                            testID="save-received-item"
                        />
                    </View>
                </View>
            </ModernCard>
        );
    };

    return (
        <View style={styles.container} testID={testID}>
            <View style={styles.header}>
                <Text style={styles.title}>Items Received from Customer</Text>
                {editable && (
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={startAddingCustomItem}
                            testID="add-custom-received-item"
                        >
                            <MaterialIcon name="add" size={16} color="#007AFF" />
                            <Text style={styles.addButtonText}>Add Item</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Templates Section */}
            {editable && templates.length > 0 && (
                <View style={styles.templatesSection}>
                    <Text style={styles.templatesTitle}>Quick Add from Templates:</Text>
                    {isLoadingTemplates ? (
                        <View style={styles.loadingContainer}>
                            <LoadingSpinner size="small" />
                        </View>
                    ) : (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.templatesScroll}
                        >
                            <View style={styles.templatesList}>
                                {templates.map((template) => (
                                    <TouchableOpacity
                                        key={template.id}
                                        style={styles.templateButton}
                                        onPress={() => addItemFromTemplate(template)}
                                        testID={`add-template-${template.id}`}
                                    >
                                        <Text style={styles.templateName}>{template.name}</Text>
                                        {template.description && (
                                            <Text style={styles.templateDescription} numberOfLines={2}>
                                                {template.description}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    )}
                </View>
            )}

            {/* Add Form */}
            {renderAddForm()}

            {/* Items List */}
            <View style={styles.itemsList}>
                {receivedItems.length === 0 ? (
                    <ModernCard style={styles.emptyState}>
                        <MaterialIcon name="inventory" size={48} color="#C7C7CC" />
                        <Text style={styles.emptyStateText}>
                            No items received from customer yet
                        </Text>
                        {editable && (
                            <Text style={styles.emptyStateSubtext}>
                                Add items using the button above or select from templates
                            </Text>
                        )}
                    </ModernCard>
                ) : (
                    receivedItems.map(renderReceivedItem)
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
    },
    headerActions: {
        flexDirection: 'row',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F8FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#007AFF',
    },
    addButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#007AFF',
        marginLeft: 4,
    },
    templatesSection: {
        marginBottom: 16,
    },
    templatesTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#666',
        marginBottom: 8,
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    templatesScroll: {
        marginHorizontal: -16,
        paddingHorizontal: 16,
    },
    templatesList: {
        flexDirection: 'row',
        gap: 8,
    },
    templateButton: {
        backgroundColor: '#FFF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#E1E1E1',
        minWidth: 120,
        maxWidth: 150,
    },
    templateName: {
        fontSize: 12,
        fontWeight: '500',
        color: '#000',
        marginBottom: 2,
    },
    templateDescription: {
        fontSize: 10,
        color: '#666',
        lineHeight: 12,
    },
    addFormCard: {
        marginBottom: 16,
    },
    formHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    formTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    closeButton: {
        padding: 4,
    },
    formContent: {
        gap: 16,
    },
    formField: {
        flex: 1,
    },
    formRow: {
        flexDirection: 'row',
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#000',
        marginBottom: 6,
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#E1E1E1',
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        backgroundColor: '#FFF',
        color: '#000',
    },
    descriptionInput: {
        height: 80,
        textAlignVertical: 'top',
    },
    inputError: {
        borderColor: '#FF3B30',
    },
    errorText: {
        fontSize: 12,
        color: '#FF3B30',
        marginTop: 4,
    },
    formActions: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
    },
    saveButton: {
        flex: 2,
    },
    itemsList: {
        flex: 1,
    },
    itemCard: {
        marginBottom: 12,
    },
    returnedItemCard: {
        opacity: 0.7,
        borderColor: '#FF9500',
        borderWidth: 1,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    itemTitleContainer: {
        flex: 1,
        marginRight: 12,
    },
    itemName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 4,
    },
    returnedText: {
        color: '#666',
        textDecorationLine: 'line-through',
    },
    statusContainer: {
        flexDirection: 'row',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    receivedBadge: {
        backgroundColor: '#E8F5E8',
    },
    returnedBadge: {
        backgroundColor: '#FFF3E0',
    },
    statusText: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    receivedStatusText: {
        color: '#34C759',
    },
    returnedStatusText: {
        color: '#FF9500',
    },
    itemActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        padding: 4,
    },
    itemDetails: {
        gap: 8,
    },
    itemDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    itemMeta: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    metaText: {
        fontSize: 12,
        color: '#666',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    emptyStateText: {
        fontSize: 16,
        color: '#666',
        marginTop: 12,
        textAlign: 'center',
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: '#999',
        marginTop: 4,
        textAlign: 'center',
    },
});