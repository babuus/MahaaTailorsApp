import { AxiosResponse } from 'axios';
import { apiClient, retryRequest, cacheManager, getNetworkStatus, API_CONFIG } from './apiConfig';
import { handleApiError, ApiServiceError, NetworkError } from './errorHandler';
import offlineManager from './offlineManager';
import { 
  Customer, 
  MeasurementConfig, 
  Bill,
  BillStatus,
  BillQueryParams,
  CreateBillRequest,
  UpdateBillRequest,
  Payment,
  CreatePaymentRequest,
  UpdatePaymentRequest,
  BillingConfigItem,
  CreateBillingConfigItemRequest,
  UpdateBillingConfigItemRequest,
  ReceivedItemTemplate,
  CreateReceivedItemTemplateRequest,
  UpdateReceivedItemTemplateRequest,
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

  // Bills API methods
  async getBills(params: BillQueryParams = {}): Promise<PaginatedResponse<Bill>> {
    const queryString = new URLSearchParams();
    
    // Backend supports customerId, status, startDate, endDate, searchText, and limit parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        queryString.append(key, String(value));
      }
    });

    const cacheKey = `bills_${queryString.toString()}`;
    const url = `/bills${queryString.toString() ? `?${queryString.toString()}` : ''}`;
    
    // Try offline cache first if not online
    if (!getNetworkStatus()) {
      const cachedBills = await offlineManager.getCachedBills();
      if (cachedBills) {
        // Apply search filter to cached data if needed
        let filteredBills = cachedBills;
        if (params.searchText) {
          const searchText = params.searchText.toLowerCase();
          filteredBills = cachedBills.filter(bill => 
            bill.billNumber.toLowerCase().includes(searchText) ||
            (bill.notes && bill.notes.toLowerCase().includes(searchText))
          );
        }
        
        return {
          items: filteredBills,
          hasMore: false,
          total: filteredBills.length,
        };
      }
      throw new NetworkError('No internet connection and no cached bills available');
    }
    
    // Backend returns object with bills array
    const backendResponse = await this.makeRequest(
      () => apiClient.get<{bills: any[], hasMore: boolean}>(url),
      cacheKey,
      true
    );

    // Transform backend response to match expected Bill format
    const bills: Bill[] = (backendResponse.bills || []).map((backendBill: any) => ({
      id: backendBill.id,
      customerId: backendBill.customerId,
      billNumber: backendBill.billNumber,
      billingDate: backendBill.billingDate,
      deliveryDate: backendBill.deliveryDate,
      items: backendBill.items || [],
      receivedItems: backendBill.receivedItems || [],
      totalAmount: backendBill.totalAmount,
      paidAmount: backendBill.paidAmount || 0,
      outstandingAmount: backendBill.outstandingAmount || backendBill.totalAmount,
      status: backendBill.status || 'draft',
      payments: backendBill.payments || [],
      notes: backendBill.notes || '',
      createdAt: backendBill.createdAt ? new Date(backendBill.createdAt * 1000).toISOString() : new Date().toISOString(),
      updatedAt: backendBill.updatedAt ? new Date(backendBill.updatedAt * 1000).toISOString() : new Date().toISOString(),
    }));

    // Cache the bills data for offline use
    await offlineManager.cacheBills(bills);

    return {
      items: bills,
      hasMore: backendResponse.hasMore || false,
      total: bills.length,
    };
  }

  async getBillById(id: string): Promise<Bill> {
    const cacheKey = `bill_${id}`;
    
    // Try offline cache first if not online
    if (!getNetworkStatus()) {
      const cachedBill = await offlineManager.getCachedBill(id);
      if (cachedBill) {
        return cachedBill;
      }
      throw new NetworkError('No internet connection and no cached bill data available');
    }
    
    const backendBill = await this.makeRequest(
      () => apiClient.get<any>(`/bills/${id}`),
      cacheKey,
      true
    );

    // Transform backend response to match expected Bill format
    const bill: Bill = {
      id: backendBill.id,
      customerId: backendBill.customerId,
      billNumber: backendBill.billNumber,
      billingDate: backendBill.billingDate,
      deliveryDate: backendBill.deliveryDate,
      items: backendBill.items || [],
      receivedItems: backendBill.receivedItems || [],
      totalAmount: backendBill.totalAmount,
      paidAmount: backendBill.paidAmount || 0,
      outstandingAmount: backendBill.outstandingAmount || backendBill.totalAmount,
      status: backendBill.status || 'draft',
      payments: backendBill.payments || [],
      notes: backendBill.notes || '',
      createdAt: backendBill.createdAt ? new Date(backendBill.createdAt * 1000).toISOString() : new Date().toISOString(),
      updatedAt: backendBill.updatedAt ? new Date(backendBill.updatedAt * 1000).toISOString() : new Date().toISOString(),
    };

    // Cache the individual bill for offline use
    await offlineManager.cacheBill(bill);
    
    return bill;
  }

  async createBill(data: CreateBillRequest): Promise<Bill> {
    const result = await this.makeRequest(
      () => apiClient.post<any>('/bills', data)
    );

    // Transform backend response to match expected Bill format
    const bill: Bill = {
      id: result.id,
      customerId: result.customerId,
      billNumber: result.billNumber,
      billingDate: result.billingDate,
      deliveryDate: result.deliveryDate,
      items: result.items || [],
      receivedItems: result.receivedItems || [],
      totalAmount: result.totalAmount,
      paidAmount: result.paidAmount || 0,
      outstandingAmount: result.outstandingAmount || result.totalAmount,
      status: result.status || 'draft',
      payments: result.payments || [],
      notes: result.notes || '',
      createdAt: result.createdAt ? new Date(result.createdAt * 1000).toISOString() : new Date().toISOString(),
      updatedAt: result.updatedAt ? new Date(result.updatedAt * 1000).toISOString() : new Date().toISOString(),
    };

    // Invalidate bills cache
    await cacheManager.remove('bills_');
    
    return bill;
  }

  async updateBill(id: string, data: UpdateBillRequest): Promise<Bill> {
    const result = await this.makeRequest(
      () => apiClient.put<any>(`/bills/${id}`, data)
    );

    // Transform backend response to match expected Bill format
    const bill: Bill = {
      id: result.id || result.billId,
      customerId: result.customerId,
      billNumber: result.billNumber,
      billingDate: result.billingDate || result.billDate,
      deliveryDate: result.deliveryDate,
      items: result.items || [],
      receivedItems: result.receivedItems || [],
      totalAmount: result.totalAmount,
      paidAmount: result.paidAmount || 0,
      outstandingAmount: result.outstandingAmount || result.totalAmount,
      status: result.status || 'draft',
      payments: result.payments || [],
      notes: result.notes || '',
      createdAt: result.createdAt ? new Date(result.createdAt * 1000).toISOString() : new Date().toISOString(),
      updatedAt: result.updatedAt ? new Date(result.updatedAt * 1000).toISOString() : new Date().toISOString(),
    };

    // Invalidate related caches
    await cacheManager.remove('bills_');
    await cacheManager.remove(`bill_${id}`);
    
    return bill;
  }

  async deleteBill(id: string): Promise<void> {
    await this.makeRequest(
      () => apiClient.delete(`/bills/${id}`)
    );

    // Invalidate related caches
    await cacheManager.remove('bills_');
    await cacheManager.remove(`bill_${id}`);
  }

  // Payment API methods
  async addPayment(billId: string, data: CreatePaymentRequest): Promise<{ payment: Payment; bill: Bill }> {
    const result = await this.makeRequest(
      () => apiClient.post<any>(`/bills/${billId}/payments`, data)
    );

    // Transform backend response - backend returns bill data at root level with payment property
    const payment: Payment = {
      id: result.payment.id,
      amount: result.payment.amount,
      paymentDate: result.payment.paymentDate,
      paymentMethod: result.payment.paymentMethod,
      notes: result.payment.notes || '',
      createdAt: result.payment.createdAt ? new Date(result.payment.createdAt * 1000).toISOString() : new Date().toISOString(),
    };

    const bill: Bill = {
      id: result.id,
      customerId: result.customerId,
      billNumber: result.billNumber,
      billingDate: result.billingDate,
      deliveryDate: result.deliveryDate,
      items: result.items || [],
      receivedItems: result.receivedItems || [],
      totalAmount: result.totalAmount,
      paidAmount: result.paidAmount,
      outstandingAmount: result.outstandingAmount,
      status: result.status as BillStatus,
      payments: result.payments || [],
      notes: result.notes || '',
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };

    console.log('API addPayment - Backend response:', {
      totalAmount: result.totalAmount,
      paidAmount: result.paidAmount,
      outstandingAmount: result.outstandingAmount,
      status: result.status,
      paymentsCount: result.payments?.length || 0
    });

    // Invalidate related caches
    await cacheManager.remove('bills_');
    await cacheManager.remove(`bill_${billId}`);
    
    return { payment, bill };
  }

  async updatePayment(billId: string, paymentId: string, data: UpdatePaymentRequest): Promise<Payment> {
    // TODO: Implement update payment API endpoint in backend
    throw new Error('Update payment functionality is not yet implemented in the backend. Please delete and re-add the payment instead.');
  }

  async deletePayment(billId: string, paymentId: string): Promise<void> {
    // TODO: Implement delete payment API endpoint in backend
    throw new Error('Delete payment functionality is not yet implemented in the backend. Please contact support for assistance.');
  }

  // Billing Configuration API methods
  async getBillingConfigItems(): Promise<BillingConfigItem[]> {
    const cacheKey = 'billing_config_items';
    
    // Try offline cache first if not online
    if (!getNetworkStatus()) {
      const cachedItems = await offlineManager.getCachedBillingConfigItems();
      if (cachedItems) {
        return cachedItems;
      }
      throw new NetworkError('No internet connection and no cached billing config items available');
    }
    
    const backendResponse = await this.makeRequest(
      () => apiClient.get<{items: any[]}>('/billing-config-items'),
      cacheKey,
      true
    );

    // Transform backend response to match expected BillingConfigItem format
    const items: BillingConfigItem[] = (backendResponse.items || []).map((backendItem: any) => ({
      id: backendItem.id,
      name: backendItem.name,
      description: backendItem.description || '',
      price: backendItem.price,
      category: backendItem.category,
      isActive: backendItem.isActive !== false,
      createdAt: backendItem.createdAt ? new Date(backendItem.createdAt * 1000).toISOString() : new Date().toISOString(),
      updatedAt: backendItem.updatedAt ? new Date(backendItem.updatedAt * 1000).toISOString() : new Date().toISOString(),
    }));

    // Cache the billing config items for offline use
    await offlineManager.cacheBillingConfigItems(items);
    
    return items;
  }

  async createBillingConfigItem(data: CreateBillingConfigItemRequest): Promise<BillingConfigItem> {
    const result = await this.makeRequest(
      () => apiClient.post<any>('/billing-config-items', data)
    );

    // Transform backend response to match expected BillingConfigItem format
    const item: BillingConfigItem = {
      id: result.id,
      name: result.name,
      description: result.description || '',
      price: result.price,
      category: result.category,
      isActive: result.isActive !== false,
      createdAt: result.createdAt ? new Date(result.createdAt * 1000).toISOString() : new Date().toISOString(),
      updatedAt: result.updatedAt ? new Date(result.updatedAt * 1000).toISOString() : new Date().toISOString(),
    };

    // Invalidate cache
    await cacheManager.remove('billing_config_items');
    
    return item;
  }

  async updateBillingConfigItem(id: string, data: UpdateBillingConfigItemRequest): Promise<BillingConfigItem> {
    const result = await this.makeRequest(
      () => apiClient.put<any>(`/billing-config-items/${id}`, data)
    );

    // Transform backend response to match expected BillingConfigItem format
    const item: BillingConfigItem = {
      id: result.id,
      name: result.name,
      description: result.description || '',
      price: result.price,
      category: result.category,
      isActive: result.isActive !== false,
      createdAt: result.createdAt ? new Date(result.createdAt * 1000).toISOString() : new Date().toISOString(),
      updatedAt: result.updatedAt ? new Date(result.updatedAt * 1000).toISOString() : new Date().toISOString(),
    };

    // Invalidate related caches
    await cacheManager.remove('billing_config_items');
    await cacheManager.remove(`billing_config_item_${id}`);
    
    return item;
  }

  async deleteBillingConfigItem(id: string): Promise<void> {
    await this.makeRequest(
      () => apiClient.delete(`/billing-config-items/${id}`)
    );

    // Invalidate related caches
    await cacheManager.remove('billing_config_items');
    await cacheManager.remove(`billing_config_item_${id}`);
  }

  // Received Item Templates API methods
  async getReceivedItemTemplates(): Promise<ReceivedItemTemplate[]> {
    const cacheKey = 'received_item_templates';
    
    // Try offline cache first if not online
    if (!getNetworkStatus()) {
      const cachedTemplates = await offlineManager.getCachedReceivedItemTemplates();
      if (cachedTemplates) {
        return cachedTemplates;
      }
      throw new NetworkError('No internet connection and no cached received item templates available');
    }
    
    const backendResponse = await this.makeRequest(
      () => apiClient.get<{templates: any[]}>('/received-item-templates'),
      cacheKey,
      true
    );

    // Transform backend response to match expected ReceivedItemTemplate format
    const templates: ReceivedItemTemplate[] = (backendResponse.templates || []).map((backendTemplate: any) => ({
      id: backendTemplate.id,
      name: backendTemplate.name,
      description: backendTemplate.description || '',
      category: backendTemplate.category,
      isActive: backendTemplate.isActive !== false,
      createdAt: backendTemplate.createdAt ? new Date(backendTemplate.createdAt * 1000).toISOString() : new Date().toISOString(),
      updatedAt: backendTemplate.updatedAt ? new Date(backendTemplate.updatedAt * 1000).toISOString() : new Date().toISOString(),
    }));

    // Cache the received item templates for offline use
    await offlineManager.cacheReceivedItemTemplates(templates);
    
    return templates;
  }

  async createReceivedItemTemplate(data: CreateReceivedItemTemplateRequest): Promise<ReceivedItemTemplate> {
    const result = await this.makeRequest(
      () => apiClient.post<any>('/received-item-templates', data)
    );

    // Transform backend response to match expected ReceivedItemTemplate format
    const template: ReceivedItemTemplate = {
      id: result.id,
      name: result.name,
      description: result.description || '',
      category: result.category,
      isActive: result.isActive !== false,
      createdAt: result.createdAt ? new Date(result.createdAt * 1000).toISOString() : new Date().toISOString(),
      updatedAt: result.updatedAt ? new Date(result.updatedAt * 1000).toISOString() : new Date().toISOString(),
    };

    // Invalidate cache
    await cacheManager.remove('received_item_templates');
    
    return template;
  }

  async updateReceivedItemTemplate(id: string, data: UpdateReceivedItemTemplateRequest): Promise<ReceivedItemTemplate> {
    const result = await this.makeRequest(
      () => apiClient.put<any>(`/received-item-templates/${id}`, data)
    );

    // Transform backend response to match expected ReceivedItemTemplate format
    const template: ReceivedItemTemplate = {
      id: result.id,
      name: result.name,
      description: result.description || '',
      category: result.category,
      isActive: result.isActive !== false,
      createdAt: result.createdAt ? new Date(result.createdAt * 1000).toISOString() : new Date().toISOString(),
      updatedAt: result.updatedAt ? new Date(result.updatedAt * 1000).toISOString() : new Date().toISOString(),
    };

    // Invalidate related caches
    await cacheManager.remove('received_item_templates');
    await cacheManager.remove(`received_item_template_${id}`);
    
    return template;
  }

  async deleteReceivedItemTemplate(id: string): Promise<void> {
    await this.makeRequest(
      () => apiClient.delete(`/received-item-templates/${id}`)
    );

    // Invalidate related caches
    await cacheManager.remove('received_item_templates');
    await cacheManager.remove(`received_item_template_${id}`);
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

// Export individual methods for convenience with proper binding
export const getCustomers = apiService.getCustomers.bind(apiService);
export const getCustomerById = apiService.getCustomerById.bind(apiService);
export const createCustomer = apiService.createCustomer.bind(apiService);
export const updateCustomer = apiService.updateCustomer.bind(apiService);
export const deleteCustomer = apiService.deleteCustomer.bind(apiService);
export const checkCustomerExists = apiService.checkCustomerExists.bind(apiService);
export const getCustomerMeasurements = apiService.getCustomerMeasurements.bind(apiService);
export const saveCustomerMeasurement = apiService.saveCustomerMeasurement.bind(apiService);
export const deleteCustomerMeasurement = apiService.deleteCustomerMeasurement.bind(apiService);
export const getMeasurementConfigs = apiService.getMeasurementConfigs.bind(apiService);
export const getMeasurementConfigById = apiService.getMeasurementConfigById.bind(apiService);
export const createMeasurementConfig = apiService.createMeasurementConfig.bind(apiService);
export const updateMeasurementConfig = apiService.updateMeasurementConfig.bind(apiService);
export const deleteMeasurementConfig = apiService.deleteMeasurementConfig.bind(apiService);
export const getServices = apiService.getServices.bind(apiService);
export const getServiceById = apiService.getServiceById.bind(apiService);
export const createService = apiService.createService.bind(apiService);
export const updateService = apiService.updateService.bind(apiService);
export const deleteService = apiService.deleteService.bind(apiService);
export const getBills = apiService.getBills.bind(apiService);
export const getBillById = apiService.getBillById.bind(apiService);
export const createBill = apiService.createBill.bind(apiService);
export const updateBill = apiService.updateBill.bind(apiService);
export const deleteBill = apiService.deleteBill.bind(apiService);
export const addPayment = apiService.addPayment.bind(apiService);
export const updatePayment = apiService.updatePayment.bind(apiService);
export const deletePayment = apiService.deletePayment.bind(apiService);
export const getBillingConfigItems = apiService.getBillingConfigItems.bind(apiService);
export const createBillingConfigItem = apiService.createBillingConfigItem.bind(apiService);
export const updateBillingConfigItem = apiService.updateBillingConfigItem.bind(apiService);
export const deleteBillingConfigItem = apiService.deleteBillingConfigItem.bind(apiService);
export const getReceivedItemTemplates = apiService.getReceivedItemTemplates.bind(apiService);
export const createReceivedItemTemplate = apiService.createReceivedItemTemplate.bind(apiService);
export const updateReceivedItemTemplate = apiService.updateReceivedItemTemplate.bind(apiService);
export const deleteReceivedItemTemplate = apiService.deleteReceivedItemTemplate.bind(apiService);
export const clearCache = apiService.clearCache.bind(apiService);
export const ping = apiService.ping.bind(apiService);