import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcon from '../components/MaterialIcon';
import { useThemeContext } from '../contexts/ThemeContext';
import {
  LoadingSpinner,
  ModernCard,
} from '../components';
import ModernButton from '../components/ModernButton';
import {
  Customer,
  BillingConfigItem,
  ReceivedItemTemplate,
  BillItem,
  ReceivedItem,
  Payment,
  DeliveryStatus
} from '../types';
import { getBillingConfigItems, getReceivedItemTemplates, createBill } from '../services/api';

// Import step components
import CustomerSelectionStep from '../components/billing/CustomerSelectionStep';
import BasicInfoStep from '../components/billing/BasicInfoStep';
import BillingItemsStep from '../components/billing/BillingItemsStep';
import ReceivedItemsStep from '../components/billing/ReceivedItemsStep';
import PaymentInfoStep from '../components/billing/PaymentInfoStep';
import ReviewStep from '../components/billing/ReviewStep';

interface CreateBillWizardScreenProps {
  navigation: any;
  route: {
    params?: {
      customerId?: string;
    };
  };
}

export interface BillWizardData {
  // Customer info
  selectedCustomer: Customer | null;
  
  // Basic info
  billingDate: string;
  deliveryDate: string;
  notes: string;
  deliveryStatus: DeliveryStatus;
  
  // Items
  billItems: Omit<BillItem, 'id' | 'totalPrice'>[];
  receivedItems: Omit<ReceivedItem, 'id'>[];
  
  // Payments
  payments: Omit<Payment, 'id' | 'createdAt'>[];
  
  // Temporary image storage for items during creation
  itemImages: { [itemIndex: number]: string[] };
}

const STEPS = [
  { id: 1, title: 'Customer', icon: 'person' },
  { id: 2, title: 'Basic Info', icon: 'info' },
  { id: 3, title: 'Bill Items', icon: 'receipt' },
  { id: 4, title: 'Received Items', icon: 'inventory' },
  { id: 5, title: 'Payment', icon: 'payment' },
  { id: 6, title: 'Review', icon: 'check-circle' },
];

