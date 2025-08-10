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
import { ReceivedItemTemplate, ReceivedItemTemplateFormData } from '../types';
import { useFormValidation } from '../hooks/useFormValidation';
import { 
  createReceivedItemTemplate, 
  updateReceivedItemTemplate 
} from '../services/api';
import { VALIDATION_MESSAGES } from '../types/validation';

interface ReceivedItemTemplateFormProps {
  navigation: any;
  route: {
    params: {
      mode: 'add' | 'edit';
      template?: ReceivedItemTemplate;
    };
  };
}

const CATEGORY_OPTIONS = [
  { value: 'sample', label: 'Sample', icon: 'style', description: 'Sample garments for reference' },
  { value: 'material', label: 'Material', icon: 'inventory', description: 'Fabrics and materials' },
  { value: 'accessory', label: 'Accessory', icon: 'category', description: 'Buttons, zippers, etc.' },
  { value: 'other', label: 'Other', icon: 'more-horiz', description: 'Other items' },
];

export const ReceivedItemTemplateForm: React.FC<ReceivedItemTemplateFormProps> = ({
  navigation,
  route,
}) => {
  const { mode, template } = route.params;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: formData,
    validation: { errors, touched },
    updateField,
    markFieldAsTouched,
    validateForm,
    resetForm,
  } = useFormValidation<ReceivedItemTemplateFormData>({
    initialData: {
      name: template?.name || '',
      description: template?.description || '',
      category: template?.category || 'sample',
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
      title: mode === 'add' ? 'Add Item Template' : 'Edit Item Template',
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
        await createReceivedItemTemplate({
          name: formData.name.trim(),
          description: formData.description?.trim() || '',
          category: formData.category as 'sample' | 'material' | 'accessory' | 'other',
        });
        Alert.alert('Success', 'Item template created successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else if (template) {
        await updateReceivedItemTemplate(template.id, {
          name: formData.name.trim(),
          description: formData.description?.trim() || '',
          category: formData.category as 'sample' | 'material' | 'accessory' | 'other',
        });
        Alert.alert('Success', 'Item template updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      console.error('Error saving item template:', error);
      Alert.alert(
        'Error',
        `Failed to ${mode === 'add' ? 'create' : 'update'} item template. Please try again.`
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
      <View style={styles.categoryHeader}>
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
      </View>
      <Text
        style={[
          styles.categoryDescription,
          formData.category === option.value && styles.selectedCategoryDescription,
        ]}
      >
        {option.description}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>
              Template Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.textInput,
                errors.name && touched.name && styles.inputError,
              ]}
              value={formData.name}
              onChangeText={(text) => updateField('name', text)}
              onBlur={() => markFieldAsTouched('name')}
              placeholder="Enter template name (e.g., Sample Blouse)"
              testID="template-name-input"
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
              placeholder="Enter template description (optional)"
              multiline
              numberOfLines={3}
              testID="template-description-input"
            />
            {errors.description && touched.description && (
              <Text style={styles.errorText}>{errors.description}</Text>
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

          <View style={styles.infoBox}>
            <MaterialIcon name="info" size={20} color="#007AFF" />
            <Text style={styles.infoText}>
              Templates help you quickly add commonly received items when creating bills. 
              Choose the category that best describes the type of items you typically receive.
            </Text>
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
          title={mode === 'add' ? 'Create Template' : 'Update Template'}
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
    gap: 12,
  },
  categoryOption: {
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
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginLeft: 12,
  },
  selectedCategoryLabel: {
    color: '#007AFF',
  },
  categoryDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 36,
  },
  selectedCategoryDescription: {
    color: '#007AFF',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F8FF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#B3D9FF',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 12,
    lineHeight: 20,
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