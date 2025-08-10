import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import DrawerNavigator from '../navigation/DrawerNavigator';
import * as api from '../services/api';
import { createMockBill, createMockCustomer, createMockBillItem } from '../test-utils/mockData';

// Mock all API calls
jest.mock('../services/api');
const mockApi = api as jest.Mocked<typeof api>;

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock all context providers
jest.mock('../contexts/ThemeContext', () => ({
  useThemeContext: () => ({ isDarkMode: false }),
}));

jest.mock('../utils/accessibility', () => ({
  useAccessibility: () => ({
    generateButtonHint: jest.fn((hint) => hint),
    ensureMinimumTouchTarget: jest.fn((size) => size),
    announceForAccessibility: jest.fn(),
    generateSemanticDescription: jest.fn((type, desc) => desc),
  }),
}));

jest.mock('../utils/AnimationManager', () => ({
  animationManager: {
    createScreenTransition: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback(true)),
    })),
  },
}));

jest.mock('../utils/performanceMonitor', () => ({
  performanceMonitor: {
    startNavigation: jest.fn(),
    endNavigation: jest.fn(),
  },
}));

// Mock form validation hook
jest.mock('../hooks/useFormValidation', () => ({
  useFormValidation: jest.fn(() => ({
    data: {},
    validation: { errors: {}, touched: {} },
    updateField: jest.fn(),
    markFieldAsTouched: jest.fn(),
    validateForm: jest.fn(() => ({ isValid: true, errors: [] })),
    resetForm: jest.fn(),
  })),
}));

