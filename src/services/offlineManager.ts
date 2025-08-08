import AsyncStorage from '@react-native-async-storage/async-storage';
import { networkService } from './networkService';
import { apiService } from './api';
import { Customer, MeasurementConfig } from '../types';

// Offline action types
export interface OfflineAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'customer' | 'measurementConfig' | 'customerMeasurement';
  data: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
  originalId?: string; // For updates and deletes
}

// Cache entry with metadata
export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  expiresAt?: Date;
  lastSyncAttempt?: Date;
  syncStatus: 'synced' | 'pending' | 'failed';
}

// Sync result
export interface SyncResult {
  success: boolean;
  syncedActions: number;
  failedActions: number;
  errors: Array<{ action: OfflineAction; error: string }>;
}

class OfflineManager {
  private static readonly OFFLINE_QUEUE_KEY = 'offline_queue';
  private static readonly CACHE_PREFIX = 'offline_cache_';
  private static readonly SYNC_STATUS_KEY = 'sync_status';
  
  private syncInProgress = false;
  private syncListeners: Array<(result: SyncResult) => void> = [];

  // ============================================================================
  // OFFLINE QUEUE MANAGEMENT
  // ============================================================================

  async addToOfflineQueue(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    try {
      const queue = await this.getOfflineQueue();
      const newAction: OfflineAction = {
        ...action,
        id: this.generateActionId(),
        timestamp: new Date(),
        retryCount: 0,
      };

      queue.push(newAction);
      await AsyncStorage.setItem(OfflineManager.OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      
      console.log('Added action to offline queue:', newAction);
    } catch (error) {
      console.error('Failed to add action to offline queue:', error);
    }
  }

  async getOfflineQueue(): Promise<OfflineAction[]> {
    try {
      const queueData = await AsyncStorage.getItem(OfflineManager.OFFLINE_QUEUE_KEY);
      if (!queueData) return [];
      
      const queue = JSON.parse(queueData);
      return queue.map((action: any) => ({
        ...action,
        timestamp: new Date(action.timestamp),
      }));
    } catch (error) {
      console.error('Failed to get offline queue:', error);
      return [];
    }
  }

  async removeFromOfflineQueue(actionId: string): Promise<void> {
    try {
      const queue = await this.getOfflineQueue();
      const filteredQueue = queue.filter(action => action.id !== actionId);
      await AsyncStorage.setItem(OfflineManager.OFFLINE_QUEUE_KEY, JSON.stringify(filteredQueue));
    } catch (error) {
      console.error('Failed to remove action from offline queue:', error);
    }
  }

  async clearOfflineQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(OfflineManager.OFFLINE_QUEUE_KEY);
    } catch (error) {
      console.error('Failed to clear offline queue:', error);
    }
  }

  async getQueueSize(): Promise<number> {
    const queue = await this.getOfflineQueue();
    return queue.length;
  }

  // ============================================================================
  // ENHANCED CACHE MANAGEMENT
  // ============================================================================

  async setCachedData<T>(key: string, data: T, ttl?: number): Promise<void> {
    try {
      const cacheEntry: CacheEntry<T> = {
        data,
        timestamp: new Date(),
        expiresAt: ttl ? new Date(Date.now() + ttl) : undefined,
        syncStatus: networkService.isOnline() ? 'synced' : 'pending',
      };

      await AsyncStorage.setItem(
        `${OfflineManager.CACHE_PREFIX}${key}`,
        JSON.stringify(cacheEntry)
      );
    } catch (error) {
      console.error('Failed to cache data:', error);
    }
  }

  async getCachedData<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
      const cached = await AsyncStorage.getItem(`${OfflineManager.CACHE_PREFIX}${key}`);
      if (!cached) return null;

      const cacheEntry = JSON.parse(cached);
      const entry: CacheEntry<T> = {
        ...cacheEntry,
        timestamp: new Date(cacheEntry.timestamp),
        expiresAt: cacheEntry.expiresAt ? new Date(cacheEntry.expiresAt) : undefined,
        lastSyncAttempt: cacheEntry.lastSyncAttempt ? new Date(cacheEntry.lastSyncAttempt) : undefined,
      };

      // Check if cache has expired
      if (entry.expiresAt && new Date() > entry.expiresAt) {
        await this.removeCachedData(key);
        return null;
      }

      return entry;
    } catch (error) {
      console.error('Failed to get cached data:', error);
      return null;
    }
  }

  async removeCachedData(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${OfflineManager.CACHE_PREFIX}${key}`);
    } catch (error) {
      console.error('Failed to remove cached data:', error);
    }
  }

  async clearAllCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(OfflineManager.CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  // ============================================================================
  // DATA SYNCHRONIZATION
  // ============================================================================

  async syncOfflineData(): Promise<SyncResult> {
    if (this.syncInProgress) {
      console.log('Sync already in progress, skipping...');
      return { success: false, syncedActions: 0, failedActions: 0, errors: [] };
    }

    if (!networkService.isOnline()) {
      console.log('Device is offline, skipping sync');
      return { success: false, syncedActions: 0, failedActions: 0, errors: [] };
    }

    this.syncInProgress = true;
    const result: SyncResult = {
      success: true,
      syncedActions: 0,
      failedActions: 0,
      errors: [],
    };

    try {
      const queue = await this.getOfflineQueue();
      console.log(`Starting sync of ${queue.length} offline actions`);

      for (const action of queue) {
        try {
          await this.syncAction(action);
          await this.removeFromOfflineQueue(action.id);
          result.syncedActions++;
          console.log(`Successfully synced action: ${action.type} ${action.entity}`);
        } catch (error) {
          console.error(`Failed to sync action ${action.id}:`, error);
          
          // Increment retry count
          action.retryCount++;
          
          if (action.retryCount >= action.maxRetries) {
            // Remove action if max retries exceeded
            await this.removeFromOfflineQueue(action.id);
            console.log(`Removed action ${action.id} after ${action.maxRetries} failed attempts`);
          } else {
            // Update action with new retry count
            const queue = await this.getOfflineQueue();
            const updatedQueue = queue.map(a => a.id === action.id ? action : a);
            await AsyncStorage.setItem(OfflineManager.OFFLINE_QUEUE_KEY, JSON.stringify(updatedQueue));
          }

          result.failedActions++;
          result.errors.push({
            action,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Update sync status
      await this.updateSyncStatus({
        lastSyncAttempt: new Date(),
        lastSuccessfulSync: result.syncedActions > 0 ? new Date() : undefined,
        pendingActions: await this.getQueueSize(),
      });

      result.success = result.failedActions === 0;
      console.log(`Sync completed: ${result.syncedActions} synced, ${result.failedActions} failed`);

    } catch (error) {
      console.error('Sync process failed:', error);
      result.success = false;
    } finally {
      this.syncInProgress = false;
    }

    // Notify listeners
    this.syncListeners.forEach(listener => listener(result));
    
    return result;
  }

  private async syncAction(action: OfflineAction): Promise<void> {
    switch (action.entity) {
      case 'customer':
        await this.syncCustomerAction(action);
        break;
      case 'measurementConfig':
        await this.syncMeasurementConfigAction(action);
        break;
      case 'customerMeasurement':
        await this.syncCustomerMeasurementAction(action);
        break;
      default:
        throw new Error(`Unknown entity type: ${action.entity}`);
    }
  }

  private async syncCustomerAction(action: OfflineAction): Promise<void> {
    switch (action.type) {
      case 'CREATE':
        await apiService.createCustomer(action.data);
        break;
      case 'UPDATE':
        if (!action.originalId) throw new Error('Original ID required for update');
        await apiService.updateCustomer(action.originalId, action.data);
        break;
      case 'DELETE':
        if (!action.originalId) throw new Error('Original ID required for delete');
        await apiService.deleteCustomer(action.originalId);
        break;
    }
  }

  private async syncMeasurementConfigAction(action: OfflineAction): Promise<void> {
    switch (action.type) {
      case 'CREATE':
        await apiService.createMeasurementConfig(action.data);
        break;
      case 'UPDATE':
        if (!action.originalId) throw new Error('Original ID required for update');
        await apiService.updateMeasurementConfig(action.originalId, action.data);
        break;
      case 'DELETE':
        if (!action.originalId) throw new Error('Original ID required for delete');
        await apiService.deleteMeasurementConfig(action.originalId);
        break;
    }
  }

  private async syncCustomerMeasurementAction(action: OfflineAction): Promise<void> {
    const { customerId, measurementId, ...measurementData } = action.data;
    
    switch (action.type) {
      case 'CREATE':
        await apiService.saveCustomerMeasurement(customerId, measurementData);
        break;
      case 'DELETE':
        if (!measurementId) throw new Error('Measurement ID required for delete');
        await apiService.deleteCustomerMeasurement(customerId, measurementId);
        break;
    }
  }

  // ============================================================================
  // SYNC STATUS MANAGEMENT
  // ============================================================================

  async updateSyncStatus(status: {
    lastSyncAttempt?: Date;
    lastSuccessfulSync?: Date;
    pendingActions?: number;
  }): Promise<void> {
    try {
      const currentStatus = await this.getSyncStatus();
      const updatedStatus = {
        ...currentStatus,
        ...status,
      };
      
      await AsyncStorage.setItem(OfflineManager.SYNC_STATUS_KEY, JSON.stringify(updatedStatus));
    } catch (error) {
      console.error('Failed to update sync status:', error);
    }
  }

  async getSyncStatus(): Promise<{
    lastSyncAttempt?: Date;
    lastSuccessfulSync?: Date;
    pendingActions: number;
  }> {
    try {
      const statusData = await AsyncStorage.getItem(OfflineManager.SYNC_STATUS_KEY);
      if (!statusData) {
        return { pendingActions: 0 };
      }

      const status = JSON.parse(statusData);
      return {
        lastSyncAttempt: status.lastSyncAttempt ? new Date(status.lastSyncAttempt) : undefined,
        lastSuccessfulSync: status.lastSuccessfulSync ? new Date(status.lastSuccessfulSync) : undefined,
        pendingActions: status.pendingActions || 0,
      };
    } catch (error) {
      console.error('Failed to get sync status:', error);
      return { pendingActions: 0 };
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  addSyncListener(listener: (result: SyncResult) => void): () => void {
    this.syncListeners.push(listener);
    
    return () => {
      const index = this.syncListeners.indexOf(listener);
      if (index > -1) {
        this.syncListeners.splice(index, 1);
      }
    };
  }

  // Auto-sync when network becomes available
  async startAutoSync(): Promise<void> {
    networkService.addListener(async (networkState) => {
      if (networkService.isOnline() && !this.syncInProgress) {
        const queueSize = await this.getQueueSize();
        if (queueSize > 0) {
          console.log(`Network restored, starting auto-sync of ${queueSize} actions`);
          await this.syncOfflineData();
        }
      }
    });
  }

  // ============================================================================
  // CONVENIENCE METHODS FOR COMMON OPERATIONS
  // ============================================================================

  async cacheCustomers(customers: Customer[]): Promise<void> {
    await this.setCachedData('customers', customers, 300000); // 5 minutes TTL
  }

  async getCachedCustomers(): Promise<Customer[] | null> {
    const cached = await this.getCachedData<Customer[]>('customers');
    return cached?.data || null;
  }

  async cacheMeasurementConfigs(configs: MeasurementConfig[]): Promise<void> {
    await this.setCachedData('measurement_configs', configs, 600000); // 10 minutes TTL
  }

  async getCachedMeasurementConfigs(): Promise<MeasurementConfig[] | null> {
    const cached = await this.getCachedData<MeasurementConfig[]>('measurement_configs');
    return cached?.data || null;
  }

  async cacheCustomer(customer: Customer): Promise<void> {
    await this.setCachedData(`customer_${customer.id}`, customer, 300000); // 5 minutes TTL
  }

  async getCachedCustomer(customerId: string): Promise<Customer | null> {
    const cached = await this.getCachedData<Customer>(`customer_${customerId}`);
    return cached?.data || null;
  }
}

// Export singleton instance
export const offlineManager = new OfflineManager();

// Export convenience methods
export const {
  addToOfflineQueue,
  getOfflineQueue,
  syncOfflineData,
  setCachedData,
  getCachedData,
  cacheCustomers,
  getCachedCustomers,
  cacheMeasurementConfigs,
  getCachedMeasurementConfigs,
  cacheCustomer,
  getCachedCustomer,
  getSyncStatus,
  addSyncListener,
  startAutoSync,
  getQueueSize,
} = offlineManager;