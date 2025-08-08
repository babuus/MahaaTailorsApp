import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import CustomerFormScreen from '../CustomerFormScreen';

// Mock the theme context hook
jest.mock('../../contexts/ThemeContext', () => ({
  useThemeContext: () => ({
    isDarkMode: false,
    themeMode: 'light' as const,
    setThemeMode: jest.fn(),
  }),
}));

// Mock the navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

// Mock the route
const mockRoute = {
  params: {
    mode: 'add' as const,
  },
};

// Mock the API service
jest.mock('../../services/api', () => ({
  apiService: {
    getMeasurementConfigs: jest.fn().mockResolvedValue([
      {
        id: '1',
        garmentType: 'shirt',
        measurements: ['chest', 'waist', 'sleeve_length'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]),
    createCustomer: jest.fn().mockResolvedValue({}),
    updateCustomer: jest.fn().mockResolvedValue({}),
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock DateTimePicker
jest.mock('@react-native-community/datetimepicker', () => {
  return jest.fn(() => null);
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <PaperProvider>
      {component}
    </PaperProvider>
  );
};

describe('CustomerFormScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders add customer form correctly', async () => {
    const { getByTestId, getByText } = renderWithProviders(
      <CustomerFormScreen
        navigation={mockNavigation as any}
        route={mockRoute as any}
      />
    );

    // Wait for the form to load
    await waitFor(() => {
      expect(getByText('Personal Details')).toBeTruthy();
    });

    // Check that form fields are present
    expect(getByTestId('customer-name-input')).toBeTruthy();
    expect(getByTestId('customer-phone-input')).toBeTruthy();
    expect(getByTestId('customer-email-input')).toBeTruthy();
    expect(getByTestId('customer-address-input')).toBeTruthy();
    expect(getByTestId('customer-dob-picker')).toBeTruthy();
    expect(getByTestId('customer-comments-input')).toBeTruthy();
  });

  it('renders edit customer form correctly', async () => {
    const editRoute = {
      params: {
        mode: 'edit' as const,
        customer: {
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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    };

    const { getByTestId, getByDisplayValue } = renderWithProviders(
      <CustomerFormScreen
        navigation={mockNavigation as any}
        route={editRoute as any}
      />
    );

    // Wait for the form to load
    await waitFor(() => {
      expect(getByDisplayValue('John Doe')).toBeTruthy();
    });

    // Check that form fields are populated
    expect(getByDisplayValue('John Doe')).toBeTruthy();
    expect(getByDisplayValue('+1234567890')).toBeTruthy();
    expect(getByDisplayValue('john@example.com')).toBeTruthy();
    expect(getByDisplayValue('123 Main St')).toBeTruthy();
    expect(getByDisplayValue('Test customer')).toBeTruthy();
  });

  it('validates required fields', async () => {
    const { getByTestId, getByText } = renderWithProviders(
      <CustomerFormScreen
        navigation={mockNavigation as any}
        route={mockRoute as any}
      />
    );

    // Wait for the form to load
    await waitFor(() => {
      expect(getByText('Personal Details')).toBeTruthy();
    });

    // Try to submit without filling required fields
    const saveButton = getByText('Save');
    fireEvent.press(saveButton);

    // Should show validation error alert
    await waitFor(() => {
      // The validation should prevent submission
      expect(mockNavigation.goBack).not.toHaveBeenCalled();
    });
  });

  it('handles form input changes', async () => {
    const { getByTestId } = renderWithProviders(
      <CustomerFormScreen
        navigation={mockNavigation as any}
        route={mockRoute as any}
      />
    );

    // Wait for the form to load
    await waitFor(() => {
      expect(getByTestId('customer-name-input')).toBeTruthy();
    });

    // Test name input
    const nameInput = getByTestId('customer-name-input');
    fireEvent.changeText(nameInput, 'John Doe');

    // Test phone input
    const phoneInput = getByTestId('customer-phone-input');
    fireEvent.changeText(phoneInput, '+1234567890');

    // The form should update with the new values
    expect(nameInput.props.value).toBe('John Doe');
    expect(phoneInput.props.value).toBe('+1234567890');
  });

  it('shows measurement section', async () => {
    const { getByText } = renderWithProviders(
      <CustomerFormScreen
        navigation={mockNavigation as any}
        route={mockRoute as any}
      />
    );

    // Wait for the form to load
    await waitFor(() => {
      expect(getByText('Measurements')).toBeTruthy();
    });

    // Should show add measurement section
    expect(getByText('Add New Measurement')).toBeTruthy();
    expect(getByText('Shirt')).toBeTruthy(); // From mocked measurement config
  });
});