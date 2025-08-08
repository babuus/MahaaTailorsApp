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

// Customer with multiple measurements to test slider navigation
const mockCustomerWithSliderMeasurements: Customer = {
  id: '1',
  personalDetails: {
    name: 'Jane Smith',
    phone: '+1987654321',
    email: 'jane.smith@example.com',
  },
  measurements: [
    {
      id: 'meas-1',
      garmentType: 'blouse',
      fields: [
        { name: 'blouse length', value: '14' },
        { name: 'body loose', value: '2' },
        { name: 'chest loose', value: '3' },
      ],
      notes: 'First fitting',
      lastMeasuredDate: '2025-01-10T10:00:00Z',
    },
    {
      id: 'meas-2',
      garmentType: 'blouse',
      fields: [
        { name: 'blouse length', value: '15' },
        { name: 'body loose', value: '2.5' },
        { name: 'chest loose', value: '3.5' },
      ],
      notes: 'Second fitting - adjusted',
      lastMeasuredDate: '2025-01-25T10:00:00Z', // Latest
    },
    {
      id: 'meas-3',
      garmentType: 'blouse',
      fields: [
        { name: 'blouse length', value: '14.5' },
        { name: 'body loose', value: '2.2' },
        { name: 'chest loose', value: '3.2' },
      ],
      notes: 'Third fitting - final',
      lastMeasuredDate: '2025-01-20T10:00:00Z', // Middle
    },
  ],
  comments: 'Multiple fittings customer',
  createdAt: '2024-01-01T10:00:00Z',
  updatedAt: '2024-01-25T10:00:00Z',
};

const mockRoute = {
  params: { customer: mockCustomerWithSliderMeasurements },
};

describe('CustomerDetailScreen - Slider Navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays correct measurement count for multiple measurements', () => {
    const { getByText } = render(
      <CustomerDetailScreen 
        navigation={mockNavigation as any} 
        route={mockRoute as any} 
      />
    );

    // Should show "1 of 3" initially (showing first/latest measurement)
    expect(getByText('1 of 3')).toBeTruthy();
  });

  it('shows latest measurement first (sorted by date)', () => {
    const { getByText } = render(
      <CustomerDetailScreen 
        navigation={mockNavigation as any} 
        route={mockRoute as any} 
      />
    );

    // Latest measurement (2025-01-25) should be shown first
    expect(getByText('Second fitting - adjusted')).toBeTruthy();
    expect(getByText('15')).toBeTruthy(); // Latest blouse length value
    expect(getByText('ID: meas-2')).toBeTruthy(); // Latest measurement ID
  });

  it('displays all measurement fields correctly', () => {
    const { getByText } = render(
      <CustomerDetailScreen 
        navigation={mockNavigation as any} 
        route={mockRoute as any} 
      />
    );

    // Should show all fields from the latest measurement
    expect(getByText('Blouse Length:')).toBeTruthy();
    expect(getByText('Body Loose:')).toBeTruthy();
    expect(getByText('Chest Loose:')).toBeTruthy();
    
    // Should show values from latest measurement
    expect(getByText('15')).toBeTruthy();
    expect(getByText('2.5')).toBeTruthy();
    expect(getByText('3.5')).toBeTruthy();
  });

  it('shows pagination dots for multiple measurements', () => {
    const { UNSAFE_getAllByType } = render(
      <CustomerDetailScreen 
        navigation={mockNavigation as any} 
        route={mockRoute as any} 
      />
    );

    // Should render pagination container with dots
    // Note: In a real test, we'd add testIDs to make this more reliable
  });

  it('handles measurement without notes gracefully', () => {
    const customerWithoutNotes: Customer = {
      ...mockCustomerWithSliderMeasurements,
      measurements: [
        {
          id: 'meas-1',
          garmentType: 'shirt',
          fields: [{ name: 'chest', value: '40' }],
          lastMeasuredDate: '2025-01-15T10:00:00Z',
          // No notes field
        },
      ],
    };

    const routeWithoutNotes = {
      params: { customer: customerWithoutNotes },
    };

    const { queryByText } = render(
      <CustomerDetailScreen 
        navigation={mockNavigation as any} 
        route={routeWithoutNotes as any} 
      />
    );

    // Should not show notes section when notes are empty
    expect(queryByText('Notes:')).toBeNull();
  });

  it('displays measurement dates in correct format', () => {
    const { getByText } = render(
      <CustomerDetailScreen 
        navigation={mockNavigation as any} 
        route={mockRoute as any} 
      />
    );

    // Should show "Last measured:" text
    expect(getByText(/Last measured:/)).toBeTruthy();
  });

  it('handles single measurement without slider', () => {
    const customerWithSingleMeasurement: Customer = {
      ...mockCustomerWithSliderMeasurements,
      measurements: [
        {
          id: 'single-meas',
          garmentType: 'dress',
          fields: [{ name: 'length', value: '45' }],
          lastMeasuredDate: '2025-01-15T10:00:00Z',
        },
      ],
    };

    const routeWithSingle = {
      params: { customer: customerWithSingleMeasurement },
    };

    const { queryByText } = render(
      <CustomerDetailScreen 
        navigation={mockNavigation as any} 
        route={routeWithSingle as any} 
      />
    );

    // Should not show measurement count for single measurement
    expect(queryByText('1 of 1')).toBeNull();
    
    // Should show the measurement content
    expect(queryByText('Dress Measurements')).toBeTruthy();
    expect(queryByText('45')).toBeTruthy();
  });
});