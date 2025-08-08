import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Dimensions,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

import {
  CustomerStackParamList,
  Customer,
  CustomerFormData,
  CustomerMeasurement,
  MeasurementConfig,
  MeasurementField,
} from '../types';
import { COLORS, SPACING } from '../constants';
import { useThemeContext } from '../contexts/ThemeContext';
import {
  FormInput,
  LoadingSpinner,
  ConfirmDialog,
  DuplicateWarningDialog,
  CustomDatePicker,
  SuccessMessage,
  FormSkeleton,
  MeasurementFormSkeleton,
  SkeletonLoader,
  ThumbFriendlyForm,
} from '../components';
import { apiService } from '../services/api';
import {
  validateCustomerForm,
  shouldShowFieldError,
  getFieldError,
} from '../utils/validation';
import { useFormValidation } from '../hooks/useFormValidation';

type CustomerFormScreenNavigationProp = StackNavigationProp<
  CustomerStackParamList,
  'CustomerForm'
>;

type CustomerFormScreenRouteProp = RouteProp<
  CustomerStackParamList,
  'CustomerForm'
>;

interface Props {
  navigation: CustomerFormScreenNavigationProp;
  route: CustomerFormScreenRouteProp;
}

const CustomerFormScreen: React.FC<Props> = ({ navigation, route }) => {
  const { customer, mode } = route.params;
  const isEditMode = mode === 'edit';
  const { isDarkMode } = useThemeContext();

  // Initial form data
  const initialFormData: CustomerFormData = {
    personalDetails: {
      name: customer?.personalDetails.name || '',
      phone: customer?.personalDetails.phone || '',
      email: customer?.personalDetails.email || '',
      address: customer?.personalDetails.address || '',
      dob: customer?.personalDetails.dob || '',
    },
    measurements: customer?.measurements || [],
    comments: customer?.comments || '',
  };

  // Form validation hook
  const {
    data: formData,
    setData: setFormData,
    updateField,
    validation,
    validateForm,
    isDirty,
    isSubmitting,
    hasErrors,
    handleSubmit: submitForm,
    resetForm,
    getFieldError,
    shouldShowFieldError,
    markFieldAsTouched,
  } = useFormValidation({
    initialData: initialFormData,
    validator: validateCustomerForm,
    validateOnChange: false,
    validateOnBlur: true,
    preventDuplicateSubmissions: true,
  });

  // Safety check for validation object
  const safeValidation = validation || { errors: {}, touched: {}, isValid: true };

  // Form navigation refs
  const scrollViewRef = useRef<ScrollView>(null);
  const fieldNames = ['name', 'phone', 'email', 'address', 'comments'];
  const inputRefs = useRef<{ [key: string]: any }>({});
  
  // Measurement field refs for automatic navigation
  const measurementRefs = useRef<{ [key: string]: any }>({});

  // Helper function to focus next field
  const focusNextField = useCallback((currentField: string) => {
    const currentIndex = fieldNames.indexOf(currentField);
    if (currentIndex !== -1 && currentIndex < fieldNames.length - 1) {
      const nextField = fieldNames[currentIndex + 1];
      const nextRef = inputRefs.current[nextField];
      if (nextRef) {
        // Use requestAnimationFrame for smoother transition
        requestAnimationFrame(() => {
          nextRef.focus();
        });
      }
    }
  }, [fieldNames]);

  // Helper function to focus next measurement field
  const focusNextMeasurementField = useCallback((measurementIndex: number, fieldIndex: number, totalFields: number) => {
    if (fieldIndex < totalFields - 1) {
      // Focus next field in same measurement
      const nextFieldKey = `measurement_${measurementIndex}_${fieldIndex + 1}`;
      const nextRef = measurementRefs.current[nextFieldKey];
      if (nextRef) {
        // Use requestAnimationFrame for smoother transition
        requestAnimationFrame(() => {
          nextRef.focus();
        });
      }
    } else {
      // Focus notes field for this measurement
      const notesKey = `measurement_notes_${measurementIndex}`;
      const notesRef = measurementRefs.current[notesKey];
      if (notesRef) {
        // Use requestAnimationFrame for smoother transition
        requestAnimationFrame(() => {
          notesRef.focus();
        });
      }
    }
  }, []);

  // UI state
  const [measurementConfigs, setMeasurementConfigs] = useState<MeasurementConfig[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  // State for measurement slider active indices
  const [measurementActiveIndices, setMeasurementActiveIndices] = useState<Record<string, number>>({});

  // Duplicate checking state
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  // Loading state for form submission (after checkingDuplicates is defined)
  const loading = isSubmitting || checkingDuplicates;
  const [duplicateCustomers, setDuplicateCustomers] = useState<Customer[]>([]);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState(false);

  // Confirmation dialogs
  const [discardDialog, setDiscardDialog] = useState({ visible: false });

  // Theme styles
  const containerStyle = useMemo(() => ({
    backgroundColor: isDarkMode ? COLORS.DARK : COLORS.LIGHT,
  }), [isDarkMode]);

  const cardStyle = useMemo(() => ({
    backgroundColor: isDarkMode ? '#333333' : '#FFFFFF',
  }), [isDarkMode]);

  const textStyle = useMemo(() => ({
    color: isDarkMode ? COLORS.LIGHT : COLORS.DARK,
  }), [isDarkMode]);

  const subtextStyle = useMemo(() => ({
    color: isDarkMode ? '#B0B0B0' : '#666666',
  }), [isDarkMode]);

  // Load measurement configurations
  const loadMeasurementConfigs = useCallback(async () => {
    try {
      setLoadingConfigs(true);
      const configs = await apiService.getMeasurementConfigs();
      setMeasurementConfigs(configs);
    } catch (error) {
      console.error('Error loading measurement configs:', error);
      // Use mock data for development
      const mockConfigs: MeasurementConfig[] = [
        {
          id: '1',
          garmentType: 'shirt',
          measurements: ['chest', 'waist', 'sleeve_length', 'collar'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '2',
          garmentType: 'pants',
          measurements: ['waist', 'inseam', 'outseam', 'thigh'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '3',
          garmentType: 'suit',
          measurements: ['chest', 'waist', 'sleeve_length', 'jacket_length', 'trouser_waist', 'inseam'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      setMeasurementConfigs(mockConfigs);
    } finally {
      setLoadingConfigs(false);
    }
  }, []);

  // Handle form field changes
  const handlePersonalDetailChange = useCallback((field: keyof typeof formData.personalDetails, value: string) => {
    updateField(`personalDetails.${field}`, value);
  }, [updateField]);

  const handleCommentsChange = useCallback((value: string) => {
    updateField('comments', value);
  }, [updateField]);

  // Handle date picker
  const handleDateChange = useCallback((selectedDate: Date) => {
    setShowDatePicker(false);
    const dateString = selectedDate.toISOString().split('T')[0];
    handlePersonalDetailChange('dob', dateString);
  }, [handlePersonalDetailChange]);

  const handleDateCancel = useCallback(() => {
    setShowDatePicker(false);
  }, []);

  // Handle measurement operations
  const addMeasurement = useCallback((garmentType: string) => {
    const config = measurementConfigs.find(c => c.garmentType === garmentType);
    if (!config) return;

    const newMeasurement: CustomerMeasurement = {
      garmentType,
      fields: config.measurements.map(name => ({ name, value: '' })),
      notes: '',
      lastMeasuredDate: new Date().toISOString(),
    };

    setFormData(prev => ({
      ...prev,
      measurements: [...(prev.measurements || []), newMeasurement],
    }));
  }, [measurementConfigs, setFormData]);

  const removeMeasurement = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      measurements: prev.measurements?.filter((_, i) => i !== index) || [],
    }));
  }, [setFormData]);

  const updateMeasurementField = useCallback((measurementIndex: number, fieldIndex: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      measurements: prev.measurements?.map((measurement, mIndex) => {
        if (mIndex === measurementIndex) {
          return {
            ...measurement,
            fields: measurement.fields.map((field, fIndex) => {
              if (fIndex === fieldIndex) {
                return { ...field, value };
              }
              return field;
            }),
          };
        }
        return measurement;
      }) || [],
    }));
  }, [setFormData]);

  const updateMeasurementNotes = useCallback((measurementIndex: number, notes: string) => {
    setFormData(prev => ({
      ...prev,
      measurements: prev.measurements?.map((measurement, index) => {
        if (index === measurementIndex) {
          return { ...measurement, notes };
        }
        return measurement;
      }) || [],
    }));
  }, [setFormData]);

  // Form submission with enhanced validation and feedback
  const handleFormSubmit = useCallback(async () => {
    try {
      if (isEditMode && customer) {
        // Update existing customer - check for duplicates only if phone number changed
        const phoneChanged = formData.personalDetails.phone !== customer.personalDetails.phone;

        if (phoneChanged && !pendingSubmission) {
          const duplicates = await checkForDuplicates(formData.personalDetails.phone);
          if (duplicates.length > 0) {
            setDuplicateCustomers(duplicates);
            setShowDuplicateDialog(true);
            return;
          }
        }

        const updateData = {
          personalDetails: {
            name: formData.personalDetails.name,
            phone: formData.personalDetails.phone,
            email: formData.personalDetails.email || undefined,
            address: formData.personalDetails.address || undefined,
            dob: formData.personalDetails.dob || undefined,
          },
          measurements: formData.measurements || [],
          comments: formData.comments || undefined,
        };

        await apiService.updateCustomer(customer.id, updateData);

        // Show success message
        setSuccessMessage('Customer updated successfully');
        setShowSuccessMessage(true);

        // Navigate back after a short delay
        setTimeout(() => {
          navigation.goBack();
        }, 1500);
      } else {
        // Create new customer - check for duplicates unless user already confirmed
        if (!pendingSubmission) {
          const duplicates = await checkForDuplicates(formData.personalDetails.phone);
          if (duplicates.length > 0) {
            setDuplicateCustomers(duplicates);
            setShowDuplicateDialog(true);
            return;
          }
        }

        const createData = {
          personalDetails: {
            name: formData.personalDetails.name,
            phone: formData.personalDetails.phone,
            email: formData.personalDetails.email || undefined,
            address: formData.personalDetails.address || undefined,
            dob: formData.personalDetails.dob || undefined,
          },
          measurements: formData.measurements || [],
          comments: formData.comments || undefined,
        };

        await apiService.createCustomer(createData);

        // Show success message
        setSuccessMessage('Customer created successfully');
        setShowSuccessMessage(true);

        // Navigate back after a short delay
        setTimeout(() => {
          navigation.goBack();
        }, 1500);
      }

      // Reset pending submission flag after successful submission
      setPendingSubmission(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save customer';
      Alert.alert('Error', errorMessage);
      setPendingSubmission(false);
    }
  }, [formData, isEditMode, customer, navigation, pendingSubmission, checkForDuplicates]);

  // Check for duplicate customers
  const checkForDuplicates = useCallback(async (phone: string): Promise<Customer[]> => {
    if (!phone.trim()) {
      return [];
    }

    try {
      setCheckingDuplicates(true);
      const result = await apiService.checkCustomerExists({ phone: phone.trim() });

      // Filter out the current customer if we're in edit mode
      let duplicates = result.phoneOnlyDuplicates || [];
      if (isEditMode && customer) {
        duplicates = duplicates.filter(dup => dup.id !== customer.id);
      }

      return duplicates;
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      // Don't block form submission if duplicate check fails
      return [];
    } finally {
      setCheckingDuplicates(false);
    }
  }, [isEditMode, customer]);

  // Handle duplicate dialog actions
  const handleDuplicateProceed = useCallback(() => {
    setShowDuplicateDialog(false);
    setDuplicateCustomers([]);
    setPendingSubmission(true);
  }, []);

  const handleDuplicateCancel = useCallback(() => {
    setShowDuplicateDialog(false);
    setDuplicateCustomers([]);
    setPendingSubmission(false);
  }, []);

  // Handle form submission with enhanced validation and feedback
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      // Mark all fields with errors as touched to show error messages
      const errorFields = Object.keys(validation.errors);
      errorFields.forEach(fieldName => {
        markFieldAsTouched(fieldName);
      });

      // Focus first invalid field and scroll to it
      const firstErrorField = errorFields[0];
      if (firstErrorField) {
        const fieldIndex = fieldNames.indexOf(firstErrorField.split('.').pop() || '');
        if (fieldIndex !== -1 && inputRefs[fieldIndex]) {
          // Scroll to the error field first
          scrollViewRef.current?.scrollTo({
            y: fieldIndex * 100, // Approximate field height
            animated: true,
          });

          // Focus the field after a short delay to ensure scrolling completes
          setTimeout(() => {
            inputRefs[fieldIndex]?.focus();
          }, 300);
        }
      }

      // Show detailed error message
      const errorCount = errorFields.length;
      const errorMessage = errorCount === 1
        ? 'Please fix the error in the highlighted field before submitting.'
        : `Please fix the errors in the ${errorCount} highlighted fields before submitting.`;

      Alert.alert('Validation Error', errorMessage);
      return;
    }

    await handleFormSubmit();
  }, [validateForm, validation.errors, fieldNames, inputRefs, handleFormSubmit, markFieldAsTouched]);

  // Handle back navigation with unsaved changes
  const handleBack = useCallback(() => {
    if (isDirty) {
      setDiscardDialog({ visible: true });
    } else {
      navigation.goBack();
    }
  }, [isDirty, navigation]);

  const confirmDiscard = useCallback(() => {
    setDiscardDialog({ visible: false });
    navigation.goBack();
  }, [navigation]);

  const cancelDiscard = useCallback(() => {
    setDiscardDialog({ visible: false });
  }, []);

  // Effects
  useEffect(() => {
    loadMeasurementConfigs();
  }, [loadMeasurementConfigs]);

  // Handle pending submission - automatically retry when user confirms to proceed
  useEffect(() => {
    if (pendingSubmission) {
      handleSubmit();
    }
  }, [pendingSubmission, handleSubmit]);

  // Set up navigation header
  useEffect(() => {
    navigation.setOptions({
      title: isEditMode ? 'Edit Customer' : 'Add Customer',
      headerLeft: () => (
        <TouchableOpacity onPress={handleBack} style={{ marginLeft: 16 }}>
          <Text style={{ fontSize: 16, color: COLORS.PRIMARY }}>Cancel</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, isEditMode, handleBack]);

  // Format date for display
  const formatDateForDisplay = useCallback((dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  }, []);

  // Group measurements by garment type and sort by date (latest first)
  const groupedMeasurements = useMemo(() => {
    const groups: Record<string, CustomerMeasurement[]> = {};
    (formData.measurements || []).forEach((measurement, index) => {
      // Use lowercase garment type as the key for grouping
      const garmentTypeKey = measurement.garmentType.toLowerCase();
      if (!groups[garmentTypeKey]) {
        groups[garmentTypeKey] = [];
      }
      groups[garmentTypeKey].push({ ...measurement, originalIndex: index });
    });

    // Sort measurements within each group by date (latest first)
    Object.keys(groups).forEach(garmentType => {
      groups[garmentType].sort((a, b) => {
        const dateA = new Date(a.lastMeasuredDate).getTime();
        const dateB = new Date(b.lastMeasuredDate).getTime();
        return dateB - dateA; // Latest first
      });
    });

    return groups;
  }, [formData.measurements]);

  // Render personal details section
  const renderPersonalDetails = () => (
    <View style={[styles.section, cardStyle]}>
      <Text style={[styles.sectionTitle, textStyle]}>Personal Details</Text>

      <FormInput
        ref={(ref) => (inputRefs.current['name'] = ref)}
        label="Name"
        value={formData.personalDetails.name}
        onChangeText={(value) => handlePersonalDetailChange('name', value)}
        placeholder="Enter customer name"
        required
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => focusNextField('name')}
        error={shouldShowFieldError('personalDetails.name', validation.errors, validation.touched)
          ? getFieldError('personalDetails.name', validation.errors)
          : undefined}
        testID="customer-name-input"
      />

      <FormInput
        ref={(ref) => (inputRefs.current['phone'] = ref)}
        label="Phone"
        value={formData.personalDetails.phone}
        onChangeText={(value) => handlePersonalDetailChange('phone', value)}
        placeholder="Enter phone number"
        keyboardType="phone-pad"
        required
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => focusNextField('phone')}
        error={shouldShowFieldError('personalDetails.phone', validation.errors, validation.touched)
          ? getFieldError('personalDetails.phone', validation.errors)
          : undefined}
        testID="customer-phone-input"
      />

      <FormInput
        ref={(ref) => (inputRefs.current['email'] = ref)}
        label="Email"
        value={formData.personalDetails.email || ''}
        onChangeText={(value) => handlePersonalDetailChange('email', value)}
        placeholder="Enter email address"
        keyboardType="email-address"
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => focusNextField('email')}
        error={shouldShowFieldError('personalDetails.email', validation.errors, validation.touched)
          ? getFieldError('personalDetails.email', validation.errors)
          : undefined}
        testID="customer-email-input"
      />

      <FormInput
        ref={(ref) => (inputRefs.current['address'] = ref)}
        label="Address"
        value={formData.personalDetails.address || ''}
        onChangeText={(value) => handlePersonalDetailChange('address', value)}
        placeholder="Enter address"
        multiline
        numberOfLines={3}
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => focusNextField('address')}
        error={shouldShowFieldError('personalDetails.address', validation.errors, validation.touched)
          ? getFieldError('personalDetails.address', validation.errors)
          : undefined}
        testID="customer-address-input"
      />

      <View style={styles.datePickerContainer}>
        <Text style={[styles.fieldLabel, textStyle]}>Date of Birth</Text>
        <TouchableOpacity
          style={[styles.datePickerButton, { borderColor: isDarkMode ? '#666666' : '#CCCCCC' }]}
          onPress={() => setShowDatePicker(true)}
          testID="customer-dob-picker"
        >
          <Text style={[styles.datePickerText, formData.personalDetails.dob ? textStyle : subtextStyle]}>
            {formData.personalDetails.dob ? formatDateForDisplay(formData.personalDetails.dob) : 'Select date of birth'}
          </Text>
        </TouchableOpacity>
        {formData.personalDetails.dob && (
          <TouchableOpacity
            style={styles.clearDateButton}
            onPress={() => handlePersonalDetailChange('dob', '')}
          >
            <Text style={styles.clearDateText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <CustomDatePicker
        visible={showDatePicker}
        value={formData.personalDetails.dob ? new Date(formData.personalDetails.dob) : undefined}
        onDateChange={handleDateChange}
        onCancel={handleDateCancel}
        maximumDate={new Date()}
      />
    </View>
  );

  // Render measurement field
  const renderMeasurementField = (measurement: CustomerMeasurement & { originalIndex?: number }, field: { name: string; value: string }, fieldIndex: number) => {
    const measurementIndex = measurement.originalIndex || 0;
    const fieldKey = `measurement_${measurementIndex}_${fieldIndex}`;
    const totalFields = measurement.fields.length;
    
    return (
      <View key={fieldIndex} style={styles.measurementFieldRow}>
        <Text style={[styles.measurementFieldLabel, textStyle]}>
          {field.name.charAt(0).toUpperCase() + field.name.slice(1).replace('_', ' ')}:
        </Text>
        <FormInput
          ref={(ref) => (measurementRefs.current[fieldKey] = ref)}
          label=""
          value={field.value}
          onChangeText={(value) => updateMeasurementField(measurementIndex, fieldIndex, value)}
          placeholder="Enter measurement"
          keyboardType="numeric"
          returnKeyType={fieldIndex < totalFields - 1 ? "next" : "done"}
          blurOnSubmit={fieldIndex >= totalFields - 1}
          onSubmitEditing={() => focusNextMeasurementField(measurementIndex, fieldIndex, totalFields)}
          style={styles.measurementFieldInput}
        />
      </View>
    );
  };

  // Render single measurement card for slider
  const renderMeasurementCard = (measurement: CustomerMeasurement & { originalIndex?: number }, index: number) => (
    <View key={measurement.id || index} style={styles.measurementCard}>
      {/* Measurement fields in a grid layout */}
      <View style={styles.measurementGrid}>
        {measurement.fields.map((field, fieldIndex) => renderMeasurementField(measurement, field, fieldIndex))}
      </View>

      {/* Measurement notes */}
      <FormInput
        ref={(ref) => (measurementRefs.current[`measurement_notes_${measurement.originalIndex || 0}`] = ref)}
        label="Notes"
        value={measurement.notes || ''}
        onChangeText={(value) => updateMeasurementNotes(measurement.originalIndex || 0, value)}
        placeholder="Add notes for this measurement"
        multiline
        numberOfLines={2}
        returnKeyType="done"
        style={styles.measurementNotesInput}
      />

      {/* Last measured date */}
      <View style={styles.measurementFooter}>
        <Text style={[styles.measurementDate, subtextStyle]}>
          Last measured: {formatDateForDisplay(measurement.lastMeasuredDate)}
        </Text>
      </View>
    </View>
  );

  // Render pagination dots
  const renderPaginationDots = (measurements: CustomerMeasurement[], activeIndex: number) => {
    if (measurements.length <= 1) return null;

    return (
      <View style={styles.paginationContainer}>
        {measurements.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              {
                backgroundColor: index === activeIndex
                  ? COLORS.PRIMARY
                  : (isDarkMode ? '#666666' : '#CCCCCC')
              }
            ]}
          />
        ))}
      </View>
    );
  };

  // Render measurement group with slider functionality
  const renderMeasurementGroup = (garmentType: string, measurements: (CustomerMeasurement & { originalIndex?: number })[]) => {
    const activeIndex = measurementActiveIndices[garmentType] || 0;
    const screenWidth = Dimensions.get('window').width;
    const cardWidth = screenWidth - (SPACING.MD * 4); // Account for margins and padding

    const handleScroll = (event: any) => {
      const scrollPosition = event.nativeEvent.contentOffset.x;
      const index = Math.round(scrollPosition / cardWidth);
      setMeasurementActiveIndices(prev => ({
        ...prev,
        [garmentType]: index
      }));
    };

    return (
      <View key={garmentType} style={[styles.section, cardStyle]}>
        <View style={styles.measurementHeader}>
          <View style={styles.measurementTitleRow}>
            <Text style={[styles.sectionTitle, textStyle]}>
              {garmentType.charAt(0).toUpperCase() + garmentType.slice(1)} Measurements
            </Text>
            <TouchableOpacity
              onPress={() => {
                const measurementToRemove = measurements[activeIndex];
                if (measurementToRemove && measurementToRemove.originalIndex !== undefined) {
                  removeMeasurement(measurementToRemove.originalIndex);
                }
              }}
              style={styles.removeMeasurementButton}
            >
              <Text style={styles.removeMeasurementText}>Remove</Text>
            </TouchableOpacity>
          </View>
          {measurements.length > 1 && (
            <Text style={[styles.measurementCount, subtextStyle]}>
              {activeIndex + 1} of {measurements.length}
            </Text>
          )}
        </View>

        {measurements.length === 1 ? (
          // Single measurement - no slider needed
          <View style={styles.measurementContainer}>
            {renderMeasurementCard(measurements[0], 0)}
          </View>
        ) : (
          // Multiple measurements - show as slider
          <>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              style={styles.measurementSlider}
              contentContainerStyle={styles.sliderContent}
            >
              {measurements.map((measurement, index) => (
                <View key={measurement.id || index} style={[styles.measurementSlide, { width: cardWidth }]}>
                  {renderMeasurementCard(measurement, index)}
                </View>
              ))}
            </ScrollView>
            {renderPaginationDots(measurements, activeIndex)}
          </>
        )}
      </View>
    );
  };

  // Render measurement section
  const renderMeasurements = () => {
    const hasExistingMeasurements = Object.keys(groupedMeasurements).length > 0;

    return (
      <>
        {/* Render existing measurements grouped by garment type */}
        {hasExistingMeasurements && (
          <>
            {Object.entries(groupedMeasurements).map(([garmentType, measurements]) =>
              renderMeasurementGroup(garmentType, measurements)
            )}
          </>
        )}

        {/* Add measurement section */}
        <View style={[styles.section, cardStyle]}>
          <View style={styles.measurementHeader}>
            <Text style={[styles.sectionTitle, textStyle]}>
              {hasExistingMeasurements ? 'Add More Measurements' : 'Measurements'}
            </Text>
            <Text style={[styles.measurementSubtitle, subtextStyle]}>
              Add measurements for different garment types
            </Text>
          </View>

          <View style={styles.addMeasurementSection}>
            <Text style={[styles.addMeasurementTitle, textStyle]}>Add New Measurement</Text>
            <Text style={[styles.addMeasurementSubtitle, subtextStyle]}>
              You can add multiple measurements for the same garment type
            </Text>
            <View style={styles.addMeasurementButtons}>
              {measurementConfigs.map((config) => {
                const existingCount = formData.measurements?.filter(m => m.garmentType.toLowerCase() === config.garmentType.toLowerCase()).length || 0;
                return (
                  <TouchableOpacity
                    key={config.id}
                    style={styles.addMeasurementButton}
                    onPress={() => addMeasurement(config.garmentType)}
                  >
                    <Text style={styles.addMeasurementButtonText}>
                      {config.garmentType.charAt(0).toUpperCase() + config.garmentType.slice(1)}
                      {existingCount > 0 && ` (${existingCount})`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </>
    );
  };

  // Render comments section
  const renderComments = () => (
    <View style={[styles.section, cardStyle]}>
      <FormInput
        ref={(ref) => (inputRefs.current['comments'] = ref)}
        label="Comments"
        value={formData.comments || ''}
        onChangeText={handleCommentsChange}
        placeholder="Add any additional comments about the customer"
        multiline
        numberOfLines={4}
        returnKeyType="done"
        error={shouldShowFieldError('comments', validation.errors, validation.touched)
          ? getFieldError('comments', validation.errors)
          : undefined}
        testID="customer-comments-input"
      />
    </View>
  );

  // Render action buttons
  const renderActionButtons = () => (
    <View style={styles.actionButtons}>
      <TouchableOpacity
        style={[styles.actionButton, styles.cancelButton]}
        onPress={handleBack}
        disabled={loading}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButton, styles.saveButton]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.saveButtonText}>
          {loading ? 'Saving...' : (isEditMode ? 'Update' : 'Save')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, containerStyle]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {loadingConfigs ? (
        <ThumbFriendlyForm
          onSave={handleSubmit}
          onCancel={handleBack}
          saveLabel={isEditMode ? 'Update' : 'Save'}
          loading={loading}
        >
          {/* Personal Details Form Skeleton */}
          <FormSkeleton
            fieldCount={5}
            showTitle={true}
            showButtons={false}
            style={[styles.section, cardStyle]}
          />

          {/* Measurements Form Skeleton */}
          <MeasurementFormSkeleton
            style={[styles.section, cardStyle]}
          />

          {/* Comments Form Skeleton */}
          <View style={[styles.section, cardStyle]}>
            <SkeletonLoader width="40%" height={18} style={{ marginBottom: SPACING.MD }} />
            <SkeletonLoader width="100%" height={80} borderRadius={8} />
          </View>
        </ThumbFriendlyForm>
      ) : (
        <ThumbFriendlyForm
          onSave={handleSubmit}
          onCancel={handleBack}
          saveLabel={isEditMode ? 'Update' : 'Save'}
          loading={loading}
        >
          {renderPersonalDetails()}
          {renderMeasurements()}
          {renderComments()}
        </ThumbFriendlyForm>
      )}

      <ConfirmDialog
        visible={discardDialog.visible}
        title="Discard Changes"
        message="You have unsaved changes. Are you sure you want to discard them?"
        confirmText="Discard"
        cancelText="Keep Editing"
        onConfirm={confirmDiscard}
        onCancel={cancelDiscard}
        destructive={true}
      />

      <DuplicateWarningDialog
        visible={showDuplicateDialog}
        duplicateCustomers={duplicateCustomers}
        onProceed={handleDuplicateProceed}
        onCancel={handleDuplicateCancel}
      />

      {loading && (
        <View style={styles.loadingOverlay}>
          <LoadingSpinner message={isEditMode ? 'Updating customer...' : 'Creating customer...'} />
        </View>
      )}

      {checkingDuplicates && (
        <View style={styles.loadingOverlay}>
          <LoadingSpinner message="Checking for duplicates..." />
        </View>
      )}
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
    paddingBottom: 100, // Space for action buttons
  },
  section: {
    margin: SPACING.MD,
    padding: SPACING.MD,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: SPACING.MD,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: SPACING.SM,
  },
  datePickerContainer: {
    marginBottom: SPACING.MD,
  },
  datePickerButton: {
    borderWidth: 1,
    borderRadius: 4,
    padding: SPACING.MD,
    backgroundColor: 'transparent',
  },
  datePickerText: {
    fontSize: 16,
  },
  clearDateButton: {
    alignSelf: 'flex-end',
    marginTop: SPACING.XS,
  },
  clearDateText: {
    color: COLORS.PRIMARY,
    fontSize: 14,
  },
  measurementHeader: {
    marginBottom: SPACING.MD,
  },
  measurementSubtitle: {
    fontSize: 14,
    marginTop: SPACING.XS,
  },
  measurementTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  measurementCount: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  measurementContainer: {
    marginBottom: SPACING.MD,
  },
  measurementCard: {
    marginBottom: SPACING.MD,
    paddingBottom: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  measurementSlider: {
    marginBottom: SPACING.SM,
  },
  sliderContent: {
    paddingHorizontal: 0,
  },
  measurementSlide: {
    paddingHorizontal: SPACING.XS,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.SM,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  measurementGrid: {
    marginBottom: SPACING.SM,
  },
  measurementFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.XS,
    paddingVertical: 2,
  },
  measurementFieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    width: 120,
    marginRight: SPACING.SM,
    textTransform: 'capitalize',
  },
  measurementFieldInput: {
    flex: 1,
    marginBottom: 0,
  },
  measurementNotesInput: {
    marginBottom: 0,
  },
  measurementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.XS,
  },
  measurementDate: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  removeMeasurementButton: {
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
  },
  removeMeasurementText: {
    color: COLORS.ERROR,
    fontSize: 14,
  },
  addMeasurementSection: {
    marginTop: SPACING.MD,
  },
  addMeasurementTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.SM,
  },
  addMeasurementSubtitle: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: SPACING.MD,
  },
  addMeasurementButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.SM,
  },
  addMeasurementButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: 6,
    marginRight: SPACING.SM,
    marginBottom: SPACING.SM,
  },
  addMeasurementButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  addMeasurementButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  addMeasurementButtonTextDisabled: {
    color: '#666666',
  },
  actionButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: SPACING.MD,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  actionButton: {
    flex: 1,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.SM,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: SPACING.XS,
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#CCCCCC',
  },
  cancelButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: SPACING.XL,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateInputFallback: {
    marginTop: SPACING.SM,
    padding: SPACING.SM,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 4,
  },
});

export default CustomerFormScreen;