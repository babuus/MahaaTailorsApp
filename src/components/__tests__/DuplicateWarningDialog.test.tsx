import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import DuplicateWarningDialog from '../DuplicateWarningDialog';
import { Customer } from '../../types';

// Mock the theme context hook
jest.mock('../../contexts/ThemeContext', () => ({
  useThemeContext: () => ({
    isDarkMode: false,
    themeMode: 'light' as const,
    setThemeMode: jest.fn(),
  }),
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>{children}</>
);

describe('DuplicateWarningDialog', () => {
  const mockDuplicateCustomers: Customer[] = [
    {
      id: '1',
      personalDetails: {
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john@example.com',
        address: '123 Main St',
        dob: '1990-01-01',
      },
      measurements: [],
      comments: 'Test customer',
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
    },
    {
      id: '2',
      personalDetails: {
        name: 'Jane Smith',
        phone: '+1234567890',
        email: 'jane@example.com',
        address: '456 Oak Ave',
        dob: '1985-05-15',
      },
      measurements: [],
      comments: 'Another test customer',
      createdAt: '2023-01-02T00:00:00.000Z',
      updatedAt: '2023-01-02T00:00:00.000Z',
    },
  ];

  const defaultProps = {
    visible: true,
    duplicateCustomers: mockDuplicateCustomers,
    onProceed: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when visible', () => {
    const { getByText, getAllByText } = render(
      <TestWrapper>
        <DuplicateWarningDialog {...defaultProps} />
      </TestWrapper>
    );

    expect(getByText('Duplicate Customer Detected')).toBeTruthy();
    expect(getByText('A customer with this phone number already exists:')).toBeTruthy();
    expect(getByText('John Doe')).toBeTruthy();
    expect(getByText('Jane Smith')).toBeTruthy();
    expect(getAllByText('+1234567890')).toHaveLength(2); // Both customers have the same phone
    expect(getByText('Cancel')).toBeTruthy();
    expect(getByText('Proceed Anyway')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    const { queryByText } = render(
      <TestWrapper>
        <DuplicateWarningDialog {...defaultProps} visible={false} />
      </TestWrapper>
    );

    expect(queryByText('Duplicate Customer Detected')).toBeNull();
  });

  it('displays customer information correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <DuplicateWarningDialog {...defaultProps} />
      </TestWrapper>
    );

    // Check first customer
    expect(getByText('John Doe')).toBeTruthy();
    expect(getByText('john@example.com')).toBeTruthy();
    expect(getByText('123 Main St')).toBeTruthy();

    // Check second customer
    expect(getByText('Jane Smith')).toBeTruthy();
    expect(getByText('jane@example.com')).toBeTruthy();
    expect(getByText('456 Oak Ave')).toBeTruthy();
  });

  it('calls onProceed when Proceed Anyway button is pressed', async () => {
    const { getByText } = render(
      <TestWrapper>
        <DuplicateWarningDialog {...defaultProps} />
      </TestWrapper>
    );

    fireEvent.press(getByText('Proceed Anyway'));

    await waitFor(() => {
      expect(defaultProps.onProceed).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onCancel when Cancel button is pressed', async () => {
    const { getByText } = render(
      <TestWrapper>
        <DuplicateWarningDialog {...defaultProps} />
      </TestWrapper>
    );

    fireEvent.press(getByText('Cancel'));

    await waitFor(() => {
      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });
  });

  it('handles customers without optional fields', () => {
    const customersWithoutOptionalFields: Customer[] = [
      {
        id: '3',
        personalDetails: {
          name: 'Minimal Customer',
          phone: '+1234567890',
          email: '',
          address: '',
          dob: '',
        },
        measurements: [],
        comments: '',
        createdAt: '2023-01-03T00:00:00.000Z',
        updatedAt: '2023-01-03T00:00:00.000Z',
      },
    ];

    const { getByText, queryByText } = render(
      <TestWrapper>
        <DuplicateWarningDialog 
          {...defaultProps} 
          duplicateCustomers={customersWithoutOptionalFields} 
        />
      </TestWrapper>
    );

    expect(getByText('Minimal Customer')).toBeTruthy();
    expect(getByText('+1234567890')).toBeTruthy();
    // Email and address should not be displayed when empty
    expect(queryByText('')).toBeNull();
  });

  it('adapts to dark theme', () => {
    // Mock dark theme for this test
    jest.doMock('../../contexts/ThemeContext', () => ({
      useThemeContext: () => ({
        isDarkMode: true,
        themeMode: 'dark' as const,
        setThemeMode: jest.fn(),
      }),
    }));

    const { getByText } = render(
      <TestWrapper>
        <DuplicateWarningDialog {...defaultProps} />
      </TestWrapper>
    );

    expect(getByText('Duplicate Customer Detected')).toBeTruthy();
    // The component should render without errors in dark mode
  });

  it('handles empty duplicate customers array', () => {
    const { getByText } = render(
      <TestWrapper>
        <DuplicateWarningDialog {...defaultProps} duplicateCustomers={[]} />
      </TestWrapper>
    );

    expect(getByText('Duplicate Customer Detected')).toBeTruthy();
    expect(getByText('A customer with this phone number already exists:')).toBeTruthy();
    // Should still show the dialog even with no customers (edge case)
  });
});