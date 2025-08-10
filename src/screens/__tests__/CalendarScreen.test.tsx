import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { CalendarScreen } from '../CalendarScreen';
import { Bill, CalendarEvent } from '../../types';
import * as api from '../../services/api';

// Mock the API
jest.mock('../../services/api');
const mockApi = api as jest.Mocked<typeof api>;

// Mock Alert
jest.spyOn(Alert, 'alert');

const mockBills: Bill[] = [
  {
    id: 'bill1',
    customerId: 'customer1',
    customer: {
      id: 'customer1',
      personalDetails: {
        name: 'John Doe',
        phone: '1234567890',
      },
      measurements: [],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    billNumber: 'BILL-001',
    billingDate: '2024-01-15',
    deliveryDate: '2024-01-25',
    items: [],
    receivedItems: [],
    totalAmount: 1000,
    paidAmount: 500,
    outstandingAmount: 500,
    status: 'partially_paid',
    payments: [],
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'bill2',
    customerId: 'customer2',
    customer: {
      id: 'customer2',
      personalDetails: {
        name: 'Jane Smith',
        phone: '0987654321',
      },
      measurements: [],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    billNumber: 'BILL-002',
    billingDate: '2024-01-20',
    deliveryDate: '2024-01-30',
    items: [],
    receivedItems: [],
    totalAmount: 1500,
    paidAmount: 1500,
    outstandingAmount: 0,
    status: 'fully_paid',
    payments: [],
    createdAt: '2024-01-20T00:00:00Z',
    updatedAt: '2024-01-20T00:00:00Z',
  },
];

const mockNavigation = {
  setOptions: jest.fn(),
  navigate: jest.fn(),
  goBack: jest.fn(),
};

const defaultProps = {
  navigation: mockNavigation,
};

describe('CalendarScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.getBills.mockResolvedValue({
      items: mockBills,
      hasMore: false,
      nextPageCursor: undefined,
    });
    
    // Mock current date to January 2024 for consistent testing
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T10:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders calendar screen with header', async () => {
      render(<CalendarScreen {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockNavigation.setOptions).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Calendar',
          })
        );
      });
    });

    it('loads and displays bills on mount', async () => {
      render(<CalendarScreen {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockApi.getBills).toHaveBeenCalledWith(
          expect.objectContaining({
            startDate: expect.any(String),
            endDate: expect.any(String),
            limit: 100,
          })
        );
      });
    });

    it('displays legend with billing and delivery date indicators', async () => {
      render(<CalendarScreen {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Legend')).toBeTruthy();
        expect(screen.getByText('Billing Date')).toBeTruthy();
        expect(screen.getByText('Delivery Date')).toBeTruthy();
      });
    });

    it('shows loading spinner while loading data', () => {
      render(<CalendarScreen {...defaultProps} />);
      
      expect(screen.getByText('Loading calendar...')).toBeTruthy();
    });
  });

  describe('Calendar Views', () => {
    it('defaults to monthly view', async () => {
      render(<CalendarScreen {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('view-monthly')).toBeTruthy();
        // Should show days of week header
        expect(screen.getByText('Sun')).toBeTruthy();
        expect(screen.getByText('Mon')).toBeTruthy();
        expect(screen.getByText('Sat')).toBeTruthy();
      });
    });

    it('switches to weekly view when selected', async () => {
      render(<CalendarScreen {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('view-weekly')).toBeTruthy();
      });
      
      fireEvent.press(screen.getByTestId('view-weekly'));
      
      // Should show week header
      expect(screen.getByTestId('week-day-0')).toBeTruthy();
      expect(screen.getByTestId('week-day-6')).toBeTruthy();
    });

    it('switches to daily view when selected', async () => {
      render(<CalendarScreen {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('view-daily')).toBeTruthy();
      });
      
      fireEvent.press(screen.getByTestId('view-daily'));
      
      // Should show daily view with large date
      expect(screen.getByText('15')).toBeTruthy(); // Current date
      expect(screen.getByText('Monday')).toBeTruthy(); // Day of week
    });
  });

  describe('Navigation', () => {
    it('navigates to previous month in monthly view', async () => {
      render(<CalendarScreen {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('January 2024')).toBeTruthy();
      });
      
      fireEvent.press(screen.getByTestId('prev-period'));
      
      await waitFor(() => {
        expect(screen.getByText('December 2023')).toBeTruthy();
      });
    });

    it('navigates to next month in monthly view', async () => {
      render(<CalendarScreen {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('January 2024')).toBeTruthy();
      });
      
      fireEvent.press(screen.getByTestId('next-period'));
      
      await waitFor(() => {
        expect(screen.getByText('February 2024')).toBeTruthy();
      });
    });

    it('navigates to today when today button is pressed', async () => {
      render(<CalendarScreen {...defaultProps} />);
      
      // First navigate to a different month
      await waitFor(() => {
        expect(screen.getByText('January 2024')).toBeTruthy();
      });
      
      fireEvent.press(screen.getByTestId('next-period'));
      
      await waitFor(() => {
        expect(screen.getByText('February 2024')).toBeTruthy();
      });
      
      // Then navigate back to today
      const todayButton = mockNavigation.setOptions.mock.calls[0][0].headerRight().props.children[1];
      fireEvent.press(todayButton);
      
      await waitFor(() => {
        expect(screen.getByText('January 2024')).toBeTruthy();
      });
    });
  });

  describe('Event Display', () => {
    it('displays event dots for dates with bills', async () => {
      render(<CalendarScreen {...defaultProps} />);
      
      await waitFor(() => {
        // Should show event dots for dates with billing/delivery events
        expect(screen.getByTestId('day-15')).toBeTruthy(); // Billing date
        expect(screen.getByTestId('day-25')).toBeTruthy(); // Delivery date
      });
    });

    it('shows event details when date is pressed', async () => {
      render(<CalendarScreen {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('day-15')).toBeTruthy();
      });
      
      fireEvent.press(screen.getByTestId('day-15'));
      
      expect(Alert.alert).toHaveBeenCalledWith(
        'Calendar Events',
        expect.stringContaining('Events for Monday, 15 January, 2024'),
        expect.any(Array)
      );
    });

    it('groups events by type in alert', async () => {
      render(<CalendarScreen {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('day-15')).toBeTruthy();
      });
      
      fireEvent.press(screen.getByTestId('day-15'));
      
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const message = alertCall[1];
      
      expect(message).toContain('📋 Billing Dates');
      expect(message).toContain('BILL-001 - John Doe');
      expect(message).toContain('₹1000.00');
    });

    it('provides option to view bills from alert', async () => {
      render(<CalendarScreen {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('day-15')).toBeTruthy();
      });
      
      fireEvent.press(screen.getByTestId('day-15'));
      
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const buttons = alertCall[2];
      const viewBillsButton = buttons.find((btn: any) => btn.text === 'View Bills');
      
      expect(viewBillsButton).toBeTruthy();
      
      // Simulate pressing "View Bills"
      viewBillsButton.onPress();
      
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Billing', {
        filterDate: '2024-01-15',
      });
    });
  });

  describe('Weekly View', () => {
    it('displays events in weekly view', async () => {
      render(<CalendarScreen {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('view-weekly')).toBeTruthy();
      });
      
      fireEvent.press(screen.getByTestId('view-weekly'));
      
      await waitFor(() => {
        // Should show events for the week
        expect(screen.getByText('BILL-001')).toBeTruthy();
        expect(screen.getByText('John Doe')).toBeTruthy();
      });
    });

    it('navigates to bill detail when event is pressed in weekly view', async () => {
      render(<CalendarScreen {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('view-weekly')).toBeTruthy();
      });
      
      fireEvent.press(screen.getByTestId('view-weekly'));
      
      await waitFor(() => {
        expect(screen.getByText('BILL-001')).toBeTruthy();
      });
      
      fireEvent.press(screen.getByText('BILL-001'));
      
      expect(mockNavigation.navigate).toHaveBeenCalledWith('BillDetail', {
        billId: 'bill1',
      });
    });
  });

  describe('Daily View', () => {
    it('shows no events message when no events for the day', async () => {
      render(<CalendarScreen {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('view-daily')).toBeTruthy();
      });
      
      fireEvent.press(screen.getByTestId('view-daily'));
      
      // Navigate to a day with no events
      fireEvent.press(screen.getByTestId('prev-period')); // Go to previous day
      
      await waitFor(() => {
        expect(screen.getByText('No events for this day')).toBeTruthy();
      });
    });

    it('displays events in daily view', async () => {
      render(<CalendarScreen {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('view-daily')).toBeTruthy();
      });
      
      fireEvent.press(screen.getByTestId('view-daily'));
      
      await waitFor(() => {
        expect(screen.getByText('📋 Billing Date')).toBeTruthy();
        expect(screen.getByText('BILL-001')).toBeTruthy();
        expect(screen.getByText('John Doe')).toBeTruthy();
      });
    });
  });

  describe('Status and Type Colors', () => {
    it('displays correct colors for different event types', async () => {
      render(<CalendarScreen {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('view-weekly')).toBeTruthy();
      });
      
      fireEvent.press(screen.getByTestId('view-weekly'));
      
      await waitFor(() => {
        // Should show events with proper styling
        expect(screen.getByText('📋 Billing')).toBeTruthy();
        expect(screen.getByText('🚚 Delivery')).toBeTruthy();
      });
    });

    it('displays correct status badges', async () => {
      render(<CalendarScreen {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('view-weekly')).toBeTruthy();
      });
      
      fireEvent.press(screen.getByTestId('view-weekly'));
      
      await waitFor(() => {
        expect(screen.getByText('PARTIALLY PAID')).toBeTruthy();
        expect(screen.getByText('FULLY PAID')).toBeTruthy();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API error gracefully', async () => {
      mockApi.getBills.mockRejectedValue(new Error('API Error'));
      
      render(<CalendarScreen {...defaultProps} />);
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to load calendar data. Please try again.'
        );
      });
    });

    it('handles refresh functionality', async () => {
      render(<CalendarScreen {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockApi.getBills).toHaveBeenCalled();
      });
      
      // Simulate refresh button press
      const refreshButton = mockNavigation.setOptions.mock.calls[0][0].headerRight().props.children[0];
      fireEvent.press(refreshButton);
      
      await waitFor(() => {
        expect(mockApi.getBills).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Date Formatting', () => {
    it('formats dates correctly in different views', async () => {
      render(<CalendarScreen {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('January 2024')).toBeTruthy();
      });
      
      // Switch to weekly view
      fireEvent.press(screen.getByTestId('view-weekly'));
      
      await waitFor(() => {
        expect(screen.getByText(/14 - 20 January 2024/)).toBeTruthy();
      });
      
      // Switch to daily view
      fireEvent.press(screen.getByTestId('view-daily'));
      
      await waitFor(() => {
        expect(screen.getByText('Monday')).toBeTruthy();
      });
    });
  });

  describe('Event Conversion', () => {
    it('converts bills to calendar events correctly', async () => {
      render(<CalendarScreen {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockApi.getBills).toHaveBeenCalled();
      });
      
      // Should create both billing and delivery events for each bill
      // This is tested indirectly through the UI showing both types of events
      fireEvent.press(screen.getByTestId('view-weekly'));
      
      await waitFor(() => {
        expect(screen.getByText('📋 Billing')).toBeTruthy();
        expect(screen.getByText('🚚 Delivery')).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper test IDs for navigation elements', async () => {
      render(<CalendarScreen {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('prev-period')).toBeTruthy();
        expect(screen.getByTestId('next-period')).toBeTruthy();
        expect(screen.getByTestId('view-monthly')).toBeTruthy();
        expect(screen.getByTestId('view-weekly')).toBeTruthy();
        expect(screen.getByTestId('view-daily')).toBeTruthy();
      });
    });

    it('has proper test IDs for calendar days', async () => {
      render(<CalendarScreen {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('day-1')).toBeTruthy();
        expect(screen.getByTestId('day-15')).toBeTruthy();
        expect(screen.getByTestId('day-31')).toBeTruthy();
      });
    });
  });
});