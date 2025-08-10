import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { 
  Bill, 
  BillingConfigItem, 
  ReceivedItemTemplate, 
  Payment,
  Customer,
  OfflineAction,
  NetworkState 
} from '../types';

export interface OfflineData {
  bills: Bill[];
  billingConfigItems: BillingConfigItem[];
  receivedItemTemplates: ReceivedItemTemplate[];
  customers: Customer[];
  lastSyncTimestamp: number;
}

export interface SyncResult {
  success: boolean;
  syncedActions: number;
  failedActions: OfflineAction[];
  conflicts: ConflictResolution[];
}

export interface ConflictResolution {
  actionId: string;
  entityType: string;
  entityId: string;
  localData: any;
  serverData: any;
  resolution: 'local' | 'server' | 'merge' | 'manual';
  resolvedData?: any;
}

class OfflineManager {
  private static instance: OfflineManager;
  private networkState: NetworkState = {
    isConnected: false,
    isInternetReachable: false,
    type: 'unknown',
  };
  private syncInProgress = false;
  private syncListeners: Array<(result: SyncResult) => void> = [];
  private networkListeners: Array<(state: NetworkState) => void> = [];

  // Storage keys
  private readonly OFFLINE_DATA_KEY = '@billing_offline_data';
  private readonly PENDING_ACTIONS_KEY = '@billing_pending_actions';
  private readonly SYNC_TIMESTAMP_KEY = '@billing_last_sync';

