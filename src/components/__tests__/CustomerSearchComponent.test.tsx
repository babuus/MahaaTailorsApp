import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { CustomerSearchComponent } from '../CustomerSearchComponent';
import { getCustomers, createCustomer } from '../../services/api';
import { Customer } from '../../types';

// Mock the API services
jest.mock('../../services/api', () => ({
  getCustomers: jest.fn(),
  createCustomer: jest.fn(),
}));

// Mock the hooks
jest.mock('../../hooks/useFormValidation', () => ({
  useFormValidation: jest.fn(() => ({
    values: {
      personalDetails: {
        name: '',
        phone: '',
        email: '',
        address: '',
        dob: '',
      },
      comments: '',
    },
    errors: {},
    touched: {},
    handleChange: jest.fn(),
    handleBlur: jest.fn(),
    validateForm: jest.fn(() => true),
    resetForm: jest.fn(),
  })),
}));

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

const mockCustomers: Customer[] = [
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
    comments: '',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },
  {
    id: '2',
    personalDetails: {
      name: 'Jane Smith',
      phone: '+1987654321',
      email: 'jane@example.com',
      address: '456 Oak Ave',
      dob: '1985-05-15',
    },
    measurements: [],
    comments: '',
    createdAt: '2023-01-02T00:00:00Z',
    updatedAt: '2023-01-02T00:00:00Z',
  },
];

const mockGetCustomers = getCustomers as jest.MockedFunction<typeof getCustomers>;
const mockCreateCustomer = createCustomer as jest.MockedFunction<typeof createCustomer>;

