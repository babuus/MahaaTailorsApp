import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { MeasurementConfigStackParamList, MeasurementConfig } from '../types';
import { COLORS, SPACING } from '../constants';
import { useThemeContext } from '../contexts/ThemeContext';
import { apiService } from '../services/api';
import { 
  FormInput, 
  LoadingSpinner, 
  SuccessMessage, 
  FormSkeleton,
  SkeletonLoader,
  ConfirmDialog
} from '../components';
import { validateMeasurementConfigForm } from '../utils/validation';

type MeasurementConfigFormScreenNavigationProp = StackNavigationProp<
  MeasurementConfigStackParamList,
  'MeasurementConfigForm'
>;

type MeasurementConfigFormScreenRouteProp = RouteProp<
  MeasurementConfigStackParamList,
  'MeasurementConfigForm'
>;

interface Props {
  navigation: MeasurementConfigFormScreenNavigationProp;
  route: MeasurementConfigFormScreenRouteProp;
}

interface FormData {
  garmentType: string;
  measurements: string[];
}

interface FormErrors {
  garmentType?: string;
  measurements?: string;
}

const MeasurementConfigFormScreen: React.FC<Props> = ({ navigation, route }) => {
  const { isDarkMode } = useThemeContext();
  const { config, mode } = route.params;
  const isEditMode = mode === 'edit';

  // Form state
  const [formData, setFormData] = useState<FormData>({
    garmentType: config?.garmentType || '',
    measurements: config?.measurements || [''],
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorDialogMessage, setErrorDialogMessage] = useState('');

  // Form navigation refs
  const garmentTypeRef = useRef<TextInput>(null);
  const measurementRefs = useRef<(TextInput | null)[]>([]);

  // Set measurement refs
  const setMeasurementRef = (index: number) => (ref: TextInput | null) => {
    measurementRefs.current[index] = ref;
  };

  // Mark form as dirty when data changes
  useEffect(() => {
    if (isEditMode && config) {
      const hasChanges = 
        formData.garmentType !== config.garmentType ||
        JSON.stringify(formData.measurements) !== JSON.stringify(config.measurements);
      setIsDirty(hasChanges);
    } else {
      setIsDirty(formData.garmentType.trim() !== '' || formData.measurements.some(m => m.trim() !== ''));
    }
  }, [formData, config, isEditMode]);

  // Enhanced validation function using validation utilities
  const validateForm = useCallback((): boolean => {
    const result = validateMeasurementConfigForm(formData);
    const newErrors: FormErrors = {};
    
    // Convert validation result to form errors
    result.errors.forEach(error => {
      if (error.field === 'garmentType') {
        newErrors.garmentType = error.message;
      } else if (error.field === 'measurements' || error.field.startsWith('measurements.')) {
        newErrors.measurements = error.message;
      }
    });

    setErrors(newErrors);
    
    // Mark all fields as touched to show validation errors
    setTouched({
      garmentType: true,
      measurements: true,
    });

    return result.isValid;
  }, [formData]);

  // Real-time field validation
  const validateField = useCallback((fieldName: string, value: any) => {
    const testData = { ...formData };
    if (fieldName === 'garmentType') {
      testData.garmentType = value;
    } else if (fieldName === 'measurements') {
      testData.measurements = value;
    }

    const result = validateMeasurementConfigForm(testData);
    const fieldErrors = result.errors.filter(error => 
      error.field === fieldName || error.field.startsWith(`${fieldName}.`)
    );

    if (fieldErrors.length > 0) {
      setErrors(prev => ({
        ...prev,
        [fieldName]: fieldErrors[0].message,
      }));
    } else {
      setErrors(prev => ({
        ...prev,
        [fieldName]: undefined,
      }));
    }
  }, [formData]);

  // Handle garment type change with validation
  const handleGarmentTypeChange = useCallback((text: string) => {
    setFormData(prev => ({ ...prev, garmentType: text }));
    setTouched(prev => ({ ...prev, garmentType: true }));
    
    // Clear error when user starts typing
    if (errors.garmentType) {
      setErrors(prev => ({ ...prev, garmentType: undefined }));
    }
    
    // Validate on change for immediate feedback
    setTimeout(() => validateField('garmentType', text), 100);
  }, [errors.garmentType, validateField]);

  // Handle measurement field change with validation
  const handleMeasurementChange = useCallback((index: number, text: string) => {
    setFormData(prev => {
      const newMeasurements = [...prev.measurements];
      newMeasurements[index] = text;
      return { ...prev, measurements: newMeasurements };
    });
    
    setTouched(prev => ({ ...prev, measurements: true }));
    
    // Clear error when user starts typing
    if (errors.measurements) {
      setErrors(prev => ({ ...prev, measurements: undefined }));
    }
    
    // Validate measurements after a short delay
    setTimeout(() => {
      const newMeasurements = [...formData.measurements];
      newMeasurements[index] = text;
      validateField('measurements', newMeasurements);
    }, 100);
  }, [errors.measurements, formData.measurements, validateField]);

  // Add new measurement field
  const addMeasurementField = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      measurements: [...prev.measurements, ''],
    }));
  }, []);

  // Remove measurement field
  const removeMeasurementField = useCallback((index: number) => {
    if (formData.measurements.length <= 1) {
      setErrorDialogMessage('At least one measurement field is required');
      setShowErrorDialog(true);
      return;
    }

    setFormData(prev => ({
      ...prev,
      measurements: prev.measurements.filter((_, i) => i !== index),
    }));
  }, [formData.measurements.length]);

  // Handle delete template
  const handleDelete = useCallback(() => {
    if (!isEditMode || !config) return;
    setShowDeleteDialog(true);
  }, [isEditMode, config]);

  // Confirm delete template
  const handleConfirmDelete = useCallback(async () => {
    if (!config) return;

    setShowDeleteDialog(false);
    setIsSubmitting(true);
    
    try {
      await apiService.deleteMeasurementConfig(config.id);
      
      // Show success message
      setSuccessMessage('Template deleted successfully');
      setShowSuccessMessage(true);
      
      // Navigate back after showing success message
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error) {
      console.error('Error deleting template:', error);
      setErrorDialogMessage('Failed to delete template. Please try again.');
      setShowErrorDialog(true);
    } finally {
      setIsSubmitting(false);
    }
  }, [config, navigation]);

  // Cancel delete
  const handleCancelDelete = useCallback(() => {
    setShowDeleteDialog(false);
  }, []);

  // Handle form submission with enhanced feedback
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      // Focus first invalid field
      if (errors.garmentType && garmentTypeRef.current) {
        garmentTypeRef.current.focus();
      } else if (errors.measurements && measurementRefs.current[0]) {
        measurementRefs.current[0]?.focus();
      }
      
      setErrorDialogMessage('Please fix the errors in the form before submitting.');
      setShowErrorDialog(true);
      return;
    }

    setIsSubmitting(true);

    try {
      // Filter out empty measurement fields
      const validMeasurements = formData.measurements
        .map(m => m.trim())
        .filter(m => m !== '');

      const submitData = {
        garmentType: formData.garmentType.trim(),
        measurements: validMeasurements,
      };

      if (isEditMode && config) {
        await apiService.updateMeasurementConfig(config.id, {
          id: config.id,
          ...submitData,
        });
        
        // Show success message
        setSuccessMessage('Template updated successfully');
        setShowSuccessMessage(true);
        
        // Navigate back after showing success message
        setTimeout(() => {
          navigation.goBack();
        }, 1500);
      } else {
        await apiService.createMeasurementConfig(submitData);
        
        // Show success message
        setSuccessMessage('Template created successfully');
        setShowSuccessMessage(true);
        
        // Navigate back after showing success message
        setTimeout(() => {
          navigation.goBack();
        }, 1500);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      setErrorDialogMessage(`Failed to ${isEditMode ? 'update' : 'create'} template. Please try again.`);
      setShowErrorDialog(true);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, isEditMode, config, navigation, errors]);

  // Handle back navigation with unsaved changes warning
  const handleBackPress = useCallback(() => {
    if (isDirty) {
      setShowUnsavedChangesDialog(true);
    } else {
      navigation.goBack();
    }
  }, [isDirty, navigation]);

  // Confirm discard changes
  const handleConfirmDiscard = useCallback(() => {
    setShowUnsavedChangesDialog(false);
    navigation.goBack();
  }, [navigation]);

  // Cancel discard
  const handleCancelDiscard = useCallback(() => {
    setShowUnsavedChangesDialog(false);
  }, []);

  const containerStyle = {
    backgroundColor: isDarkMode ? COLORS.DARK : COLORS.LIGHT,
  };

  const textStyle = {
    color: isDarkMode ? COLORS.LIGHT : COLORS.DARK,
  };

  const cardStyle = {
    backgroundColor: isDarkMode ? '#333' : '#fff',
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, containerStyle]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {isSubmitting && (
        <View style={styles.loadingOverlay}>
          <FormSkeleton 
            fieldCount={3} 
            showTitle={true} 
            showButtons={true}
          />
        </View>
      )}
      
      <SuccessMessage
        visible={showSuccessMessage}
        message={successMessage}
        onDismiss={() => setShowSuccessMessage(false)}
        testID="success-message"
      />

      <ConfirmDialog
        visible={showDeleteDialog}
        title="Delete Template"
        message={`Are you sure you want to delete the "${config?.garmentType}" template? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        destructive={true}
      />

      <ConfirmDialog
        visible={showUnsavedChangesDialog}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to go back?"
        confirmText="Discard"
        cancelText="Cancel"
        onConfirm={handleConfirmDiscard}
        onCancel={handleCancelDiscard}
        destructive={true}
      />

      <ConfirmDialog
        visible={showErrorDialog}
        title="Error"
        message={errorDialogMessage}
        confirmText="OK"
        onConfirm={() => setShowErrorDialog(false)}
        onCancel={() => setShowErrorDialog(false)}
      />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Form Card */}
        <View style={[styles.formCard, cardStyle]}>
          {/* Garment Type Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, textStyle]}>Garment Type</Text>
            <FormInput
              label="Garment Type"
              value={formData.garmentType}
              onChangeText={handleGarmentTypeChange}
              placeholder="e.g., Shirt, Pants, Dress"
              error={touched.garmentType ? errors.garmentType : undefined}
              success={touched.garmentType && !errors.garmentType && formData.garmentType.trim() !== ''}
              required
              autoFocus={!isEditMode}
              returnKeyType="next"
              onSubmitEditing={() => measurementRefs.current[0]?.focus()}
              blurOnSubmit={false}
              showCharacterCount
              maxLength={50}
              helperText="Enter the type of garment (e.g., Shirt, Pants, Dress)"
              testID="garment-type-input"
            />
          </View>

          {/* Measurements Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, textStyle]}>Measurement Fields</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={addMeasurementField}
                accessibilityLabel="Add measurement field"
                testID="add-measurement-field-button"
              >
                <Icon name="add" size={24} color={COLORS.PRIMARY} />
              </TouchableOpacity>
            </View>

            {formData.measurements.map((measurement, index) => {
              const isLastField = index === formData.measurements.length - 1;
              const hasValue = measurement.trim() !== '';
              
              return (
                <View key={index} style={styles.measurementRow}>
                  <View style={styles.measurementInput}>
                    <FormInput
                      ref={setMeasurementRef(index)}
                      label={`Field ${index + 1}`}
                      value={measurement}
                      onChangeText={(text) => handleMeasurementChange(index, text)}
                      placeholder="e.g., Chest, Waist, Length"
                      success={hasValue && touched.measurements}
                      returnKeyType={isLastField ? "done" : "next"}
                      onSubmitEditing={() => {
                        if (isLastField) {
                          // Focus save button or dismiss keyboard
                          measurementRefs.current[index]?.blur();
                        } else {
                          // Focus next measurement field
                          measurementRefs.current[index + 1]?.focus();
                        }
                      }}
                      blurOnSubmit={isLastField}
                      maxLength={30}
                      showCharacterCount={hasValue}
                      helperText={index === 0 ? "Enter measurement field names" : undefined}
                      testID={`measurement-field-${index}`}
                    />
                  </View>
                  {formData.measurements.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeMeasurementField(index)}
                      accessibilityLabel={`Remove measurement field ${index + 1}`}
                      testID={`remove-measurement-field-${index}`}
                    >
                      <Icon name="remove" size={24} color={COLORS.ERROR} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            {errors.measurements && (
              <Text style={styles.errorText}>{errors.measurements}</Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={[styles.actionBar, cardStyle]}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={handleBackPress}
          disabled={isSubmitting}
          testID="cancel-button"
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        {isEditMode && (
          <TouchableOpacity
            style={[styles.button, styles.deleteButton, isSubmitting && styles.disabledButton]}
            onPress={handleDelete}
            disabled={isSubmitting}
            testID="delete-button"
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.button,
            styles.saveButton,
            isSubmitting && styles.disabledButton,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          testID="save-button"
        >
          <Text style={styles.saveButtonText}>
            {isEditMode ? 'Update' : 'Create'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.MD,
    paddingBottom: 100, // Space for action bar
  },
  formCard: {
    borderRadius: 8,
    padding: SPACING.MD,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  section: {
    marginBottom: SPACING.LG,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: SPACING.MD,
  },
  addButton: {
    padding: SPACING.XS,
    borderRadius: 20,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
  },
  measurementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.SM,
  },
  measurementInput: {
    flex: 1,
    marginRight: SPACING.SM,
  },
  removeButton: {
    padding: SPACING.XS,
    borderRadius: 20,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    marginTop: 8, // Align with input field
  },
  errorText: {
    color: COLORS.ERROR,
    fontSize: 14,
    marginTop: SPACING.XS,
    marginLeft: SPACING.SM,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: SPACING.MD,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  button: {
    flex: 1,
    paddingVertical: SPACING.MD,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
    marginRight: SPACING.SM,
  },
  cancelButtonText: {
    color: COLORS.PRIMARY,
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: COLORS.ERROR,
    marginHorizontal: SPACING.XS,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: COLORS.PRIMARY,
    marginLeft: SPACING.SM,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 1000,
    padding: SPACING.MD,
  },
});

export default MeasurementConfigFormScreen;