describe('Billing System Integration Tests', () => {
  const mockBill = createMockBill();
  const mockCustomer = createMockCustomer();
  const mockBillItem = createMockBillItem();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default API responses
    mockApi.getBills.mockResolvedValue({
      items: [mockBill],
      hasMore: false,
      nextPageCursor: undefined,
    });
    
    mockApi.getCustomers.mockResolvedValue([mockCustomer]);
    mockApi.getBillingConfigItems.mockResolvedValue([]);
    mockApi.getReceivedItemTemplates.mockResolvedValue([]);
    mockApi.createBill.mockResolvedValue(mockBill);
    mockApi.updateBill.mockResolvedValue(mockBill);
    mockApi.addPayment.mockResolvedValue({
      id: 'payment1',
      amount: 500,
      paymentDate: '2024-01-15',
      paymentMethod: 'cash',
      notes: '',
      createdAt: '2024-01-15T00:00:00Z',
    });
  });

  describe('Complete Billing Workflow', () => {
    it('should complete full billing workflow from creation to payment', async () => {
      const { getByTestId, getByText } = render(<DrawerNavigator />);

      // Navigate to billing screen
      fireEvent.press(getByTestId('drawer-menu-button'));
      fireEvent.press(getByText('Billing'));

      // Wait for bills to load
      await waitFor(() => {
        expect(mockApi.getBills).toHaveBeenCalled();
      });

      // Create new bill
      fireEvent.press(getByTestId('add-bill-fab'));

      // Should navigate to billing form
      await waitFor(() => {
        expect(getByText('Create Bill')).toBeTruthy();
      });

      // Fill customer information
      const customerSearch = getByTestId('customer-search-input');
      fireEvent.changeText(customerSearch, 'John Doe');
      
      await waitFor(() => {
        expect(mockApi.getCustomers).toHaveBeenCalledWith(
          expect.objectContaining({ search: 'John Doe' })
        );
      });

      // Select customer
      fireEvent.press(getByText('John Doe'));

      // Fill dates
      fireEvent.changeText(getByTestId('billing-date-input'), '2024-01-15');
      fireEvent.changeText(getByTestId('delivery-date-input'), '2024-01-25');

      // Add billing item
      fireEvent.press(getByTestId('add-custom-item'));
      fireEvent.changeText(getByTestId('billing-item-name-0'), 'Shirt Stitching');
      fireEvent.changeText(getByTestId('billing-item-quantity-0'), '1');
      fireEvent.changeText(getByTestId('billing-item-price-0'), '500');

      // Submit bill
      fireEvent.press(getByTestId('submit-button'));

      await waitFor(() => {
        expect(mockApi.createBill).toHaveBeenCalledWith(
          expect.objectContaining({
            customerId: mockCustomer.id,
            billingDate: '2024-01-15',
            deliveryDate: '2024-01-25',
            items: expect.arrayContaining([
              expect.objectContaining({
                name: 'Shirt Stitching',
                quantity: 1,
                unitPrice: 500,
              }),
            ]),
          })
        );
      });

      // Should show success message
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'Bill created successfully!'
      );

      // Navigate back to billing list
      fireEvent.press(getByText('OK'));

      // Should show the new bill in the list
      await waitFor(() => {
        expect(getByText(`Bill #${mockBill.billNumber}`)).toBeTruthy();
      });

      // Add payment to the bill
      fireEvent.press(getByTestId(`bill-card-${mockBill.id}`));
      
      // Should navigate to bill details/edit
      await waitFor(() => {
        expect(getByText('Payment Tracking')).toBeTruthy();
      });

      // Add payment
      fireEvent.press(getByTestId('add-payment-button'));
      fireEvent.changeText(getByTestId('payment-amount-input'), '500');
      fireEvent.press(getByTestId('payment-method-cash'));
      fireEvent.press(getByTestId('save-payment'));

      await waitFor(() => {
        expect(mockApi.addPayment).toHaveBeenCalledWith(
          mockBill.id,
          expect.objectContaining({
            amount: 500,
            paymentMethod: 'cash',
          })
        );
      });

      // Should show payment success
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'Payment added successfully!'
      );

      // Bill status should update to fully paid
      await waitFor(() => {
        expect(getByText('Fully Paid')).toBeTruthy();
      });
    });

    it('should handle bill editing workflow', async () => {
      const { getByTestId, getByText } = render(<DrawerNavigator />);

      // Navigate to billing screen
      fireEvent.press(getByTestId('drawer-menu-button'));
      fireEvent.press(getByText('Billing'));

      await waitFor(() => {
        expect(mockApi.getBills).toHaveBeenCalled();
      });

      // Edit existing bill
      fireEvent.press(getByTestId(`edit-bill-${mockBill.id}`));

      // Should navigate to edit form
      await waitFor(() => {
        expect(getByText('Edit Bill')).toBeTruthy();
      });

      // Modify bill item
      fireEvent.changeText(getByTestId('billing-item-quantity-0'), '2');

      // Save changes
      fireEvent.press(getByTestId('submit-button'));

      await waitFor(() => {
        expect(mockApi.updateBill).toHaveBeenCalledWith(
          mockBill.id,
          expect.objectContaining({
            items: expect.arrayContaining([
              expect.objectContaining({
                quantity: 2,
              }),
            ]),
          })
        );
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'Bill updated successfully!'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockApi.getBills.mockRejectedValue(new Error('Network error'));

      const { getByTestId, getByText } = render(<DrawerNavigator />);

      // Navigate to billing screen
      fireEvent.press(getByTestId('drawer-menu-button'));
      fireEvent.press(getByText('Billing'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to load bills. Please try again.'
        );
      });

      // Should show retry option
      expect(getByText('Retry')).toBeTruthy();
    });

    it('should handle form validation errors', async () => {
      const { getByTestId, getByText } = render(<DrawerNavigator />);

      // Navigate to billing form
      fireEvent.press(getByTestId('drawer-menu-button'));
      fireEvent.press(getByText('Billing'));
      fireEvent.press(getByTestId('add-bill-fab'));

      // Try to submit empty form
      fireEvent.press(getByTestId('submit-button'));

      // Should show validation errors
      await waitFor(() => {
        expect(getByText('This field is required')).toBeTruthy();
      });

      // Should not call API
      expect(mockApi.createBill).not.toHaveBeenCalled();
    });

    it('should handle payment validation errors', async () => {
      const billWithPayments = {
        ...mockBill,
        totalAmount: 1000,
        paidAmount: 500,
        outstandingAmount: 500,
      };

      mockApi.getBillById.mockResolvedValue(billWithPayments);

      const { getByTestId, getByText } = render(<DrawerNavigator />);

      // Navigate to bill details
      fireEvent.press(getByTestId('drawer-menu-button'));
      fireEvent.press(getByText('Billing'));
      fireEvent.press(getByTestId(`bill-card-${mockBill.id}`));

      // Try to add payment exceeding outstanding amount
      fireEvent.press(getByTestId('add-payment-button'));
      fireEvent.changeText(getByTestId('payment-amount-input'), '600');
      fireEvent.press(getByTestId('save-payment'));

      // Should show validation error
      await waitFor(() => {
        expect(getByText('Payment amount cannot exceed outstanding balance')).toBeTruthy();
      });

      // Should not call API
      expect(mockApi.addPayment).not.toHaveBeenCalled();
    });
  });

  describe('Offline Support', () => {
    it('should handle offline bill creation', async () => {
      // Mock network error
      mockApi.createBill.mockRejectedValue(new Error('Network unavailable'));

      const { getByTestId, getByText } = render(<DrawerNavigator />);

      // Navigate to billing form
      fireEvent.press(getByTestId('drawer-menu-button'));
      fireEvent.press(getByText('Billing'));
      fireEvent.press(getByTestId('add-bill-fab'));

      // Fill and submit form
      fireEvent.changeText(getByTestId('customer-search-input'), 'John Doe');
      fireEvent.press(getByText('John Doe'));
      fireEvent.changeText(getByTestId('billing-date-input'), '2024-01-15');
      fireEvent.changeText(getByTestId('delivery-date-input'), '2024-01-25');
      fireEvent.press(getByTestId('add-custom-item'));
      fireEvent.changeText(getByTestId('billing-item-name-0'), 'Shirt Stitching');
      fireEvent.changeText(getByTestId('billing-item-quantity-0'), '1');
      fireEvent.changeText(getByTestId('billing-item-price-0'), '500');
      fireEvent.press(getByTestId('submit-button'));

      // Should show offline message
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Offline',
          'Bill saved locally and will be synced when connection is restored.'
        );
      });

      // Should show offline indicator
      expect(getByTestId('offline-indicator')).toBeTruthy();
    });
  });

  describe('Calendar Integration', () => {
    it('should show bills on calendar dates', async () => {
      const { getByTestId, getByText } = render(<DrawerNavigator />);

      // Navigate to calendar
      fireEvent.press(getByTestId('drawer-menu-button'));
      fireEvent.press(getByText('Calendar'));

      await waitFor(() => {
        expect(mockApi.getBills).toHaveBeenCalledWith(
          expect.objectContaining({
            startDate: expect.any(String),
            endDate: expect.any(String),
          })
        );
      });

      // Should show bill indicators on dates
      const billDate = new Date(mockBill.billingDate).getDate();
      expect(getByTestId(`day-${billDate}-indicator`)).toBeTruthy();

      // Click on date with bills
      fireEvent.press(getByTestId(`day-${billDate}`));

      // Should show bill details
      await waitFor(() => {
        expect(getByText(`Bill #${mockBill.billNumber}`)).toBeTruthy();
      });
    });
  });

  describe('Print Functionality', () => {
    it('should generate and share bill PDF', async () => {
      const { getByTestId, getByText } = render(<DrawerNavigator />);

      // Navigate to billing screen
      fireEvent.press(getByTestId('drawer-menu-button'));
      fireEvent.press(getByText('Billing'));

      await waitFor(() => {
        expect(mockApi.getBills).toHaveBeenCalled();
      });

      // Print bill
      fireEvent.press(getByTestId(`print-bill-${mockBill.id}`));

      // Should navigate to print screen
      await waitFor(() => {
        expect(getByText('Print Bill')).toBeTruthy();
        expect(getByText('Print Preview')).toBeTruthy();
      });

      // Generate PDF
      fireEvent.press(getByTestId('generate-pdf'));

      // Should show success message
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'Bill PDF has been generated successfully!'
        );
      });
    });
  });

  describe('Configuration Management', () => {
    it('should manage billing configuration items', async () => {
      const mockConfigItem = {
        id: 'config1',
        name: 'Shirt Stitching',
        price: 500,
        category: 'service' as const,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockApi.getBillingConfigItems.mockResolvedValue([mockConfigItem]);
      mockApi.createBillingConfigItem.mockResolvedValue(mockConfigItem);

      const { getByTestId, getByText } = render(<DrawerNavigator />);

      // Navigate to billing configuration
      fireEvent.press(getByTestId('drawer-menu-button'));
      fireEvent.press(getByText('Settings'));
      fireEvent.press(getByText('Billing Configuration'));

      await waitFor(() => {
        expect(mockApi.getBillingConfigItems).toHaveBeenCalled();
      });

      // Add new configuration item
      fireEvent.press(getByTestId('add-config-item'));
      fireEvent.changeText(getByTestId('config-item-name'), 'Pant Stitching');
      fireEvent.changeText(getByTestId('config-item-price'), '400');
      fireEvent.press(getByTestId('config-item-category-service'));
      fireEvent.press(getByTestId('save-config-item'));

      await waitFor(() => {
        expect(mockApi.createBillingConfigItem).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Pant Stitching',
            price: 400,
            category: 'service',
          })
        );
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'Configuration item created successfully!'
      );
    });
  });

  describe('Performance', () => {
    it('should handle large bill lists efficiently', async () => {
      const largeBillList = Array.from({ length: 100 }, (_, index) =>
        createMockBill({
          id: `bill${index + 1}`,
          billNumber: `BILL-${String(index + 1).padStart(3, '0')}`,
        })
      );

      mockApi.getBills.mockResolvedValue({
        items: largeBillList,
        hasMore: false,
        nextPageCursor: undefined,
      });

      const startTime = performance.now();

      const { getByTestId, getByText } = render(<DrawerNavigator />);

      // Navigate to billing screen
      fireEvent.press(getByTestId('drawer-menu-button'));
      fireEvent.press(getByText('Billing'));

      await waitFor(() => {
        expect(mockApi.getBills).toHaveBeenCalled();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time (2 seconds)
      expect(renderTime).toBeLessThan(2000);

      // Should show all bills
      expect(getByText('BILL-001')).toBeTruthy();
      expect(getByText('BILL-100')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', async () => {
      const { getByLabelText } = render(<DrawerNavigator />);

      // Navigate to billing screen
      fireEvent.press(getByLabelText('Open navigation menu'));
      fireEvent.press(getByLabelText('Navigate to Billing'));

      await waitFor(() => {
        expect(mockApi.getBills).toHaveBeenCalled();
      });

      // Should have accessible elements
      expect(getByLabelText('Add new bill')).toBeTruthy();
      expect(getByLabelText('Search bills')).toBeTruthy();
    });

    it('should support keyboard navigation', async () => {
      const { getByTestId } = render(<DrawerNavigator />);

      // Navigate to billing form
      fireEvent.press(getByTestId('drawer-menu-button'));
      fireEvent.press(getByTestId('billing-nav-item'));
      fireEvent.press(getByTestId('add-bill-fab'));

      // Should be able to tab through form fields
      const customerInput = getByTestId('customer-search-input');
      const billingDateInput = getByTestId('billing-date-input');
      const deliveryDateInput = getByTestId('delivery-date-input');

      expect(customerInput.props.accessibilityRole).toBe('textbox');
      expect(billingDateInput.props.accessibilityRole).toBe('textbox');
      expect(deliveryDateInput.props.accessibilityRole).toBe('textbox');
    });
  });
});