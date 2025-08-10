import { Alert } from 'react-native';

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  statusCode?: number;
}

export interface ErrorHandlerOptions {
  showAlert?: boolean;
  logError?: boolean;
  fallbackMessage?: string;
  onRetry?: () => void;
  context?: string;
}

// Error codes
export const ERROR_CODES = {
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  
  // API errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  
  // Business logic errors
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  INVALID_STATE: 'INVALID_STATE',
  
  // Client errors
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_DATA: 'MISSING_DATA',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
} as const;

// Error messages
export const ERROR_MESSAGES = {
  [ERROR_CODES.NETWORK_ERROR]: 'Network connection failed. Please check your internet connection.',
  [ERROR_CODES.TIMEOUT_ERROR]: 'Request timed out. Please try again.',
  [ERROR_CODES.CONNECTION_ERROR]: 'Unable to connect to server. Please try again later.',
  
  [ERROR_CODES.VALIDATION_ERROR]: 'Please check your input and try again.',
  [ERROR_CODES.NOT_FOUND]: 'The requested resource was not found.',
  [ERROR_CODES.UNAUTHORIZED]: 'You are not authorized to perform this action.',
  [ERROR_CODES.FORBIDDEN]: 'Access denied. You do not have permission to perform this action.',
  [ERROR_CODES.CONFLICT]: 'This action conflicts with existing data.',
  [ERROR_CODES.INTERNAL_ERROR]: 'An unexpected error occurred. Please try again.',
  
  [ERROR_CODES.INSUFFICIENT_BALANCE]: 'Payment amount exceeds the outstanding balance.',
  [ERROR_CODES.DUPLICATE_ENTRY]: 'This entry already exists.',
  [ERROR_CODES.INVALID_STATE]: 'Invalid operation for current state.',
  
  [ERROR_CODES.INVALID_INPUT]: 'Please provide valid input.',
  [ERROR_CODES.MISSING_DATA]: 'Required information is missing.',
  [ERROR_CODES.PERMISSION_DENIED]: 'You do not have permission to access this feature.',
} as const;

// Error classification
export const isNetworkError = (error: any): boolean => {
  return (
    error?.code === 'NETWORK_REQUEST_FAILED' ||
    error?.message?.includes('Network request failed') ||
    error?.message?.includes('fetch') ||
    !navigator.onLine
  );
};

export const isTimeoutError = (error: any): boolean => {
  return (
    error?.code === 'TIMEOUT' ||
    error?.message?.includes('timeout') ||
    error?.message?.includes('Request timed out')
  );
};

export const isValidationError = (error: any): boolean => {
  return (
    error?.statusCode === 400 ||
    error?.statusCode === 422 ||
    error?.code === ERROR_CODES.VALIDATION_ERROR
  );
};

export const isAuthError = (error: any): boolean => {
  return (
    error?.statusCode === 401 ||
    error?.statusCode === 403 ||
    error?.code === ERROR_CODES.UNAUTHORIZED ||
    error?.code === ERROR_CODES.FORBIDDEN
  );
};

export const isServerError = (error: any): boolean => {
  return (
    error?.statusCode >= 500 ||
    error?.code === ERROR_CODES.INTERNAL_ERROR
  );
};

// Error parsing
export const parseApiError = (error: any): ApiError => {
  // Handle network errors
  if (isNetworkError(error)) {
    return {
      code: ERROR_CODES.NETWORK_ERROR,
      message: ERROR_MESSAGES[ERROR_CODES.NETWORK_ERROR],
      statusCode: 0,
    };
  }

  // Handle timeout errors
  if (isTimeoutError(error)) {
    return {
      code: ERROR_CODES.TIMEOUT_ERROR,
      message: ERROR_MESSAGES[ERROR_CODES.TIMEOUT_ERROR],
      statusCode: 0,
    };
  }

  // Handle API response errors
  if (error?.response) {
    const { status, data } = error.response;
    
    return {
      code: data?.error?.code || getErrorCodeFromStatus(status),
      message: data?.error?.message || getErrorMessageFromStatus(status),
      details: data?.error?.details,
      statusCode: status,
    };
  }

  // Handle structured errors
  if (error?.code && error?.message) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
      statusCode: error.statusCode,
    };
  }

  // Handle generic errors
  return {
    code: ERROR_CODES.INTERNAL_ERROR,
    message: error?.message || ERROR_MESSAGES[ERROR_CODES.INTERNAL_ERROR],
    statusCode: 500,
  };
};

const getErrorCodeFromStatus = (status: number): string => {
  switch (status) {
    case 400:
    case 422:
      return ERROR_CODES.VALIDATION_ERROR;
    case 401:
      return ERROR_CODES.UNAUTHORIZED;
    case 403:
      return ERROR_CODES.FORBIDDEN;
    case 404:
      return ERROR_CODES.NOT_FOUND;
    case 409:
      return ERROR_CODES.CONFLICT;
    default:
      return ERROR_CODES.INTERNAL_ERROR;
  }
};

const getErrorMessageFromStatus = (status: number): string => {
  const code = getErrorCodeFromStatus(status);
  return ERROR_MESSAGES[code as keyof typeof ERROR_MESSAGES];
};

