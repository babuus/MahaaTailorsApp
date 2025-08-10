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
  INVALID_CUSTOMER: 'Please select a valid customer',
  DELIVERY_DATE_PAST: 'Delivery date cannot be in the past',
  BILLING_DATE_FUTURE: 'Billing date cannot be in the future',
  MIN_ITEMS: 'At least one item is required',
  PAYMENT_EXCEEDS_OUTSTANDING: 'Payment amount cannot exceed outstanding balance',
  INVALID_PAYMENT_METHOD: 'Please select a valid payment method',
  INVALID_CATEGORY: 'Please select a valid category',
  PRICE_REQUIRED: 'Price is required and must be greater than 0',
  QUANTITY_REQUIRED: 'Quantity is required and must be greater than 0',
  RECEIVED_DATE_FUTURE: 'Received date cannot be in the future',
} as const;

// ============================================================================
// BILLING VALIDATION SCHEMAS
// ============================================================================

export interface BillValidationSchema {
  customerId: FieldValidationRule;
  billingDate: FieldValidationRule;
  deliveryDate: FieldValidationRule;
  items: {
    required: boolean;
    minItems: number;
    itemValidation: BillItemValidationRule;
  };
  receivedItems: {
    required: boolean;
    itemValidation: ReceivedItemValidationRule;
  };
  notes: FieldValidationRule;
}

export interface BillItemValidationRule {
  name: FieldValidationRule;
  description: FieldValidationRule;
  quantity: FieldValidationRule;
  unitPrice: FieldValidationRule;
}

export interface ReceivedItemValidationRule {
  name: FieldValidationRule;
  description: FieldValidationRule;
  quantity: FieldValidationRule;
  receivedDate: FieldValidationRule;
}

export interface PaymentValidationSchema {
  amount: FieldValidationRule;
  paymentDate: FieldValidationRule;
  paymentMethod: FieldValidationRule;
  notes: FieldValidationRule;
}

export interface BillingConfigItemValidationSchema {
  name: FieldValidationRule;
  description: FieldValidationRule;
  price: FieldValidationRule;
  category: FieldValidationRule;
}

export interface ReceivedItemTemplateValidationSchema {
  name: FieldValidationRule;
  description: FieldValidationRule;
  category: FieldValidationRule;
}

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

export const BILL_VALIDATION_SCHEMA: BillValidationSchema = {
  customerId: {
    required: true,
  },
  billingDate: {
    required: true,
  },
  deliveryDate: {
    required: true,
  },
  items: {
    required: true,
    minItems: 1,
    itemValidation: {
      name: {
        required: true,
        minLength: 2,
        maxLength: 100,
      },
      description: {
        required: false,
        maxLength: 200,
      },
      quantity: {
        required: true,
        pattern: VALIDATION_PATTERNS.NUMERIC,
      },
      unitPrice: {
        required: true,
        pattern: VALIDATION_PATTERNS.DECIMAL,
      },
    },
  },
  receivedItems: {
    required: false,
    itemValidation: {
      name: {
        required: true,
        minLength: 2,
        maxLength: 100,
      },
      description: {
        required: false,
        maxLength: 200,
      },
      quantity: {
        required: true,
        pattern: VALIDATION_PATTERNS.NUMERIC,
      },
      receivedDate: {
        required: true,
      },
    },
  },
  notes: {
    required: false,
    maxLength: 500,
  },
};

export const PAYMENT_VALIDATION_SCHEMA: PaymentValidationSchema = {
  amount: {
    required: true,
    pattern: VALIDATION_PATTERNS.DECIMAL,
  },
  paymentDate: {
    required: true,
  },
  paymentMethod: {
    required: true,
  },
  notes: {
    required: false,
    maxLength: 200,
  },
};

export const BILLING_CONFIG_ITEM_VALIDATION_SCHEMA: BillingConfigItemValidationSchema = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  description: {
    required: false,
    maxLength: 200,
  },
  price: {
    required: true,
    pattern: VALIDATION_PATTERNS.DECIMAL,
  },
  category: {
    required: true,
  },
};

export const RECEIVED_ITEM_TEMPLATE_VALIDATION_SCHEMA: ReceivedItemTemplateValidationSchema = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  description: {
    required: false,
    maxLength: 200,
  },
  category: {
    required: true,
  },
};