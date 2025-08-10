import OfflineManager from './offlineManager';
import * as api from './api';
import {
  Bill,
  BillingConfigItem,
  ReceivedItemTemplate,
  Customer,
  Payment,
  CreateBillRequest,
  UpdateBillRequest,
  CreatePaymentRequest,
  UpdatePaymentRequest,
  CreateBillingConfigItemRequest,
  UpdateBillingConfigItemRequest,
  CreateReceivedItemTemplateRequest,
  UpdateReceivedItemTemplateRequest,
  PaginatedResponse,
  BillQueryParams,
} from '../types';

class OfflineApiService {
  private static instance: OfflineApiService;

  private constructor() {}

  static getInstance(): OfflineApiService {
    if (!OfflineApiService.instance) {
      OfflineApiService.instance = new OfflineApiService();
    }
    return OfflineApiService.instance;
  }

  // Bills API with offline support
  async getBills(params?: BillQueryParams): Promise<PaginatedResponse<Bill>> {
    if (OfflineManager.isOnline()) {
      try {
        const result = await api.getBills(params);
        // Cache the results for offline use
        await OfflineManager.saveOfflineData({ bills: result.items });
        return result;
      } catch (error) {
        console.warn('Online getBills failed, falling back to offline data:', error);
        return this.getOfflineBills(params);
      }
    } else {
      return this.getOfflineBills(params);
    }
  }

  private async getOfflineBills(params?: BillQueryParams): Promise<PaginatedResponse<Bill>> {
    const offlineData = await OfflineManager.getOfflineData();
    let bills = offlineData?.bills || [];

    // Apply filters if provided
    if (params) {
      if (params.customerId) {
        bills = bills.filter(bill => bill.customerId === params.customerId);
      }
      
      if (params.status) {
        bills = bills.filter(bill => bill.status === params.status);
      }
      
      if (params.startDate) {
        bills = bills.filter(bill => bill.billingDate >= params.startDate!);
      }
      
      if (params.endDate) {
        bills = bills.filter(bill => bill.billingDate <= params.endDate!);
      }
      
      if (params.searchText) {
        const searchLower = params.searchText.toLowerCase();
        bills = bills.filter(bill => 
          bill.billNumber.toLowerCase().includes(searchLower) ||
          bill.customer.personalDetails.name.toLowerCase().includes(searchLower) ||
          bill.customer.personalDetails.phone.includes(searchLower)
        );
      }
    }

    // Apply pagination
    const limit = params?.limit || 50;
    const startIndex = params?.startAfter ? 
      bills.findIndex(bill => bill.id === params.startAfter) + 1 : 0;
    
    const paginatedBills = bills.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < bills.length;
    const nextPageCursor = hasMore ? paginatedBills[paginatedBills.length - 1]?.id : undefined;

    return {
      items: paginatedBills,
      hasMore,
      nextPageCursor,
      total: bills.length,
    };
  }

  async getBillById(id: string): Promise<Bill> {
    if (OfflineManager.isOnline()) {
      try {
        return await api.getBillById(id);
      } catch (error) {
        console.warn('Online getBillById failed, falling back to offline data:', error);
        return this.getOfflineBillById(id);
      }
    } else {
      return this.getOfflineBillById(id);
    }
  }

  private async getOfflineBillById(id: string): Promise<Bill> {
    const offlineData = await OfflineManager.getOfflineData();
    const bill = offlineData?.bills.find(b => b.id === id);
    
    if (!bill) {
      throw new Error(`Bill with id ${id} not found in offline storage`);
    }
    
    return bill;
  }

