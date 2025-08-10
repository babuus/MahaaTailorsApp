import OfflineApiService from '../offlineApiService';
import OfflineManager from '../offlineManager';
import * as api from '../api';
import { createMockBill, createMockBillItem, createMockPayment } from '../../test-utils/mockData';

// Mock dependencies
jest.mock('../offlineManager');
jest.mock('../api');

const mockOfflineManager = OfflineManager as jest.Mocked<typeof OfflineManager>;
const mockApi = api as jest.Mocked<typeof api>;

describe('OfflineApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockOfflineManager.isOnline.mockReturnValue(true);
    mockOfflineManager.getOfflineData.mockResolvedValue({
      bills: [],
      billingConfigItems: [],
      receivedItemTemplates: [],
      customers: [],
      lastSyncTimestamp: 0,
    });
    mockOfflineManager.saveOfflineData.mockResolvedValue();
    mockOfflineManager.addPendingAction.mockResolvedValue();
  });

  describe('getBills', () => {
    it('should fetch bills from API when online', async () => {
      const mockBills = [createMockBill()];
      const mockResponse = {
        items: mockBills,
        hasMore: false,
        nextPageCursor: undefined,
        total: 1,
      };

      mockApi.getBills.mockResolvedValue(mockResponse);

      const result = await OfflineApiService.getBills();

      expect(mockApi.getBills).toHaveBeenCalled();
      expect(mockOfflineManager.saveOfflineData).toHaveBeenCalledWith({
        bills: mockBills,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should fall back to offline data when API fails', async () => {
      const mockBills = [createMockBill()];
      mockApi.getBills.mockRejectedValue(new Error('Network error'));
      mockOfflineManager.getOfflineData.mockResolvedValue({
        bills: mockBills,
        billingConfigItems: [],
        receivedItemTemplates: [],
        customers: [],
        lastSyncTimestamp: 0,
      });

      const result = await OfflineApiService.getBills();

      expect(mockApi.getBills).toHaveBeenCalled();
      expect(result.items).toEqual(mockBills);
    });

    it('should use offline data when offline', async () => {
      const mockBills = [createMockBill()];
      mockOfflineManager.isOnline.mockReturnValue(false);
      mockOfflineManager.getOfflineData.mockResolvedValue({
        bills: mockBills,
        billingConfigItems: [],
        receivedItemTemplates: [],
        customers: [],
        lastSyncTimestamp: 0,
      });

      const result = await OfflineApiService.getBills();

      expect(mockApi.getBills).not.toHaveBeenCalled();
      expect(result.items).toEqual(mockBills);
    });

    it('should apply filters to offline data', async () => {
      const mockBills = [
        createMockBill({ id: '1', status: 'unpaid', customerId: 'customer1' }),
        createMockBill({ id: '2', status: 'paid', customerId: 'customer2' }),
      ];
      
      mockOfflineManager.isOnline.mockReturnValue(false);
      mockOfflineManager.getOfflineData.mockResolvedValue({
        bills: mockBills,
        billingConfigItems: [],
        receivedItemTemplates: [],
        customers: [],
        lastSyncTimestamp: 0,
      });

      const result = await OfflineApiService.getBills({
        status: 'unpaid',
        customerId: 'customer1',
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('1');
    });

    it('should apply pagination to offline data', async () => {
      const mockBills = Array.from({ length: 10 }, (_, i) => 
        createMockBill({ id: `bill${i}` })
      );
      
      mockOfflineManager.isOnline.mockReturnValue(false);
      mockOfflineManager.getOfflineData.mockResolvedValue({
        bills: mockBills,
        billingConfigItems: [],
        receivedItemTemplates: [],
        customers: [],
        lastSyncTimestamp: 0,
      });

      const result = await OfflineApiService.getBills({ limit: 5 });

      expect(result.items).toHaveLength(5);
      expect(result.hasMore).toBe(true);
      expect(result.nextPageCursor).toBeDefined();
    });
  });

  describe('createBill', () => {
    const mockBillData = {
      customerId: 'customer1',
      billingDate: '2024-01-15',
      deliveryDate: '2024-01-25',
      items: [createMockBillItem()],
      receivedItems: [],
      notes: 'Test bill',
    };

    it('should create bill via API when online', async () => {
      const mockCreatedBill = createMockBill();
      mockApi.createBill.mockResolvedValue(mockCreatedBill);

      const result = await OfflineApiService.createBill(mockBillData);

      expect(mockApi.createBill).toHaveBeenCalledWith(mockBillData);
      expect(result).toEqual(mockCreatedBill);
    });

    it('should store bill offline when API fails', async () => {
      mockApi.createBill.mockRejectedValue(new Error('Network error'));

      const result = await OfflineApiService.createBill(mockBillData);

      expect(mockApi.createBill).toHaveBeenCalledWith(mockBillData);
      expect(mockOfflineManager.addPendingAction).toHaveBeenCalledWith({
        type: 'CREATE',
        entity: 'bill',
        data: mockBillData,
      });
      expect(result.status).toBe('draft');
      expect(result.id).toMatch(/^temp_bill_/);
    });

    it('should store bill offline when offline', async () => {
      mockOfflineManager.isOnline.mockReturnValue(false);

      const result = await OfflineApiService.createBill(mockBillData);

      expect(mockApi.createBill).not.toHaveBeenCalled();
      expect(mockOfflineManager.addPendingAction).toHaveBeenCalledWith({
        type: 'CREATE',
        entity: 'bill',
        data: mockBillData,
      });
      expect(result.status).toBe('draft');
    });

    it('should calculate totals correctly for offline bill', async () => {
      mockOfflineManager.isOnline.mockReturnValue(false);
      const billDataWithMultipleItems = {
        ...mockBillData,
        items: [
          createMockBillItem({ quantity: 2, unitPrice: 100 }),
          createMockBillItem({ quantity: 1, unitPrice: 50 }),
        ],
      };

      const result = await OfflineApiService.createBill(billDataWithMultipleItems);

      expect(result.totalAmount).toBe(250);
      expect(result.outstandingAmount).toBe(250);
      expect(result.paidAmount).toBe(0);
    });
  });

  describe('addPayment', () => {
    const mockPaymentData = {
      amount: 100,
      paymentDate: '2024-01-16',
      paymentMethod: 'cash' as const,
      notes: 'Test payment',
    };

    it('should add payment via API when online', async () => {
      const mockPayment = createMockPayment();
      mockApi.addPayment.mockResolvedValue(mockPayment);

      const result = await OfflineApiService.addPayment('bill1', mockPaymentData);

      expect(mockApi.addPayment).toHaveBeenCalledWith('bill1', mockPaymentData);
      expect(result).toEqual(mockPayment);
    });

    it('should store payment offline when API fails', async () => {
      mockApi.addPayment.mockRejectedValue(new Error('Network error'));

      const result = await OfflineApiService.addPayment('bill1', mockPaymentData);

      expect(mockOfflineManager.addPendingAction).toHaveBeenCalledWith({
        type: 'CREATE',
        entity: 'payment',
        data: { billId: 'bill1', ...mockPaymentData },
      });
      expect(result.id).toMatch(/^temp_payment_/);
      expect(result.amount).toBe(mockPaymentData.amount);
    });

    it('should update bill payment status offline', async () => {
      const mockBill = createMockBill({
        id: 'bill1',
        totalAmount: 500,
        paidAmount: 0,
        outstandingAmount: 500,
        status: 'unpaid',
        payments: [],
      });

      mockOfflineManager.isOnline.mockReturnValue(false);
      mockOfflineManager.getOfflineData.mockResolvedValue({
        bills: [mockBill],
        billingConfigItems: [],
        receivedItemTemplates: [],
        customers: [],
        lastSyncTimestamp: 0,
      });

      await OfflineApiService.addPayment('bill1', mockPaymentData);

      expect(mockOfflineManager.saveOfflineData).toHaveBeenCalledWith({
        bills: expect.arrayContaining([
          expect.objectContaining({
            id: 'bill1',
            paidAmount: 100,
            outstandingAmount: 400,
            status: 'partially_paid',
            payments: expect.arrayContaining([
              expect.objectContaining({
                amount: 100,
                paymentMethod: 'cash',
              }),
            ]),
          }),
        ]),
      });
    });
  });

  describe('getBillingConfigItems', () => {
    it('should fetch config items from API when online', async () => {
      const mockItems = [
        {
          id: '1',
          name: 'Shirt Stitching',
          price: 500,
          category: 'service' as const,
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      mockApi.getBillingConfigItems.mockResolvedValue(mockItems);

      const result = await OfflineApiService.getBillingConfigItems();

      expect(mockApi.getBillingConfigItems).toHaveBeenCalled();
      expect(mockOfflineManager.saveOfflineData).toHaveBeenCalledWith({
        billingConfigItems: mockItems,
      });
      expect(result).toEqual(mockItems);
    });

    it('should fall back to offline data when API fails', async () => {
      const mockItems = [
        {
          id: '1',
          name: 'Shirt Stitching',
          price: 500,
          category: 'service' as const,
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      mockApi.getBillingConfigItems.mockRejectedValue(new Error('Network error'));
      mockOfflineManager.getOfflineData.mockResolvedValue({
        bills: [],
        billingConfigItems: mockItems,
        receivedItemTemplates: [],
        customers: [],
        lastSyncTimestamp: 0,
      });

      const result = await OfflineApiService.getBillingConfigItems();

      expect(result).toEqual(mockItems);
    });
  });

  describe('error handling', () => {
    it('should handle offline manager errors gracefully', async () => {
      mockOfflineManager.getOfflineData.mockRejectedValue(new Error('Storage error'));
      mockOfflineManager.isOnline.mockReturnValue(false);

      await expect(OfflineApiService.getBills()).rejects.toThrow('Storage error');
    });

    it('should handle API errors gracefully', async () => {
      mockApi.getBills.mockRejectedValue(new Error('API error'));
      mockOfflineManager.getOfflineData.mockResolvedValue({
        bills: [],
        billingConfigItems: [],
        receivedItemTemplates: [],
        customers: [],
        lastSyncTimestamp: 0,
      });

      const result = await OfflineApiService.getBills();

      expect(result.items).toEqual([]);
    });
  });

  describe('data consistency', () => {
    it('should maintain data consistency when switching between online and offline', async () => {
      const mockBill = createMockBill();
      
      // First call online
      mockApi.getBills.mockResolvedValue({
        items: [mockBill],
        hasMore: false,
        nextPageCursor: undefined,
        total: 1,
      });

      await OfflineApiService.getBills();

      // Verify data was cached
      expect(mockOfflineManager.saveOfflineData).toHaveBeenCalledWith({
        bills: [mockBill],
      });

      // Second call offline
      mockOfflineManager.isOnline.mockReturnValue(false);
      mockOfflineManager.getOfflineData.mockResolvedValue({
        bills: [mockBill],
        billingConfigItems: [],
        receivedItemTemplates: [],
        customers: [],
        lastSyncTimestamp: 0,
      });

      const offlineResult = await OfflineApiService.getBills();

      expect(offlineResult.items).toEqual([mockBill]);
    });

    it('should handle concurrent operations correctly', async () => {
      const mockBillData = {
        customerId: 'customer1',
        billingDate: '2024-01-15',
        deliveryDate: '2024-01-25',
        items: [createMockBillItem()],
        receivedItems: [],
      };

      mockOfflineManager.isOnline.mockReturnValue(false);

      // Create multiple bills concurrently
      const promises = Array.from({ length: 3 }, (_, i) => 
        OfflineApiService.createBill({
          ...mockBillData,
          customerId: `customer${i}`,
        })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(mockOfflineManager.addPendingAction).toHaveBeenCalledTimes(3);
      
      // Each bill should have unique ID
      const ids = results.map(bill => bill.id);
      expect(new Set(ids).size).toBe(3);
    });
  });
});