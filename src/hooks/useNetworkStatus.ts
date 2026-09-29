import { useNetworkState } from 'expo-network';

export function useNetworkStatus() {
  const networkState = useNetworkState();

  return {
    isOffline: networkState.isConnected === false || networkState.isInternetReachable === false,
  };
}
