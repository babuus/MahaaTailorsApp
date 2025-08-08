// Test file to verify data models and validation schemas work correctly

import {
  Customer,
  CustomerPersonalDetails,
  CustomerMeasurement,
  MeasurementField,
  MeasurementConfig,
  CustomerFormData,
  MeasurementConfigFormData,
  ApiResponse,
  PaginatedResponse,
  VALIDATION_PATTERNS,
  VALIDATION_MESSAGES,
} from '../index';

import {
  validateCustomerForm,
  validateMeasurementConfigForm,
  validateField,
  validateDate,
} from '../../utils/validation';

describe('Data Models and TypeScript Interfaces', () => {
  describe('Customer Data Models', () => {
    it('should create a valid Customer object', () => {
      const customer: Customer = {
        id: '123',
        personalDetails: {
          name: 'John Doe',
          phone: '+1234567890',
          email: 'john@example.com',
          address: '123 Main St',
          dob: '1990-01-01',
        },
        measurements: [
          {
            id: 'measurement-1',
            garmentType: 'Shirt',
            fields: [
              { name: 'Chest', value: '40' },
              { name: 'Waist', value: '32' },
            ],
            notes: 'Regular fit',
            lastMeasuredDate: '2024-01-01',
          },
        ],
        comments: 'VIP customer',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      expect(customer.id).toBe('123');
      expect(customer.personalDetails.name).toBe('John Doe');
      expect(customer.measurements).toHaveLength(1);
      expect(customer.measurements[0].fields).toHaveLength(2);
    });

    it('should create a valid CustomerFormData object', () => {
      const formData: CustomerFormData = {
        personalDetails: {
          name: 'Jane Doe',
          phone: '+1987654321',
          email: 'jane@example.com',
        },
        measurements: [
          {
            garmentType: 'Dress',
            fields: [
              { name: 'Bust', value: '36' },
              { name: 'Waist', value: '28' },
              { name: 'Hip', value: '38' },
            ],
            lastMeasuredDate: '2024-01-01',
          },
        ],
        comments: 'Prefers loose fit',
      };

      expect(formData.personalDetails.name).toBe('Jane Doe');
      expect(formData.measurements?.[0].fields).toHaveLength(3);
    });
  });

  describe('Measurement Configuration Data Models', () => {
    it('should create a valid MeasurementConfig object', () => {
      const config: MeasurementConfig = {
        id: 'config-1',
        garmentType: 'Shirt',
        measurements: ['Chest', 'Waist', 'Shoulder', 'Sleeve Length'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      expect(config.id).toBe('config-1');
      expect(config.garmentType).toBe('Shirt');
      expect(config.measurements).toHaveLength(4);
    });

    it('should create a valid MeasurementConfigFormData object', () => {
      const formData: MeasurementConfigFormData = {
        garmentType: 'Pants',
        measurements: ['Waist', 'Inseam', 'Outseam', 'Thigh'],
      };

      expect(formData.garmentType).toBe('Pants');
      expect(formData.measurements).toHaveLength(4);
    });
  });

  describe('API Response Interfaces', () => {
    it('should create a valid ApiResponse object', () => {
      const response: ApiResponse<Customer> = {
        success: true,
        data: {
          id: '123',
          personalDetails: {
            name: 'Test Customer',
            phone: '+1234567890',
          },
          measurements: [],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        message: 'Customer retrieved successfully',
      };

      expect(response.success).toBe(true);
      expect(response.data?.id).toBe('123');
    });

    it('should create a valid PaginatedResponse object', () => {
      const response: PaginatedResponse<Customer> = {
        items: [],
        nextPageCursor: 'cursor-123',
        hasMore: true,
        total: 100,
      };

      expect(response.items).toHaveLength(0);
      expect(response.hasMore).toBe(true);
      expect(response.total).toBe(100);
    });
  });
});

describe('Validation Functions', () => {
  describe('Customer Form Validation', () => {
    it('should validate a valid customer form', () => {
      const validFormData: CustomerFormData = {
        personalDetails: {
          name: 'John Doe',
          phone: '+1234567890',
          email: 'john@example.com',
          address: '123 Main St',
          dob: '1990-01-01',
        },
        comments: 'Test customer',
      };

      const result = validateCustomerForm(validFormData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for missing required fields', () => {
      const invalidFormData: CustomerFormData = {
        personalDetails: {
          name: '',
          phone: '',
        },
      };

      const result = validateCustomerForm(invalidFormData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.field === 'personalDetails.name')).toBe(true);
      expect(result.errors.some(e => e.field === 'personalDetails.phone')).toBe(true);
    });

    it('should fail validation for invalid email format', () => {
      const invalidFormData: CustomerFormData = {
        personalDetails: {
          name: 'John Doe',
          phone: '+1234567890',
          email: 'invalid-email',
        },
      };

      const result = validateCustomerForm(invalidFormData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'personalDetails.email')).toBe(true);
    });
  });

  describe('Measurement Config Form Validation', () => {
    it('should validate a valid measurement config form', () => {
      const validFormData: MeasurementConfigFormData = {
        garmentType: 'Shirt',
        measurements: ['Chest', 'Waist', 'Shoulder'],
      };

      const result = validateMeasurementConfigForm(validFormData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for missing garment type', () => {
      const invalidFormData: MeasurementConfigFormData = {
        garmentType: '',
        measurements: ['Chest', 'Waist'],
      };

      const result = validateMeasurementConfigForm(invalidFormData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'garmentType')).toBe(true);
    });

    it('should fail validation for empty measurements array', () => {
      const invalidFormData: MeasurementConfigFormData = {
        garmentType: 'Shirt',
        measurements: [],
      };

      const result = validateMeasurementConfigForm(invalidFormData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'measurements')).toBe(true);
    });

    it('should fail validation for duplicate measurement names', () => {
      const invalidFormData: MeasurementConfigFormData = {
        garmentType: 'Shirt',
        measurements: ['Chest', 'Waist', 'chest'], // 'chest' is duplicate of 'Chest'
      };

      const result = validateMeasurementConfigForm(invalidFormData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'measurements')).toBe(true);
    });
  });

  describe('Field Validation', () => {
    it('should validate required fields correctly', () => {
      const result = validateField('', { required: true });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(VALIDATION_MESSAGES.REQUIRED);
    });

    it('should validate email pattern correctly', () => {
      const validEmail = validateField('test@example.com', { pattern: VALIDATION_PATTERNS.EMAIL });
      expect(validEmail.isValid).toBe(true);

      const invalidEmail = validateField('invalid-email', { pattern: VALIDATION_PATTERNS.EMAIL });
      expect(invalidEmail.isValid).toBe(false);
      expect(invalidEmail.error).toBe(VALIDATION_MESSAGES.INVALID_EMAIL);
    });

    it('should validate phone pattern correctly', () => {
      const validPhone = validateField('+1234567890', { pattern: VALIDATION_PATTERNS.PHONE });
      expect(validPhone.isValid).toBe(true);

      const invalidPhone = validateField('invalid-phone', { pattern: VALIDATION_PATTERNS.PHONE });
      expect(invalidPhone.isValid).toBe(false);
      expect(invalidPhone.error).toBe(VALIDATION_MESSAGES.INVALID_PHONE);
    });
  });

  describe('Date Validation', () => {
    it('should validate valid dates', () => {
      const result = validateDate('1990-01-01');
      expect(result.isValid).toBe(true);
    });

    it('should fail validation for invalid date format', () => {
      const result = validateDate('invalid-date');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(VALIDATION_MESSAGES.INVALID_DATE);
    });

    it('should fail validation for future dates', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const result = validateDate(futureDate.toISOString().split('T')[0]);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Date cannot be in the future');
    });

    it('should allow empty dates (optional)', () => {
      const result = validateDate('');
      expect(result.isValid).toBe(true);
    });
  });
});