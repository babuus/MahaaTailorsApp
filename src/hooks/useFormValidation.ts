import { useState, useCallback, useRef } from 'react';
import { 
  ValidationResult, 
  FormValidationState,
  validationResultToFormState,
  touchField,
  resetValidationState,
} from '../utils/validation';

interface UseFormValidationOptions<T> {
  initialData: T;
  validator: (data: T) => ValidationResult;
  onSubmit?: (data: T) => Promise<void> | void;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  preventDuplicateSubmissions?: boolean;
}

interface UseFormValidationReturn<T> {
  // Form data
  data: T;
  setData: (data: T | ((prev: T) => T)) => void;
  updateField: (field: string, value: any) => void;
  
  // Validation state
  validation: FormValidationState;
  validateForm: () => boolean;
  validateField: (field: string) => boolean;
  clearFieldError: (field: string) => void;
  clearAllErrors: () => void;
  
  // Form state
  isDirty: boolean;
  isSubmitting: boolean;
  hasErrors: boolean;
  
  // Form actions
  handleSubmit: () => Promise<void>;
  resetForm: () => void;
  markFieldAsTouched: (field: string) => void;
  markAllFieldsAsTouched: () => void;
  
  // Utility functions
  getFieldError: (field: string) => string | undefined;
  shouldShowFieldError: (field: string) => boolean;
  isFieldTouched: (field: string) => boolean;
}

export const useFormValidation = <T extends Record<string, any>>({
  initialData,
  validator,
  onSubmit,
  validateOnChange = false,
  validateOnBlur = true,
  preventDuplicateSubmissions = true,
}: UseFormValidationOptions<T>): UseFormValidationReturn<T> => {
  const [data, setDataState] = useState<T>(initialData);
  const [validation, setValidation] = useState<FormValidationState>(resetValidationState());
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const initialDataRef = useRef(initialData);
  const submissionInProgressRef = useRef(false);

  // Update form data
  const setData = useCallback((newData: T | ((prev: T) => T)) => {
    setDataState(prev => {
      const updatedData = typeof newData === 'function' ? newData(prev) : newData;
      
      // Check if form is dirty
      const isFormDirty = JSON.stringify(updatedData) !== JSON.stringify(initialDataRef.current);
      setIsDirty(isFormDirty);
      
      // Validate on change if enabled
      if (validateOnChange) {
        const result = validator(updatedData);
        const formValidation = validationResultToFormState(result);
        setValidation(prevValidation => ({
          ...prevValidation,
          isValid: formValidation.isValid,
          errors: formValidation.errors,
        }));
      }
      
      return updatedData;
    });
  }, [validator, validateOnChange]);

  // Update specific field
  const updateField = useCallback((field: string, value: any) => {
    setData(prev => {
      const keys = field.split('.');
      const updatedData = { ...prev };
      let current: any = updatedData;
      
      // Navigate to the parent object
      for (let i = 0; i < keys.length - 1; i++) {
        if (current[keys[i]] === undefined) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      // Set the value
      current[keys[keys.length - 1]] = value;
      
      return updatedData;
    });
    
    // Mark field as touched
    markFieldAsTouched(field);
  }, []);

  // Validate entire form
  const validateForm = useCallback((): boolean => {
    const result = validator(data);
    const formValidation = validationResultToFormState(result);
    
    setValidation(prev => ({
      ...prev,
      isValid: formValidation.isValid,
      errors: formValidation.errors,
    }));
    
    return formValidation.isValid;
  }, [data, validator]);

  // Validate specific field
  const validateField = useCallback((field: string): boolean => {
    const result = validator(data);
    const formValidation = validationResultToFormState(result);
    const fieldError = formValidation.errors[field];
    
    setValidation(prev => ({
      ...prev,
      errors: {
        ...prev.errors,
        [field]: fieldError || '',
      },
    }));
    
    return !fieldError;
  }, [data, validator]);

  // Clear field error
  const clearFieldError = useCallback((field: string) => {
    setValidation(prev => ({
      ...prev,
      errors: {
        ...prev.errors,
        [field]: '',
      },
    }));
  }, []);

  // Clear all errors
  const clearAllErrors = useCallback(() => {
    setValidation(prev => ({
      ...prev,
      errors: {},
      isValid: true,
    }));
  }, []);

  // Mark field as touched
  const markFieldAsTouched = useCallback((field: string) => {
    setValidation(prev => ({
      ...prev,
      touched: touchField(field, prev.touched),
    }));
  }, []);

  // Mark all fields as touched
  const markAllFieldsAsTouched = useCallback(() => {
    const result = validator(data);
    const touchedFields: Record<string, boolean> = {};
    
    result.errors.forEach(error => {
      touchedFields[error.field] = true;
    });
    
    setValidation(prev => ({
      ...prev,
      touched: {
        ...prev.touched,
        ...touchedFields,
      },
    }));
  }, [data, validator]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    // Prevent duplicate submissions
    if (preventDuplicateSubmissions && submissionInProgressRef.current) {
      return;
    }

    // Mark all fields as touched to show validation errors
    markAllFieldsAsTouched();
    
    // Validate form
    if (!validateForm()) {
      return;
    }

    if (!onSubmit) {
      return;
    }

    try {
      setIsSubmitting(true);
      submissionInProgressRef.current = true;
      
      await onSubmit(data);
      
      // Reset dirty state after successful submission
      setIsDirty(false);
      initialDataRef.current = data;
    } catch (error) {
      // Error handling is done by the caller
      throw error;
    } finally {
      setIsSubmitting(false);
      submissionInProgressRef.current = false;
    }
  }, [data, validateForm, markAllFieldsAsTouched, onSubmit, preventDuplicateSubmissions]);

  // Reset form to initial state
  const resetForm = useCallback(() => {
    setDataState(initialDataRef.current);
    setValidation(resetValidationState());
    setIsDirty(false);
    setIsSubmitting(false);
    submissionInProgressRef.current = false;
  }, []);

  // Utility functions
  const getFieldError = useCallback((field: string): string | undefined => {
    return validation.errors[field] || undefined;
  }, [validation.errors]);

  const shouldShowFieldError = useCallback((field: string): boolean => {
    return validation.touched[field] && Boolean(validation.errors[field]);
  }, [validation.touched, validation.errors]);

  const isFieldTouched = useCallback((field: string): boolean => {
    return Boolean(validation.touched[field]);
  }, [validation.touched]);

  const hasErrors = Object.values(validation.errors).some(error => Boolean(error));

  return {
    // Form data
    data,
    setData,
    updateField,
    
    // Validation state
    validation,
    validateForm,
    validateField,
    clearFieldError,
    clearAllErrors,
    
    // Form state
    isDirty,
    isSubmitting,
    hasErrors,
    
    // Form actions
    handleSubmit,
    resetForm,
    markFieldAsTouched,
    markAllFieldsAsTouched,
    
    // Utility functions
    getFieldError,
    shouldShowFieldError,
    isFieldTouched,
  };
};

export default useFormValidation;