describe('CustomerSearchComponent', () => {
  const mockOnCustomerSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCustomers.mockResolvedValue({
      items: mockCustomers,
      hasMore: false,
      total: mockCustomers.length,
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('renders correctly with default props', () => {
    const { getByTestId, getByPlaceholderText } = render(
      <CustomerSearchComponent onCustomerSelect={mockOnCustomerSelect} />
    );

    expect(getByTestId('customer-search')).toBeTruthy();
    expect(getByPlaceholderText('Search customers by name or phone...')).toBeTruthy();
  });

  it('renders with custom placeholder', () => {
    const customPlaceholder = 'Find customer...';
    const { getByPlaceholderText } = render(
      <CustomerSearchComponent
        onCustomerSelect={mockOnCustomerSelect}
        placeholder={customPlaceholder}
      />
    );

    expect(getByPlaceholderText(customPlaceholder)).toBeTruthy();
  });

  it('shows selected customer when provided', () => {
    const selectedCustomer = mockCustomers[0];
    const { getByText } = render(
      <CustomerSearchComponent
        onCustomerSelect={mockOnCustomerSelect}
        selectedCustomer={selectedCustomer}
      />
    );

    expect(getByText('John Doe - +1234567890')).toBeTruthy();
  });

  it('performs search when user types', async () => {
    jest.useFakeTimers();
    
    const { getByTestId } = render(
      <CustomerSearchComponent onCustomerSelect={mockOnCustomerSelect} />
    );

    const searchInput = getByTestId('customer-search-input');
    
    fireEvent.changeText(searchInput, 'John');
    
    // Fast-forward timers to trigger debounced search
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(mockGetCustomers).toHaveBeenCalledWith({
        searchText: 'John',
        searchField: 'universal',
        limit: 10,
      });
    });

    jest.useRealTimers();
  });

  it('shows search results when customers are found', async () => {
    jest.useFakeTimers();
    
    const { getByTestId, getByText } = render(
      <CustomerSearchComponent onCustomerSelect={mockOnCustomerSelect} />
    );

    const searchInput = getByTestId('customer-search-input');
    
    fireEvent.changeText(searchInput, 'John');
    
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('+1234567890 • john@example.com')).toBeTruthy();
    });

    jest.useRealTimers();
  });

  it('shows "Add New Customer" option when no exact match found', async () => {
    jest.useFakeTimers();
    
    mockGetCustomers.mockResolvedValue({
      items: [],
      hasMore: false,
      total: 0,
    });

    const { getByTestId, getByText } = render(
      <CustomerSearchComponent onCustomerSelect={mockOnCustomerSelect} />
    );

    const searchInput = getByTestId('customer-search-input');
    
    fireEvent.changeText(searchInput, 'New Customer');
    
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(getByText('Add New Customer: "New Customer"')).toBeTruthy();
      expect(getByText('Tap to create a new customer')).toBeTruthy();
    });

    jest.useRealTimers();
  });

  it('calls onCustomerSelect when existing customer is selected', async () => {
    jest.useFakeTimers();
    
    const { getByTestId, getByText } = render(
      <CustomerSearchComponent onCustomerSelect={mockOnCustomerSelect} />
    );

    const searchInput = getByTestId('customer-search-input');
    
    fireEvent.changeText(searchInput, 'John');
    
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
    });

    fireEvent.press(getByText('John Doe'));

    expect(mockOnCustomerSelect).toHaveBeenCalledWith(mockCustomers[0]);

    jest.useRealTimers();
  });

  it('shows add customer form when "Add New Customer" is selected', async () => {
    jest.useFakeTimers();
    
    mockGetCustomers.mockResolvedValue({
      items: [],
      hasMore: false,
      total: 0,
    });

    const { getByTestId, getByText } = render(
      <CustomerSearchComponent onCustomerSelect={mockOnCustomerSelect} />
    );

    const searchInput = getByTestId('customer-search-input');
    
    fireEvent.changeText(searchInput, 'New Customer');
    
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(getByText('Add New Customer: "New Customer"')).toBeTruthy();
    });

    fireEvent.press(getByTestId('customer-search-add-new-customer'));

    expect(getByText('Add New Customer')).toBeTruthy();
    expect(getByTestId('customer-search-form-name')).toBeTruthy();
    expect(getByTestId('customer-search-form-phone')).toBeTruthy();

    jest.useRealTimers();
  });

  it('creates new customer when form is submitted', async () => {
    const newCustomer: Customer = {
      id: '3',
      personalDetails: {
        name: 'New Customer',
        phone: '+1111111111',
        email: 'new@example.com',
        address: '',
        dob: '',
      },
      measurements: [],
      comments: '',
      createdAt: '2023-01-03T00:00:00Z',
      updatedAt: '2023-01-03T00:00:00Z',
    };

    mockCreateCustomer.mockResolvedValue(newCustomer);

    jest.useFakeTimers();
    
    mockGetCustomers.mockResolvedValue({
      items: [],
      hasMore: false,
      total: 0,
    });

    const { getByTestId, getByText } = render(
      <CustomerSearchComponent onCustomerSelect={mockOnCustomerSelect} />
    );

    const searchInput = getByTestId('customer-search-input');
    
    fireEvent.changeText(searchInput, 'New Customer');
    
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(getByText('Add New Customer: "New Customer"')).toBeTruthy();
    });

    fireEvent.press(getByTestId('customer-search-add-new-customer'));

    // Fill out the form
    const nameInput = getByTestId('customer-search-form-name');
    const phoneInput = getByTestId('customer-search-form-phone');
    
    fireEvent.changeText(nameInput, 'New Customer');
    fireEvent.changeText(phoneInput, '+1111111111');

    // Submit the form
    fireEvent.press(getByTestId('customer-search-form-create'));

    await waitFor(() => {
      expect(mockCreateCustomer).toHaveBeenCalledWith({
        personalDetails: {
          name: '',
          phone: '',
          email: '',
          address: '',
          dob: '',
        },
        measurements: [],
        comments: '',
      });
    });

    jest.useRealTimers();
  });

  it('cancels add customer form when cancel is pressed', async () => {
    jest.useFakeTimers();
    
    mockGetCustomers.mockResolvedValue({
      items: [],
      hasMore: false,
      total: 0,
    });

    const { getByTestId, getByText, queryByText } = render(
      <CustomerSearchComponent onCustomerSelect={mockOnCustomerSelect} />
    );

    const searchInput = getByTestId('customer-search-input');
    
    fireEvent.changeText(searchInput, 'New Customer');
    
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(getByText('Add New Customer: "New Customer"')).toBeTruthy();
    });

    fireEvent.press(getByTestId('customer-search-add-new-customer'));

    expect(getByText('Add New Customer')).toBeTruthy();

    fireEvent.press(getByTestId('customer-search-form-cancel'));

    expect(queryByText('Add New Customer')).toBeNull();

    jest.useRealTimers();
  });

  it('clears search when clear button is pressed', () => {
    const { getByTestId } = render(
      <CustomerSearchComponent onCustomerSelect={mockOnCustomerSelect} />
    );

    const searchInput = getByTestId('customer-search-input');
    
    fireEvent.changeText(searchInput, 'John');

    const clearButton = getByTestId('customer-search-clear');
    fireEvent.press(clearButton);

    expect(searchInput.props.value).toBe('');
  });

  it('handles search error gracefully', async () => {
    jest.useFakeTimers();
    
    mockGetCustomers.mockRejectedValue(new Error('Network error'));

    const { getByTestId } = render(
      <CustomerSearchComponent onCustomerSelect={mockOnCustomerSelect} />
    );

    const searchInput = getByTestId('customer-search-input');
    
    fireEvent.changeText(searchInput, 'John');
    
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to search customers. Please try again.'
      );
    });

    jest.useRealTimers();
  });

  it('handles customer creation error gracefully', async () => {
    mockCreateCustomer.mockRejectedValue(new Error('Creation failed'));

    jest.useFakeTimers();
    
    mockGetCustomers.mockResolvedValue({
      items: [],
      hasMore: false,
      total: 0,
    });

    const { getByTestId, getByText } = render(
      <CustomerSearchComponent onCustomerSelect={mockOnCustomerSelect} />
    );

    const searchInput = getByTestId('customer-search-input');
    
    fireEvent.changeText(searchInput, 'New Customer');
    
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(getByText('Add New Customer: "New Customer"')).toBeTruthy();
    });

    fireEvent.press(getByTestId('customer-search-add-new-customer'));

    fireEvent.press(getByTestId('customer-search-form-create'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to create customer. Please try again.'
      );
    });

    jest.useRealTimers();
  });

  it('does not search for queries shorter than 2 characters', async () => {
    jest.useFakeTimers();
    
    const { getByTestId } = render(
      <CustomerSearchComponent onCustomerSelect={mockOnCustomerSelect} />
    );

    const searchInput = getByTestId('customer-search-input');
    
    fireEvent.changeText(searchInput, 'J');
    
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockGetCustomers).not.toHaveBeenCalled();

    jest.useRealTimers();
  });
});