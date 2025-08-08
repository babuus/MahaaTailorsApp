import { apiService } from '../services/api';
import { Customer } from '../types';
import { apiClient } from '../services/apiConfig';

// Mock the API client
jest.mock('../services/apiConfig', () => ({
  apiClient: {
    get: jest.fn(),
  },
  retryRequest: jest.fn((fn) => fn()),
  cacheManager: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
  },
  getNetworkStatus: jest.fn(() => true),
  API_CONFIG: {
    BASE_URL: 'http://test.com',
  },
}));

jest.mock('../services/errorHandler', () => ({
  handleApiError: jest.fn((error) => error),
  ApiServiceError: class extends Error {},
  NetworkError: class extends Error {},
}));

describe('Customer Duplicate Detection API', () => {
  const mockBackendCustomer = {
    customer_id: 'existing-customer-id',
    personalDetails: {
      name: 'Existing Customer',
      phone: '+1234567890',
      email: 'existing@example.com',
      address: '123 Main St',
      dob: '1990-01-01',
    },
    measurements: [],
    comments: '',
    created_at: 1672531200, // Unix timestamp
    updated_at: 1672531200,
  };

  const expectedTransformedCustomer: Customer = {
    id: 'existing-customer-id',
    personalDetails: {
      name: 'Existing Customer',
      phone: '+1234567890',
      email: 'existing@example.com',
      address: '123 Main St',
      dob: '1990-01-01',
    },
    measurements: [],
    comments: '',
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call checkCustomerExists API with correct parameters', async () => {
    const mockApiResponse = {
      data: {
        exists: true,
        allCustomers: [mockBackendCustomer],
        phoneOnlyDuplicates: [mockBackendCustomer],
      },
    };

    (apiClient.get as jest.Mock).mockResolvedValue(mockApiResponse);

    const result = await apiService.checkCustomerExists({ phone: '+1234567890' });

    expect(apiClient.get).toHaveBeenCalledWith('/customers/exists?phone=%2B1234567890');
    expect(result).toEqual({
      exists: true,
      allCustomers: [expectedTransformedCustomer],
      phoneOnlyDuplicates: [expectedTransformedCustomer],
    });
  });

  it('should return no duplicates when customer does not exist', async () => {
    const mockApiResponse = {
      data: {
        exists: false,
        allCustomers: [],
        phoneOnlyDuplicates: [],
      },
    };

    (apiClient.get as jest.Mock).mockResolvedValue(mockApiResponse);

    const result = await apiService.checkCustomerExists({ phone: '+9999999999' });

    expect(apiClient.get).toHaveBeenCalledWith('/customers/exists?phone=%2B9999999999');
    expect(result).toEqual({
      exists: false,
      allCustomers: [],
      phoneOnlyDuplicates: [],
    });
  });

  it('should transform backend customer data correctly', async () => {
    const mockApiResponse = {
      data: {
        exists: true,
        allCustomers: [mockBackendCustomer],
        phoneOnlyDuplicates: [mockBackendCustomer],
      },
    };

    (apiClient.get as jest.Mock).mockResolvedValue(mockApiResponse);

    const result = await apiService.checkCustomerExists({ phone: '+1234567890' });

    // Verify the transformation from backend format to app format
    expect(result.phoneOnlyDuplicates[0]).toEqual(expectedTransformedCustomer);
    expect(result.phoneOnlyDuplicates[0].id).toBe('existing-customer-id');
    expect(result.phoneOnlyDuplicates[0].personalDetails.name).toBe('Existing Customer');
    expect(result.phoneOnlyDuplicates[0].createdAt).toBe('2023-01-01T00:00:00.000Z');
  });

  it('should handle multiple duplicate customers', async () => {
    const secondMockCustomer = {
      customer_id: 'another-customer-id',
      personalDetails: {
        name: 'Another Customer',
        phone: '+1234567890',
        email: 'another@example.com',
        address: '456 Oak Ave',
        dob: '1985-05-15',
      },
      measurements: [],
      comments: 'Another customer with same phone',
      created_at: 1672617600,
      updated_at: 1672617600,
    };

    const mockApiResponse = {
      data: {
        exists: true,
        allCustomers: [mockBackendCustomer, secondMockCustomer],
        phoneOnlyDuplicates: [mockBackendCustomer, secondMockCustomer],
      },
    };

    (apiClient.get as jest.Mock).mockResolvedValue(mockApiResponse);

    const result = await apiService.checkCustomerExists({ phone: '+1234567890' });

    expect(result.exists).toBe(true);
    expect(result.phoneOnlyDuplicates).toHaveLength(2);
    expect(result.phoneOnlyDuplicates[0].personalDetails.name).toBe('Existing Customer');
    expect(result.phoneOnlyDuplicates[1].personalDetails.name).toBe('Another Customer');
  });

  it('should handle API errors gracefully', async () => {
    const mockError = new Error('Network error');
    (apiClient.get as jest.Mock).mockRejectedValue(mockError);

    await expect(apiService.checkCustomerExists({ phone: '+1234567890' })).rejects.toThrow('Network error');

    expect(apiClient.get).toHaveBeenCalledWith('/customers/exists?phone=%2B1234567890');
  });

  it('should handle empty customer data gracefully', async () => {
    const emptyCustomer = {
      customer_id: 'empty-customer-id',
      personalDetails: {},
      measurements: [],
      comments: '',
      created_at: 1672531200,
      updated_at: 1672531200,
    };

    const mockApiResponse = {
      data: {
        exists: true,
        allCustomers: [emptyCustomer],
        phoneOnlyDuplicates: [emptyCustomer],
      },
    };

    (apiClient.get as jest.Mock).mockResolvedValue(mockApiResponse);

    const result = await apiService.checkCustomerExists({ phone: '+1234567890' });

    expect(result.phoneOnlyDuplicates[0]).toEqual({
      id: 'empty-customer-id',
      personalDetails: {
        name: '',
        phone: '',
        email: '',
        address: '',
        dob: '',
      },
      measurements: [],
      comments: '',
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
    });
  });
});