  async createBill(data: CreateBillRequest): Promise<Bill> {
    const tempId = `temp_bill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const tempBill: Bill = {
      id: tempId,
      customerId: data.customerId,
      customer: {} as any, // Will be populated from offline customer data
      billNumber: `TEMP-${Date.now()}`,
      billingDate: data.billingDate,
      deliveryDate: data.deliveryDate,
      items: data.items.map((item, index) => ({
        ...item,
        id: `temp_item_${index}`,
        totalPrice: item.quantity * item.unitPrice,
      })),
      receivedItems: data.receivedItems.map((item, index) => ({
        ...item,
        id: `temp_received_${index}`,
        status: 'received' as const,
      })),
      totalAmount: data.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0),
      paidAmount: 0,
      outstandingAmount: data.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0),
      status: 'draft',
      payments: [],
      notes: data.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (OfflineManager.isOnline()) {
      try {
        const result = await api.createBill(data);
        // Update offline cache with the real bill
        await this.updateOfflineBill(result);
        return result;
      } catch (error) {
        console.warn('Online createBill failed, storing offline:', error);
        await this.storeOfflineBill(tempBill);
        await OfflineManager.addPendingAction({
          type: 'CREATE',
          entity: 'bill',
          data: data,
        });
        return tempBill;
      }
    } else {
      await this.storeOfflineBill(tempBill);
      await OfflineManager.addPendingAction({
        type: 'CREATE',
        entity: 'bill',
        data: data,
      });
      return tempBill;
    }
  }

  async updateBill(id: string, data: UpdateBillRequest): Promise<Bill> {
    if (OfflineManager.isOnline()) {
      try {
        const result = await api.updateBill(id, data);
        await this.updateOfflineBill(result);
        return result;
      } catch (error) {
        console.warn('Online updateBill failed, storing offline:', error);
        await this.updateOfflineBillData(id, data);
        await OfflineManager.addPendingAction({
          type: 'UPDATE',
          entity: 'bill',
          data: { id, ...data },
        });
        return await this.getOfflineBillById(id);
      }
    } else {
      await this.updateOfflineBillData(id, data);
      await OfflineManager.addPendingAction({
        type: 'UPDATE',
        entity: 'bill',
        data: { id, ...data },
      });
      return await this.getOfflineBillById(id);
    }
  }

  async deleteBill(id: string): Promise<void> {
    if (OfflineManager.isOnline()) {
      try {
        await api.deleteBill(id);
        await this.removeOfflineBill(id);
      } catch (error) {
        console.warn('Online deleteBill failed, storing offline:', error);
        await this.markBillAsDeleted(id);
        await OfflineManager.addPendingAction({
          type: 'DELETE',
          entity: 'bill',
          data: { id },
        });
      }
    } else {
      await this.markBillAsDeleted(id);
      await OfflineManager.addPendingAction({
        type: 'DELETE',
        entity: 'bill',
        data: { id },
      });
    }
  }

  // Payment API with offline support
  async addPayment(billId: string, payment: CreatePaymentRequest): Promise<{ payment: Payment; bill: Bill }> {
    const tempPayment: Payment = {
      id: `temp_payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: payment.amount,
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      notes: payment.notes,
      createdAt: new Date().toISOString(),
    };

