import {
  validateRequired,
  validateEmail,
  validatePhone,
  validateDate,
  validateNumber,
  validateString,
  validateBillItem,
  validateBillForm,
  validatePayment,
  validateReceivedItem,
  validateBillingConfigItem,
  isValidDate,
  isDateInPast,
  isDateInFuture,
  isValidNumber,
  isPositiveNumber,
  VALIDATION_CODES,
  VALIDATION_MESSAGES,
} from '../billingValidation';

describe('Billing Validation Utils', () => {
  describe('Utility Functions', () => {
    describe('isValidDate', () => {
      it('should validate correct date formats', () => {
        expect(isValidDate('2024-01-15')).toBe(true);
        expect(isValidDate('2024-12-31')).toBe(true);
      });

      it('should reject invalid date formats', () => {
        expect(isValidDate('2024-1-15')).toBe(false);
        expect(isValidDate('24-01-15')).toBe(false);
        expect(isValidDate('2024/01/15')).toBe(false);
        expect(isValidDate('invalid')).toBe(false);
      });

      it('should reject invalid dates', () => {
        expect(isValidDate('2024-02-30')).toBe(false);
        expect(isValidDate('2024-13-01')).toBe(false);
      });
    });

    describe('isDateInPast', () => {
      it('should identify past dates', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = yesterday.toISOString().split('T')[0];
        
        expect(isDateInPast(yesterdayString)).toBe(true);
      });

      it('should identify future dates', () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowString = tomorrow.toISOString().split('T')[0];
        
        expect(isDateInPast(tomorrowString)).toBe(false);
      });
    });

    describe('isValidNumber', () => {
      it('should validate numbers', () => {
        expect(isValidNumber(123)).toBe(true);
        expect(isValidNumber('123')).toBe(true);
        expect(isValidNumber('123.45')).toBe(true);
        expect(isValidNumber(0)).toBe(true);
        expect(isValidNumber(-123)).toBe(true);
      });

      it('should reject invalid numbers', () => {
        expect(isValidNumber('abc')).toBe(false);
        expect(isValidNumber('')).toBe(false);
        expect(isValidNumber(NaN)).toBe(false);
        expect(isValidNumber(Infinity)).toBe(false);
      });
    });

    describe('isPositiveNumber', () => {
      it('should validate positive numbers', () => {
        expect(isPositiveNumber(123)).toBe(true);
        expect(isPositiveNumber('123.45')).toBe(true);
        expect(isPositiveNumber(0.01)).toBe(true);
      });

      it('should reject non-positive numbers', () => {
        expect(isPositiveNumber(0)).toBe(false);
        expect(isPositiveNumber(-123)).toBe(false);
        expect(isPositiveNumber('abc')).toBe(false);
      });
    });
  });

  describe('Field Validators', () => {
    describe('validateRequired', () => {
      it('should pass for non-empty values', () => {
        expect(validateRequired('test')).toEqual({ isValid: true });
        expect(validateRequired(123)).toEqual({ isValid: true });
        expect(validateRequired(['item'])).toEqual({ isValid: true });
      });

      it('should fail for empty values', () => {
        expect(validateRequired('')).toEqual({
          isValid: false,
          error: VALIDATION_MESSAGES[VALIDATION_CODES.REQUIRED],
        });
        expect(validateRequired(null)).toEqual({
          isValid: false,
          error: VALIDATION_MESSAGES[VALIDATION_CODES.REQUIRED],
        });
        expect(validateRequired([])).toEqual({
          isValid: false,
          error: VALIDATION_MESSAGES[VALIDATION_CODES.REQUIRED],
        });
      });
    });

    describe('validateEmail', () => {
      it('should validate correct email formats', () => {
        expect(validateEmail('test@example.com')).toEqual({ isValid: true });
        expect(validateEmail('user.name@domain.co.uk')).toEqual({ isValid: true });
      });

      it('should reject invalid email formats', () => {
        expect(validateEmail('invalid-email')).toEqual({
          isValid: false,
          error: VALIDATION_MESSAGES[VALIDATION_CODES.INVALID_EMAIL],
        });
        expect(validateEmail('test@')).toEqual({
          isValid: false,
          error: VALIDATION_MESSAGES[VALIDATION_CODES.INVALID_EMAIL],
        });
      });

      it('should allow empty email (optional field)', () => {
        expect(validateEmail('')).toEqual({ isValid: true });
      });
    });

    describe('validatePhone', () => {
      it('should validate correct phone formats', () => {
        expect(validatePhone('1234567890')).toEqual({ isValid: true });
        expect(validatePhone('+911234567890')).toEqual({ isValid: true });
      });

      it('should reject invalid phone formats', () => {
        expect(validatePhone('abc123')).toEqual({
          isValid: false,
          error: VALIDATION_MESSAGES[VALIDATION_CODES.INVALID_PHONE],
        });
      });

      it('should allow empty phone (optional field)', () => {
        expect(validatePhone('')).toEqual({ isValid: true });
      });
    });

    describe('validateDate', () => {
      it('should validate correct dates', () => {
        expect(validateDate('2024-01-15')).toEqual({ isValid: true });
      });

      it('should reject invalid dates', () => {
        expect(validateDate('invalid-date')).toEqual({
          isValid: false,
          error: VALIDATION_MESSAGES[VALIDATION_CODES.INVALID_DATE],
        });
      });

      it('should handle required option', () => {
        expect(validateDate('', { required: true })).toEqual({
          isValid: false,
          error: VALIDATION_MESSAGES[VALIDATION_CODES.REQUIRED],
        });
        expect(validateDate('', { required: false })).toEqual({ isValid: true });
      });

      it('should handle allowPast option', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = yesterday.toISOString().split('T')[0];

        expect(validateDate(yesterdayString, { allowPast: false })).toEqual({
          isValid: false,
          error: VALIDATION_MESSAGES[VALIDATION_CODES.DATE_IN_PAST],
        });
      });
    });

    describe('validateNumber', () => {
      it('should validate correct numbers', () => {
        expect(validateNumber(123)).toEqual({ isValid: true });
        expect(validateNumber('123.45')).toEqual({ isValid: true });
      });

      it('should reject invalid numbers', () => {
        expect(validateNumber('abc')).toEqual({
          isValid: false,
          error: VALIDATION_MESSAGES[VALIDATION_CODES.INVALID_NUMBER],
        });
      });

      it('should handle min/max constraints', () => {
        expect(validateNumber(5, { min: 10 })).toEqual({
          isValid: false,
          error: 'Value must be at least 10',
        });
        expect(validateNumber(15, { max: 10 })).toEqual({
          isValid: false,
          error: 'Value cannot exceed 10',
        });
      });

      it('should handle allowZero option', () => {
        expect(validateNumber(0, { allowZero: false })).toEqual({
          isValid: false,
          error: VALIDATION_MESSAGES[VALIDATION_CODES.ZERO_VALUE],
        });
        expect(validateNumber(0, { allowZero: true })).toEqual({ isValid: true });
      });
    });

    describe('validateString', () => {
      it('should validate correct strings', () => {
        expect(validateString('test')).toEqual({ isValid: true });
      });

      it('should handle required option', () => {
        expect(validateString('', { required: true })).toEqual({
          isValid: false,
          error: VALIDATION_MESSAGES[VALIDATION_CODES.REQUIRED],
        });
      });

      it('should handle length constraints', () => {
        expect(validateString('ab', { minLength: 3 })).toEqual({
          isValid: false,
          error: expect.stringContaining('Minimum 3 characters'),
        });
        expect(validateString('abcdef', { maxLength: 5 })).toEqual({
          isValid: false,
          error: expect.stringContaining('Maximum 5 characters'),
        });
      });
    });
  });

  describe('Complex Validators', () => {
    describe('validateBillItem', () => {
      it('should validate correct bill item', () => {
        const item = {
          name: 'Shirt Stitching',
          quantity: 1,
          unitPrice: 500,
        };

        const result = validateBillItem(item);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject invalid bill item', () => {
        const item = {
          name: '',
          quantity: 0,
          unitPrice: -100,
        };

        const result = validateBillItem(item);
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(3);
        expect(result.errors.map(e => e.field)).toEqual(['name', 'quantity', 'unitPrice']);
      });
    });

    describe('validateBillForm', () => {
      it('should validate correct bill form', () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowString = tomorrow.toISOString().split('T')[0];

        const billData = {
          customerId: 'customer1',
          billingDate: '2024-01-15',
          deliveryDate: tomorrowString,
          items: [
            {
              id: 'item1',
              name: 'Shirt Stitching',
              quantity: 1,
              unitPrice: 500,
              totalPrice: 500,
              type: 'custom' as const,
            },
          ],
        };

        const result = validateBillForm(billData);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject bill form with missing required fields', () => {
        const billData = {
          customerId: '',
          billingDate: '',
          deliveryDate: '',
          items: [],
        };

        const result = validateBillForm(billData);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should reject delivery date before billing date', () => {
        const billData = {
          customerId: 'customer1',
          billingDate: '2024-01-20',
          deliveryDate: '2024-01-15',
          items: [
            {
              id: 'item1',
              name: 'Shirt Stitching',
              quantity: 1,
              unitPrice: 500,
              totalPrice: 500,
              type: 'custom' as const,
            },
          ],
        };

        const result = validateBillForm(billData);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === VALIDATION_CODES.DELIVERY_BEFORE_BILLING)).toBe(true);
      });
    });

    describe('validatePayment', () => {
      it('should validate correct payment', () => {
        const payment = {
          amount: 500,
          paymentDate: '2024-01-15',
          paymentMethod: 'cash' as const,
        };

        const result = validatePayment(payment, 1000);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject payment exceeding outstanding amount', () => {
        const payment = {
          amount: 1500,
          paymentDate: '2024-01-15',
          paymentMethod: 'cash' as const,
        };

        const result = validatePayment(payment, 1000);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === VALIDATION_CODES.PAYMENT_EXCEEDS_OUTSTANDING)).toBe(true);
      });

      it('should reject future payment date', () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowString = tomorrow.toISOString().split('T')[0];

        const payment = {
          amount: 500,
          paymentDate: tomorrowString,
          paymentMethod: 'cash' as const,
        };

        const result = validatePayment(payment, 1000);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === VALIDATION_CODES.INVALID_DATE)).toBe(true);
      });
    });

    describe('validateReceivedItem', () => {
      it('should validate correct received item', () => {
        const item = {
          name: 'Sample Fabric',
          quantity: 2,
          receivedDate: '2024-01-15',
          status: 'received' as const,
        };

        const result = validateReceivedItem(item);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject invalid received item', () => {
        const item = {
          name: '',
          quantity: 0,
          receivedDate: 'invalid-date',
        };

        const result = validateReceivedItem(item);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should reject returned date before received date', () => {
        const item = {
          name: 'Sample Fabric',
          quantity: 1,
          receivedDate: '2024-01-20',
          returnedDate: '2024-01-15',
          status: 'returned' as const,
        };

        const result = validateReceivedItem(item);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.field === 'returnedDate')).toBe(true);
      });
    });

    describe('validateBillingConfigItem', () => {
      it('should validate correct config item', () => {
        const item = {
          name: 'Shirt Stitching',
          price: 500,
          category: 'service' as const,
          isActive: true,
        };

        const result = validateBillingConfigItem(item);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject invalid config item', () => {
        const item = {
          name: '',
          price: -100,
          category: undefined,
        };

        const result = validateBillingConfigItem(item);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });
});