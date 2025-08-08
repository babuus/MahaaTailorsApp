import { AxiosResponse } from 'axios';
import { apiClient, retryRequest, cacheManager, getNetworkStatus, API_CONFIG } from './apiConfig';
import { handleApiError, ApiServiceError, NetworkError } from './errorHandler';
import { offlineManager } from './offlineManager';
import { 
  Customer, 
  MeasurementConfig, 
  ApiResponse, 
  PaginatedResponse,
  CustomerMeasurement 
} from '../types';

// API Request/Response interfaces matching backend
export interface CustomerCreateRequest {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  dob?: string;
  measurements?: Record<string, any>;
  comments?: string;
}

export interface CustomerUpdateRequest extends CustomerCreateRequest {
  customer_id: string;
}

export interface CustomerQueryParams {
  searchText?: string;
  searchField?: 'universal' | 'name' | 'phone' | 'email';
  limit?: number;
}

export interface MeasurementConfigCreateRequest {
  garmentType: string;
  measurements: string[];
}

export interface MeasurementConfigUpdateRequest extends MeasurementConfigCreateRequest {
  id: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceCreateRequest {
  name: string;
  price: number;
  description?: string;
}

export interface ServiceUpdateRequest extends ServiceCreateRequest {
  id: string;
}

// Base API service class
class ApiService {
  private async makeRequest<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    cacheKey?: string,
    useCache: boolean = false
  ): Promise<T> {
    // Check network status
    if (!getNetworkStatus()) {
      if (useCache && cacheKey) {
        const cached = await cacheManager.get<T>(cacheKey);
        if (cached) {
          return cached;
        }
      }
      throw new NetworkError('No internet connection available');
    }

    try {
      const response = await retryRequest(async () => {
        return await requestFn();
      });

      const data = response.data;

      // Cache successful responses if caching is enabled
      if (useCache && cacheKey && data) {
        await cacheManager.set(cacheKey, data);
      }

      return data;
    } catch (error) {
      const apiError = handleApiError(error);
      throw new ApiServiceError(
        apiError.message,
        apiError.status,
        apiError.code,
        apiError.type
      );
    }
  }

