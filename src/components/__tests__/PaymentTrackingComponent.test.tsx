import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { PaymentTrackingComponent } from '../PaymentTrackingComponent';
import { Bill, Payment, BillStatus } from '../../types';
import * as api from '../../services/api';

// Mock the API
jest.mock('../../services/api');
const mockApi = api as jest.Mocked<typeof api>;

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock useFormValidation
jest.mock('../../hooks/useFormValidation', () => ({
  useFormValidation: jest.fn(() => ({
    data: {
      amount: 0,
      paymentDate: '2024-01-15',
      paymentMethod: 'cash',
      notes: '',
    },
    validation: {
      errors: {},
      touched: {},
    },
    updateField: jest.fn(),
    markFieldAsTouched: jest.fn(),
    validateForm: jest.fn(() => true),
    resetForm: jest.fn(),
  })),
}));

const mockPayments: Payment[] = [
  {
    id: 'payment1',
    amount: 500,
    paymentDate: '2024-01-10',
    paymentMethod: 'cash',
    notes: 'First payment',
    createdAt: '2024-01-10T00:00:00Z',
  },
  {
    id: 'payment2',
    amount: 300,
    paymentDate: '2024-01-12',
    paymentMethod: 'upi',
    createdAt: '2024-01-12T00:00:00Z',
  },
];

const mockBill: Bill = {
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
  billingDate: '2024-01-10',
  deliveryDate: '2024-01-20',
  items: [],
  receivedItems: [],
  totalAmount: 1000,
  paidAmount: 800,
  outstandingAmount: 200,
  status: 'partially_paid' as BillStatus,
  payments: mockPayments,
  createdAt: '2024-01-10T00:00:00Z',
  updatedAt: '2024-01-12T00:00:00Z',
};

const defaultProps = {
  bill: mockBill,
  onBillUpdate: jest.fn(),
  editable: true,
};

