import { AxiosError } from 'axios';
import { ErrorState } from '../types';

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  type: 'network' | 'validation' | 'api' | 'unknown';
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ApiServiceError extends Error {
  public status?: number;
  public code?: string;
  public type: 'network' | 'validation' | 'api' | 'unknown';

  constructor(message: string, status?: number, code?: string, type: 'network' | 'validation' | 'api' | 'unknown' = 'api') {
    super(message);
    this.name = 'ApiServiceError';
    this.status = status;
    this.code = code;
    this.type = type;
  }
}

export const handleApiError = (error: unknown): ApiError => {
  console.error('API Error:', error);

  if (error instanceof ApiServiceError) {
    return {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type,
    };
  }

  if (error instanceof NetworkError) {
    return {
      message: error.message,
      type: 'network',
    };
  }

  if (error instanceof ValidationError) {
    return {
      message: error.message,
      type: 'validation',
    };
  }

  // Handle Axios errors
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as AxiosError;
    
    if (!axiosError.response) {
      // Network error
      return {
        message: 'Network error. Please check your internet connection.',
        type: 'network',
      };
    }

    const status = axiosError.response.status;
    const responseData = axiosError.response.data as any;

    // Handle specific status codes
    switch (status) {
      case 400:
        return {
          message: responseData?.message || 'Invalid request data.',
          status,
          type: 'validation',
        };
      case 401:
        return {
          message: 'Authentication required.',
          status,
          type: 'api',
        };
      case 403:
        return {
          message: 'Access denied.',
          status,
          type: 'api',
        };
      case 404:
        return {
          message: responseData?.message || 'Resource not found.',
          status,
          type: 'api',
        };
      case 409:
        return {
          message: responseData?.message || 'Conflict with existing data.',
          status,
          type: 'validation',
        };
      case 422:
        return {
          message: responseData?.message || 'Validation failed.',
          status,
          type: 'validation',
        };
      case 429:
        return {
          message: 'Too many requests. Please try again later.',
          status,
          type: 'api',
        };
      case 500:
        return {
          message: 'Server error. Please try again later.',
          status,
          type: 'api',
        };
      case 503:
        return {
          message: 'Service temporarily unavailable.',
          status,
          type: 'api',
        };
      default:
        return {
          message: responseData?.message || `Request failed with status ${status}`,
          status,
          type: 'api',
        };
    }
  }

  // Handle generic errors
  if (error instanceof Error) {
    return {
      message: error.message,
      type: 'unknown',
    };
  }

  return {
    message: 'An unexpected error occurred.',
    type: 'unknown',
  };
};

export const createErrorState = (error: ApiError, retryAction?: () => void): ErrorState => {
  return {
    hasError: true,
    errorMessage: error.message,
    errorType: error.type,
    retryAction,
  };
};

export const getUserFriendlyErrorMessage = (error: ApiError): string => {
  switch (error.type) {
    case 'network':
      return 'Please check your internet connection and try again.';
    case 'validation':
      return error.message;
    case 'api':
      if (error.status === 500) {
        return 'Something went wrong on our end. Please try again later.';
      }
      return error.message;
    default:
      return 'Something went wrong. Please try again.';
  }
};