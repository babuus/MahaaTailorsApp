import { Bill, BillItem, Payment, ReceivedItem, BillingConfigItem } from '../types';

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}

export interface ValidationError {
    field: string;
    message: string;
    code: string;
}

export interface FieldValidationResult {
    isValid: boolean;
    error?: string;
}

// Validation error codes
export const VALIDATION_CODES = {
    REQUIRED: 'REQUIRED',
    INVALID_FORMAT: 'INVALID_FORMAT',
    INVALID_DATE: 'INVALID_DATE',
    DATE_IN_PAST: 'DATE_IN_PAST',
    DATE_IN_FUTURE: 'DATE_IN_FUTURE',
    INVALID_NUMBER: 'INVALID_NUMBER',
    NEGATIVE_NUMBER: 'NEGATIVE_NUMBER',
    ZERO_VALUE: 'ZERO_VALUE',
    EXCEEDS_LIMIT: 'EXCEEDS_LIMIT',
    DUPLICATE_VALUE: 'DUPLICATE_VALUE',
    INVALID_EMAIL: 'INVALID_EMAIL',
    INVALID_PHONE: 'INVALID_PHONE',
    MIN_LENGTH: 'MIN_LENGTH',
    MAX_LENGTH: 'MAX_LENGTH',
    DELIVERY_BEFORE_BILLING: 'DELIVERY_BEFORE_BILLING',
    PAYMENT_EXCEEDS_OUTSTANDING: 'PAYMENT_EXCEEDS_OUTSTANDING',
    EMPTY_ITEMS: 'EMPTY_ITEMS',
} as const;

// Validation messages
export const VALIDATION_MESSAGES = {
    [VALIDATION_CODES.REQUIRED]: 'This field is required',
    [VALIDATION_CODES.INVALID_FORMAT]: 'Invalid format',
    [VALIDATION_CODES.INVALID_DATE]: 'Please enter a valid date',
    [VALIDATION_CODES.DATE_IN_PAST]: 'Date cannot be in the past',
    [VALIDATION_CODES.DATE_IN_FUTURE]: 'Date cannot be in the future',
    [VALIDATION_CODES.INVALID_NUMBER]: 'Please enter a valid number',
    [VALIDATION_CODES.NEGATIVE_NUMBER]: 'Value cannot be negative',
    [VALIDATION_CODES.ZERO_VALUE]: 'Value must be greater than zero',
    [VALIDATION_CODES.EXCEEDS_LIMIT]: 'Value exceeds maximum limit',
    [VALIDATION_CODES.DUPLICATE_VALUE]: 'This value already exists',
    [VALIDATION_CODES.INVALID_EMAIL]: 'Please enter a valid email address',
    [VALIDATION_CODES.INVALID_PHONE]: 'Please enter a valid phone number',
    [VALIDATION_CODES.MIN_LENGTH]: (min: number) => `Minimum ${min} characters required`,
    [VALIDATION_CODES.MAX_LENGTH]: (max: number) => `Maximum ${max} characters allowed`,
    [VALIDATION_CODES.DELIVERY_BEFORE_BILLING]: 'Delivery date cannot be before billing date',
    [VALIDATION_CODES.PAYMENT_EXCEEDS_OUTSTANDING]: 'Payment amount cannot exceed outstanding balance',
    [VALIDATION_CODES.EMPTY_ITEMS]: 'At least one item is required',
} as const;

// Regular expressions for validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[\+]?[1-9][\d]{0,15}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Utility functions
export const isValidDate = (dateString: string): boolean => {
    if (!DATE_REGEX.test(dateString)) return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
};

export const isDateInPast = (dateString: string): boolean => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
};

export const isDateInFuture = (dateString: string): boolean => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return date > today;
};

export const isValidNumber = (value: string | number): boolean => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return !isNaN(num) && isFinite(num);
};

export const isPositiveNumber = (value: string | number): boolean => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isValidNumber(num) && num > 0;
};

// Field validators
export const validateRequired = (value: any): FieldValidationResult => {
    const isEmpty = value === null || value === undefined ||
        (typeof value === 'string' && value.trim() === '') ||
        (Array.isArray(value) && value.length === 0);

    return {
        isValid: !isEmpty,
        error: isEmpty ? VALIDATION_MESSAGES[VALIDATION_CODES.REQUIRED] : undefined,
    };
};

