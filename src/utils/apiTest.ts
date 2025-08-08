// API Test Utility for debugging connectivity issues
import { apiClient } from '../services/apiConfig';
import { ENV_CONFIG } from '../config/environment';

export const testApiConnectivity = async () => {
  console.log('=== API Connectivity Test ===');
  console.log('Environment:', ENV_CONFIG.ENVIRONMENT);
  console.log('API Base URL:', ENV_CONFIG.API_BASE_URL);
  console.log('Timeout:', ENV_CONFIG.TIMEOUT);
  
  const tests = [
    {
      name: 'Basic connectivity test',
      url: '/measurement-configs',
      method: 'GET'
    },
    {
      name: 'Customers endpoint test',
      url: '/customers',
      method: 'GET'
    }
  ];

  const results = [];

  for (const test of tests) {
    try {
      console.log(`\n--- Testing: ${test.name} ---`);
      console.log(`URL: ${ENV_CONFIG.API_BASE_URL}${test.url}`);
      
      const startTime = Date.now();
      const response = await apiClient.get(test.url);
      const endTime = Date.now();
      
      const result = {
        test: test.name,
        success: true,
        status: response.status,
        responseTime: endTime - startTime,
        dataLength: JSON.stringify(response.data).length,
        data: response.data
      };
      
      console.log('✅ Success:', result);
      results.push(result);
      
    } catch (error: any) {
      const result = {
        test: test.name,
        success: false,
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data
      };
      
      console.log('❌ Failed:', result);
      results.push(result);
    }
  }

  console.log('\n=== Test Summary ===');
  results.forEach(result => {
    console.log(`${result.success ? '✅' : '❌'} ${result.test}`);
  });

  return results;
};

// Simple ping test
export const pingApi = async () => {
  try {
    const response = await fetch(`${ENV_CONFIG.API_BASE_URL}/measurement-configs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('Ping response status:', response.status);
    console.log('Ping response ok:', response.ok);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Ping response data:', data);
      return { success: true, data };
    } else {
      const errorText = await response.text();
      console.log('Ping error response:', errorText);
      return { success: false, error: errorText, status: response.status };
    }
  } catch (error: any) {
    console.log('Ping network error:', error.message);
    return { success: false, error: error.message };
  }
};