  // Customer API methods
  async getCustomers(params: CustomerQueryParams = {}): Promise<PaginatedResponse<Customer>> {
    const queryString = new URLSearchParams();
    
    // Backend supports searchText, searchField, and limit parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        queryString.append(key, String(value));
      }
    });

    const cacheKey = `customers_${queryString.toString()}`;
    const url = `/customers${queryString.toString() ? `?${queryString.toString()}` : ''}`;
    
    // Try offline cache first if not online
    if (!getNetworkStatus()) {
      const cachedCustomers = await offlineManager.getCachedCustomers();
      if (cachedCustomers) {
        // Apply search filter to cached data if needed
        let filteredCustomers = cachedCustomers;
        if (params.searchText) {
          const searchText = params.searchText.toLowerCase();
          filteredCustomers = cachedCustomers.filter(customer => 
            customer.personalDetails.name.toLowerCase().includes(searchText) ||
            customer.personalDetails.phone.includes(searchText) ||
            (customer.personalDetails.email && customer.personalDetails.email.toLowerCase().includes(searchText))
          );
        }
        
        return {
          items: filteredCustomers,
          hasMore: false,
          total: filteredCustomers.length,
        };
      }
      throw new NetworkError('No internet connection and no cached data available');
    }
    
    console.log('Making API call to:', url);
    console.log('Full URL:', `${API_CONFIG.BASE_URL}${url}`);
    
    // Backend returns object with customers array
    const backendResponse = await this.makeRequest(
      () => apiClient.get<{customers: any[]}>(url),
      cacheKey,
      true
    );

    // Debug logging to see what we're getting from the backend
    console.log('Backend customers response:', backendResponse);
    console.log('Customers array:', backendResponse.customers);
    console.log('Customers array length:', backendResponse.customers?.length);
    console.log('First customer:', backendResponse.customers?.[0]);

    // Transform backend response to match expected Customer format
    const customers: Customer[] = (backendResponse.customers || []).map((backendCustomer: any) => ({
      id: backendCustomer.id,
      personalDetails: {
        name: backendCustomer.personalDetails?.name || backendCustomer.name,
        phone: backendCustomer.personalDetails?.phone || backendCustomer.phone,
        email: backendCustomer.personalDetails?.email || backendCustomer.email,
        address: backendCustomer.personalDetails?.address || backendCustomer.address,
        dob: backendCustomer.personalDetails?.dob || backendCustomer.dob,
      },
      measurements: backendCustomer.measurements || [],
      comments: backendCustomer.comments,
      createdAt: backendCustomer.createdAt ? new Date(backendCustomer.createdAt * 1000).toISOString() : new Date().toISOString(),
      updatedAt: backendCustomer.updatedAt ? new Date(backendCustomer.updatedAt * 1000).toISOString() : new Date().toISOString(),
    }));

    console.log('Transformed customers:', customers);
    console.log('Transformed customers length:', customers.length);

    // Cache the customers data for offline use
    await offlineManager.cacheCustomers(customers);

    // Transform backend response to match expected PaginatedResponse format
    return {
      items: customers,
      hasMore: false, // Backend doesn't support pagination yet
      total: customers.length,
    };
  }

  async getCustomerById(id: string): Promise<Customer> {
    const cacheKey = `customer_${id}`;
    
    // Try offline cache first if not online
    if (!getNetworkStatus()) {
      const cachedCustomer = await offlineManager.getCachedCustomer(id);
      if (cachedCustomer) {
        return cachedCustomer;
      }
      throw new NetworkError('No internet connection and no cached customer data available');
    }
    
    const customer = await this.makeRequest(
      () => apiClient.get<Customer>(`/customers/${id}`),
      cacheKey,
      true
    );

    // Cache the individual customer for offline use
    await offlineManager.cacheCustomer(customer);
    
    return customer;
  }

  async createCustomer(data: CustomerCreateRequest): Promise<Customer> {
    const result = await this.makeRequest(
      () => apiClient.post<Customer>('/customers', data)
    );

    // Invalidate customers cache
    await cacheManager.remove('customers_');
    
    return result;
  }

  async updateCustomer(id: string, data: CustomerUpdateRequest): Promise<Customer> {
    const result = await this.makeRequest(
      () => apiClient.put<Customer>(`/customers/${id}`, data)
    );

    // Invalidate related caches
    await cacheManager.remove('customers_');
    await cacheManager.remove(`customer_${id}`);
    
    return result;
  }

  async deleteCustomer(id: string): Promise<void> {
    await this.makeRequest(
      () => apiClient.delete(`/customers/${id}`)
    );

    // Invalidate related caches
    await cacheManager.remove('customers_');
    await cacheManager.remove(`customer_${id}`);
  }

  async checkCustomerExists(params: { phone: string }): Promise<{
    exists: boolean;
    allCustomers: Customer[];
    phoneOnlyDuplicates: Customer[];
  }> {
    const queryString = new URLSearchParams(params).toString();
    
    const backendResponse = await this.makeRequest(
      () => apiClient.get<{
        exists: boolean;
        allCustomers: any[];
        phoneOnlyDuplicates: any[];
      }>(`/customers/exists?${queryString}`)
    );

    // Transform backend response to match expected Customer format
    const transformCustomer = (backendCustomer: any): Customer => ({
      id: backendCustomer.customer_id,
      personalDetails: {
        name: backendCustomer.personalDetails?.name || '',
        phone: backendCustomer.personalDetails?.phone || '',
        email: backendCustomer.personalDetails?.email || '',
        address: backendCustomer.personalDetails?.address || '',
        dob: backendCustomer.personalDetails?.dob || '',
      },
      measurements: backendCustomer.measurements || [],
      comments: backendCustomer.comments || '',
      createdAt: backendCustomer.created_at ? new Date(backendCustomer.created_at * 1000).toISOString() : new Date().toISOString(),
      updatedAt: backendCustomer.updated_at ? new Date(backendCustomer.updated_at * 1000).toISOString() : new Date().toISOString(),
    });

    return {
      exists: backendResponse.exists,
      allCustomers: (backendResponse.allCustomers || []).map(transformCustomer),
      phoneOnlyDuplicates: (backendResponse.phoneOnlyDuplicates || []).map(transformCustomer),
    };
  }

  // Customer Measurements API methods
  async getCustomerMeasurements(customerId: string): Promise<CustomerMeasurement[]> {
    const cacheKey = `customer_measurements_${customerId}`;
    
    return this.makeRequest(
      () => apiClient.get<CustomerMeasurement[]>(`/customers/${customerId}/measurements`),
      cacheKey,
      true
    );
  }

  async saveCustomerMeasurement(customerId: string, data: CustomerMeasurement): Promise<CustomerMeasurement> {
    const result = await this.makeRequest(
      () => apiClient.post<CustomerMeasurement>(`/customers/${customerId}/measurements`, data)
    );

    // Invalidate related caches
    await cacheManager.remove(`customer_measurements_${customerId}`);
    await cacheManager.remove(`customer_${customerId}`);
    
    return result;
  }

  async deleteCustomerMeasurement(customerId: string, measurementId: string): Promise<void> {
    await this.makeRequest(
      () => apiClient.delete(`/customers/${customerId}/measurements/${measurementId}`)
    );

    // Invalidate related caches
    await cacheManager.remove(`customer_measurements_${customerId}`);
    await cacheManager.remove(`customer_${customerId}`);
  }

  // Measurement Configuration API methods
  async getMeasurementConfigs(): Promise<MeasurementConfig[]> {
    const cacheKey = 'measurement_configs';
    
    // Try offline cache first if not online
    if (!getNetworkStatus()) {
      const cachedConfigs = await offlineManager.getCachedMeasurementConfigs();
      if (cachedConfigs) {
        return cachedConfigs;
      }
      throw new NetworkError('No internet connection and no cached measurement configs available');
    }
    
    const configs = await this.makeRequest(
      () => apiClient.get<MeasurementConfig[]>('/measurement-configs'),
      cacheKey,
      true
    );

    // Cache the measurement configs for offline use
    await offlineManager.cacheMeasurementConfigs(configs);
    
    return configs;
  }

  async getMeasurementConfigById(id: string): Promise<MeasurementConfig> {
    const cacheKey = `measurement_config_${id}`;
    
    return this.makeRequest(
      () => apiClient.get<MeasurementConfig>(`/measurement-configs/${id}`),
      cacheKey,
      true
    );
  }

  async createMeasurementConfig(data: MeasurementConfigCreateRequest): Promise<MeasurementConfig> {
    const result = await this.makeRequest(
      () => apiClient.post<MeasurementConfig>('/measurement-configs', data)
    );

    // Invalidate cache
    await cacheManager.remove('measurement_configs');
    
    return result;
  }

  async updateMeasurementConfig(id: string, data: MeasurementConfigUpdateRequest): Promise<MeasurementConfig> {
    const result = await this.makeRequest(
      () => apiClient.put<MeasurementConfig>(`/measurement-configs/${id}`, data)
    );

    // Invalidate related caches
    await cacheManager.remove('measurement_configs');
    await cacheManager.remove(`measurement_config_${id}`);
    
    return result;
  }

  async deleteMeasurementConfig(id: string): Promise<void> {
    await this.makeRequest(
      () => apiClient.delete(`/measurement-configs/${id}`)
    );

    // Invalidate related caches
    await cacheManager.remove('measurement_configs');
    await cacheManager.remove(`measurement_config_${id}`);
  }

  // Services API methods
  async getServices(): Promise<ServiceItem[]> {
    const cacheKey = 'services';
    
    return this.makeRequest(
      () => apiClient.get<ServiceItem[]>('/services'),
      cacheKey,
      true
    );
  }

  async getServiceById(id: string): Promise<ServiceItem> {
    const cacheKey = `service_${id}`;
    
    return this.makeRequest(
      () => apiClient.get<ServiceItem>(`/services/${id}`),
      cacheKey,
      true
    );
  }

  async createService(data: ServiceCreateRequest): Promise<ServiceItem> {
    const result = await this.makeRequest(
      () => apiClient.post<ServiceItem>('/services', data)
    );

    // Invalidate cache
    await cacheManager.remove('services');
    
    return result;
  }

  async updateService(id: string, data: ServiceUpdateRequest): Promise<ServiceItem> {
    const result = await this.makeRequest(
      () => apiClient.put<ServiceItem>(`/services/${id}`, data)
    );

    // Invalidate related caches
    await cacheManager.remove('services');
    await cacheManager.remove(`service_${id}`);
    
    return result;
  }

  async deleteService(id: string): Promise<void> {
    await this.makeRequest(
      () => apiClient.delete(`/services/${id}`)
    );

    // Invalidate related caches
    await cacheManager.remove('services');
    await cacheManager.remove(`service_${id}`);
  }

  // Utility methods
  async clearCache(): Promise<void> {
    await cacheManager.clear();
  }

  async ping(): Promise<{ status: string; timestamp: number }> {
    return this.makeRequest(
      () => apiClient.get<{ status: string; timestamp: number }>('/health')
    );
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Export individual methods for convenience
export const {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  checkCustomerExists,
  getCustomerMeasurements,
  saveCustomerMeasurement,
  deleteCustomerMeasurement,
  getMeasurementConfigs,
  getMeasurementConfigById,
  createMeasurementConfig,
  updateMeasurementConfig,
  deleteMeasurementConfig,
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  clearCache,
  ping,
} = apiService;