export const validateEmail = (email: string): FieldValidationResult => {
    if (!email) return { isValid: true }; // Optional field

    const isValid = EMAIL_REGEX.test(email);
    return {
        isValid,
        error: isValid ? undefined : VALIDATION_MESSAGES[VALIDATION_CODES.INVALID_EMAIL],
    };
};

export const validatePhone = (phone: string): FieldValidationResult => {
    if (!phone) return { isValid: true }; // Optional field

    const isValid = PHONE_REGEX.test(phone);
    return {
        isValid,
        error: isValid ? undefined : VALIDATION_MESSAGES[VALIDATION_CODES.INVALID_PHONE],
    };
};

export const validateDate = (dateString: string, options: {
    required?: boolean;
    allowPast?: boolean;
    allowFuture?: boolean;
} = {}): FieldValidationResult => {
    const { required = false, allowPast = true, allowFuture = true } = options;

    if (!dateString) {
        return {
            isValid: !required,
            error: required ? VALIDATION_MESSAGES[VALIDATION_CODES.REQUIRED] : undefined,
        };
    }

    if (!isValidDate(dateString)) {
        return {
            isValid: false,
            error: VALIDATION_MESSAGES[VALIDATION_CODES.INVALID_DATE],
        };
    }

    if (!allowPast && isDateInPast(dateString)) {
        return {
            isValid: false,
            error: VALIDATION_MESSAGES[VALIDATION_CODES.DATE_IN_PAST],
        };
    }

    if (!allowFuture && isDateInFuture(dateString)) {
        return {
            isValid: false,
            error: VALIDATION_MESSAGES[VALIDATION_CODES.DATE_IN_FUTURE],
        };
    }

    return { isValid: true };
};

export const validateNumber = (value: string | number, options: {
    required?: boolean;
    min?: number;
    max?: number;
    allowZero?: boolean;
} = {}): FieldValidationResult => {
    const { required = false, min, max, allowZero = false } = options;

    if (value === '' || value === null || value === undefined) {
        return {
            isValid: !required,
            error: required ? VALIDATION_MESSAGES[VALIDATION_CODES.REQUIRED] : undefined,
        };
    }

    if (!isValidNumber(value)) {
        return {
            isValid: false,
            error: VALIDATION_MESSAGES[VALIDATION_CODES.INVALID_NUMBER],
        };
    }

    const num = typeof value === 'string' ? parseFloat(value) : value;

    if (!allowZero && num === 0) {
        return {
            isValid: false,
            error: VALIDATION_MESSAGES[VALIDATION_CODES.ZERO_VALUE],
        };
    }

    if (num < 0) {
        return {
            isValid: false,
            error: VALIDATION_MESSAGES[VALIDATION_CODES.NEGATIVE_NUMBER],
        };
    }

    if (min !== undefined && num < min) {
        return {
            isValid: false,
            error: `Value must be at least ${min}`,
        };
    }

    if (max !== undefined && num > max) {
        return {
            isValid: false,
            error: `Value cannot exceed ${max}`,
        };
    }

    return { isValid: true };
};

export const validateString = (value: string, options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
} = {}): FieldValidationResult => {
    const { required = false, minLength, maxLength } = options;

    if (!value || value.trim() === '') {
        return {
            isValid: !required,
            error: required ? VALIDATION_MESSAGES[VALIDATION_CODES.REQUIRED] : undefined,
        };
    }

    const trimmedValue = value.trim();

    if (minLength && trimmedValue.length < minLength) {
        return {
            isValid: false,
            error: typeof VALIDATION_MESSAGES[VALIDATION_CODES.MIN_LENGTH] === 'function'
                ? VALIDATION_MESSAGES[VALIDATION_CODES.MIN_LENGTH](minLength)
                : `Minimum ${minLength} characters required`,
        };
    }

    if (maxLength && trimmedValue.length > maxLength) {
        return {
            isValid: false,
            error: typeof VALIDATION_MESSAGES[VALIDATION_CODES.MAX_LENGTH] === 'function'
                ? VALIDATION_MESSAGES[VALIDATION_CODES.MAX_LENGTH](maxLength)
                : `Maximum ${maxLength} characters allowed`,
        };
    }

    return { isValid: true };
};

