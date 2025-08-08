import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import NetworkErrorHandler from '../NetworkErrorHandler';
import { ApiError } from '../../services/errorHandler';

describe('NetworkErrorHandler', () => {
  const mockOnRetry = jest.fn();
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders network error correctly', () => {
    const networkError: ApiError = {
      message: 'Network connection failed',
      type: 'network',
    };

    const { getByText } = render(
      <NetworkErrorHandler
        error={networkError}
        onRetry={mockOnRetry}
        onDismiss={mockOnDismiss}
      />
    );

    expect(getByText('Connection Problem')).toBeTruthy();
    expect(getByText('Please check your internet connection and try again.')).toBeTruthy();
  });

  it('renders validation error correctly', () => {
    const validationError: ApiError = {
      message: 'Invalid phone number format',
      type: 'validation',
    };

    const { getByText } = render(
      <NetworkErrorHandler
        error={validationError}
        onRetry={mockOnRetry}
        onDismiss={mockOnDismiss}
      />
    );

    expect(getByText('Invalid Data')).toBeTruthy();
    expect(getByText('Invalid phone number format')).toBeTruthy();
  });

  it('renders API error correctly', () => {
    const apiError: ApiError = {
      message: 'Internal server error',
      type: 'api',
      status: 500,
    };

    const { getByText } = render(
      <NetworkErrorHandler
        error={apiError}
        onRetry={mockOnRetry}
        onDismiss={mockOnDismiss}
      />
    );

    expect(getByText('Server Error')).toBeTruthy();
    expect(getByText('Something went wrong on our end. Please try again later.')).toBeTruthy();
    expect(getByText('Error Code: 500')).toBeTruthy();
  });

  it('calls onRetry when retry button is pressed', () => {
    const networkError: ApiError = {
      message: 'Network connection failed',
      type: 'network',
    };

    const { getByText } = render(
      <NetworkErrorHandler
        error={networkError}
        onRetry={mockOnRetry}
      />
    );

    const retryButton = getByText('Try Again');
    fireEvent.press(retryButton);

    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when dismiss button is pressed', () => {
    const networkError: ApiError = {
      message: 'Network connection failed',
      type: 'network',
    };

    const { getByLabelText } = render(
      <NetworkErrorHandler
        error={networkError}
        onDismiss={mockOnDismiss}
      />
    );

    const dismissButton = getByLabelText('Dismiss error');
    fireEvent.press(dismissButton);

    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders compact version correctly', () => {
    const networkError: ApiError = {
      message: 'Network connection failed',
      type: 'network',
    };

    const { getByText } = render(
      <NetworkErrorHandler
        error={networkError}
        onRetry={mockOnRetry}
        compact={true}
      />
    );

    expect(getByText('Please check your internet connection and try again.')).toBeTruthy();
    expect(getByText('Retry')).toBeTruthy();
  });

  it('does not show retry button for validation errors', () => {
    const validationError: ApiError = {
      message: 'Invalid data',
      type: 'validation',
    };

    const { queryByText } = render(
      <NetworkErrorHandler
        error={validationError}
        onRetry={mockOnRetry}
      />
    );

    expect(queryByText('Try Again')).toBeNull();
  });

  it('shows retry button for network and API errors', () => {
    const networkError: ApiError = {
      message: 'Network error',
      type: 'network',
    };

    const { getByText } = render(
      <NetworkErrorHandler
        error={networkError}
        onRetry={mockOnRetry}
      />
    );

    expect(getByText('Try Again')).toBeTruthy();
  });
});