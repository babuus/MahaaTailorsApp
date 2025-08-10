import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcon from '../components/MaterialIcon';
import { useThemeContext } from '../contexts/ThemeContext';
import {
  LoadingSpinner,
  ModernButton,
  ModernCard,
  CustomerSearchComponent,
  CustomDatePicker,
  PaymentTrackingComponent
} from '../components';
import {
  Customer,
  BillingConfigItem,
  ReceivedItemTemplate,
  BillFormData,
  BillItem,
  ReceivedItem,
  Payment
} from '../types';
import { useFormValidation } from '../hooks/useFormValidation';
import {
  createBill,
  updateBill,
  getBillingConfigItems,
  getReceivedItemTemplates
} from '../services/api';
import { VALIDATION_MESSAGES } from '../types/validation';

interface BillingFormScreenProps {
  navigation: any;
  route: {
    params?: {
      mode?: 'add' | 'edit';
      bill?: any;
      customerId?: string;
    };
  };
}

export const BillingFormScreen: React.FC<BillingFormScreenProps> = ({
  navigation,
  route,
}) => {
  const { mode = 'add', bill, customerId } = route.params || {};
  const { isDarkMode } = useThemeContext();

  // State management
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [billingConfigItems, setBillingConfigItems] = useState<BillingConfigItem[]>([]);
  const [receivedItemTemplates, setReceivedItemTemplates] = useState<ReceivedItemTemplate[]>([]);
  const [billItems, setBillItems] = useState<Omit<BillItem, 'id' | 'totalPrice'>[]>([]);
  const [receivedItems, setReceivedItems] = useState<Omit<ReceivedItem, 'id'>[]>([]);
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [showBillingDatePicker, setShowBillingDatePicker] = useState(false);
  const [showDeliveryDatePicker, setShowDeliveryDatePicker] = useState(false);
  const [showReceivedDatePicker, setShowReceivedDatePicker] = useState<number | null>(null);
  const [showReceivedItemSelector, setShowReceivedItemSelector] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentBill, setCurrentBill] = useState<any>(null);
  const [payments, setPayments] = useState<Omit<Payment, 'id' | 'createdAt'>[]>([]);

  // Form validation
  const {
    data: formData,
    validation: { errors, touched },
    updateField,
    markFieldAsTouched,
    validateForm,
  } = useFormValidation<BillFormData>({
    initialData: {
      customerId: customerId || bill?.customerId || '',
      billingDate: bill?.billingDate || new Date().toISOString().split('T')[0],
      deliveryDate: bill?.deliveryDate || '',
      items: [],
      receivedItems: [],
      notes: bill?.notes || '',
    },
    validator: (data) => {
      const validationErrors: any[] = [];

      if (!data.customerId) {
        validationErrors.push({
          field: 'customerId',
          message: VALIDATION_MESSAGES.INVALID_CUSTOMER
        });
      }

      if (!data.billingDate) {
        validationErrors.push({
          field: 'billingDate',
          message: VALIDATION_MESSAGES.REQUIRED
        });
      }

      if (!data.deliveryDate) {
        validationErrors.push({
          field: 'deliveryDate',
          message: VALIDATION_MESSAGES.REQUIRED
        });
      } else {
        const deliveryDate = new Date(data.deliveryDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (deliveryDate < today) {
          validationErrors.push({
            field: 'deliveryDate',
            message: VALIDATION_MESSAGES.DELIVERY_DATE_PAST
          });
        }
      }

      if (billItems.length === 0) {
        validationErrors.push({
          field: 'items',
          message: VALIDATION_MESSAGES.MIN_ITEMS
        });
      }

      return {
        isValid: validationErrors.length === 0,
        errors: validationErrors,
      };
    },
  });

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [configItems, templates] = await Promise.all([
          getBillingConfigItems(),
          getReceivedItemTemplates(),
        ]);

        setBillingConfigItems(configItems);
        setReceivedItemTemplates(templates);

        if (mode === 'edit' && bill) {
          // Fetch fresh bill data to ensure we have the latest payments
          try {
            const { getBillById, getCustomerById } = await import('../services/api');
            const freshBill = await getBillById(bill.id);
            console.log('BillingFormScreen - Loaded fresh bill data:', {
              totalAmount: freshBill.totalAmount,
              paidAmount: freshBill.paidAmount,
              outstandingAmount: freshBill.outstandingAmount,
              status: freshBill.status,
              paymentsCount: freshBill.payments?.length || 0
            });

            // Fetch customer details separately to ensure we have complete customer info
            let customerData = freshBill.customer;
            if (freshBill.customerId && (!customerData || !customerData.personalDetails)) {
              try {
                customerData = await getCustomerById(freshBill.customerId);
                console.log('BillingFormScreen - Loaded customer data:', customerData);
              } catch (customerError) {
                console.warn('Failed to fetch customer data:', customerError);
                // Use whatever customer data we have from the bill
                customerData = freshBill.customer || bill.customer;
              }
            }

            setBillItems(freshBill.items || []);
            setReceivedItems(freshBill.receivedItems || []);
            setSelectedCustomer(customerData);
            setCurrentBill({ ...freshBill, customer: customerData });
          } catch (error) {
            console.warn('Failed to fetch fresh bill data, using passed data:', error);
            // Fallback to passed bill data
            setBillItems(bill.items || []);
            setReceivedItems(bill.receivedItems || []);

            // Try to fetch customer data even in fallback mode
            if (bill.customerId) {
              try {
                const { getCustomerById } = await import('../services/api');
                const customerData = await getCustomerById(bill.customerId);
                setSelectedCustomer(customerData);
                setCurrentBill({ ...bill, customer: customerData });
              } catch (customerError) {
                console.warn('Failed to fetch customer data in fallback:', customerError);
                setSelectedCustomer(bill.customer);
                setCurrentBill(bill);
              }
            } else {
              setSelectedCustomer(bill.customer);
              setCurrentBill(bill);
            }
          }
        }
      } catch (error) {
        console.error('Error loading billing form data:', error);
        Alert.alert('Error', 'Failed to load form data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [mode, bill]);

  // Calculate total amount
  const totalAmount = billItems.reduce((sum, item) => {
    return sum + (item.quantity * item.unitPrice);
  }, 0);

  // Handle customer selection
  const handleCustomerSelect = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    updateField('customerId', customer.id);
  }, [updateField]);

  // Handle adding billing items
  const handleAddBillingItem = useCallback((item: BillingConfigItem) => {
    const newItem: Omit<BillItem, 'id' | 'totalPrice'> = {
      type: 'configured',
      name: item.name,
      description: item.description,
      quantity: 1,
      unitPrice: item.price,
      configItemId: item.id,
    };
    setBillItems(prev => [...prev, newItem]);
    setShowItemSelector(false);
  }, []);

  // Handle adding custom billing item
  const handleAddCustomItem = useCallback(() => {
    const newItem: Omit<BillItem, 'id' | 'totalPrice'> = {
      type: 'custom',
      name: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
    };
    setBillItems(prev => [...prev, newItem]);
  }, []);

  // Handle updating billing item
  const handleUpdateBillingItem = useCallback((index: number, field: string, value: any) => {
    setBillItems(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ));
  }, []);

  // Handle removing billing item
  const handleRemoveBillingItem = useCallback((index: number) => {
    setBillItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Handle adding received items
  const handleAddReceivedItem = useCallback((template: ReceivedItemTemplate) => {
    const newItem: Omit<ReceivedItem, 'id'> = {
      name: template.name,
      description: template.description,
      quantity: 1,
      receivedDate: new Date().toISOString().split('T')[0],
      status: 'received',
    };
    setReceivedItems(prev => [...prev, newItem]);
    setShowReceivedItemSelector(false);
  }, []);

  // Handle adding custom received item
  const handleAddCustomReceivedItem = useCallback(() => {
    const newItem: Omit<ReceivedItem, 'id'> = {
      name: '',
      description: '',
      quantity: 1,
      receivedDate: new Date().toISOString().split('T')[0],
      status: 'received',
    };
    setReceivedItems(prev => [...prev, newItem]);
  }, []);

  // Handle updating received item
  const handleUpdateReceivedItem = useCallback((index: number, field: string, value: any) => {
    setReceivedItems(prev => prev.map((item, i) => {
      if (i === index) {
        const updatedItem = { ...item, [field]: value };
        // Ensure quantity is always a number
        if (field === 'quantity') {
          updatedItem.quantity = parseInt(value) || 1;
        }
        return updatedItem;
      }
      return item;
    }));
  }, []);

  // Handle removing received item
  const handleRemoveReceivedItem = useCallback((index: number) => {
    setReceivedItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Payment handlers for create mode
  const handleAddPayment = useCallback(() => {
    const newPayment: Omit<Payment, 'id' | 'createdAt'> = {
      amount: 0,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'cash',
      notes: '',
    };
    setPayments(prev => [...prev, newPayment]);
  }, []);

  const handleUpdatePayment = useCallback((index: number, field: string, value: any) => {
    setPayments(prev => prev.map((payment, i) => {
      if (i === index) {
        const updatedPayment = { ...payment, [field]: value };

        // Validate payment amount doesn't exceed remaining balance
        if (field === 'amount') {
          const otherPaymentsTotal = prev
            .filter((_, idx) => idx !== index)
            .reduce((sum, p) => sum + p.amount, 0);
          const maxAmount = totalAmount - otherPaymentsTotal;

          if (value > maxAmount) {
            Alert.alert(
              'Invalid Amount',
              `Payment amount cannot exceed ₹${maxAmount.toFixed(2)} (remaining balance)`
            );
            return payment; // Don't update if invalid
          }
        }

        return updatedPayment;
      }
      return payment;
    }));
  }, [totalAmount]);

  const handleRemovePayment = useCallback((index: number) => {
    setPayments(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Calculate payment totals for create mode
  const totalPaidAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const outstandingAmount = totalAmount - totalPaidAmount;

  // Handle bill updates from payment component
  const handleBillUpdate = useCallback((updatedBill: any) => {
    console.log('BillingFormScreen - Received bill update:', {
      totalAmount: updatedBill.totalAmount,
      paidAmount: updatedBill.paidAmount,
      outstandingAmount: updatedBill.outstandingAmount,
      status: updatedBill.status,
      paymentsCount: updatedBill.payments?.length || 0,
      payments: updatedBill.payments?.map((p: any) => ({ id: p.id, amount: p.amount, date: p.paymentDate })) || []
    });

    // Verify the bill update is working correctly
    console.log('BillingFormScreen - Before update, currentBill:', currentBill ? {
      totalAmount: currentBill.totalAmount,
      paidAmount: currentBill.paidAmount,
      outstandingAmount: currentBill.outstandingAmount,
      status: currentBill.status,
      paymentsCount: currentBill.payments?.length || 0
    } : 'null');

    setCurrentBill(updatedBill);

    // Log after update to confirm state change
    setTimeout(() => {
      console.log('BillingFormScreen - After update, state should be updated');
    }, 100);
  }, [currentBill]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      // Mark all fields as touched to show validation errors
      markFieldAsTouched('customerId');
      markFieldAsTouched('billingDate');
      markFieldAsTouched('deliveryDate');
      markFieldAsTouched('items');

      Alert.alert('Validation Error', 'Please fix the errors before submitting.');
      return;
    }

    if (billItems.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one billing item.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Ensure all data is properly formatted for the backend
      const processedItems = billItems.map(item => ({
        type: item.type || 'custom',
        name: item.name || '',
        description: item.description || '',
        quantity: Number(item.quantity) || 1, // Keep as number for int() conversion
        unitPrice: Number(item.unitPrice) || 0, // Keep as number
        configItemId: item.configItemId || null
      }));

      const processedReceivedItems = receivedItems.map(item => ({
        name: item.name || '',
        description: item.description || '',
        quantity: Number(item.quantity) || 1,
        receivedDate: item.receivedDate || new Date().toISOString().split('T')[0],
        status: item.status || 'received'
      }));

      const billData = {
        customerId: formData.customerId,
        billingDate: formData.billingDate,
        deliveryDate: formData.deliveryDate,
        items: processedItems,
        receivedItems: processedReceivedItems,
        payments: mode === 'add' ? payments.filter(p => p.amount > 0) : undefined, // Only include payments for create mode
        notes: formData.notes || '',
      };

      // Debug logging (can be removed in production)
      console.log('Submitting bill data:', JSON.stringify(billData, null, 2));

      // Validate data before sending
      if (!billData.customerId) {
        Alert.alert('Error', 'Customer ID is missing');
        return;
      }
      if (!billData.billingDate) {
        Alert.alert('Error', 'Billing date is missing');
        return;
      }
      if (!billData.deliveryDate) {
        Alert.alert('Error', 'Delivery date is missing');
        return;
      }
      if (!billData.items || billData.items.length === 0) {
        Alert.alert('Error', 'No billing items found');
        return;
      }

      // Validate each item has required fields (before processing)
      for (let i = 0; i < billItems.length; i++) {
        const item = billItems[i];
        if (!item.name || item.name.trim() === '') {
          Alert.alert('Error', `Item ${i + 1} is missing a name`);
          return;
        }
        if (typeof item.quantity !== 'number' || item.quantity <= 0) {
          Alert.alert('Error', `Item ${i + 1} has invalid quantity`);
          return;
        }
        if (typeof item.unitPrice !== 'number' || item.unitPrice < 0) {
          Alert.alert('Error', `Item ${i + 1} has invalid unit price`);
          return;
        }
      }

      // Validate received items
      for (let i = 0; i < billData.receivedItems.length; i++) {
        const item = billData.receivedItems[i];
        if (!item.name || item.name.trim() === '') {
          Alert.alert('Error', `Received item ${i + 1} is missing a name`);
          return;
        }
        if (typeof item.quantity !== 'number' || item.quantity <= 0) {
          Alert.alert('Error', `Received item ${i + 1} has invalid quantity`);
          return;
        }
        if (!item.receivedDate) {
          Alert.alert('Error', `Received item ${i + 1} is missing received date`);
          return;
        }
      }

      if (mode === 'edit' && bill) {
        await updateBill(bill.id, billData);
        Alert.alert('Success', 'Bill updated successfully!');
      } else {
        await createBill(billData);
        Alert.alert('Success', 'Bill created successfully!');
      }

      navigation.goBack();
    } catch (error) {
      console.error('Error submitting bill:', error);
      Alert.alert('Error', 'Failed to save bill. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [validateForm, billItems, receivedItems, formData, mode, bill, navigation]);

  const styles = createStyles(isDarkMode);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner message="Loading form data..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          style={styles.content}
          testID="billing-form-scroll"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          {/* Customer Information */}
          <ModernCard style={[
            styles.section,
            touched.customerId && errors.customerId && styles.errorSection
          ]}>
            <Text style={styles.sectionTitle}>Customer Information</Text>

            {mode === 'edit' ? (
              // Non-editable customer display for edit mode
              (() => {
                const customer = selectedCustomer || currentBill?.customer;
                if (!customer) {
                  return (
                    <View style={styles.customerDisplay}>
                      <Text style={styles.customerName}>Loading customer information...</Text>
                    </View>
                  );
                }

                return (
                  <TouchableOpacity
                    style={styles.customerDisplay}
                    onPress={() => {
                      if (customer?.id) {
                        navigation.navigate('CustomerDetail', {
                          customerId: customer.id,
                          customer: customer
                        });
                      }
                    }}
                    activeOpacity={0.7}
                    testID="customer-info-card"
                  >
                    <View style={styles.customerHeader}>
                      <View style={styles.customerAvatar}>
                        <MaterialIcon name="person" size={24} color="#007AFF" />
                      </View>
                      <View style={styles.customerInfo}>
                        <View style={styles.customerNameRow}>
                          <Text style={styles.customerName}>
                            {customer.personalDetails?.name || 'Unknown Customer'}
                          </Text>
                          <View style={styles.customerActions}>
                            <MaterialIcon name="lock" size={14} color="#999" />
                            <MaterialIcon name="chevron-right" size={16} color="#999" />
                          </View>
                        </View>
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

                    <View style={styles.customerNote}>
                      <MaterialIcon name="info" size={14} color="#999" />
                      <Text style={styles.customerNoteText}>
                        Customer information cannot be changed when editing a bill
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })()
            ) : (
              // Editable customer search for create mode
              <CustomerSearchComponent
                onCustomerSelect={handleCustomerSelect}
                selectedCustomer={selectedCustomer}
                navigation={navigation}
              />
            )}

            {touched.customerId && errors.customerId && (
              <Text style={styles.errorText}>{errors.customerId}</Text>
            )}
          </ModernCard>

          {/* Dates */}
          <ModernCard style={styles.section}>
            <Text style={styles.sectionTitle}>Dates</Text>

            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text style={styles.fieldLabel}>Billing Date</Text>
                <TouchableOpacity
                  style={[
                    styles.dateInput,
                    touched.billingDate && errors.billingDate && styles.dateInputError
                  ]}
                  onPress={() => setShowBillingDatePicker(true)}
                  testID="billing-date-input"
                >
                  <Text style={styles.dateInputText}>
                    {formData.billingDate ? new Date(formData.billingDate).toLocaleDateString() : 'Select billing date'}
                  </Text>
                  <MaterialIcon name="calendar-today" size={20} color="#666" />
                </TouchableOpacity>
                {touched.billingDate && errors.billingDate && (
                  <Text style={styles.errorText}>{errors.billingDate}</Text>
                )}
              </View>

              <View style={styles.dateField}>
                <Text style={styles.fieldLabel}>Delivery Date</Text>
                <TouchableOpacity
                  style={[
                    styles.dateInput,
                    touched.deliveryDate && errors.deliveryDate && styles.dateInputError
                  ]}
                  onPress={() => setShowDeliveryDatePicker(true)}
                  testID="delivery-date-input"
                >
                  <Text style={styles.dateInputText}>
                    {formData.deliveryDate ? new Date(formData.deliveryDate).toLocaleDateString() : 'Select delivery date'}
                  </Text>
                  <MaterialIcon name="calendar-today" size={20} color="#666" />
                </TouchableOpacity>
                {touched.deliveryDate && errors.deliveryDate && (
                  <Text style={styles.errorText}>{errors.deliveryDate}</Text>
                )}
              </View>
            </View>
          </ModernCard>

          {/* Billing Items */}
          <ModernCard style={[
            styles.section,
            touched.items && errors.items && styles.errorSection
          ]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Billing Items</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowItemSelector(true)}
                testID="add-configured-item"
              >
                <MaterialIcon name="add" size={20} color="#007AFF" />
                <Text style={styles.addButtonText}>Add Item</Text>
              </TouchableOpacity>
            </View>

            {billItems.map((item, index) => (
              <View key={index} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <TextInput
                    style={styles.itemNameInput}
                    value={item.name}
                    onChangeText={(text) => handleUpdateBillingItem(index, 'name', text)}
                    placeholder="Item name"
                    testID={`billing-item-name-${index}`}
                  />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveBillingItem(index)}
                    testID={`remove-item-${index}`}
                  >
                    <MaterialIcon name="close" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.itemDescriptionInput}
                  value={item.description || ''}
                  onChangeText={(text) => handleUpdateBillingItem(index, 'description', text)}
                  placeholder="Description (optional)"
                  multiline
                  testID={`billing-item-description-${index}`}
                />

                <View style={styles.itemDetails}>
                  <View style={styles.itemDetailField}>
                    <Text style={styles.fieldLabel}>Quantity</Text>
                    <TextInput
                      style={styles.numberInput}
                      value={item.quantity.toString()}
                      onChangeText={(text) => handleUpdateBillingItem(index, 'quantity', parseInt(text) || 0)}
                      keyboardType="numeric"
                      testID={`billing-item-quantity-${index}`}
                    />
                  </View>

                  <View style={styles.itemDetailField}>
                    <Text style={styles.fieldLabel}>Unit Price</Text>
                    <TextInput
                      style={styles.numberInput}
                      value={item.unitPrice.toString()}
                      onChangeText={(text) => handleUpdateBillingItem(index, 'unitPrice', parseFloat(text) || 0)}
                      keyboardType="numeric"
                      testID={`billing-item-price-${index}`}
                    />
                  </View>

                  <View style={styles.itemDetailField}>
                    <Text style={styles.fieldLabel}>Total</Text>
                    <Text style={styles.totalText}>
                      ₹{(item.quantity * item.unitPrice).toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}

            {billItems.length === 0 && (
              <View style={styles.emptyState}>
                <MaterialIcon name="shopping-cart" size={48} color="#CCC" />
                <Text style={styles.emptyStateText}>No billing items added</Text>
                <Text style={styles.emptyStateSubtext}>
                  Add items from your configuration or create custom items
                </Text>
              </View>
            )}

            {touched.items && errors.items && (
              <Text style={styles.errorText}>{errors.items}</Text>
            )}

            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.totalAmount}>₹{totalAmount.toFixed(2)}</Text>
            </View>
          </ModernCard>

          {/* Received Items */}
          <ModernCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Received Items</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowReceivedItemSelector(true)}
                testID="add-received-template"
              >
                <MaterialIcon name="add" size={20} color="#007AFF" />
                <Text style={styles.addButtonText}>Add Item</Text>
              </TouchableOpacity>
            </View>

            {receivedItems.map((item, index) => (
              <View key={index} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <TextInput
                    style={styles.itemNameInput}
                    value={item.name}
                    onChangeText={(text) => handleUpdateReceivedItem(index, 'name', text)}
                    placeholder="Item name"
                    testID={`received-item-name-${index}`}
                  />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveReceivedItem(index)}
                    testID={`remove-received-item-${index}`}
                  >
                    <MaterialIcon name="close" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.itemDescriptionInput}
                  value={item.description || ''}
                  onChangeText={(text) => handleUpdateReceivedItem(index, 'description', text)}
                  placeholder="Description (optional)"
                  multiline
                  testID={`received-item-description-${index}`}
                />

                <View style={styles.itemDetails}>
                  <View style={styles.itemDetailField}>
                    <Text style={styles.fieldLabel}>Quantity</Text>
                    <TextInput
                      style={styles.numberInput}
                      value={item.quantity.toString()}
                      onChangeText={(text) => handleUpdateReceivedItem(index, 'quantity', parseInt(text) || 0)}
                      keyboardType="numeric"
                      testID={`received-item-quantity-${index}`}
                    />
                  </View>

                  <View style={styles.itemDetailField}>
                    <Text style={styles.fieldLabel}>Received Date</Text>
                    <TouchableOpacity
                      style={styles.dateInput}
                      onPress={() => setShowReceivedDatePicker(index)}
                      testID={`received-item-date-${index}`}
                    >
                      <Text style={styles.dateInputText}>
                        {item.receivedDate ? new Date(item.receivedDate).toLocaleDateString() : 'Select date'}
                      </Text>
                      <MaterialIcon name="calendar-today" size={16} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}

            {receivedItems.length === 0 && (
              <View style={styles.emptyState}>
                <MaterialIcon name="inventory" size={48} color="#CCC" />
                <Text style={styles.emptyStateText}>No received items</Text>
                <Text style={styles.emptyStateSubtext}>
                  Track items received from the customer
                </Text>
              </View>
            )}
          </ModernCard>

          {/* Notes */}
          <ModernCard style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <TextInput
              style={styles.notesInput}
              value={formData.notes}
              onChangeText={(text) => updateField('notes', text)}
              placeholder="Additional notes (optional)"
              multiline
              numberOfLines={4}
              testID="notes-input"
            />
          </ModernCard>

          {/* Payment Section - Show for create mode */}
          {mode === 'add' && (
            <ModernCard style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Payments (Optional)</Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleAddPayment}
                  testID="add-payment-button"
                >
                  <MaterialIcon name="add" size={20} color="#007AFF" />
                  <Text style={styles.addButtonText}>Add Payment</Text>
                </TouchableOpacity>
              </View>

              {/* Payment Summary */}
              {totalAmount > 0 && (
                <View style={styles.paymentSummary}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total Amount:</Text>
                    <Text style={styles.summaryValue}>₹{totalAmount.toFixed(2)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Paid Amount:</Text>
                    <Text style={[styles.summaryValue, { color: '#34C759' }]}>
                      ₹{totalPaidAmount.toFixed(2)}
                    </Text>
                  </View>
                  <View style={[styles.summaryRow, styles.outstandingRow]}>
                    <Text style={styles.summaryLabel}>Outstanding:</Text>
                    <Text style={[styles.summaryValue, {
                      color: outstandingAmount > 0 ? '#FF3B30' : '#34C759',
                      fontWeight: '700',
                    }]}>
                      ₹{outstandingAmount.toFixed(2)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Payment List */}
              {payments.map((payment, index) => (
                <View key={index} style={styles.paymentCard}>
                  <View style={styles.paymentHeader}>
                    <Text style={styles.paymentTitle}>Payment {index + 1}</Text>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemovePayment(index)}
                      testID={`remove-payment-${index}`}
                    >
                      <MaterialIcon name="close" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.paymentRow}>
                    <View style={styles.paymentField}>
                      <Text style={styles.fieldLabel}>Amount *</Text>
                      <TextInput
                        style={styles.numberInput}
                        value={payment.amount.toString()}
                        onChangeText={(text) => handleUpdatePayment(index, 'amount', parseFloat(text) || 0)}
                        keyboardType="numeric"
                        placeholder="0.00"
                        testID={`payment-amount-${index}`}
                      />
                    </View>

                    <View style={styles.paymentField}>
                      <Text style={styles.fieldLabel}>Date *</Text>
                      <TextInput
                        style={styles.textInput}
                        value={payment.paymentDate}
                        onChangeText={(text) => handleUpdatePayment(index, 'paymentDate', text)}
                        placeholder="YYYY-MM-DD"
                        testID={`payment-date-${index}`}
                      />
                    </View>
                  </View>

                  <View style={styles.paymentField}>
                    <Text style={styles.fieldLabel}>Payment Method *</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.methodButtons}>
                        {['cash', 'card', 'upi', 'bank_transfer', 'other'].map((method) => (
                          <TouchableOpacity
                            key={method}
                            style={[
                              styles.methodButton,
                              payment.paymentMethod === method && styles.methodButtonActive,
                            ]}
                            onPress={() => handleUpdatePayment(index, 'paymentMethod', method)}
                            testID={`payment-method-${method}-${index}`}
                          >
                            <Text style={[
                              styles.methodButtonText,
                              payment.paymentMethod === method && styles.methodButtonTextActive,
                            ]}>
                              {method.charAt(0).toUpperCase() + method.slice(1).replace('_', ' ')}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>

                  <View style={styles.paymentField}>
                    <Text style={styles.fieldLabel}>Notes</Text>
                    <TextInput
                      style={[styles.textInput, styles.notesInput]}
                      value={payment.notes}
                      onChangeText={(text) => handleUpdatePayment(index, 'notes', text)}
                      placeholder="Payment notes (optional)"
                      multiline
                      numberOfLines={2}
                      testID={`payment-notes-${index}`}
                    />
                  </View>
                </View>
              ))}

              {payments.length === 0 && (
                <View style={styles.emptyState}>
                  <MaterialIcon name="payment" size={48} color="#CCC" />
                  <Text style={styles.emptyStateText}>No payments added</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Add payments to track bill status from creation
                  </Text>
                </View>
              )}
            </ModernCard>
          )}

          {/* Payment Tracking - Only show when editing existing bill */}
          {mode === 'edit' && currentBill && (
            <PaymentTrackingComponent
              key={`payment-tracking-${currentBill.id}-${currentBill.payments?.length || 0}-${currentBill.updatedAt}`}
              bill={currentBill}
              onBillUpdate={handleBillUpdate}
              editable={true}
              testID="payment-tracking"
            />
          )}
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.footer}>
          <ModernButton
            title={mode === 'edit' ? 'Update Bill' : 'Create Bill'}
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
            testID="submit-button"
          />
        </View>

        {/* Date Picker Modals */}
        <CustomDatePicker
          visible={showBillingDatePicker}
          value={formData.billingDate ? new Date(formData.billingDate) : undefined}
          onDateChange={(date) => {
            updateField('billingDate', date.toISOString().split('T')[0]);
            setShowBillingDatePicker(false);
          }}
          onCancel={() => setShowBillingDatePicker(false)}
        />

        <CustomDatePicker
          visible={showDeliveryDatePicker}
          value={formData.deliveryDate ? new Date(formData.deliveryDate) : undefined}
          onDateChange={(date) => {
            updateField('deliveryDate', date.toISOString().split('T')[0]);
            setShowDeliveryDatePicker(false);
          }}
          onCancel={() => setShowDeliveryDatePicker(false)}
          minimumDate={new Date()}
        />

        {showReceivedDatePicker !== null && (
          <CustomDatePicker
            visible={true}
            value={receivedItems[showReceivedDatePicker]?.receivedDate ?
              new Date(receivedItems[showReceivedDatePicker].receivedDate) : undefined}
            onDateChange={(date) => {
              handleUpdateReceivedItem(showReceivedDatePicker, 'receivedDate', date.toISOString().split('T')[0]);
              setShowReceivedDatePicker(null);
            }}
            onCancel={() => setShowReceivedDatePicker(null)}
          />
        )}

        {/* Billing Item Selector Modal */}
        {showItemSelector && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Billing Item</Text>
                <TouchableOpacity
                  onPress={() => setShowItemSelector(false)}
                  style={styles.modalCloseButton}
                >
                  <MaterialIcon name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalContent}>
                <TouchableOpacity
                  style={[styles.modalItem, styles.customModalItem]}
                  onPress={() => {
                    handleAddCustomItem();
                    setShowItemSelector(false);
                  }}
                  testID="modal-add-custom-item"
                >
                  <View style={styles.customModalItemInfo}>
                    <MaterialIcon name="edit" size={20} color="#007AFF" />
                    <View style={styles.customItemText}>
                      <Text style={[styles.modalItemName, styles.customItemName]}>Add Custom Item</Text>
                      <Text style={styles.modalItemDescription}>Create a custom billing item</Text>
                    </View>
                  </View>
                  <MaterialIcon name="add" size={20} color="#007AFF" />
                </TouchableOpacity>

                {billingConfigItems.length > 0 && <View style={styles.modalSeparator} />}

                {billingConfigItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.modalItem}
                    onPress={() => handleAddBillingItem(item)}
                  >
                    <View style={styles.modalItemInfo}>
                      <Text style={styles.modalItemName}>{item.name}</Text>
                      {item.description && (
                        <Text style={styles.modalItemDescription}>{item.description}</Text>
                      )}
                    </View>
                    <Text style={styles.modalItemPrice}>₹{item.price.toFixed(2)}</Text>
                  </TouchableOpacity>
                ))}
                {billingConfigItems.length === 0 && (
                  <View style={styles.modalEmptyState}>
                    <Text style={styles.modalEmptyText}>No billing items configured</Text>
                    <Text style={styles.modalEmptySubtext}>
                      Go to Billing Config to add items
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        )}

        {/* Received Item Template Selector Modal */}
        {showReceivedItemSelector && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Received Item Template</Text>
                <TouchableOpacity
                  onPress={() => setShowReceivedItemSelector(false)}
                  style={styles.modalCloseButton}
                >
                  <MaterialIcon name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalContent}>
                <TouchableOpacity
                  style={[styles.modalItem, styles.customModalItem]}
                  onPress={() => {
                    handleAddCustomReceivedItem();
                    setShowReceivedItemSelector(false);
                  }}
                  testID="modal-add-custom-received-item"
                >
                  <View style={styles.customModalItemInfo}>
                    <MaterialIcon name="edit" size={20} color="#007AFF" />
                    <View style={styles.customItemText}>
                      <Text style={[styles.modalItemName, styles.customItemName]}>Add Custom Item</Text>
                      <Text style={styles.modalItemDescription}>Create a custom received item</Text>
                    </View>
                  </View>
                  <MaterialIcon name="add" size={20} color="#007AFF" />
                </TouchableOpacity>

                {receivedItemTemplates.length > 0 && <View style={styles.modalSeparator} />}

                {receivedItemTemplates.map((template) => (
                  <TouchableOpacity
                    key={template.id}
                    style={styles.modalItem}
                    onPress={() => handleAddReceivedItem(template)}
                  >
                    <View style={styles.modalItemInfo}>
                      <Text style={styles.modalItemName}>{template.name}</Text>
                      {template.description && (
                        <Text style={styles.modalItemDescription}>{template.description}</Text>
                      )}
                    </View>
                    <View style={styles.modalItemCategory}>
                      <Text style={styles.modalItemCategoryText}>
                        {template.category.charAt(0).toUpperCase() + template.category.slice(1)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
                {receivedItemTemplates.length === 0 && (
                  <View style={styles.modalEmptyState}>
                    <Text style={styles.modalEmptyText}>No received item templates configured</Text>
                    <Text style={styles.modalEmptySubtext}>
                      Go to Billing Config to add templates
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? '#000000' : '#F2F2F7',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: isDarkMode ? '#FFFFFF' : '#000000',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F0F8FF',
    borderRadius: 6,
    gap: 4,
  },
  addButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 16,
  },
  dateField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: isDarkMode ? '#FFFFFF' : '#000000',
    marginBottom: 8,
  },
  itemCard: {
    backgroundColor: isDarkMode ? '#1C1C1E' : '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemNameInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: isDarkMode ? '#FFFFFF' : '#000000',
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#3A3A3C' : '#E1E1E1',
    paddingVertical: 4,
    marginRight: 8,
  },
  removeButton: {
    padding: 4,
  },
  itemDescriptionInput: {
    fontSize: 14,
    color: isDarkMode ? '#CCCCCC' : '#666666',
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#3A3A3C' : '#E1E1E1',
    paddingVertical: 4,
    marginBottom: 12,
    minHeight: 40,
  },
  itemDetails: {
    flexDirection: 'row',
    gap: 12,
  },
  itemDetailField: {
    flex: 1,
  },
  numberInput: {
    fontSize: 14,
    color: isDarkMode ? '#FFFFFF' : '#000000',
    borderWidth: 1,
    borderColor: isDarkMode ? '#3A3A3C' : '#E1E1E1',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF',
  },
  totalText: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? '#FFFFFF' : '#000000',
    paddingVertical: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginTop: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  errorSection: {
    borderColor: '#FF3B30',
    borderWidth: 2,
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E1E1E1',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? '#FFFFFF' : '#000000',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
  },
  notesInput: {
    fontSize: 14,
    color: isDarkMode ? '#FFFFFF' : '#000000',
    borderWidth: 1,
    borderColor: isDarkMode ? '#3A3A3C' : '#E1E1E1',
    borderRadius: 8,
    padding: 12,
    backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF',
    textAlignVertical: 'top',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E1E1E1',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E1E1E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 44,
  },
  dateInputError: {
    borderColor: '#FF3B30',
  },
  dateInputText: {
    fontSize: 16,
    color: isDarkMode ? '#FFFFFF' : '#000000',
    flex: 1,
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E1E1',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    maxHeight: 400,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  modalItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  modalItemDescription: {
    fontSize: 14,
    color: '#666',
  },
  modalItemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  modalItemCategory: {
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modalItemCategoryText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  modalEmptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  modalEmptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  modalEmptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  customModalItem: {
    backgroundColor: '#F0F8FF',
    borderBottomColor: '#B3D9FF',
  },
  customModalItemInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  customItemText: {
    flex: 1,
    marginLeft: 12,
  },
  customItemName: {
    color: '#007AFF',
  },
  modalSeparator: {
    height: 1,
    backgroundColor: '#E1E1E1',
    marginVertical: 8,
  },
  // Payment section styles
  paymentSummary: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  outstandingRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E1E1E1',
    marginBottom: 0,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: isDarkMode ? '#FFFFFF' : '#000000',
  },
  paymentCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E1E1E1',
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: isDarkMode ? '#FFFFFF' : '#000000',
  },
  paymentRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  paymentField: {
    flex: 1,
  },
  textInput: {
    fontSize: 14,
    color: isDarkMode ? '#FFFFFF' : '#000000',
    borderWidth: 1,
    borderColor: isDarkMode ? '#3A3A3C' : '#E1E1E1',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF',
  },
  methodButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8,
  },
  methodButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E1E1E1',
    backgroundColor: '#FFF',
  },
  methodButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  methodButtonText: {
    fontSize: 12,
    color: '#666',
  },
  methodButtonTextActive: {
    color: '#007AFF',
    fontWeight: '500',
  },
  // Customer display styles for edit mode
  customerDisplay: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E1E1E1',
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: isDarkMode ? '#FFFFFF' : '#000000',
    flex: 1,
    marginRight: 8,
  },
  customerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  customerPhone: {
    fontSize: 14,
    color: '#666',
  },
  customerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  customerBadgeText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  customerDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  customerDetailText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  customerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E1E1E1',
    gap: 6,
  },
  customerNoteText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    flex: 1,
  },
});

export default BillingFormScreen;