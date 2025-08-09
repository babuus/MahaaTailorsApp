// Validation utility functions for form data

import {
  ValidationResult,
  ValidationError,
  FieldValidationResult,
  FieldValidationRule,
  VALIDATION_PATTERNS,
  VALIDATION_MESSAGES,
  CUSTOMER_VALIDATION_SCHEMA,
  MEASUREMENT_CONFIG_VALIDATION_SCHEMA,
} from '../types/validation';

import {
  CustomerFormData,
  MeasurementConfigFormData,
  CustomerMeasurement,
  MeasurementField,
} from '../types';

// ============================================================================
// FIELD VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates a single field based on validation rules
 */
export const validateField = (
  value: any,
  rule: FieldValidationRule,
  fieldName?: string
): FieldValidationResult => {
  // Check required validation
  if (rule.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
    return {
      isValid: false,
      error: VALIDATION_MESSAGES.REQUIRED,
    };
  }

  // Skip other validations if field is empty and not required
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return { isValid: true };
  }

  const stringValue = String(value).trim();

  // Check minimum length
  if (rule.minLength && stringValue.length < rule.minLength) {
    return {
      isValid: false,
      error: VALIDATION_MESSAGES.MIN_LENGTH(rule.minLength),
    };
  }

  // Check maximum length
  if (rule.maxLength && stringValue.length > rule.maxLength) {
    return {
      isValid: false,
      error: VALIDATION_MESSAGES.MAX_LENGTH(rule.maxLength),
    };
  }

  // Check pattern validation
  if (rule.pattern && !rule.pattern.test(stringValue)) {
    // Return specific error messages for known patterns
    if (rule.pattern === VALIDATION_PATTERNS.EMAIL) {
      return {
        isValid: false,
        error: VALIDATION_MESSAGES.INVALID_EMAIL,
      };
    }
    if (rule.pattern === VALIDATION_PATTERNS.PHONE) {
      return {
        isValid: false,
        error: VALIDATION_MESSAGES.INVALID_PHONE,
      };
    }
    if (rule.pattern === VALIDATION_PATTERNS.NAME) {
      return {
        isValid: false,
        error: VALIDATION_MESSAGES.INVALID_NAME,
      };
    }
    return {
      isValid: false,
      error: `Invalid format for ${fieldName || 'field'}`,
    };
  }

  // Run custom validator if provided
  if (rule.customValidator) {
    return rule.customValidator(value);
  }

  return { isValid: true };
};

/**
 * Validates date field
 */
export const validateDate = (dateString: string, allowFuture = false): FieldValidationResult => {
  if (!dateString) {
    return { isValid: true }; // Date is optional
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return {
      isValid: false,
      error: VALIDATION_MESSAGES.INVALID_DATE,
    };
  }

  // Check if date is not in the future (for DOB)
  if (!allowFuture && date > new Date()) {
    return {
      isValid: false,
      error: VALIDATION_MESSAGES.FUTURE_DATE,
    };
  }

  return { isValid: true };
};

/**
 * Validates numeric field
 */
export const validateNumeric = (value: string, allowDecimals = false, allowNegative = false): FieldValidationResult => {
  if (!value || value.trim() === '') {
    return { isValid: true }; // Empty is valid for optional fields
  }

  const trimmedValue = value.trim();
  
  // Check for whitespace only
  if (trimmedValue === '') {
    return {
      isValid: false,
      error: VALIDATION_MESSAGES.WHITESPACE_ONLY,
    };
  }

  const pattern = allowDecimals ? VALIDATION_PATTERNS.DECIMAL : VALIDATION_PATTERNS.NUMERIC;
  
  if (!pattern.test(trimmedValue)) {
    return {
      isValid: false,
      error: allowDecimals ? VALIDATION_MESSAGES.INVALID_DECIMAL : VALIDATION_MESSAGES.INVALID_NUMERIC,
    };
  }

  const numValue = parseFloat(trimmedValue);
  
  if (!allowNegative && numValue < 0) {
    return {
      isValid: false,
      error: VALIDATION_MESSAGES.NEGATIVE_NUMBER,
    };
  }

  // Check decimal places (max 2 for measurements)
  if (allowDecimals && trimmedValue.includes('.')) {
    const decimalPart = trimmedValue.split('.')[1];
    if (decimalPart && decimalPart.length > 2) {
      return {
        isValid: false,
        error: VALIDATION_MESSAGES.TOO_MANY_DECIMALS,
      };
    }
  }

  return { isValid: true };
};

