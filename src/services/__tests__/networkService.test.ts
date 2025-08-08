import { networkService } from '../networkService';

// Mock the NetInfo module to simulate the error
jest.mock('@react-native-community/netinfo', () => {
  throw new Error('RNCNetInfo is null');
});

// Mock the apiConfig
jest.mock('../apiConfig', () => ({
  setNetworkStatus: jest.fn(),
}));

describe('NetworkService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Fallback behavior when NetInfo is not available', () => {
    it('should initialize with fallback state when NetInfo throws error', () => {
      const currentState = networkService.getCurrentState();
      
      expect(currentState.isConnected).toBe(true);
      expect(currentState.type).toBe('unknown');
      expect(currentState.isInternetReachable).toBe(true);
    });

    it('should return online status with fallback', () => {
      const isOnline = networkService.isOnline();
      
      expect(isOnline).toBe(true);
    });

    it('should handle checkConnection with fallback', async () => {
      const networkState = await networkService.checkConnection();
      
      expect(networkState.isConnected).toBe(true);
      expect(networkState.type).toBe('unknown');
      expect(networkState.isInternetReachable).toBe(true);
    });

    it('should allow adding and removing listeners', () => {
      const mockListener = jest.fn();
      
      const unsubscribe = networkService.addListener(mockListener);
      expect(typeof unsubscribe).toBe('function');
      
      // Should not throw when unsubscribing
      expect(() => unsubscribe()).not.toThrow();
    });

    it('should remove all listeners without error', () => {
      const mockListener1 = jest.fn();
      const mockListener2 = jest.fn();
      
      networkService.addListener(mockListener1);
      networkService.addListener(mockListener2);
      
      expect(() => networkService.removeAllListeners()).not.toThrow();
    });
  });
});