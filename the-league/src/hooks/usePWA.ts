import { useState, useEffect } from 'react';

interface PWAState {
  isOnline: boolean;
  isInstallable: boolean;
  isInstalled: boolean;
  installPrompt: any;
}

export const usePWA = () => {
  const [pwaState, setPwaState] = useState<PWAState>({
    isOnline: navigator.onLine,
    isInstallable: false,
    isInstalled: false,
    installPrompt: null,
  });

  useEffect(() => {
    // Check if app is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    const isInstalled = isStandalone || isIOSStandalone;

    setPwaState(prev => ({ ...prev, isInstalled }));

    // Handle online/offline status
    const handleOnline = () => setPwaState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setPwaState(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Handle install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setPwaState(prev => ({ 
        ...prev, 
        isInstallable: true, 
        installPrompt: e 
      }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Handle app installed
    const handleAppInstalled = () => {
      setPwaState(prev => ({ 
        ...prev, 
        isInstalled: true, 
        isInstallable: false,
        installPrompt: null 
      }));
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!pwaState.installPrompt) return false;

    try {
      const result = await pwaState.installPrompt.prompt();
      console.log('Install prompt result:', result);
      
      if (result.outcome === 'accepted') {
        setPwaState(prev => ({ 
          ...prev, 
          isInstallable: false, 
          installPrompt: null 
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error installing app:', error);
      return false;
    }
  };

  const shareApp = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Fantasy Sports League',
          text: 'Check out this awesome fantasy sports app!',
          url: window.location.origin,
        });
        return true;
      } catch (error) {
        console.error('Error sharing app:', error);
        return false;
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(window.location.origin);
        alert('App URL copied to clipboard!');
        return true;
      } catch (error) {
        console.error('Error copying to clipboard:', error);
        return false;
      }
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  };

  const sendNotification = (title: string, options?: NotificationOptions) => {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/logo192.png',
        badge: '/logo192.png',
        ...options,
      });
    }
  };

  const saveOfflineData = (key: string, data: any) => {
    try {
      localStorage.setItem(`offline_${key}`, JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('Error saving offline data:', error);
    }
  };

  const getOfflineData = (key: string) => {
    try {
      const stored = localStorage.getItem(`offline_${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Return data if it's less than 24 hours old
        if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          return parsed.data;
        } else {
          localStorage.removeItem(`offline_${key}`);
        }
      }
    } catch (error) {
      console.error('Error getting offline data:', error);
    }
    return null;
  };

  const clearOfflineData = (key?: string) => {
    try {
      if (key) {
        localStorage.removeItem(`offline_${key}`);
      } else {
        // Clear all offline data
        const keys = Object.keys(localStorage).filter(k => k.startsWith('offline_'));
        keys.forEach(k => localStorage.removeItem(k));
      }
    } catch (error) {
      console.error('Error clearing offline data:', error);
    }
  };

  const registerBackgroundSync = (tag: string) => {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      return navigator.serviceWorker.ready.then(registration => {
        return (registration as any).sync.register(tag);
      });
    }
    return Promise.reject('Background sync not supported');
  };

  return {
    ...pwaState,
    installApp,
    shareApp,
    requestNotificationPermission,
    sendNotification,
    saveOfflineData,
    getOfflineData,
    clearOfflineData,
    registerBackgroundSync,
  };
};

export default usePWA;