    if (OfflineManager.isOnline()) {
      try {
        const result = await api.addPayment(billId, payment);
        await this.updateBillPayments(billId, result.payment, 'add');
        return result;
      } catch (error) {
        console.warn('Online addPayment failed, storing offline:', error);
        const updatedBill = await this.updateBillPayments(billId, tempPayment, 'add');
        await OfflineManager.addPendingAction({
          type: 'CREATE',
          entity: 'payment',
          data: { billId, ...payment },
        });
        return { payment: tempPayment, bill: updatedBill };
      }
    } else {
      const updatedBill = await this.updateBillPayments(billId, tempPayment, 'add');
      await OfflineManager.addPendingAction({
        type: 'CREATE',
        entity: 'payment',
        data: { billId, ...payment },
      });
      return { payment: tempPayment, bill: updatedBill };
    }
  }

  async updatePayment(billId: string, paymentId: string, payment: UpdatePaymentRequest): Promise<Payment> {
    // TODO: Implement update payment functionality
    throw new Error('Update payment functionality is not yet implemented in the backend. Please delete and re-add the payment instead.');
  }

  async deletePayment(billId: string, paymentId: string): Promise<void> {
    // TODO: Implement delete payment functionality
    throw new Error('Delete payment functionality is not yet implemented in the backend. Please contact support for assistance.');
  }

  // Customer API with offline support
  async getCustomerById(id: string): Promise<Customer> {
    if (OfflineManager.isOnline()) {
      try {
        const result = await api.getCustomerById(id);
        // Cache the customer for offline use
        await this.updateOfflineCustomer(result);
        return result;
      } catch (error) {
        console.warn('Online getCustomerById failed, falling back to offline data:', error);
        return this.getOfflineCustomerById(id);
      }
    } else {
      return this.getOfflineCustomerById(id);
    }
  }

  private async getOfflineCustomerById(id: string): Promise<Customer> {
    const offlineData = await OfflineManager.getOfflineData();
    const customer = offlineData?.customers?.find(c => c.id === id);
    
    if (!customer) {
      throw new Error(`Customer with ID ${id} not found in offline data`);
    }
    
    return customer;
  }

  private async updateOfflineCustomer(customer: Customer): Promise<void> {
    const offlineData = await OfflineManager.getOfflineData();
    const customers = offlineData?.customers || [];
    
    const existingIndex = customers.findIndex(c => c.id === customer.id);
    if (existingIndex >= 0) {
      customers[existingIndex] = customer;
    } else {
      customers.push(customer);
    }
    
    await OfflineManager.saveOfflineData({ 
      ...offlineData, 
      customers 
    });
  }

  // Billing Config API with offline support
  async getBillingConfigItems(): Promise<BillingConfigItem[]> {
    if (OfflineManager.isOnline()) {
      try {
        const result = await api.getBillingConfigItems();
        await OfflineManager.saveOfflineData({ billingConfigItems: result });
        return result;
      } catch (error) {
        console.warn('Online getBillingConfigItems failed, falling back to offline data:', error);
        return this.getOfflineBillingConfigItems();
      }
    } else {
      return this.getOfflineBillingConfigItems();
    }
  }

  private async getOfflineBillingConfigItems(): Promise<BillingConfigItem[]> {
    const offlineData = await OfflineManager.getOfflineData();
    return offlineData?.billingConfigItems || [];
  }

  async createBillingConfigItem(data: CreateBillingConfigItemRequest): Promise<BillingConfigItem> {
    const tempItem: BillingConfigItem = {
      id: `temp_config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: data.name,
      description: data.description,
      price: data.price,
      category: data.category,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (OfflineManager.isOnline()) {
      try {
        const result = await api.createBillingConfigItem(data);
        await this.updateOfflineBillingConfigItem(result);
        return result;
      } catch (error) {
        console.warn('Online createBillingConfigItem failed, storing offline:', error);
        await this.storeOfflineBillingConfigItem(tempItem);
        await OfflineManager.addPendingAction({
          type: 'CREATE',
          entity: 'billingConfigItem',
          data: data,
        });
        return tempItem;
      }
    } else {
      await this.storeOfflineBillingConfigItem(tempItem);
      await OfflineManager.addPendingAction({
        type: 'CREATE',
        entity: 'billingConfigItem',
        data: data,
      });
      return tempItem;
    }
  }

  // Received Item Templates API with offline support
  async getReceivedItemTemplates(): Promise<ReceivedItemTemplate[]> {
    if (OfflineManager.isOnline()) {
      try {
        const result = await api.getReceivedItemTemplates();
        await OfflineManager.saveOfflineData({ receivedItemTemplates: result });
        return result;
      } catch (error) {
        console.warn('Online getReceivedItemTemplates failed, falling back to offline data:', error);
        return this.getOfflineReceivedItemTemplates();
      }
    } else {
      return this.getOfflineReceivedItemTemplates();
    }
  }

  private async getOfflineReceivedItemTemplates(): Promise<ReceivedItemTemplate[]> {
    const offlineData = await OfflineManager.getOfflineData();
    return offlineData?.receivedItemTemplates || [];
  }

  // Helper methods for offline data management
  private async storeOfflineBill(bill: Bill): Promise<void> {
    const offlineData = await OfflineManager.getOfflineData();
    const bills = offlineData?.bills || [];
    bills.push(bill);
    await OfflineManager.saveOfflineData({ bills });
  }

  private async updateOfflineBill(bill: Bill): Promise<void> {
    const offlineData = await OfflineManager.getOfflineData();
    const bills = offlineData?.bills || [];
    const index = bills.findIndex(b => b.id === bill.id);
    
    if (index > -1) {
      bills[index] = bill;
    } else {
      bills.push(bill);
    }
    
    await OfflineManager.saveOfflineData({ bills });
  }

  private async updateOfflineBillData(id: string, data: Partial<Bill>): Promise<void> {
    const offlineData = await OfflineManager.getOfflineData();
    const bills = offlineData?.bills || [];
    const index = bills.findIndex(b => b.id === id);
    
    if (index > -1) {
      bills[index] = { ...bills[index], ...data, updatedAt: new Date().toISOString() };
      await OfflineManager.saveOfflineData({ bills });
    }
  }

  private async removeOfflineBill(id: string): Promise<void> {
    const offlineData = await OfflineManager.getOfflineData();
    const bills = offlineData?.bills || [];
    const filteredBills = bills.filter(b => b.id !== id);
    await OfflineManager.saveOfflineData({ bills: filteredBills });
  }

  private async markBillAsDeleted(id: string): Promise<void> {
    const offlineData = await OfflineManager.getOfflineData();
    const bills = offlineData?.bills || [];
    const index = bills.findIndex(b => b.id === id);
    
    if (index > -1) {
      bills[index] = { 
        ...bills[index], 
        status: 'cancelled',
        updatedAt: new Date().toISOString() 
      };
      await OfflineManager.saveOfflineData({ bills });
    }
  }

  private async updateBillPayments(billId: string, payment: Payment, action: 'add' | 'remove'): Promise<Bill> {
    const offlineData = await OfflineManager.getOfflineData();
    const bills = offlineData?.bills || [];
    const billIndex = bills.findIndex(b => b.id === billId);
    
    if (billIndex > -1) {
      const bill = bills[billIndex];
      
      if (action === 'add') {
        bill.payments.push(payment);
      } else {
        bill.payments = bill.payments.filter(p => p.id !== payment.id);
      }
      
      // Recalculate amounts
      bill.paidAmount = bill.payments.reduce((sum, p) => sum + p.amount, 0);
      bill.outstandingAmount = bill.totalAmount - bill.paidAmount;
      
      // Update status
      if (bill.paidAmount === 0) {
        bill.status = 'unpaid';
      } else if (bill.paidAmount >= bill.totalAmount) {
        bill.status = 'fully_paid';
      } else {
        bill.status = 'partially_paid';
      }
      
      bill.updatedAt = new Date().toISOString();
      await OfflineManager.saveOfflineData({ bills });
      return bill;
    }
    
    throw new Error(`Bill with ID ${billId} not found`);
  }

  private async storeOfflineBillingConfigItem(item: BillingConfigItem): Promise<void> {
    const offlineData = await OfflineManager.getOfflineData();
    const items = offlineData?.billingConfigItems || [];
    items.push(item);
    await OfflineManager.saveOfflineData({ billingConfigItems: items });
  }

  private async updateOfflineBillingConfigItem(item: BillingConfigItem): Promise<void> {
    const offlineData = await OfflineManager.getOfflineData();
    const items = offlineData?.billingConfigItems || [];
    const index = items.findIndex(i => i.id === item.id);
    
    if (index > -1) {
      items[index] = item;
    } else {
      items.push(item);
    }
    
    await OfflineManager.saveOfflineData({ billingConfigItems: items });
  }
}

export default OfflineApiService.getInstance();