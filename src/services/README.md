# API Service Layer

This directory contains the API service layer for the Mahaa Tailors mobile app, providing a comprehensive interface to interact with the backend API.

## Structure

- `api.ts` - Main API service with all endpoint methods
- `apiConfig.ts` - Base configuration, HTTP client setup, and caching
- `errorHandler.ts` - Error handling utilities and custom error classes
- `networkService.ts` - Network status monitoring and management
- `index.ts` - Main exports for the service layer

## Features

### ✅ HTTP Client with Axios
- Configured with base URL, timeout, and headers
- Request/response interceptors for logging
- Automatic retry logic with exponential backoff

### ✅ Error Handling
- Custom error classes for different error types
- User-friendly error messages
- Proper error categorization (network, validation, api, unknown)

### ✅ Network Management
- Real-time network status monitoring
- Offline detection and handling
- Automatic network state updates

### ✅ Caching System
- Local data caching with TTL support
- Cache invalidation on data mutations
- Offline data access

### ✅ API Endpoints

#### Customer Management
- `getCustomers(params)` - Get paginated customer list with search/filter
- `getCustomerById(id)` - Get single customer details
- `createCustomer(data)` - Create new customer
- `updateCustomer(id, data)` - Update existing customer
- `deleteCustomer(id)` - Delete customer
- `checkCustomerExists(params)` - Check for duplicate customers

#### Customer Measurements
- `getCustomerMeasurements(customerId)` - Get customer measurements
- `saveCustomerMeasurement(customerId, data)` - Save measurement
- `deleteCustomerMeasurement(customerId, measurementId)` - Delete measurement

#### Measurement Configuration
- `getMeasurementConfigs()` - Get all measurement templates
- `getMeasurementConfigById(id)` - Get single template
- `createMeasurementConfig(data)` - Create new template
- `updateMeasurementConfig(id, data)` - Update template
- `deleteMeasurementConfig(id)` - Delete template

#### Services
- `getServices()` - Get all services
- `getServiceById(id)` - Get single service
- `createService(data)` - Create new service
- `updateService(id, data)` - Update service
- `deleteService(id)` - Delete service

## Usage Examples

### Basic API Calls

```typescript
import { apiService } from '../services';

// Get customers with search
const customers = await apiService.getCustomers({
  search: 'John',
  limit: 20,
  sortBy: 'name'
});

// Create new customer
const newCustomer = await apiService.createCustomer({
  personalDetails: {
    name: 'John Doe',
    phone: '+1234567890',
    email: 'john@example.com'
  }
});

// Get measurement configs
const configs = await apiService.getMeasurementConfigs();
```

### Error Handling

```typescript
import { apiService, handleApiError, getUserFriendlyErrorMessage } from '../services';

try {
  const customer = await apiService.getCustomerById('123');
} catch (error) {
  const apiError = handleApiError(error);
  const userMessage = getUserFriendlyErrorMessage(apiError);
  
  console.error('API Error:', apiError);
  // Show userMessage to user
}
```

### Network Status Monitoring

```typescript
import { networkService } from '../services';

// Check current network status
const isOnline = networkService.isOnline();

// Listen for network changes
const unsubscribe = networkService.addListener((state) => {
  console.log('Network changed:', state);
  if (state.isConnected) {
    // Sync cached data
  }
});

// Clean up listener
unsubscribe();
```

### Cache Management

```typescript
import { cacheManager } from '../services';

// Manual cache operations
await cacheManager.set('key', data, 300000); // 5 minutes TTL
const cached = await cacheManager.get('key');
await cacheManager.remove('key');
await cacheManager.clear(); // Clear all cache
```

## Configuration

The API service can be configured through `API_CONFIG`:

```typescript
export const API_CONFIG = {
  BASE_URL: 'http://127.0.0.1:3000',
  TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};
```

## Requirements Satisfied

- ✅ **5.1**: Uses same backend endpoints as web application
- ✅ **5.4**: Implements retry logic with exponential backoff
- ✅ **5.6**: Maintains same data structure as web app
- ✅ **Additional**: Network error handling and offline support
- ✅ **Additional**: Comprehensive TypeScript interfaces
- ✅ **Additional**: Local caching for offline access