/**
 * Validates measurement field value
 */
export const validateMeasurementValue = (value: string): FieldValidationResult => {
  return validateNumeric(value, true, false);
};

/**
 * Validates whitespace-only input
 */
export const validateNotWhitespaceOnly = (value: string): FieldValidationResult => {
  if (value && value.trim() === '') {
    return {
      isValid: false,
      error: VALIDATION_MESSAGES.WHITESPACE_ONLY,
    };
  }
  return { isValid: true };
};

/**
 * Validates phone number for duplicates
 */
export const validatePhoneUniqueness = async (
  phone: string,
  currentCustomerId?: string,
  checkExistsFunction?: (phone: string) => Promise<{ exists: boolean; customer?: any }>
): Promise<FieldValidationResult> => {
  if (!phone || !checkExistsFunction) {
    return { isValid: true };
  }

  try {
    const result = await checkExistsFunction(phone);
    if (result.exists && result.customer?.id !== currentCustomerId) {
      return {
        isValid: false,
        error: VALIDATION_MESSAGES.DUPLICATE_PHONE,
      };
    }
    return { isValid: true };
  } catch (error) {
    // If check fails, allow the submission (server will handle it)
    return { isValid: true };
  }
};

// ============================================================================
// CUSTOMER VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates customer form data
 */