const CreateBillWizardScreen: React.FC<CreateBillWizardScreenProps> = ({
  navigation,
  route,
}) => {
  const { customerId } = route.params || {};
  const { isDarkMode } = useThemeContext();

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [billingConfigItems, setBillingConfigItems] = useState<BillingConfigItem[]>([]);
  const [receivedItemTemplates, setReceivedItemTemplates] = useState<ReceivedItemTemplate[]>([]);

  const [wizardData, setWizardData] = useState<BillWizardData>({
    selectedCustomer: null,
    billingDate: new Date().toISOString().split('T')[0],
    deliveryDate: '',
    notes: '',
    deliveryStatus: 'pending',
    billItems: [],
    receivedItems: [],
    payments: [],
    itemImages: {},
  });

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [configItems, templates] = await Promise.all([
          getBillingConfigItems(),
          getReceivedItemTemplates(),
        ]);

        setBillingConfigItems(configItems);
        setReceivedItemTemplates(templates);
      } catch (error) {
        console.error('Error loading wizard data:', error);
        Alert.alert('Error', 'Failed to load form data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Set navigation header
  useEffect(() => {
    navigation.setOptions({
      title: 'Create Bill',
      headerLeft: () => (
        <TouchableOpacity
          onPress={handleBack}
          style={styles.headerButton}
        >
          <MaterialIcon name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, currentStep]);

  const updateWizardData = useCallback((updates: Partial<BillWizardData>) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  }, []);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    } else {
      navigation.goBack();
    }
  }, [currentStep, navigation]);

  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  const handleStepPress = useCallback((stepId: number) => {
    // Allow navigation to previous steps or current step
    if (stepId <= currentStep) {
      setCurrentStep(stepId);
    }
  }, [currentStep]);

  const validateCurrentStep = useCallback((): boolean => {
    switch (currentStep) {
      case 1: // Customer Selection
        if (!wizardData.selectedCustomer) {
          Alert.alert('Required', 'Please select a customer to continue.');
          return false;
        }
        return true;

      case 2: // Basic Info
        if (!wizardData.billingDate) {
          Alert.alert('Required', 'Please select a billing date.');
          return false;
        }
        if (!wizardData.deliveryDate) {
          Alert.alert('Required', 'Please select a delivery date.');
          return false;
        }
        const deliveryDate = new Date(wizardData.deliveryDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (deliveryDate < today) {
          Alert.alert('Invalid Date', 'Delivery date cannot be in the past.');
          return false;
        }
        return true;

      case 3: // Billing Items
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
        return true;

      case 4: // Received Items (optional)
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

      case 5: // Payment Info (optional)
        const totalAmount = wizardData.billItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const totalPaid = wizardData.payments.reduce((sum, payment) => sum + payment.amount, 0);
        if (totalPaid > totalAmount) {
          Alert.alert('Invalid Payment', 'Total payments cannot exceed the bill amount.');
          return false;
        }
        return true;

      case 6: // Review
        return true;

      default:
        return true;
    }
  }, [currentStep, wizardData]);

  const handleSubmit = useCallback(async () => {
    if (!validateCurrentStep()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const billData = {
        customerId: wizardData.selectedCustomer!.id,
        billingDate: wizardData.billingDate,
        deliveryDate: wizardData.deliveryDate,
        deliveryStatus: wizardData.deliveryStatus,
        items: wizardData.billItems.map(item => ({
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
          name: item.name,
          description: item.description || '',
          quantity: Number(item.quantity),
          receivedDate: item.receivedDate,
          status: item.status || 'received'
        })),
        payments: wizardData.payments.filter(p => p.amount > 0),
        notes: wizardData.notes || '',
      };

      const createdBill = await createBill(billData);
      
      // Wait a moment to ensure bill and items are fully saved to database
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Upload images for items that have them
      const imageUploadPromises = [];
      const uploadTimestamp = Date.now();
      
      console.log('Starting image upload process for new bill...');
      console.log('Items with images:', Object.keys(wizardData.itemImages));
      
      for (const [itemIndex, images] of Object.entries(wizardData.itemImages)) {
        const index = parseInt(itemIndex);
        console.log(`Processing item ${index} with ${images.length} images`);
        
        if (images && images.length > 0 && createdBill.items && createdBill.items[index]) {
          const itemId = createdBill.items[index].id;
          console.log(`Item ${index} ID: ${itemId}`);
          
          for (let i = 0; i < images.length; i++) {
            const imageData = images[i];
            
            try {
              // Extract base64 data (remove data:image/jpeg;base64, prefix)
              const base64Data = imageData.split(',')[1];
              const contentType = imageData.split(';')[0].split(':')[1];
              
              if (!base64Data) {
                console.error(`No base64 data found for image ${i} of item ${index}`);
                continue;
              }
              
              // Use full IDs for API call (no prefix stripping needed)
              const billIdForApi = createdBill.id;
              const itemIdForApi = itemId;
              
              // Create unique filename with timestamp and sequence
              const filename = `item_${itemIndex}_image_${uploadTimestamp}_${i + 1}.jpg`;
              
              console.log(`Preparing upload for item ${index}, image ${i + 1}: ${filename}`);
              
              const uploadPromise = import('../services/api').then(({ uploadBillItemImage }) => {
                console.log(`Uploading image ${i + 1} for item ${index}...`);
                return uploadBillItemImage(
                  billIdForApi,
                  itemIdForApi,
                  base64Data,
                  filename,
                  contentType
                ).then(result => {
                  console.log(`Successfully uploaded image ${i + 1} for item ${index}:`, result.imageUrl);
                  return result;
                }).catch(error => {
                  console.error(`Failed to upload image ${i + 1} for item ${index}:`, error);
                  throw error;
                });
              });
              
              imageUploadPromises.push(uploadPromise);
            } catch (error) {
              console.error(`Error processing image ${i} for item ${itemIndex}:`, error);
            }
          }
        } else {
          console.log(`Skipping item ${index}: no images or item not found`);
        }
      }
      
      console.log(`Total image upload promises: ${imageUploadPromises.length}`);
      
      // Wait for all image uploads to complete
      if (imageUploadPromises.length > 0) {
        try {
          console.log(`Processing ${imageUploadPromises.length} image uploads sequentially...`);
          
          let successful = 0;
          let failed = 0;
          
          // Process uploads sequentially to avoid overwhelming the server
          for (let i = 0; i < imageUploadPromises.length; i++) {
            try {
              console.log(`Processing upload ${i + 1} of ${imageUploadPromises.length}...`);
              await imageUploadPromises[i];
              successful++;
              console.log(`Upload ${i + 1} completed successfully`);
              
              // Add a small delay between uploads to avoid rate limiting
              if (i < imageUploadPromises.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            } catch (error) {
              failed++;
              console.error(`Upload ${i + 1} failed:`, error);
            }
          }
          
          console.log(`Image upload results: ${successful} successful, ${failed} failed`);
          
          if (successful > 0) {
            console.log(`Successfully uploaded ${successful} images`);
          }
        } catch (error) {
          console.error('Error in image upload process:', error);
          // Don't fail the entire process if image upload fails
        }
      } else {
        console.log('No images to upload');
      }
      
      Alert.alert('Success', 'Bill created successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('Billing') }
      ]);
    } catch (error) {
      console.error('Error creating bill:', error);
      Alert.alert('Error', 'Failed to create bill. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [wizardData, validateCurrentStep, navigation]);



  const renderCurrentStep = () => {
    const commonProps = {
      wizardData,
      updateWizardData,
      navigation,
      billingConfigItems,
      receivedItemTemplates,
    };

    switch (currentStep) {
      case 1:
        return <CustomerSelectionStep {...commonProps} />;
      case 2:
        return <BasicInfoStep {...commonProps} />;
      case 3:
        return <BillingItemsStep {...commonProps} />;
      case 4:
        return <ReceivedItemsStep {...commonProps} />;
      case 5:
        return <PaymentInfoStep {...commonProps} />;
      case 6:
        return <ReviewStep {...commonProps} />;
      default:
        return null;
    }
  };

  const styles = createStyles(isDarkMode);

  if (isLoading) {
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
        <View style={styles.stepContent}>
          {renderCurrentStep()}
        </View>

        <View style={styles.navigationButtons}>
          {currentStep > 1 && (
            <ModernButton
              title="Back"
              onPress={handleBack}
              variant="outline"
              style={styles.backButton}
            />
          )}
          
          {currentStep < STEPS.length ? (
            <ModernButton
              title={`Next (${currentStep}/${STEPS.length})`}
              onPress={() => {
                if (validateCurrentStep()) {
                  handleNext();
                }
              }}
              style={styles.nextButton}
            />
          ) : (
            <ModernButton
              title="Create Bill"
              onPress={handleSubmit}
              loading={isSubmitting}
              style={styles.submitButton}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? '#000' : '#F2F2F7',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  headerButton: {
    padding: 8,
  },

  stepContent: {
    flex: 1,
    padding: 16,
  },
  navigationButtons: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 8,
    backgroundColor: isDarkMode ? '#1C1C1E' : '#FFF',
    borderTopWidth: 1,
    borderTopColor: isDarkMode ? '#38383A' : '#E5E5EA',
    gap: 12,
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
  submitButton: {
    flex: 1,
  },
});

export default CreateBillWizardScreen;