import { setNetworkStatus } from './apiConfig';

// Try to import NetInfo, but handle the case where it's not available
let NetInfo: any = null;
try {
  NetInfo = require('@react-native-community/netinfo').default;
} catch (error) {
  console.warn('NetInfo not available, using fallback network detection:', error);
}

export interface NetworkState {
  isConnected: boolean;
  type: string;
  isInternetReachable: boolean | null;
}

class NetworkService {
  private listeners: ((state: NetworkState) => void)[] = [];
  private currentState: NetworkState = {
    isConnected: true, // Default to online for fallback
    type: 'unknown',
    isInternetReachable: true,
  };
  private netInfoAvailable: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (NetInfo) {
      this.netInfoAvailable = true;
      try {
        // Subscribe to network state changes
        NetInfo.addEventListener((state: any) => {
          const networkState: NetworkState = {
            isConnected: state.isConnected ?? false,
            type: state.type,
            isInternetReachable: state.isInternetReachable,
          };

          this.currentState = networkState;
          
          // Update API config network status
          setNetworkStatus(networkState.isConnected && networkState.isInternetReachable !== false);

          // Notify listeners
          this.listeners.forEach(listener => listener(networkState));

          console.log('Network state changed:', networkState);
        });
      } catch (error) {
        console.warn('Failed to initialize NetInfo listener:', error);
        this.netInfoAvailable = false;
        this.initializeFallback();
      }
    } else {
      this.initializeFallback();
    }
  }

  private initializeFallback() {
    console.log('Using fallback network detection');
    // Set initial state to online for fallback
    this.currentState = {
      isConnected: true,
      type: 'unknown',
      isInternetReachable: true,
    };
    setNetworkStatus(true);
  }

  getCurrentState(): NetworkState {
    return this.currentState;
  }

  async checkConnection(): Promise<NetworkState> {
    if (NetInfo && this.netInfoAvailable) {
      try {
        const state = await NetInfo.fetch();
        const networkState: NetworkState = {
          isConnected: state.isConnected ?? false,
          type: state.type,
          isInternetReachable: state.isInternetReachable,
        };

        this.currentState = networkState;
        setNetworkStatus(networkState.isConnected && networkState.isInternetReachable !== false);

        return networkState;
      } catch (error) {
        console.warn('Failed to fetch network state, using fallback:', error);
        return this.getFallbackState();
      }
    } else {
      return this.getFallbackState();
    }
  }

  private getFallbackState(): NetworkState {
    // For fallback, we'll assume online and let API calls determine connectivity
    const fallbackState: NetworkState = {
      isConnected: true,
      type: 'unknown',
      isInternetReachable: true,
    };
    this.currentState = fallbackState;
    setNetworkStatus(true);
    return fallbackState;
  }

  isOnline(): boolean {
    return this.currentState.isConnected && this.currentState.isInternetReachable !== false;
  }

  addListener(listener: (state: NetworkState) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  removeAllListeners(): void {
    this.listeners = [];
  }
}

// Export singleton instance
export const networkService = new NetworkService();

// Export convenience methods
export const {
  getCurrentState,
  checkConnection,
  isOnline,
  addListener,
  removeAllListeners,
} = networkService;