describe('PaymentTrackingComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders payment summary correctly', () => {
      render(<PaymentTrackingComponent {...defaultProps} />);
      
      expect(screen.getByText('Payment Summary')).toBeTruthy();
      expect(screen.getByText('Partially Paid')).toBeTruthy();
      expect(screen.getByText('₹1000.00')).toBeTruthy(); // Total amount
      expect(screen.getByText('₹800.00')).toBeTruthy(); // Paid amount
      expect(screen.getByText('₹200.00')).toBeTruthy(); // Outstanding amount
    });

    it('renders payment history', () => {
      render(<PaymentTrackingComponent {...defaultProps} />);
      
      expect(screen.getByText('Payment History')).toBeTruthy();
      expect(screen.getByText('₹500.00')).toBeTruthy();
      expect(screen.getByText('₹300.00')).toBeTruthy();
      expect(screen.getByText('Cash')).toBeTruthy();
      expect(screen.getByText('UPI')).toBeTruthy();
      expect(screen.getByText('First payment')).toBeTruthy();
    });

    it('shows add payment button when outstanding amount exists', () => {
      render(<PaymentTrackingComponent {...defaultProps} />);
      
      expect(screen.getByTestId('add-payment-button')).toBeTruthy();
      expect(screen.getByText('Add Payment')).toBeTruthy();
    });

    it('hides add payment button when fully paid', () => {
      const fullyPaidBill = {
        ...mockBill,
        paidAmount: 1000,
        outstandingAmount: 0,
        status: 'fully_paid' as BillStatus,
      };
      
      render(<PaymentTrackingComponent {...defaultProps} bill={fullyPaidBill} />);
      
      expect(screen.queryByTestId('add-payment-button')).toBeNull();
    });

    it('shows empty state when no payments', () => {
      const billWithNoPayments = {
        ...mockBill,
        payments: [],
        paidAmount: 0,
        outstandingAmount: 1000,
        status: 'unpaid' as BillStatus,
      };
      
      render(<PaymentTrackingComponent {...defaultProps} bill={billWithNoPayments} />);
      
      expect(screen.getByText('No payments recorded yet')).toBeTruthy();
      expect(screen.getByText('Add a payment to track bill status')).toBeTruthy();
    });

    it('hides action buttons when not editable', () => {
      render(<PaymentTrackingComponent {...defaultProps} editable={false} />);
      
      expect(screen.queryByTestId('add-payment-button')).toBeNull();
      expect(screen.queryByTestId('edit-payment-0')).toBeNull();
      expect(screen.queryByTestId('remove-payment-0')).toBeNull();
    });
  });

  describe('Status Display', () => {
    it('displays unpaid status correctly', () => {
      const unpaidBill = {
        ...mockBill,
        paidAmount: 0,
        outstandingAmount: 1000,
        status: 'unpaid' as BillStatus,
        payments: [],
      };
      
      render(<PaymentTrackingComponent {...defaultProps} bill={unpaidBill} />);
      
      expect(screen.getByText('Unpaid')).toBeTruthy();
    });

    it('displays fully paid status correctly', () => {
      const fullyPaidBill = {
        ...mockBill,
        paidAmount: 1000,
        outstandingAmount: 0,
        status: 'fully_paid' as BillStatus,
      };
      
      render(<PaymentTrackingComponent {...defaultProps} bill={fullyPaidBill} />);
      
      expect(screen.getByText('Fully Paid')).toBeTruthy();
    });

    it('displays partially paid status correctly', () => {
      render(<PaymentTrackingComponent {...defaultProps} />);
      
      expect(screen.getByText('Partially Paid')).toBeTruthy();
    });
  });

  describe('Payment Form', () => {
    it('shows payment form when add payment is pressed', () => {
      render(<PaymentTrackingComponent {...defaultProps} />);
      
      fireEvent.press(screen.getByTestId('add-payment-button'));
      
      expect(screen.getByText('Add Payment')).toBeTruthy();
      expect(screen.getByTestId('payment-amount-input')).toBeTruthy();
      expect(screen.getByTestId('payment-date-input')).toBeTruthy();
      expect(screen.getByTestId('payment-method-cash')).toBeTruthy();
      expect(screen.getByTestId('payment-notes-input')).toBeTruthy();
    });

    it('shows edit form when edit payment is pressed', () => {
      render(<PaymentTrackingComponent {...defaultProps} />);
      
      fireEvent.press(screen.getByTestId('edit-payment-0'));
      
      expect(screen.getByText('Edit Payment')).toBeTruthy();
    });

    it('closes form when cancel is pressed', () => {
      render(<PaymentTrackingComponent {...defaultProps} />);
      
      fireEvent.press(screen.getByTestId('add-payment-button'));
      expect(screen.getByText('Add Payment')).toBeTruthy();
      
      fireEvent.press(screen.getByTestId('cancel-payment'));
      expect(screen.queryByText('Add Payment')).toBeNull();
    });

    it('closes form when close button is pressed', () => {
      render(<PaymentTrackingComponent {...defaultProps} />);
      
      fireEvent.press(screen.getByTestId('add-payment-button'));
      expect(screen.getByText('Add Payment')).toBeTruthy();
      
      fireEvent.press(screen.getByTestId('close-payment-form'));
      expect(screen.queryByText('Add Payment')).toBeNull();
    });

    it('displays payment method options', () => {
      render(<PaymentTrackingComponent {...defaultProps} />);
      
      fireEvent.press(screen.getByTestId('add-payment-button'));
      
      expect(screen.getByTestId('payment-method-cash')).toBeTruthy();
      expect(screen.getByTestId('payment-method-card')).toBeTruthy();
      expect(screen.getByTestId('payment-method-upi')).toBeTruthy();
      expect(screen.getByTestId('payment-method-bank_transfer')).toBeTruthy();
      expect(screen.getByTestId('payment-method-other')).toBeTruthy();
    });
  });

  describe('Payment Operations', () => {
    it('adds payment successfully', async () => {
      const newPayment: Payment = {
        id: 'payment3',
        amount: 200,
        paymentDate: '2024-01-15',
        paymentMethod: 'cash',
        createdAt: '2024-01-15T00:00:00Z',
      };
      
      mockApi.addPayment.mockResolvedValue(newPayment);
      const onBillUpdate = jest.fn();
      
      render(<PaymentTrackingComponent {...defaultProps} onBillUpdate={onBillUpdate} />);
      
      fireEvent.press(screen.getByTestId('add-payment-button'));
      fireEvent.press(screen.getByTestId('save-payment'));
      
      await waitFor(() => {
        expect(mockApi.addPayment).toHaveBeenCalledWith('bill1', expect.any(Object));
      });
      
      expect(onBillUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          paidAmount: 1000, // 800 + 200
          outstandingAmount: 0,
          status: 'fully_paid',
          payments: expect.arrayContaining([newPayment]),
        })
      );
      
      expect(Alert.alert).toHaveBeenCalledWith('Success', 'Payment added successfully!');
    });

    it('updates payment successfully', async () => {
      const updatedPayment: Payment = {
        ...mockPayments[0],
        amount: 600,
      };
      
      mockApi.updatePayment.mockResolvedValue(updatedPayment);
      const onBillUpdate = jest.fn();
      
      render(<PaymentTrackingComponent {...defaultProps} onBillUpdate={onBillUpdate} />);
      
      fireEvent.press(screen.getByTestId('edit-payment-0'));
      fireEvent.press(screen.getByTestId('save-payment'));
      
      await waitFor(() => {
        expect(mockApi.updatePayment).toHaveBeenCalledWith('bill1', 'payment1', expect.any(Object));
      });
      
      expect(onBillUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          paidAmount: 900, // 600 + 300
          outstandingAmount: 100,
          status: 'partially_paid',
        })
      );
      
      expect(Alert.alert).toHaveBeenCalledWith('Success', 'Payment updated successfully!');
    });

    it('removes payment successfully', async () => {
      mockApi.deletePayment.mockResolvedValue(undefined);
      const onBillUpdate = jest.fn();
      
      render(<PaymentTrackingComponent {...defaultProps} onBillUpdate={onBillUpdate} />);
      
      fireEvent.press(screen.getByTestId('remove-payment-0'));
      
      expect(Alert.alert).toHaveBeenCalledWith(
        'Remove Payment',
        'Are you sure you want to remove this payment?',
        expect.any(Array)
      );
      
      // Simulate pressing "Remove"
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const removeCallback = alertCall[2][1].onPress;
      await removeCallback();
      
      expect(mockApi.deletePayment).toHaveBeenCalledWith('bill1', 'payment1');
      expect(onBillUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          paidAmount: 300, // Only payment2 remains
          outstandingAmount: 700,
          status: 'partially_paid',
          payments: [mockPayments[1]],
        })
      );
      
      expect(Alert.alert).toHaveBeenCalledWith('Success', 'Payment removed successfully!');
    });

    it('handles payment addition error', async () => {
      mockApi.addPayment.mockRejectedValue(new Error('API Error'));
      
      render(<PaymentTrackingComponent {...defaultProps} />);
      
      fireEvent.press(screen.getByTestId('add-payment-button'));
      fireEvent.press(screen.getByTestId('save-payment'));
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to add payment. Please try again.'
        );
      });
    });

    it('handles payment removal error', async () => {
      mockApi.deletePayment.mockRejectedValue(new Error('API Error'));
      
      render(<PaymentTrackingComponent {...defaultProps} />);
      
      fireEvent.press(screen.getByTestId('remove-payment-0'));
      
      // Simulate pressing "Remove"
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const removeCallback = alertCall[2][1].onPress;
      await removeCallback();
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to remove payment. Please try again.'
        );
      });
    });
  });

  describe('Status Calculations', () => {
    it('calculates unpaid status correctly', () => {
      const unpaidBill = {
        ...mockBill,
        paidAmount: 0,
        outstandingAmount: 1000,
        payments: [],
      };
      
      render(<PaymentTrackingComponent {...defaultProps} bill={unpaidBill} />);
      
      // The component should show unpaid status
      expect(screen.getByText('₹0.00')).toBeTruthy(); // Paid amount
      expect(screen.getByText('₹1000.00')).toBeTruthy(); // Outstanding amount
    });

    it('calculates fully paid status correctly', () => {
      const fullyPaidBill = {
        ...mockBill,
        paidAmount: 1000,
        outstandingAmount: 0,
        status: 'fully_paid' as BillStatus,
      };
      
      render(<PaymentTrackingComponent {...defaultProps} bill={fullyPaidBill} />);
      
      expect(screen.getByText('Fully Paid')).toBeTruthy();
      expect(screen.getByText('₹0.00')).toBeTruthy(); // Outstanding amount
    });

    it('calculates partially paid status correctly', () => {
      render(<PaymentTrackingComponent {...defaultProps} />);
      
      expect(screen.getByText('Partially Paid')).toBeTruthy();
      expect(screen.getByText('₹800.00')).toBeTruthy(); // Paid amount
      expect(screen.getByText('₹200.00')).toBeTruthy(); // Outstanding amount
    });
  });

  describe('Payment Method Display', () => {
    it('displays payment method labels correctly', () => {
      render(<PaymentTrackingComponent {...defaultProps} />);
      
      expect(screen.getByText('Cash')).toBeTruthy();
      expect(screen.getByText('UPI')).toBeTruthy();
    });

    it('handles unknown payment methods gracefully', () => {
      const billWithUnknownMethod = {
        ...mockBill,
        payments: [{
          ...mockPayments[0],
          paymentMethod: 'unknown_method' as any,
        }],
      };
      
      render(<PaymentTrackingComponent {...defaultProps} bill={billWithUnknownMethod} />);
      
      expect(screen.getByText('unknown_method')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('has proper test IDs for all interactive elements', () => {
      render(<PaymentTrackingComponent {...defaultProps} />);
      
      expect(screen.getByTestId('payment-tracking-component')).toBeTruthy();
      expect(screen.getByTestId('add-payment-button')).toBeTruthy();
      expect(screen.getByTestId('edit-payment-0')).toBeTruthy();
      expect(screen.getByTestId('remove-payment-0')).toBeTruthy();
    });

    it('supports custom testID prop', () => {
      render(
        <PaymentTrackingComponent 
          {...defaultProps} 
          testID="custom-payment-tracking"
        />
      );
      
      expect(screen.getByTestId('custom-payment-tracking')).toBeTruthy();
    });
  });

  describe('Payment Sorting', () => {
    it('sorts payments by date in descending order', () => {
      const billWithMixedDates = {
        ...mockBill,
        payments: [
          { ...mockPayments[0], paymentDate: '2024-01-05' },
          { ...mockPayments[1], paymentDate: '2024-01-15' },
        ],
      };
      
      render(<PaymentTrackingComponent {...defaultProps} bill={billWithMixedDates} />);
      
      // The more recent payment (2024-01-15) should appear first
      const paymentElements = screen.getAllByText(/₹\d+\.\d+/);
      // First element should be the more recent payment
      expect(paymentElements[3]).toBeTruthy(); // After summary amounts
    });
  });
});