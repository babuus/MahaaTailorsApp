import { BillPrintService, BillPrintData, PrintOptions, ShopInfo } from '../BillPrintService';
import { Bill, Customer, BillItem, ReceivedItem, Payment } from '../../types';

const mockCustomer: Customer = {
  id: 'customer1',
  personalDetails: {
    name: 'John Doe',
    phone: '+91 98765 43210',
    email: 'john@example.com',
    address: '123 Main Street, City - 123456',
  },
  measurements: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockBillItems: BillItem[] = [
  {
    id: 'item1',
    type: 'configured',
    name: 'Shirt Stitching',
    description: 'Cotton shirt with collar',
    quantity: 2,
    unitPrice: 500,
    totalPrice: 1000,
    configItemId: 'config1',
  },
  {
    id: 'item2',
    type: 'custom',
    name: 'Button Replacement',
    quantity: 5,
    unitPrice: 20,
    totalPrice: 100,
  },
];

const mockReceivedItems: ReceivedItem[] = [
  {
    id: 'received1',
    name: 'Sample Shirt',
    description: 'Blue cotton shirt for reference',
    quantity: 1,
    receivedDate: '2024-01-10',
    status: 'received',
  },
  {
    id: 'received2',
    name: 'Fabric Material',
    description: 'Cotton fabric',
    quantity: 2,
    receivedDate: '2024-01-10',
    returnedDate: '2024-01-15',
    status: 'returned',
  },
];

const mockPayments: Payment[] = [
  {
    id: 'payment1',
    amount: 600,
    paymentDate: '2024-01-12',
    paymentMethod: 'cash',
    notes: 'Advance payment',
    createdAt: '2024-01-12T00:00:00Z',
  },
  {
    id: 'payment2',
    amount: 300,
    paymentDate: '2024-01-15',
    paymentMethod: 'upi',
    createdAt: '2024-01-15T00:00:00Z',
  },
];

const mockBill: Bill = {
  id: 'bill1',
  customerId: 'customer1',
  customer: mockCustomer,
  billNumber: 'BILL-001',
  billingDate: '2024-01-10',
  deliveryDate: '2024-01-20',
  items: mockBillItems,
  receivedItems: mockReceivedItems,
  totalAmount: 1100,
  paidAmount: 900,
  outstandingAmount: 200,
  status: 'partially_paid',
  payments: mockPayments,
  createdAt: '2024-01-10T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
};

const mockShopInfo: ShopInfo = {
  name: 'Test Tailors',
  address: '456 Fashion Street, Textile City - 654321',
  phone: '+91 87654 32109',
  email: 'test@testtailors.com',
  gst: 'GST987654321',
};

const mockBillPrintData: BillPrintData = {
  bill: mockBill,
  shopInfo: mockShopInfo,
  printDate: '15/01/2024, 10:30:00 AM',
};

describe('BillPrintService', () => {
  beforeEach(() => {
    // Reset shop info to default before each test
    BillPrintService.updateShopInfo(BillPrintService.getDefaultShopInfo());
  });

  describe('generateBillHTML', () => {
    it('generates complete HTML bill with all sections', () => {
      const html = BillPrintService.generateBillHTML(mockBillPrintData);
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="en">');
      expect(html).toContain('Test Tailors');
      expect(html).toContain('BILL-001');
      expect(html).toContain('John Doe');
      expect(html).toContain('Shirt Stitching');
      expect(html).toContain('Button Replacement');
      expect(html).toContain('₹1100.00');
      expect(html).toContain('₹900.00');
      expect(html).toContain('₹200.00');
    });

    it('includes shop information in header', () => {
      const html = BillPrintService.generateBillHTML(mockBillPrintData);
      
      expect(html).toContain('Test Tailors');
      expect(html).toContain('456 Fashion Street, Textile City - 654321');
      expect(html).toContain('+91 87654 32109');
      expect(html).toContain('test@testtailors.com');
      expect(html).toContain('GST987654321');
    });

    it('includes bill information', () => {
      const html = BillPrintService.generateBillHTML(mockBillPrintData);
      
      expect(html).toContain('BILL-001');
      expect(html).toContain('Partially Paid');
      expect(html).toContain('10/01/2024'); // Billing date
      expect(html).toContain('20/01/2024'); // Delivery date
    });

    it('includes customer information', () => {
      const html = BillPrintService.generateBillHTML(mockBillPrintData);
      
      expect(html).toContain('John Doe');
      expect(html).toContain('+91 98765 43210');
      expect(html).toContain('john@example.com');
      expect(html).toContain('123 Main Street, City - 123456');
    });

    it('includes billing items table', () => {
      const html = BillPrintService.generateBillHTML(mockBillPrintData);
      
      expect(html).toContain('Billing Items');
      expect(html).toContain('Shirt Stitching');
      expect(html).toContain('Cotton shirt with collar');
      expect(html).toContain('Button Replacement');
      expect(html).toContain('₹500.00');
      expect(html).toContain('₹1000.00');
      expect(html).toContain('₹100.00');
    });

    it('includes received items table when option is enabled', () => {
      const html = BillPrintService.generateBillHTML(mockBillPrintData, {
        format: 'html',
        includeShopLogo: true,
        includePaymentHistory: true,
        includeReceivedItems: true,
        paperSize: 'A4',
      });
      
      expect(html).toContain('Items Received from Customer');
      expect(html).toContain('Sample Shirt');
      expect(html).toContain('Blue cotton shirt for reference');
      expect(html).toContain('Fabric Material');
      expect(html).toContain('With Us');
      expect(html).toContain('Returned');
    });

    it('excludes received items table when option is disabled', () => {
      const html = BillPrintService.generateBillHTML(mockBillPrintData, {
        format: 'html',
        includeShopLogo: true,
        includePaymentHistory: true,
        includeReceivedItems: false,
        paperSize: 'A4',
      });
      
      expect(html).not.toContain('Items Received from Customer');
      expect(html).not.toContain('Sample Shirt');
    });

    it('includes payment history when option is enabled', () => {
      const html = BillPrintService.generateBillHTML(mockBillPrintData, {
        format: 'html',
        includeShopLogo: true,
        includePaymentHistory: true,
        includeReceivedItems: true,
        paperSize: 'A4',
      });
      
      expect(html).toContain('Payment History');
      expect(html).toContain('₹600.00');
      expect(html).toContain('₹300.00');
      expect(html).toContain('Cash');
      expect(html).toContain('UPI');
      expect(html).toContain('Advance payment');
    });

    it('excludes payment history when option is disabled', () => {
      const html = BillPrintService.generateBillHTML(mockBillPrintData, {
        format: 'html',
        includeShopLogo: true,
        includePaymentHistory: false,
        includeReceivedItems: true,
        paperSize: 'A4',
      });
      
      expect(html).not.toContain('Payment History');
      expect(html).not.toContain('Advance payment');
    });

    it('includes amount summary', () => {
      const html = BillPrintService.generateBillHTML(mockBillPrintData);
      
      expect(html).toContain('Total Amount');
      expect(html).toContain('Paid Amount');
      expect(html).toContain('Outstanding Balance');
      expect(html).toContain('₹1100.00');
      expect(html).toContain('₹900.00');
      expect(html).toContain('₹200.00');
    });

    it('includes footer with print date', () => {
      const html = BillPrintService.generateBillHTML(mockBillPrintData);
      
      expect(html).toContain('Thank you for choosing Test Tailors!');
      expect(html).toContain('For any queries, please contact us at +91 87654 32109');
      expect(html).toContain('Printed on: 15/01/2024, 10:30:00 AM');
    });

    it('applies different CSS for different paper sizes', () => {
      const a4Html = BillPrintService.generateBillHTML(mockBillPrintData, {
        format: 'html',
        includeShopLogo: true,
        includePaymentHistory: true,
        includeReceivedItems: true,
        paperSize: 'A4',
      });
      
      const thermalHtml = BillPrintService.generateBillHTML(mockBillPrintData, {
        format: 'html',
        includeShopLogo: true,
        includePaymentHistory: true,
        includeReceivedItems: true,
        paperSize: 'thermal',
      });
      
      expect(a4Html).toContain('size: A4');
      expect(thermalHtml).toContain('size: 80mm auto');
      expect(thermalHtml).toContain('max-width: 76mm');
    });
  });

  describe('generatePDF', () => {
    it('returns HTML content for PDF generation', async () => {
      const result = await BillPrintService.generatePDF(mockBillPrintData);
      
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('Test Tailors');
      expect(result).toContain('BILL-001');
    });

    it('uses provided print options', async () => {
      const options: PrintOptions = {
        format: 'pdf',
        includeShopLogo: false,
        includePaymentHistory: false,
        includeReceivedItems: false,
        paperSize: 'A5',
      };
      
      const result = await BillPrintService.generatePDF(mockBillPrintData, options);
      
      expect(result).toContain('size: A5');
      expect(result).not.toContain('Payment History');
      expect(result).not.toContain('Items Received from Customer');
    });
  });

  describe('shop info management', () => {
    it('returns default shop info', () => {
      const shopInfo = BillPrintService.getDefaultShopInfo();
      
      expect(shopInfo.name).toBe('Mahaa Tailors');
      expect(shopInfo.phone).toBe('+91 98765 43210');
      expect(shopInfo.email).toBe('info@mahaatailors.com');
    });

    it('updates shop info', () => {
      const newInfo: Partial<ShopInfo> = {
        name: 'Updated Tailors',
        phone: '+91 11111 11111',
      };
      
      BillPrintService.updateShopInfo(newInfo);
      const updatedInfo = BillPrintService.getDefaultShopInfo();
      
      expect(updatedInfo.name).toBe('Updated Tailors');
      expect(updatedInfo.phone).toBe('+91 11111 11111');
      expect(updatedInfo.email).toBe('info@mahaatailors.com'); // Should remain unchanged
    });
  });

  describe('edge cases', () => {
    it('handles bill with no items', () => {
      const billWithNoItems = {
        ...mockBill,
        items: [],
        totalAmount: 0,
        paidAmount: 0,
        outstandingAmount: 0,
      };
      
      const printData = {
        ...mockBillPrintData,
        bill: billWithNoItems,
      };
      
      const html = BillPrintService.generateBillHTML(printData);
      
      expect(html).toContain('No billing items');
      expect(html).toContain('₹0.00');
    });

    it('handles bill with no payments', () => {
      const billWithNoPayments = {
        ...mockBill,
        payments: [],
        paidAmount: 0,
        outstandingAmount: 1100,
        status: 'unpaid' as const,
      };
      
      const printData = {
        ...mockBillPrintData,
        bill: billWithNoPayments,
      };
      
      const html = BillPrintService.generateBillHTML(printData);
      
      expect(html).toContain('No payments recorded yet');
      expect(html).toContain('Unpaid');
    });

    it('handles bill with no received items', () => {
      const billWithNoReceivedItems = {
        ...mockBill,
        receivedItems: [],
      };
      
      const printData = {
        ...mockBillPrintData,
        bill: billWithNoReceivedItems,
      };
      
      const html = BillPrintService.generateBillHTML(printData, {
        format: 'html',
        includeShopLogo: true,
        includePaymentHistory: true,
        includeReceivedItems: true,
        paperSize: 'A4',
      });
      
      expect(html).not.toContain('Items Received from Customer');
    });

    it('handles customer with minimal information', () => {
      const minimalCustomer: Customer = {
        id: 'customer2',
        personalDetails: {
          name: 'Jane Doe',
          phone: '+91 99999 99999',
        },
        measurements: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      
      const billWithMinimalCustomer = {
        ...mockBill,
        customer: minimalCustomer,
      };
      
      const printData = {
        ...mockBillPrintData,
        bill: billWithMinimalCustomer,
      };
      
      const html = BillPrintService.generateBillHTML(printData);
      
      expect(html).toContain('Jane Doe');
      expect(html).toContain('+91 99999 99999');
      expect(html).not.toContain('Email:');
      expect(html).not.toContain('Address:');
    });

    it('handles shop info without optional fields', () => {
      const minimalShopInfo: ShopInfo = {
        name: 'Simple Tailors',
        address: 'Simple Address',
        phone: '+91 12345 67890',
      };
      
      const printData = {
        ...mockBillPrintData,
        shopInfo: minimalShopInfo,
      };
      
      const html = BillPrintService.generateBillHTML(printData);
      
      expect(html).toContain('Simple Tailors');
      expect(html).toContain('Simple Address');
      expect(html).toContain('+91 12345 67890');
      expect(html).not.toContain('Email:');
      expect(html).not.toContain('GST:');
    });
  });

  describe('date formatting', () => {
    it('formats dates correctly', () => {
      const html = BillPrintService.generateBillHTML(mockBillPrintData);
      
      expect(html).toContain('10/01/2024'); // Billing date
      expect(html).toContain('20/01/2024'); // Delivery date
      expect(html).toContain('12/01/2024'); // Payment date
      expect(html).toContain('15/01/2024'); // Payment date
    });
  });

  describe('status and method labels', () => {
    it('displays correct status labels', () => {
      const statuses = ['unpaid', 'partially_paid', 'fully_paid', 'draft', 'cancelled'];
      
      statuses.forEach(status => {
        const billWithStatus = {
          ...mockBill,
          status: status as any,
        };
        
        const printData = {
          ...mockBillPrintData,
          bill: billWithStatus,
        };
        
        const html = BillPrintService.generateBillHTML(printData);
        
        switch (status) {
          case 'unpaid':
            expect(html).toContain('Unpaid');
            break;
          case 'partially_paid':
            expect(html).toContain('Partially Paid');
            break;
          case 'fully_paid':
            expect(html).toContain('Fully Paid');
            break;
          case 'draft':
            expect(html).toContain('Draft');
            break;
          case 'cancelled':
            expect(html).toContain('Cancelled');
            break;
        }
      });
    });

    it('displays correct payment method labels', () => {
      const methods = ['cash', 'card', 'upi', 'bank_transfer', 'other'];
      
      methods.forEach(method => {
        const paymentWithMethod = {
          ...mockPayments[0],
          paymentMethod: method as any,
        };
        
        const billWithMethod = {
          ...mockBill,
          payments: [paymentWithMethod],
        };
        
        const printData = {
          ...mockBillPrintData,
          bill: billWithMethod,
        };
        
        const html = BillPrintService.generateBillHTML(printData);
        
        switch (method) {
          case 'cash':
            expect(html).toContain('Cash');
            break;
          case 'card':
            expect(html).toContain('Card');
            break;
          case 'upi':
            expect(html).toContain('UPI');
            break;
          case 'bank_transfer':
            expect(html).toContain('Bank Transfer');
            break;
          case 'other':
            expect(html).toContain('Other');
            break;
        }
      });
    });
  });
});