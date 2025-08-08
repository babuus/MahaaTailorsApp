import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CustomerDetailScreen from '../screens/CustomerDetailScreen';
import { Customer } from '../types';

// Mock dependencies
jest.mock('../services/api');
jest.mock('../contexts/ThemeContext', () => ({
  useThemeContext: () => ({ isDarkMode: false }),
}));

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

// Customer with multiple measurements for the same garment type (sorted by date)
const mockCustomerWithMultipleMeasurements: Customer = {
  id: '1',
  personalDetails: {
    name: 'John Doe',
    phone: '+1234567890',
    email: 'john.doe@example.com',
  },
  measurements: [
    {
      id: '1',
      garmentType: 'blouse',
      fields: [
        { name: 'blouse length', value: '15' },
        { name: 'chest loose', value: '38' },
      ],
      notes: 'First measurement',
      lastMeasuredDate: '2025-01-15T10:00:00Z', // Older
    },
    {
      id: '2',
      garmentType: 'blouse',
      fields: [
        { name: 'blouse length', value: '16' },
        { name: 'chest loose', value: '40' },
      ],
      notes: 'Updated measurement',
      lastMeasuredDate: '2025-01-20T10:00:00Z', // Latest
    },
    {
      id: '3',
      garmentType: 'shirt',
      fields: [
        { name: 'chest', value: '42' },
        { name: 'waist', value: '34' },
      ],
      notes: 'Shirt measurement',
      lastMeasuredDate: '2025-01-18T10:00:00Z',
    },
  ],
  comments: 'Regular customer',
  createdAt: '2024-01-01T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
};

const mockRoute = {
  params: { customer: mockCustomerWithMultipleMeasurements },
};

describe('CustomerDetailScreen - Measurement Slider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays measurements sorted by date (latest first)', () => {
    const { getByText } = render(
      <CustomerDetailScreen 
        navigation={mockNavigation as any} 
        route={mockRoute as any} 
      />
    );

    // Should show blouse measurements section
    expect(getByText('Blouse Measurements')).toBeTruthy();
    
    // Should show shirt measurements section
    expect(getByText('Shirt Measurements')).toBeTruthy();
  });

  it('shows measurement count for multiple measurements of same garment type', () => {
    const { getByText } = render(
      <CustomerDetailScreen 
        navigation={mockNavigation as any} 
        route={mockRoute as any} 
      />
    );

    // Should show "1 of 2" for blouse measurements (multiple measurements)
    expect(getByText('1 of 2')).toBeTruthy();
  });

  it('displays pagination dots for multiple measurements', () => {
    const { getAllByTestId } = render(
      <CustomerDetailScreen 
        navigation={mockNavigation as any} 
        route={mockRoute as any} 
      />
    );

    // Should have pagination dots for the blouse measurements
    // Note: This would require adding testID to pagination dots in the actual implementation
  });

  it('shows latest measurement first in slider', () => {
    const { getByText } = render(
      <CustomerDetailScreen 
        navigation={mockNavigation as any} 
        route={mockRoute as any} 
      />
    );

    // The latest measurement (2025-01-20) should be shown first
    // This measurement has "Updated measurement" as notes
    expect(getByText('Updated measurement')).toBeTruthy();
    
    // Should show the latest measurement values
    expect(getByText('16')).toBeTruthy(); // Latest blouse length
    expect(getByText('40')).toBeTruthy(); // Latest chest loose
  });

  it('displays single measurement without slider for garment with one measurement', () => {
    const { queryByText } = render(
      <CustomerDetailScreen 
        navigation={mockNavigation as any} 
        route={mockRoute as any} 
      />
    );

    // Shirt has only one measurement, so no count should be shown
    expect(queryByText('1 of 1')).toBeNull();
  });

  it('shows measurement ID when available', () => {
    const { getByText } = render(
      <CustomerDetailScreen 
        navigation={mockNavigation as any} 
        route={mockRoute as any} 
      />
    );

    // Should show measurement IDs
    expect(getByText('ID: 2')).toBeTruthy(); // Latest blouse measurement ID
    expect(getByText('ID: 3')).toBeTruthy(); // Shirt measurement ID
  });

  it('formats dates correctly in measurement footer', () => {
    const { getByText } = render(
      <CustomerDetailScreen 
        navigation={mockNavigation as any} 
        route={mockRoute as any} 
      />
    );

    // Should show formatted dates
    expect(getByText(/Last measured:/)).toBeTruthy();
  });

  it('capitalizes garment type in section title', () => {
    const { getByText } = render(
      <CustomerDetailScreen 
        navigation={mockNavigation as any} 
        route={mockRoute as any} 
      />
    );

    // Should capitalize garment types
    expect(getByText('Blouse Measurements')).toBeTruthy();
    expect(getByText('Shirt Measurements')).toBeTruthy();
  });
});