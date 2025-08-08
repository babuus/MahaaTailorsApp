// Validation schemas and types for form data

// ============================================================================
// VALIDATION RESULT TYPES
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface FieldValidationResult {
  isValid: boolean;
  error?: string;
}

// ============================================================================
// CUSTOMER VALIDATION SCHEMAS
// ============================================================================

export interface CustomerValidationSchema {
  personalDetails: {
    name: FieldValidationRule;
    phone: FieldValidationRule;
    email: FieldValidationRule;
    address: FieldValidationRule;
    dob: FieldValidationRule;
  };
  measurements: MeasurementValidationRule[];
  comments: FieldValidationRule;
}

export interface FieldValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (value: any) => FieldValidationResult;
}

export interface MeasurementValidationRule {
  garmentType: FieldValidationRule;
  fields: FieldValidationRule[];
  notes: FieldValidationRule;
}

// ============================================================================
// MEASUREMENT CONFIG VALIDATION SCHEMAS
// ============================================================================

export interface MeasurementConfigValidationSchema {
  garmentType: FieldValidationRule;
  measurements: {
    required: boolean;
    minItems: number;
    itemValidation: FieldValidationRule;
  };
}

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[\+]?[1-9][\d]{0,15}$/,
  NAME: /^[a-zA-Z\s]{2,50}$/,
  ALPHANUMERIC: /^[a-zA-Z0-9\s]+$/,
  NUMERIC: /^\d+$/,
  DECIMAL: /^\d+(\.\d+)?$/,
  NO_SPECIAL_CHARS: /^[a-zA-Z0-9\s\-_]+$/,
  ADDRESS: /^[a-zA-Z0-9\s\-,.'#]+$/,
} as const;

export const VALIDATION_MESSAGES = {
  REQUIRED: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PHONE: 'Please enter a valid phone number',
  INVALID_NAME: 'Name should contain only letters and spaces (2-50 characters)',
  INVALID_ADDRESS: 'Address contains invalid characters',
  INVALID_NUMERIC: 'Please enter a valid number',
  INVALID_DECIMAL: 'Please enter a valid decimal number',
  MIN_LENGTH: (min: number) => `Minimum ${min} characters required`,
  MAX_LENGTH: (max: number) => `Maximum ${max} characters allowed`,
  DUPLICATE_PHONE: 'A customer with this phone number already exists',
  INVALID_DATE: 'Please enter a valid date',
  FUTURE_DATE: 'Date cannot be in the future',
  GARMENT_TYPE_EXISTS: 'A measurement template with this garment type already exists',
  MIN_MEASUREMENTS: 'At least one measurement field is required',
  DUPLICATE_MEASUREMENT: 'Duplicate measurement field names are not allowed',
  WHITESPACE_ONLY: 'Field cannot contain only whitespace',
  INVALID_FORMAT: 'Invalid format',
  TOO_MANY_DECIMALS: 'Too many decimal places',
  NEGATIVE_NUMBER: 'Number cannot be negative',
} as const;

// ============================================================================
// VALIDATION SCHEMA DEFINITIONS
// ============================================================================

export const CUSTOMER_VALIDATION_SCHEMA: CustomerValidationSchema = {
  personalDetails: {
    name: {
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: VALIDATION_PATTERNS.NAME,
    },
    phone: {
      required: true,
      pattern: VALIDATION_PATTERNS.PHONE,
    },
    email: {
      required: false,
      pattern: VALIDATION_PATTERNS.EMAIL,
    },
    address: {
      required: false,
      maxLength: 200,
    },
    dob: {
      required: false,
    },
  },
  measurements: [],
  comments: {
    required: false,
    maxLength: 500,
  },
};

export const MEASUREMENT_CONFIG_VALIDATION_SCHEMA: MeasurementConfigValidationSchema = {
  garmentType: {
    required: true,
    minLength: 2,
    maxLength: 50,
  },
  measurements: {
    required: true,
    minItems: 1,
    itemValidation: {
      required: true,
      minLength: 2,
      maxLength: 30,
    },
  },
};