// Bill validation functions
export const validateBillItem = (item: Partial<BillItem>): ValidationResult => {
    const errors: ValidationError[] = [];

    // Validate name
    const nameValidation = validateString(item.name || '', { required: true, minLength: 2, maxLength: 100 });
    if (!nameValidation.isValid) {
        errors.push({
            field: 'name',
            message: nameValidation.error!,
            code: VALIDATION_CODES.REQUIRED,
        });
    }

    // Validate quantity
    const quantityValidation = validateNumber(item.quantity || 0, { required: true, min: 1 });
    if (!quantityValidation.isValid) {
        errors.push({
            field: 'quantity',
            message: quantityValidation.error!,
            code: VALIDATION_CODES.INVALID_NUMBER,
        });
    }

    // Validate unit price
    const priceValidation = validateNumber(item.unitPrice || 0, { required: true, min: 0.01 });
    if (!priceValidation.isValid) {
        errors.push({
            field: 'unitPrice',
            message: priceValidation.error!,
            code: VALIDATION_CODES.INVALID_NUMBER,
        });
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
};

export const validateBillForm = (billData: Partial<Bill>): ValidationResult => {
    const errors: ValidationError[] = [];

    // Validate customer
    if (!billData.customerId) {
        errors.push({
            field: 'customerId',
            message: VALIDATION_MESSAGES[VALIDATION_CODES.REQUIRED],
            code: VALIDATION_CODES.REQUIRED,
        });
    }

    // Validate billing date
    const billingDateValidation = validateDate(billData.billingDate || '', { required: true });
    if (!billingDateValidation.isValid) {
        errors.push({
            field: 'billingDate',
            message: billingDateValidation.error!,
            code: VALIDATION_CODES.INVALID_DATE,
        });
    }

    // Validate delivery date
    const deliveryDateValidation = validateDate(billData.deliveryDate || '', {
        required: true,
        allowPast: false
    });
    if (!deliveryDateValidation.isValid) {
        errors.push({
            field: 'deliveryDate',
            message: deliveryDateValidation.error!,
            code: VALIDATION_CODES.INVALID_DATE,
        });
    }

    // Validate delivery date is not before billing date
    if (billData.billingDate && billData.deliveryDate) {
        const billingDate = new Date(billData.billingDate);
        const deliveryDate = new Date(billData.deliveryDate);

        if (deliveryDate < billingDate) {
            errors.push({
                field: 'deliveryDate',
                message: VALIDATION_MESSAGES[VALIDATION_CODES.DELIVERY_BEFORE_BILLING],
                code: VALIDATION_CODES.DELIVERY_BEFORE_BILLING,
            });
        }
    }

    // Validate items
    if (!billData.items || billData.items.length === 0) {
        errors.push({
            field: 'items',
            message: VALIDATION_MESSAGES[VALIDATION_CODES.EMPTY_ITEMS],
            code: VALIDATION_CODES.EMPTY_ITEMS,
        });
    } else {
        billData.items.forEach((item, index) => {
            const itemValidation = validateBillItem(item);
            itemValidation.errors.forEach(error => {
                errors.push({
                    field: `items[${index}].${error.field}`,
                    message: error.message,
                    code: error.code,
                });
            });
        });
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
};

export const validatePayment = (payment: Partial<Payment>, outstandingAmount: number): ValidationResult => {
    const errors: ValidationError[] = [];

    // Validate amount
    const amountValidation = validateNumber(payment.amount || 0, { required: true, min: 0.01 });
    if (!amountValidation.isValid) {
        errors.push({
            field: 'amount',
            message: amountValidation.error!,
            code: VALIDATION_CODES.INVALID_NUMBER,
        });
    } else if (payment.amount && payment.amount > outstandingAmount) {
        errors.push({
            field: 'amount',
            message: VALIDATION_MESSAGES[VALIDATION_CODES.PAYMENT_EXCEEDS_OUTSTANDING],
            code: VALIDATION_CODES.PAYMENT_EXCEEDS_OUTSTANDING,
        });
    }

    // Validate payment date
    const paymentDateValidation = validateDate(payment.paymentDate || '', {
        required: true,
        allowFuture: false
    });
    if (!paymentDateValidation.isValid) {
        errors.push({
            field: 'paymentDate',
            message: paymentDateValidation.error!,
            code: VALIDATION_CODES.INVALID_DATE,
        });
    }

    // Validate payment method
    if (!payment.paymentMethod) {
        errors.push({
            field: 'paymentMethod',
            message: VALIDATION_MESSAGES[VALIDATION_CODES.REQUIRED],
            code: VALIDATION_CODES.REQUIRED,
        });
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
};

export const validateReceivedItem = (item: Partial<ReceivedItem>): ValidationResult => {
    const errors: ValidationError[] = [];

    // Validate name
    const nameValidation = validateString(item.name || '', { required: true, minLength: 2, maxLength: 100 });
    if (!nameValidation.isValid) {
        errors.push({
            field: 'name',
            message: nameValidation.error!,
            code: VALIDATION_CODES.REQUIRED,
        });
    }

    // Validate quantity
    const quantityValidation = validateNumber(item.quantity || 0, { required: true, min: 1 });
    if (!quantityValidation.isValid) {
        errors.push({
            field: 'quantity',
            message: quantityValidation.error!,
            code: VALIDATION_CODES.INVALID_NUMBER,
        });
    }

    // Validate received date
    const receivedDateValidation = validateDate(item.receivedDate || '', {
        required: true,
        allowFuture: false
    });
    if (!receivedDateValidation.isValid) {
        errors.push({
            field: 'receivedDate',
            message: receivedDateValidation.error!,
            code: VALIDATION_CODES.INVALID_DATE,
        });
    }

    // Validate returned date if provided
    if (item.returnedDate) {
        const returnedDateValidation = validateDate(item.returnedDate, { allowFuture: false });
        if (!returnedDateValidation.isValid) {
            errors.push({
                field: 'returnedDate',
                message: returnedDateValidation.error!,
                code: VALIDATION_CODES.INVALID_DATE,
            });
        }

        // Returned date cannot be before received date
        if (item.receivedDate && item.returnedDate < item.receivedDate) {
            errors.push({
                field: 'returnedDate',
                message: 'Return date cannot be before received date',
                code: VALIDATION_CODES.INVALID_DATE,
            });
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
};

export const validateBillingConfigItem = (item: Partial<BillingConfigItem>): ValidationResult => {
    const errors: ValidationError[] = [];

    // Validate name
    const nameValidation = validateString(item.name || '', { required: true, minLength: 2, maxLength: 100 });
    if (!nameValidation.isValid) {
        errors.push({
            field: 'name',
            message: nameValidation.error!,
            code: VALIDATION_CODES.REQUIRED,
        });
    }

    // Validate price
    const priceValidation = validateNumber(item.price || 0, { required: true, min: 0 });
    if (!priceValidation.isValid) {
        errors.push({
            field: 'price',
            message: priceValidation.error!,
            code: VALIDATION_CODES.INVALID_NUMBER,
        });
    }

    // Validate category
    if (!item.category) {
        errors.push({
            field: 'category',
            message: VALIDATION_MESSAGES[VALIDATION_CODES.REQUIRED],
            code: VALIDATION_CODES.REQUIRED,
        });
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
};

// Real-time validation helpers
export const createFieldValidator = (validationFn: (value: any) => FieldValidationResult) => {
    return (value: any) => {
        const result = validationFn(value);
        return {
            isValid: result.isValid,
            error: result.error || null,
        };
    };
};

// Validation state management
export interface ValidationState {
    errors: Record<string, string>;
    touched: Record<string, boolean>;
    isValid: boolean;
}

export const createValidationState = (): ValidationState => ({
    errors: {},
    touched: {},
    isValid: true,
});

export const updateValidationState = (
    state: ValidationState,
    field: string,
    error: string | null,
    touched: boolean = true
): ValidationState => {
    const newErrors = { ...state.errors };
    const newTouched = { ...state.touched };

    if (error) {
        newErrors[field] = error;
    } else {
        delete newErrors[field];
    }

    if (touched) {
        newTouched[field] = true;
    }

    return {
        errors: newErrors,
        touched: newTouched,
        isValid: Object.keys(newErrors).length === 0,
    };
};

export const getFieldError = (state: ValidationState, field: string): string | null => {
    return state.touched[field] ? state.errors[field] || null : null;
};

export const hasFieldError = (state: ValidationState, field: string): boolean => {
    return state.touched[field] && !!state.errors[field];
};