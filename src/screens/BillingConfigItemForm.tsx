import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcon from '../components/MaterialIcon';
import { LoadingSpinner, ModernButton } from '../components';
import { BillingConfigItem, BillingConfigItemFormData } from '../types';
import { useFormValidation } from '../hooks/useFormValidation';
import { 
  createBillingConfigItem, 
  updateBillingConfigItem 
} from '../services/api';
import { VALIDATION_PATTERNS, VALIDATION_MESSAGES } from '../types/validation';

interface BillingConfigItemFormProps {
  navigation: any;
  route: {
    params: {
      mode: 'add' | 'edit';
      item?: BillingConfigItem;
    };
  };
}

const CATEGORY_OPTIONS = [
  { value: 'service', label: 'Service', icon: 'design-services' },
  { value: 'material', label: 'Material', icon: 'inventory' },
  { value: 'alteration', label: 'Alteration', icon: 'build' },
];

export const BillingConfigItemForm: React.FC<BillingConfigItemFormProps> = ({
  navigation,
  route,
}) => {
  const { mode, item } = route.params;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: formData,
    validation: { errors, touched },
    updateField,
    markFieldAsTouched,
    validateForm,
    resetForm,
  } = useFormValidation<BillingConfigItemFormData>({
    initialData: {
      name: item?.name || '',
      description: item?.description || '',
      price: item?.price || 0,
      category: item?.category || 'service',
    },
    validator: (data) => {
      const validationErrors: any[] = [];
      
      if (!data.name.trim()) {
        validationErrors.push({ 
          field: 'name', 
          message: VALIDATION_MESSAGES.REQUIRED 
        });
      } else if (data.name.trim().length < 2) {
        validationErrors.push({ 
          field: 'name', 
          message: VALIDATION_MESSAGES.MIN_LENGTH(2) 
        });
      }
      
      if (data.price <= 0) {
        validationErrors.push({ 
          field: 'price', 
          message: VALIDATION_MESSAGES.PRICE_REQUIRED 
        });
      }
      
      if (!data.category) {
        validationErrors.push({ 
          field: 'category', 
          message: VALIDATION_MESSAGES.INVALID_CATEGORY 
        });
      }
      
      return {
        isValid: validationErrors.length === 0,
        errors: validationErrors,
      };
    },
  });

  useEffect(() => {
    navigation.setOptions({
      title: mode === 'add' ? 'Add Billing Item' : 'Edit Billing Item',
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <MaterialIcon name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, mode]);

  const handleSubmit = async () => {
    const isValid = validateForm();
    if (!isValid) {
      Alert.alert('Validation Error', 'Please fix the errors in the form.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'add') {
        await createBillingConfigItem({
          name: formData.name.trim(),
          description: formData.description?.trim() || '',
          price: formData.price,
          category: formData.category as 'service' | 'material' | 'alteration',
        });
        Alert.alert('Success', 'Billing item created successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else if (item) {
        await updateBillingConfigItem(item.id, {
          name: formData.name.trim(),
          description: formData.description?.trim() || '',
          price: formData.price,
          category: formData.category as 'service' | 'material' | 'alteration',
        });
        Alert.alert('Success', 'Billing item updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      console.error('Error saving billing item:', error);
      Alert.alert(
        'Error',
        `Failed to ${mode === 'add' ? 'create' : 'update'} billing item. Please try again.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const renderCategoryOption = (option: typeof CATEGORY_OPTIONS[0]) => (
    <TouchableOpacity
      key={option.value}
      style={[
        styles.categoryOption,
        formData.category === option.value && styles.selectedCategoryOption,
      ]}
      onPress={() => updateField('category', option.value)}
      testID={`category-${option.value}`}
    >
      <MaterialIcon
        name={option.icon}
        size={24}
        color={formData.category === option.value ? '#007AFF' : '#8E8E93'}
      />
      <Text
        style={[
          styles.categoryLabel,
          formData.category === option.value && styles.selectedCategoryLabel,
        ]}
      >
        {option.label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>
              Item Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.textInput,
                errors.name && touched.name && styles.inputError,
              ]}
              value={formData.name}
              onChangeText={(text) => updateField('name', text)}
              onBlur={() => markFieldAsTouched('name')}
              placeholder="Enter item name (e.g., Shirt Stitching)"
              testID="item-name-input"
            />
            {errors.name && touched.name && (
              <Text style={styles.errorText}>{errors.name}</Text>
            )}
          </View>

          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[
                styles.textInput,
                styles.multilineInput,
                errors.description && touched.description && styles.inputError,
              ]}
              value={formData.description}
              onChangeText={(text) => updateField('description', text)}
              onBlur={() => markFieldAsTouched('description')}
              placeholder="Enter item description (optional)"
              multiline
              numberOfLines={3}
              testID="item-description-input"
            />
            {errors.description && touched.description && (
              <Text style={styles.errorText}>{errors.description}</Text>
            )}
          </View>

          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>
              Price (₹) <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.textInput,
                errors.price && touched.price && styles.inputError,
              ]}
              value={formData.price.toString()}
              onChangeText={(text) => {
                const numericValue = parseFloat(text) || 0;
                updateField('price', numericValue);
              }}
              onBlur={() => markFieldAsTouched('price')}
              placeholder="Enter price"
              keyboardType="numeric"
              testID="item-price-input"
            />
            {errors.price && touched.price && (
              <Text style={styles.errorText}>{errors.price}</Text>
            )}
          </View>

          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>
              Category <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.categoryContainer}>
              {CATEGORY_OPTIONS.map(renderCategoryOption)}
            </View>
            {errors.category && touched.category && (
              <Text style={styles.errorText}>{errors.category}</Text>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <ModernButton
          title="Cancel"
          onPress={handleCancel}
          variant="secondary"
          style={styles.cancelButton}
          testID="cancel-button"
        />
        <ModernButton
          title={mode === 'add' ? 'Create Item' : 'Update Item'}
          onPress={handleSubmit}
          loading={isSubmitting}
          style={styles.submitButton}
          testID="submit-button"
        />
      </View>
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
  content: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  formField: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  required: {
    color: '#FF3B30',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E1E1E1',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFF',
    color: '#000',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 4,
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryOption: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E1E1E1',
    borderRadius: 8,
    backgroundColor: '#FFF',
  },
  selectedCategoryOption: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 8,
  },
  selectedCategoryLabel: {
    color: '#007AFF',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E1E1E1',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
});