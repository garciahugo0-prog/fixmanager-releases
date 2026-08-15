/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Network } from '@capacitor/network';
import { isCapacitor } from './nativeBridge';

let currentOnlineStatus = typeof navigator !== 'undefined' ? navigator.onLine : true;

// Initialize Capacitor Network listener if in Capacitor
if (isCapacitor()) {
  // Get initial status
  Network.getStatus().then(status => {
    currentOnlineStatus = status.connected;
    window.dispatchEvent(new CustomEvent('network_status_change', { detail: { online: status.connected } }));
  });

  // Listen for changes
  Network.addListener('networkStatusChange', status => {
    currentOnlineStatus = status.connected;
    // Dispatch a custom event so other parts of the app can listen if they want
    window.dispatchEvent(new CustomEvent('network_status_change', { detail: { online: status.connected } }));
  });
} else {
  // Standard web listeners
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      currentOnlineStatus = true;
      window.dispatchEvent(new CustomEvent('network_status_change', { detail: { online: true } }));
    });
    window.addEventListener('offline', () => {
      currentOnlineStatus = false;
      window.dispatchEvent(new CustomEvent('network_status_change', { detail: { online: false } }));
    });
  }
}

export const getNetworkStatus = async (): Promise<boolean> => {
  if (isCapacitor()) {
    try {
      const status = await Network.getStatus();
      return status.connected;
    } catch (e) {
      return typeof navigator !== 'undefined' ? navigator.onLine : true;
    }
  }
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
};

export const getNetworkStatusSync = (): boolean => {
  return currentOnlineStatus;
};

export const subscribeToNetworkStatus = (callback: (online: boolean) => void): (() => void) => {
  // Call immediately with current status
  callback(currentOnlineStatus);

  const handler = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail && typeof detail.online === 'boolean') {
      callback(detail.online);
    }
  };

  window.addEventListener('network_status_change', handler);
  return () => {
    window.removeEventListener('network_status_change', handler);
  };
};