  private constructor() {
    this.initializeNetworkListener();
  }

  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }

  private initializeNetworkListener() {
    NetInfo.addEventListener(state => {
      const newNetworkState: NetworkState = {
        isConnected: state.isConnected || false,
        isInternetReachable: state.isInternetReachable || false,
        type: state.type || 'unknown',
      };

      const wasOffline = !this.networkState.isConnected;
      const isNowOnline = newNetworkState.isConnected;

      this.networkState = newNetworkState;
      this.notifyNetworkListeners(newNetworkState);

      // Auto-sync when coming back online
      if (wasOffline && isNowOnline) {
        this.syncPendingActions();
      }
    });
  }

  // Network state management
  getNetworkState(): NetworkState {
    return this.networkState;
  }

  isOnline(): boolean {
    return this.networkState.isConnected && this.networkState.isInternetReachable;
  }

  addNetworkListener(listener: (state: NetworkState) => void): () => void {
    this.networkListeners.push(listener);
    return () => {
      const index = this.networkListeners.indexOf(listener);
      if (index > -1) {
        this.networkListeners.splice(index, 1);
      }
    };
  }

  private notifyNetworkListeners(state: NetworkState) {
    this.networkListeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('Error in network listener:', error);
      }
    });
  }

  // Offline data management
  async getOfflineData(): Promise<OfflineData | null> {
    try {
      const data = await AsyncStorage.getItem(this.OFFLINE_DATA_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting offline data:', error);
      return null;
    }
  }

  async saveOfflineData(data: Partial<OfflineData>): Promise<void> {
    try {
      const existingData = await this.getOfflineData() || {
        bills: [],
        billingConfigItems: [],
        receivedItemTemplates: [],
        customers: [],
        lastSyncTimestamp: 0,
      };

      const updatedData: OfflineData = {
        ...existingData,
        ...data,
        lastSyncTimestamp: Date.now(),
      };

      await AsyncStorage.setItem(this.OFFLINE_DATA_KEY, JSON.stringify(updatedData));
    } catch (error) {
      console.error('Error saving offline data:', error);
      throw error;
    }
  }

  async clearOfflineData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        this.OFFLINE_DATA_KEY,
        this.PENDING_ACTIONS_KEY,
        this.SYNC_TIMESTAMP_KEY,
      ]);
    } catch (error) {
      console.error('Error clearing offline data:', error);
    }
  }

  // Pending actions management
  async getPendingActions(): Promise<OfflineAction[]> {
    try {
      const data = await AsyncStorage.getItem(this.PENDING_ACTIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting pending actions:', error);
      return [];
    }
  }

  async addPendingAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    try {
      const pendingActions = await this.getPendingActions();
      const newAction: OfflineAction = {
        ...action,
        id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        retryCount: 0,
      };

      pendingActions.push(newAction);
      await AsyncStorage.setItem(this.PENDING_ACTIONS_KEY, JSON.stringify(pendingActions));
    } catch (error) {
      console.error('Error adding pending action:', error);
      throw error;
    }
  }

  async removePendingAction(actionId: string): Promise<void> {
    try {
      const pendingActions = await this.getPendingActions();
      const filteredActions = pendingActions.filter(action => action.id !== actionId);
      await AsyncStorage.setItem(this.PENDING_ACTIONS_KEY, JSON.stringify(filteredActions));
    } catch (error) {
      console.error('Error removing pending action:', error);
    }
  }

  async updatePendingAction(actionId: string, updates: Partial<OfflineAction>): Promise<void> {
    try {
      const pendingActions = await this.getPendingActions();
      const actionIndex = pendingActions.findIndex(action => action.id === actionId);
      
      if (actionIndex > -1) {
        pendingActions[actionIndex] = { ...pendingActions[actionIndex], ...updates };
        await AsyncStorage.setItem(this.PENDING_ACTIONS_KEY, JSON.stringify(pendingActions));
      }
    } catch (error) {
      console.error('Error updating pending action:', error);
    }
  }

  // Sync management
  addSyncListener(listener: (result: SyncResult) => void): () => void {
    this.syncListeners.push(listener);
    return () => {
      const index = this.syncListeners.indexOf(listener);
      if (index > -1) {
        this.syncListeners.splice(index, 1);
      }
    };
  }

  private notifySyncListeners(result: SyncResult) {
    this.syncListeners.forEach(listener => {
      try {
        listener(result);
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }

  isSyncInProgress(): boolean {
    return this.syncInProgress;
  }

  async syncPendingActions(): Promise<SyncResult> {
    if (this.syncInProgress) {
      return {
        success: false,
        syncedActions: 0,
        failedActions: [],
        conflicts: [],
      };
    }

    if (!this.isOnline()) {
      return {
        success: false,
        syncedActions: 0,
        failedActions: [],
        conflicts: [],
      };
    }

    this.syncInProgress = true;
    const result: SyncResult = {
      success: true,
      syncedActions: 0,
      failedActions: [],
      conflicts: [],
    };

    try {
      const pendingActions = await this.getPendingActions();
      
      for (const action of pendingActions) {
        try {
          const syncResult = await this.syncSingleAction(action);
          
          if (syncResult.success) {
            await this.removePendingAction(action.id);
            result.syncedActions++;
          } else if (syncResult.conflict) {
            result.conflicts.push(syncResult.conflict);
          } else {
            // Increment retry count
            await this.updatePendingAction(action.id, {
              retryCount: action.retryCount + 1,
            });
            
            // Remove action if max retries reached
            if (action.retryCount >= 3) {
              await this.removePendingAction(action.id);
              result.failedActions.push(action);
            }
          }
        } catch (error) {
          console.error(`Error syncing action ${action.id}:`, error);
          result.failedActions.push(action);
        }
      }

      // Update last sync timestamp
      await AsyncStorage.setItem(this.SYNC_TIMESTAMP_KEY, Date.now().toString());

    } catch (error) {
      console.error('Error during sync:', error);
      result.success = false;
    } finally {
      this.syncInProgress = false;
      this.notifySyncListeners(result);
    }

    return result;
  }

  private async syncSingleAction(action: OfflineAction): Promise<{
    success: boolean;
    conflict?: ConflictResolution;
  }> {
    // This would integrate with the actual API service
    // For now, we'll simulate the sync process
    
    try {
      switch (action.type) {
        case 'CREATE':
          return await this.syncCreateAction(action);
        case 'UPDATE':
          return await this.syncUpdateAction(action);
        case 'DELETE':
          return await this.syncDeleteAction(action);
        default:
          return { success: false };
      }
    } catch (error) {
      console.error(`Error syncing ${action.type} action:`, error);
      return { success: false };
    }
  }

  private async syncCreateAction(action: OfflineAction): Promise<{
    success: boolean;
    conflict?: ConflictResolution;
  }> {
    // Implement create sync logic
    // This would call the appropriate API method based on action.entity
    return { success: true };
  }

  private async syncUpdateAction(action: OfflineAction): Promise<{
    success: boolean;
    conflict?: ConflictResolution;
  }> {
    // Implement update sync logic with conflict detection
    // This would compare local and server versions
    return { success: true };
  }

  private async syncDeleteAction(action: OfflineAction): Promise<{
    success: boolean;
    conflict?: ConflictResolution;
  }> {
    // Implement delete sync logic
    return { success: true };
  }

  // Conflict resolution
  async resolveConflict(
    conflict: ConflictResolution,
    resolution: 'local' | 'server' | 'merge',
    mergedData?: any
  ): Promise<void> {
    try {
      let resolvedData: any;

      switch (resolution) {
        case 'local':
          resolvedData = conflict.localData;
          break;
        case 'server':
          resolvedData = conflict.serverData;
          break;
        case 'merge':
          resolvedData = mergedData || this.mergeData(conflict.localData, conflict.serverData);
          break;
      }

      // Apply the resolved data
      // This would update both local storage and sync with server
      conflict.resolution = resolution;
      conflict.resolvedData = resolvedData;

    } catch (error) {
      console.error('Error resolving conflict:', error);
      throw error;
    }
  }

  private mergeData(localData: any, serverData: any): any {
    // Simple merge strategy - server data takes precedence for conflicts
    // More sophisticated merge logic could be implemented based on entity type
    return {
      ...localData,
      ...serverData,
      // Keep local timestamps if they're newer
      updatedAt: new Date(localData.updatedAt) > new Date(serverData.updatedAt) 
        ? localData.updatedAt 
        : serverData.updatedAt,
    };
  }

  // Auto-sync management
  async startAutoSync(): Promise<void> {
    try {
      // Initialize network state
      const currentState = await NetInfo.fetch();
      this.networkState = {
        isConnected: currentState.isConnected || false,
        isInternetReachable: currentState.isInternetReachable || false,
        type: currentState.type || 'unknown',
      };

      // If online, perform initial sync
      if (this.isOnline()) {
        await this.syncPendingActions();
      }

      console.log('Auto-sync started successfully');
    } catch (error) {
      console.error('Error starting auto-sync:', error);
      throw error;
    }
  }

  // Utility methods
  async getLastSyncTimestamp(): Promise<number> {
    try {
      const timestamp = await AsyncStorage.getItem(this.SYNC_TIMESTAMP_KEY);
      return timestamp ? parseInt(timestamp, 10) : 0;
    } catch (error) {
      console.error('Error getting last sync timestamp:', error);
      return 0;
    }
  }

  async hasPendingChanges(): Promise<boolean> {
    const pendingActions = await this.getPendingActions();
    return pendingActions.length > 0;
  }

  async getOfflineDataSize(): Promise<number> {
    try {
      const offlineData = await this.getOfflineData();
      const pendingActions = await this.getPendingActions();
      
      const dataSize = JSON.stringify(offlineData || {}).length;
      const actionsSize = JSON.stringify(pendingActions).length;
      
      return dataSize + actionsSize;
    } catch (error) {
      console.error('Error calculating offline data size:', error);
      return 0;
    }
  }

  // Cache management methods
  async getCachedCustomers(): Promise<Customer[] | null> {
    try {
      const offlineData = await this.getOfflineData();
      return offlineData?.customers || null;
    } catch (error) {
      console.error('Error getting cached customers:', error);
      return null;
    }
  }

  async getCachedCustomer(id: string): Promise<Customer | null> {
    try {
      const customers = await this.getCachedCustomers();
      return customers?.find(customer => customer.id === id) || null;
    } catch (error) {
      console.error('Error getting cached customer:', error);
      return null;
    }
  }

  async cacheCustomers(customers: Customer[]): Promise<void> {
    try {
      await this.saveOfflineData({ customers });
    } catch (error) {
      console.error('Error caching customers:', error);
    }
  }

  async cacheCustomer(customer: Customer): Promise<void> {
    try {
      const customers = await this.getCachedCustomers() || [];
      const existingIndex = customers.findIndex(c => c.id === customer.id);
      
      if (existingIndex >= 0) {
        customers[existingIndex] = customer;
      } else {
        customers.push(customer);
      }
      
      await this.cacheCustomers(customers);
    } catch (error) {
      console.error('Error caching customer:', error);
    }
  }

  async getCachedBills(): Promise<Bill[] | null> {
    try {
      const offlineData = await this.getOfflineData();
      return offlineData?.bills || null;
    } catch (error) {
      console.error('Error getting cached bills:', error);
      return null;
    }
  }

  async getCachedBill(id: string): Promise<Bill | null> {
    try {
      const bills = await this.getCachedBills();
      return bills?.find(bill => bill.id === id) || null;
    } catch (error) {
      console.error('Error getting cached bill:', error);
      return null;
    }
  }

  async cacheBills(bills: Bill[]): Promise<void> {
    try {
      await this.saveOfflineData({ bills });
    } catch (error) {
      console.error('Error caching bills:', error);
    }
  }

  async cacheBill(bill: Bill): Promise<void> {
    try {
      const bills = await this.getCachedBills() || [];
      const existingIndex = bills.findIndex(b => b.id === bill.id);
      
      if (existingIndex >= 0) {
        bills[existingIndex] = bill;
      } else {
        bills.push(bill);
      }
      
      await this.cacheBills(bills);
    } catch (error) {
      console.error('Error caching bill:', error);
    }
  }

  async getCachedBillingConfigItems(): Promise<BillingConfigItem[] | null> {
    try {
      const offlineData = await this.getOfflineData();
      return offlineData?.billingConfigItems || null;
    } catch (error) {
      console.error('Error getting cached billing config items:', error);
      return null;
    }
  }

  async cacheBillingConfigItems(items: BillingConfigItem[]): Promise<void> {
    try {
      await this.saveOfflineData({ billingConfigItems: items });
    } catch (error) {
      console.error('Error caching billing config items:', error);
    }
  }

  async getCachedReceivedItemTemplates(): Promise<ReceivedItemTemplate[] | null> {
    try {
      const offlineData = await this.getOfflineData();
      return offlineData?.receivedItemTemplates || null;
    } catch (error) {
      console.error('Error getting cached received item templates:', error);
      return null;
    }
  }

  async cacheReceivedItemTemplates(templates: ReceivedItemTemplate[]): Promise<void> {
    try {
      await this.saveOfflineData({ receivedItemTemplates: templates });
    } catch (error) {
      console.error('Error caching received item templates:', error);
    }
  }

  async getCachedMeasurementConfigs(): Promise<any[] | null> {
    try {
      // For now, return empty array as measurement configs aren't part of OfflineData interface
      // This can be extended later if needed
      return [];
    } catch (error) {
      console.error('Error getting cached measurement configs:', error);
      return null;
    }
  }

  async cacheMeasurementConfigs(configs: any[]): Promise<void> {
    try {
      // For now, do nothing as measurement configs aren't part of OfflineData interface
      // This can be extended later if needed
      console.log('Measurement configs caching not implemented yet');
    } catch (error) {
      console.error('Error caching measurement configs:', error);
    }
  }

  // Data integrity checks
  async validateOfflineData(): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    try {
      const offlineData = await this.getOfflineData();
      
      if (!offlineData) {
        return { isValid: true, errors: [] };
      }

      // Validate data structure
      if (!Array.isArray(offlineData.bills)) {
        errors.push('Bills data is corrupted');
      }

      if (!Array.isArray(offlineData.billingConfigItems)) {
        errors.push('Billing config items data is corrupted');
      }

      if (!Array.isArray(offlineData.receivedItemTemplates)) {
        errors.push('Received item templates data is corrupted');
      }

      if (!Array.isArray(offlineData.customers)) {
        errors.push('Customers data is corrupted');
      }

      // Validate pending actions
      const pendingActions = await this.getPendingActions();
      if (!Array.isArray(pendingActions)) {
        errors.push('Pending actions data is corrupted');
      }

    } catch (error) {
      errors.push(`Data validation error: ${error.message}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export default OfflineManager.getInstance();