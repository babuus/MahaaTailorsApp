import { Alert } from 'react-native';
import {
  ErrorHandler,
  parseApiError,
  isNetworkError,
  isTimeoutError,
  isValidationError,
  isAuthError,
  isServerError,
  ERROR_CODES,
  ERROR_MESSAGES,
  handleError,
  handleNetworkError,
  handleValidationError,
  handleAuthError,
  showSuccessMessage,
  showConfirmationDialog,
} from '../errorHandler';

// Mock Alert
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;

describe('Error Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear error log
    ErrorHandler.getInstance().clearErrorLog();
  });

  describe('Error Classification', () => {
    describe('isNetworkError', () => {
      it('should identify network errors', () => {
        expect(isNetworkError({ code: 'NETWORK_REQUEST_FAILED' })).toBe(true);
        expect(isNetworkError({ message: 'Network request failed' })).toBe(true);
        expect(isNetworkError({ message: 'fetch error' })).toBe(true);
      });

      it('should not identify non-network errors', () => {
        expect(isNetworkError({ code: 'VALIDATION_ERROR' })).toBe(false);
        expect(isNetworkError({ message: 'Invalid input' })).toBe(false);
      });
    });

    describe('isTimeoutError', () => {
      it('should identify timeout errors', () => {
        expect(isTimeoutError({ code: 'TIMEOUT' })).toBe(true);
        expect(isTimeoutError({ message: 'Request timed out' })).toBe(true);
        expect(isTimeoutError({ message: 'timeout occurred' })).toBe(true);
      });

      it('should not identify non-timeout errors', () => {
        expect(isTimeoutError({ code: 'VALIDATION_ERROR' })).toBe(false);
        expect(isTimeoutError({ message: 'Invalid input' })).toBe(false);
      });
    });

    describe('isValidationError', () => {
      it('should identify validation errors', () => {
        expect(isValidationError({ statusCode: 400 })).toBe(true);
        expect(isValidationError({ statusCode: 422 })).toBe(true);
        expect(isValidationError({ code: ERROR_CODES.VALIDATION_ERROR })).toBe(true);
      });

      it('should not identify non-validation errors', () => {
        expect(isValidationError({ statusCode: 500 })).toBe(false);
        expect(isValidationError({ code: ERROR_CODES.NETWORK_ERROR })).toBe(false);
      });
    });

    describe('isAuthError', () => {
      it('should identify auth errors', () => {
        expect(isAuthError({ statusCode: 401 })).toBe(true);
        expect(isAuthError({ statusCode: 403 })).toBe(true);
        expect(isAuthError({ code: ERROR_CODES.UNAUTHORIZED })).toBe(true);
        expect(isAuthError({ code: ERROR_CODES.FORBIDDEN })).toBe(true);
      });

      it('should not identify non-auth errors', () => {
        expect(isAuthError({ statusCode: 400 })).toBe(false);
        expect(isAuthError({ code: ERROR_CODES.VALIDATION_ERROR })).toBe(false);
      });
    });

    describe('isServerError', () => {
      it('should identify server errors', () => {
        expect(isServerError({ statusCode: 500 })).toBe(true);
        expect(isServerError({ statusCode: 502 })).toBe(true);
        expect(isServerError({ code: ERROR_CODES.INTERNAL_ERROR })).toBe(true);
      });

      it('should not identify non-server errors', () => {
        expect(isServerError({ statusCode: 400 })).toBe(false);
        expect(isServerError({ code: ERROR_CODES.VALIDATION_ERROR })).toBe(false);
      });
    });
  });

  describe('parseApiError', () => {
    it('should parse network errors', () => {
      const error = { code: 'NETWORK_REQUEST_FAILED' };
      const parsed = parseApiError(error);

      expect(parsed).toEqual({
        code: ERROR_CODES.NETWORK_ERROR,
        message: ERROR_MESSAGES[ERROR_CODES.NETWORK_ERROR],
        statusCode: 0,
      });
    });

    it('should parse timeout errors', () => {
      const error = { message: 'Request timed out' };
      const parsed = parseApiError(error);

      expect(parsed).toEqual({
        code: ERROR_CODES.TIMEOUT_ERROR,
        message: ERROR_MESSAGES[ERROR_CODES.TIMEOUT_ERROR],
        statusCode: 0,
      });
    });

    it('should parse API response errors', () => {
      const error = {
        response: {
          status: 400,
          data: {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid input data',
              details: { field: 'email' },
            },
          },
        },
      };

      const parsed = parseApiError(error);

      expect(parsed).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: { field: 'email' },
        statusCode: 400,
      });
    });

    it('should parse structured errors', () => {
      const error = {
        code: ERROR_CODES.DUPLICATE_ENTRY,
        message: 'Entry already exists',
        statusCode: 409,
      };

      const parsed = parseApiError(error);

      expect(parsed).toEqual(error);
    });

    it('should handle generic errors', () => {
      const error = new Error('Something went wrong');
      const parsed = parseApiError(error);

      expect(parsed).toEqual({
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Something went wrong',
        statusCode: 500,
      });
    });
  });

  describe('ErrorHandler Class', () => {
    let errorHandler: ErrorHandler;

    beforeEach(() => {
      errorHandler = ErrorHandler.getInstance();
    });

    describe('handle', () => {
      it('should handle error with default options', () => {
        const error = new Error('Test error');
        const result = errorHandler.handle(error);

        expect(result.code).toBe(ERROR_CODES.INTERNAL_ERROR);
        expect(result.message).toBe('Test error');
        expect(mockAlert).toHaveBeenCalledWith(
          'Error',
          'Test error',
          [{ text: 'OK', style: 'cancel' }]
        );
      });

      it('should handle error without showing alert', () => {
        const error = new Error('Test error');
        errorHandler.handle(error, { showAlert: false });

        expect(mockAlert).not.toHaveBeenCalled();
      });

      it('should use fallback message', () => {
        const error = new Error('Test error');
        const fallbackMessage = 'Custom error message';
        
        errorHandler.handle(error, { fallbackMessage });

        expect(mockAlert).toHaveBeenCalledWith(
          'Error',
          fallbackMessage,
          [{ text: 'OK', style: 'cancel' }]
        );
      });

      it('should show retry button for recoverable errors', () => {
        const error = { code: 'NETWORK_REQUEST_FAILED' };
        const onRetry = jest.fn();
        
        errorHandler.handle(error, { onRetry });

        expect(mockAlert).toHaveBeenCalledWith(
          'Error',
          ERROR_MESSAGES[ERROR_CODES.NETWORK_ERROR],
          [
            { text: 'Retry', onPress: onRetry },
            { text: 'OK', style: 'cancel' },
          ]
        );
      });

      it('should log errors', () => {
        const error = new Error('Test error');
        const context = 'test-context';
        
        errorHandler.handle(error, { context });

        const errorLog = errorHandler.getErrorLog();
        expect(errorLog).toHaveLength(1);
        expect(errorLog[0].error.message).toBe('Test error');
        expect(errorLog[0].context).toBe(context);
      });
    });

    describe('Specific Error Handlers', () => {
      it('should handle network errors', () => {
        const onRetry = jest.fn();
        errorHandler.handleNetworkError(onRetry);

        expect(mockAlert).toHaveBeenCalledWith(
          'Connection Error',
          'Unable to connect to the server. Please check your internet connection and try again.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Retry', onPress: onRetry },
          ]
        );
      });

      it('should handle validation errors', () => {
        const errors = [
          { field: 'email', message: 'Invalid email format' },
          { field: 'phone', message: 'Invalid phone number' },
        ];

        errorHandler.handleValidationError(errors);

        expect(mockAlert).toHaveBeenCalledWith(
          'Validation Error',
          'Please fix the following errors:\n• Invalid email format\n• Invalid phone number'
        );
      });

      it('should handle single validation error', () => {
        const errors = [{ field: 'email', message: 'Invalid email format' }];

        errorHandler.handleValidationError(errors);

        expect(mockAlert).toHaveBeenCalledWith(
          'Validation Error',
          'Invalid email format'
        );
      });

      it('should handle auth errors', () => {
        const onLogin = jest.fn();
        errorHandler.handleAuthError(onLogin);

        expect(mockAlert).toHaveBeenCalledWith(
          'Authentication Required',
          'Your session has expired. Please log in again.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log In', onPress: onLogin },
          ]
        );
      });

      it('should handle permission errors', () => {
        errorHandler.handlePermissionError();

        expect(mockAlert).toHaveBeenCalledWith(
          'Access Denied',
          'You do not have permission to perform this action. Please contact your administrator.',
          [{ text: 'OK', style: 'cancel' }]
        );
      });

      it('should handle offline errors', () => {
        const onRetry = jest.fn();
        errorHandler.handleOfflineError(onRetry);

        expect(mockAlert).toHaveBeenCalledWith(
          'Offline',
          'You are currently offline. Some features may not be available.',
          [
            { text: 'OK', style: 'cancel' },
            { text: 'Try Again', onPress: onRetry },
          ]
        );
      });
    });

    describe('Success Handlers', () => {
      it('should show success message', () => {
        const onDismiss = jest.fn();
        errorHandler.showSuccessMessage('Operation completed successfully', onDismiss);

        expect(mockAlert).toHaveBeenCalledWith(
          'Success',
          'Operation completed successfully',
          [{ text: 'OK', onPress: onDismiss }]
        );
      });

      it('should show confirmation dialog', () => {
        const onConfirm = jest.fn();
        const onCancel = jest.fn();
        
        errorHandler.showConfirmationDialog(
          'Confirm Action',
          'Are you sure you want to proceed?',
          onConfirm,
          onCancel
        );

        expect(mockAlert).toHaveBeenCalledWith(
          'Confirm Action',
          'Are you sure you want to proceed?',
          [
            { text: 'Cancel', style: 'cancel', onPress: onCancel },
            { text: 'Confirm', onPress: onConfirm },
          ]
        );
      });
    });

    describe('Error Recovery', () => {
      it('should create retry handler', async () => {
        let callCount = 0;
        const operation = jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount < 3) {
            throw { code: 'NETWORK_REQUEST_FAILED' };
          }
          return 'success';
        });

        const retryHandler = errorHandler.createRetryHandler(operation, 3);
        const result = await retryHandler();

        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(3);
      });

      it('should fail after max retries', async () => {
        const operation = jest.fn().mockRejectedValue({ code: 'NETWORK_REQUEST_FAILED' });
        const retryHandler = errorHandler.createRetryHandler(operation, 2);

        await expect(retryHandler()).rejects.toEqual({ code: 'NETWORK_REQUEST_FAILED' });
        expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
      });

      it('should not retry non-recoverable errors', async () => {
        const operation = jest.fn().mockRejectedValue({ statusCode: 400 });
        const retryHandler = errorHandler.createRetryHandler(operation, 3);

        await expect(retryHandler()).rejects.toEqual({ statusCode: 400 });
        expect(operation).toHaveBeenCalledTimes(1); // No retries
      });
    });

    describe('Utility Methods', () => {
      it('should identify recoverable errors', () => {
        expect(errorHandler.isRecoverableError({ code: ERROR_CODES.NETWORK_ERROR })).toBe(true);
        expect(errorHandler.isRecoverableError({ code: ERROR_CODES.TIMEOUT_ERROR })).toBe(true);
        expect(errorHandler.isRecoverableError({ code: ERROR_CODES.INTERNAL_ERROR })).toBe(true);
        expect(errorHandler.isRecoverableError({ code: ERROR_CODES.VALIDATION_ERROR })).toBe(false);
      });

      it('should determine error severity', () => {
        expect(errorHandler.getErrorSeverity({ code: ERROR_CODES.UNAUTHORIZED })).toBe('high');
        expect(errorHandler.getErrorSeverity({ code: ERROR_CODES.INTERNAL_ERROR })).toBe('critical');
        expect(errorHandler.getErrorSeverity({ code: ERROR_CODES.NETWORK_ERROR })).toBe('medium');
        expect(errorHandler.getErrorSeverity({ code: ERROR_CODES.VALIDATION_ERROR })).toBe('low');
      });
    });

    describe('Error Log Management', () => {
      it('should maintain error log', () => {
        errorHandler.handle(new Error('Error 1'));
        errorHandler.handle(new Error('Error 2'));

        const errorLog = errorHandler.getErrorLog();
        expect(errorLog).toHaveLength(2);
        expect(errorLog[0].error.message).toBe('Error 1');
        expect(errorLog[1].error.message).toBe('Error 2');
      });

      it('should clear error log', () => {
        errorHandler.handle(new Error('Test error'));
        expect(errorHandler.getErrorLog()).toHaveLength(1);

        errorHandler.clearErrorLog();
        expect(errorHandler.getErrorLog()).toHaveLength(0);
      });

      it('should limit error log size', () => {
        // Add more than 100 errors
        for (let i = 0; i < 105; i++) {
          errorHandler.handle(new Error(`Error ${i}`), { showAlert: false });
        }

        const errorLog = errorHandler.getErrorLog();
        expect(errorLog).toHaveLength(100);
        expect(errorLog[0].error.message).toBe('Error 5'); // First 5 should be removed
      });
    });
  });

  describe('Convenience Functions', () => {
    it('should handle error using convenience function', () => {
      const error = new Error('Test error');
      const result = handleError(error);

      expect(result.message).toBe('Test error');
      expect(mockAlert).toHaveBeenCalled();
    });

    it('should handle network error using convenience function', () => {
      const onRetry = jest.fn();
      handleNetworkError(onRetry);

      expect(mockAlert).toHaveBeenCalledWith(
        'Connection Error',
        expect.any(String),
        expect.arrayContaining([
          { text: 'Retry', onPress: onRetry },
        ])
      );
    });

    it('should handle validation error using convenience function', () => {
      const errors = [{ field: 'email', message: 'Invalid email' }];
      handleValidationError(errors);

      expect(mockAlert).toHaveBeenCalledWith(
        'Validation Error',
        'Invalid email'
      );
    });

    it('should handle auth error using convenience function', () => {
      const onLogin = jest.fn();
      handleAuthError(onLogin);

      expect(mockAlert).toHaveBeenCalledWith(
        'Authentication Required',
        expect.any(String),
        expect.arrayContaining([
          { text: 'Log In', onPress: onLogin },
        ])
      );
    });

    it('should show success message using convenience function', () => {
      const onDismiss = jest.fn();
      showSuccessMessage('Success!', onDismiss);

      expect(mockAlert).toHaveBeenCalledWith(
        'Success',
        'Success!',
        [{ text: 'OK', onPress: onDismiss }]
      );
    });

    it('should show confirmation dialog using convenience function', () => {
      const onConfirm = jest.fn();
      const onCancel = jest.fn();
      
      showConfirmationDialog('Confirm', 'Are you sure?', onConfirm, onCancel);

      expect(mockAlert).toHaveBeenCalledWith(
        'Confirm',
        'Are you sure?',
        [
          { text: 'Cancel', style: 'cancel', onPress: onCancel },
          { text: 'Confirm', onPress: onConfirm },
        ]
      );
    });
  });
});