// Error handling strategies
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: Array<{ error: ApiError; timestamp: Date; context?: string }> = [];

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  handle(error: any, options: ErrorHandlerOptions = {}): ApiError {
    const {
      showAlert = true,
      logError = true,
      fallbackMessage,
      onRetry,
      context,
    } = options;

    const parsedError = parseApiError(error);

    // Log error
    if (logError) {
      this.logError(parsedError, context);
    }

    // Show user-friendly alert
    if (showAlert) {
      this.showErrorAlert(parsedError, fallbackMessage, onRetry);
    }

    return parsedError;
  }

  private logError(error: ApiError, context?: string): void {
    const logEntry = {
      error,
      timestamp: new Date(),
      context,
    };

    this.errorLog.push(logEntry);

    // Keep only last 100 errors
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-100);
    }

    // Console log for development
    if (__DEV__) {
      console.error('Error Handler:', {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        context,
        details: error.details,
      });
    }
  }

  private showErrorAlert(error: ApiError, fallbackMessage?: string, onRetry?: () => void): void {
    const message = fallbackMessage || error.message;
    const buttons: any[] = [];

    // Add retry button for network errors
    if (onRetry && (isNetworkError(error) || isTimeoutError(error) || isServerError(error))) {
      buttons.push({
        text: 'Retry',
        onPress: onRetry,
      });
    }

    buttons.push({
      text: 'OK',
      style: 'cancel',
    });

    Alert.alert('Error', message, buttons);
  }

  // Specific error handlers
  handleNetworkError(onRetry?: () => void): void {
    Alert.alert(
      'Connection Error',
      'Unable to connect to the server. Please check your internet connection and try again.',
      [
        { text: 'Cancel', style: 'cancel' },
        ...(onRetry ? [{ text: 'Retry', onPress: onRetry }] : []),
      ]
    );
  }

  handleValidationError(errors: Array<{ field: string; message: string }>): void {
    const errorMessage = errors.length === 1 
      ? errors[0].message
      : `Please fix the following errors:\n${errors.map(e => `• ${e.message}`).join('\n')}`;

    Alert.alert('Validation Error', errorMessage);
  }

  handleAuthError(onLogin?: () => void): void {
    Alert.alert(
      'Authentication Required',
      'Your session has expired. Please log in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        ...(onLogin ? [{ text: 'Log In', onPress: onLogin }] : []),
      ]
    );
  }

  handlePermissionError(): void {
    Alert.alert(
      'Access Denied',
      'You do not have permission to perform this action. Please contact your administrator.',
      [{ text: 'OK', style: 'cancel' }]
    );
  }

  handleOfflineError(onRetry?: () => void): void {
    Alert.alert(
      'Offline',
      'You are currently offline. Some features may not be available.',
      [
        { text: 'OK', style: 'cancel' },
        ...(onRetry ? [{ text: 'Try Again', onPress: onRetry }] : []),
      ]
    );
  }

  // Success handlers
  showSuccessMessage(message: string, onDismiss?: () => void): void {
    Alert.alert('Success', message, [
      { text: 'OK', onPress: onDismiss },
    ]);
  }

  showConfirmationDialog(
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ): void {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: onCancel },
        { text: 'Confirm', onPress: onConfirm },
      ]
    );
  }

  // Error recovery
  createRetryHandler(operation: () => Promise<any>, maxRetries: number = 3) {
    let retryCount = 0;

    const executeWithRetry = async (): Promise<any> => {
      try {
        return await operation();
      } catch (error) {
        const parsedError = parseApiError(error);

        // Only retry for network/server errors
        if (
          retryCount < maxRetries &&
          (isNetworkError(parsedError) || isTimeoutError(parsedError) || isServerError(parsedError))
        ) {
          retryCount++;
          
          // Exponential backoff
          const delay = Math.pow(2, retryCount) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          
          return executeWithRetry();
        }

        throw error;
      }
    };

    return executeWithRetry;
  }

  // Error reporting
  getErrorLog(): Array<{ error: ApiError; timestamp: Date; context?: string }> {
    return [...this.errorLog];
  }

  clearErrorLog(): void {
    this.errorLog = [];
  }

  // Utility methods
  isRecoverableError(error: ApiError): boolean {
    return (
      error.code === ERROR_CODES.NETWORK_ERROR ||
      error.code === ERROR_CODES.TIMEOUT_ERROR ||
      error.code === ERROR_CODES.INTERNAL_ERROR
    );
  }

  shouldRetry(error: ApiError): boolean {
    return (
      isNetworkError(error) ||
      isTimeoutError(error) ||
      isServerError(error)
    );
  }

  getErrorSeverity(error: ApiError): 'low' | 'medium' | 'high' | 'critical' {
    if (isAuthError(error)) return 'high';
    if (isServerError(error)) return 'critical';
    if (isNetworkError(error) || isTimeoutError(error)) return 'medium';
    if (isValidationError(error)) return 'low';
    return 'medium';
  }
}

// Convenience functions
export const errorHandler = ErrorHandler.getInstance();

export const handleError = (error: any, options?: ErrorHandlerOptions): ApiError => {
  return errorHandler.handle(error, options);
};

export const handleNetworkError = (onRetry?: () => void): void => {
  errorHandler.handleNetworkError(onRetry);
};

export const handleValidationError = (errors: Array<{ field: string; message: string }>): void => {
  errorHandler.handleValidationError(errors);
};

export const handleAuthError = (onLogin?: () => void): void => {
  errorHandler.handleAuthError(onLogin);
};

export const showSuccessMessage = (message: string, onDismiss?: () => void): void => {
  errorHandler.showSuccessMessage(message, onDismiss);
};

export const showConfirmationDialog = (
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void
): void => {
  errorHandler.showConfirmationDialog(title, message, onConfirm, onCancel);
};

export const createRetryHandler = (operation: () => Promise<any>, maxRetries?: number) => {
  return errorHandler.createRetryHandler(operation, maxRetries);
};