export const validateCustomerForm = (data: CustomerFormData): ValidationResult => {
  const errors: ValidationError[] = [];

  // Validate personal details
  const nameValidation = validateField(
    data.personalDetails.name,
    CUSTOMER_VALIDATION_SCHEMA.personalDetails.name,
    'name'
  );
  if (!nameValidation.isValid) {
    errors.push({
      field: 'personalDetails.name',
      message: nameValidation.error!,
    });
  }

  const phoneValidation = validateField(
    data.personalDetails.phone,
    CUSTOMER_VALIDATION_SCHEMA.personalDetails.phone,
    'phone'
  );
  if (!phoneValidation.isValid) {
    errors.push({
      field: 'personalDetails.phone',
      message: phoneValidation.error!,
    });
  }

  if (data.personalDetails.email) {
    const emailValidation = validateField(
      data.personalDetails.email,
      CUSTOMER_VALIDATION_SCHEMA.personalDetails.email,
      'email'
    );
    if (!emailValidation.isValid) {
      errors.push({
        field: 'personalDetails.email',
        message: emailValidation.error!,
      });
    }
  }

  if (data.personalDetails.address) {
    const addressValidation = validateField(
      data.personalDetails.address,
      CUSTOMER_VALIDATION_SCHEMA.personalDetails.address,
      'address'
    );
    if (!addressValidation.isValid) {
      errors.push({
        field: 'personalDetails.address',
        message: addressValidation.error!,
      });
    }
  }

  if (data.personalDetails.dob) {
    const dobValidation = validateDate(data.personalDetails.dob);
    if (!dobValidation.isValid) {
      errors.push({
        field: 'personalDetails.dob',
        message: dobValidation.error!,
      });
    }
  }

  // Validate comments
  if (data.comments) {
    const commentsValidation = validateField(
      data.comments,
      CUSTOMER_VALIDATION_SCHEMA.comments,
      'comments'
    );
    if (!commentsValidation.isValid) {
      errors.push({
        field: 'comments',
        message: commentsValidation.error!,
      });
    }
  }

  // Validate measurements if provided
  if (data.measurements) {
    data.measurements.forEach((measurement: CustomerMeasurement, index: number) => {
      if (!measurement.garmentType.trim()) {
        errors.push({
          field: `measurements.${index}.garmentType`,
          message: 'Garment type is required',
        });
      }

      measurement.fields.forEach((field: MeasurementField, fieldIndex: number) => {
        if (!field.name.trim()) {
          errors.push({
            field: `measurements.${index}.fields.${fieldIndex}.name`,
            message: 'Measurement field name is required',
          });
        }
        // Validate the measurement value (use '0' as default for empty values during validation only)
        const valueToValidate = field.value.trim() === '' ? '0' : field.value;
        const measurementValidation = validateMeasurementValue(valueToValidate);
        if (!measurementValidation.isValid) {
          errors.push({
            field: `measurements.${index}.fields.${fieldIndex}.value`,
            message: measurementValidation.error!,
          });
        }
      });
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// ============================================================================
// MEASUREMENT CONFIG VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates measurement config form data
 */
export const validateMeasurementConfigForm = (data: MeasurementConfigFormData): ValidationResult => {
  const errors: ValidationError[] = [];

  // Validate garment type
  const garmentTypeValidation = validateField(
    data.garmentType,
    MEASUREMENT_CONFIG_VALIDATION_SCHEMA.garmentType,
    'garmentType'
  );
  if (!garmentTypeValidation.isValid) {
    errors.push({
      field: 'garmentType',
      message: garmentTypeValidation.error!,
    });
  }

  // Validate measurements array
  if (!data.measurements || data.measurements.length < MEASUREMENT_CONFIG_VALIDATION_SCHEMA.measurements.minItems) {
    errors.push({
      field: 'measurements',
      message: VALIDATION_MESSAGES.MIN_MEASUREMENTS,
    });
  } else {
    // Validate each measurement field
    data.measurements.forEach((measurement: string, index: number) => {
      const measurementValidation = validateField(
        measurement,
        MEASUREMENT_CONFIG_VALIDATION_SCHEMA.measurements.itemValidation,
        `measurement ${index + 1}`
      );
      if (!measurementValidation.isValid) {
        errors.push({
          field: `measurements.${index}`,
          message: measurementValidation.error!,
        });
      }
    });

    // Check for duplicate measurement names
    const measurementNames = data.measurements.map((m: string) => m.toLowerCase().trim());
    const duplicates = measurementNames.filter((name: string, index: number) => 
      measurementNames.indexOf(name) !== index
    );
    if (duplicates.length > 0) {
      errors.push({
        field: 'measurements',
        message: 'Duplicate measurement field names are not allowed',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Converts validation result to form validation state format
 */
export const validationResultToFormState = (result: ValidationResult): {
  isValid: boolean;
  errors: Record<string, string>;
} => {
  const errors: Record<string, string> = {};
  
  result.errors.forEach(error => {
    errors[error.field] = error.message;
  });

  return {
    isValid: result.isValid,
    errors,
  };
};

/**
 * Checks if a field has been touched and has an error
 */
export const shouldShowFieldError = (
  fieldName: string,
  errors: Record<string, string>,
  touched: Record<string, boolean>
): boolean => {
  return touched[fieldName] && !!errors[fieldName];
};

/**
 * Gets error message for a specific field
 */
export const getFieldError = (
  fieldName: string,
  errors: Record<string, string>
): string | undefined => {
  return errors[fieldName];
};

/**
 * Marks a field as touched
 */
export const touchField = (
  fieldName: string,
  touched: Record<string, boolean>
): Record<string, boolean> => {
  return {
    ...touched,
    [fieldName]: true,
  };
};

/**
 * Resets form validation state
 */
export const resetValidationState = () => ({
  isValid: true,
  errors: {},
  touched: {},
});