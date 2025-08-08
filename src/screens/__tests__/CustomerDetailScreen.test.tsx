import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
import CustomerDetailScreen from '../CustomerDetailScreen';
import { Customer } from '../../types';
import { apiService } from '../../services/api';

// Mock dependencies
jest.mock('../../services/api');
jest.mock('../../contexts/ThemeContext', () => ({
  useThemeContext: () => ({ isDarkMode: false }),
}));
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn().mockResolvedValue(true),
}));

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

const mockCustomer: Customer = {
  id: '1',
  personalDetails: {
    name: 'John Doe',
    phone: '+1234567890',
    email: 'john.doe@example.com',
    address: '123 Main St, City, State',
    dob: '1990-01-01',
  },
  measurements: [
    {
      id: '1',
      garmentType: 'Shirt',
      fields: [
        { name: 'Chest', value: '40' },
        { name: 'Waist', value: '32' },
      ],
      notes: 'Regular fit',
      lastMeasuredDate: '2024-01-15T10:00:00Z',
    },
  ],
  comments: 'Regular customer',
  createdAt: '2024-01-01T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
};

const mockRoute = {
  params: { customer: mockCustomer },
};

describe('CustomerDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders customer details correctly', () => {
    const { getByText } = render(
      <CustomerDetailScreen 
        navigation={mockNavigation as any} 
        route={mockRoute as any} 
      />
    );

    expect(getByText('John Doe')).toBeTruthy();
    expect(getByText('+1234567890')).toBeTruthy();
    expect(getByText('john.doe@example.com')).toBeTruthy();
    expect(getByText('123 Main St, City, State')).toBeTruthy();
    expect(getByText('Regular customer')).toBeTruthy();
  });

  it('displays measurements correctly', () => {
    const { getByText } = render(
      <CustomerDetailScreen 
        navigation={mockNavigation as any} 
        route={mockRoute as any} 
      />
    );

    expect(getByText('Shirt Measurements')).toBeTruthy();
    expect(getByText('Chest:')).toBeTruthy();
    expect(getByText('40')).toBeTruthy();
    expect(getByText('Waist:')).toBeTruthy();
    expect(getByText('32')).toBeTruthy();
    expect(getByText('Regular fit')).toBeTruthy();
  });

  it('handles phone call when phone number is pressed', async () => {
    const { getByText } = render(
      <CustomerDetailScreen 
        navigation={mockNavigation as any} 
        route={mockRoute as any} 
      />
    );

    const phoneNumber = getByText('+1234567890');
    fireEvent.press(phoneNumber);

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith('tel:+1234567890');
    });
  });

  it('handles email when email is pressed', async () => {
    const { getByText } = render(
      <CustomerDetailScreen 
        navigation={mockNavigation as any} 
        route={mockRoute as any} 
      />
    );

    const email = getByText('john.doe@example.com');
    fireEvent.press(email);

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith('mailto:john.doe@example.com');
    });
  });

  it('navigates to edit form when edit button is pressed', () => {
    const { getByText } = render(
      <CustomerDetailScreen 
        navigation={mockNavigation as any} 
        route={mockRoute as any} 
      />
    );

    const editButton = getByText('Edit');
    fireEvent.press(editButton);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('CustomerForm', {
      customer: mockCustomer,
      mode: 'edit',
    });
  });

  it('shows delete confirmation dialog when delete button is pressed', () => {
    const { getByText } = render(
      <CustomerDetailScreen 
        navigation={mockNavigation as any} 
        route={mockRoute as any} 
      />
    );

    const deleteButton = getByText('Delete');
    fireEvent.press(deleteButton);

    expect(getByText('Delete Customer')).toBeTruthy();
    expect(getByText('Are you sure you want to delete John Doe? This action cannot be undone.')).toBeTruthy();
  });

  it('deletes customer when confirmed', async () => {
    const mockDeleteCustomer = jest.fn().mockResolvedValue({});
    (apiService.deleteCustomer as jest.Mock) = mockDeleteCustomer;

    const { getByText } = render(
      <CustomerDetailScreen 
        navigation={mockNavigation as any} 
        route={mockRoute as any} 
      />
    );

    // Open delete dialog
    const deleteButton = getByText('Delete');
    fireEvent.press(deleteButton);

    // Confirm deletion
    const confirmButton = getByText('Delete');
    fireEvent.press(confirmButton);

    await waitFor(() => {
      expect(mockDeleteCustomer).toHaveBeenCalledWith('1');
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'Customer deleted successfully',
        expect.any(Array)
      );
    });
  });

  it('displays empty state when no measurements exist', () => {
    const customerWithoutMeasurements: Customer = {
      ...mockCustomer,
      measurements: [],
    };

    const routeWithoutMeasurements = {
      params: { customer: customerWithoutMeasurements },
    };

    const { getByText } = render(
      <CustomerDetailScreen 
        navigation={mockNavigation as any} 
        route={routeWithoutMeasurements as any} 
      />
    );

    expect(getByText('No measurements recorded yet')).toBeTruthy();
  });

  it('does not display comments section when no comments exist', () => {
    const customerWithoutComments: Customer = {
      ...mockCustomer,
      comments: undefined,
    };

    const routeWithoutComments = {
      params: { customer: customerWithoutComments },
    };

    const { queryByText } = render(
      <CustomerDetailScreen 
        navigation={mockNavigation as any} 
        route={routeWithoutComments as any} 
      />
    );

    expect(queryByText('Comments')).toBeNull();
  });
});