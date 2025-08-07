import { useEffect, useRef, useState } from 'react';

const isSafari = () => {
  const ua = navigator.userAgent;
  return /^((?!chrome|android).)*safari/i.test(ua);
};

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckRef = useRef<number>(Date.now());

  // More robust network check for Safari
  const checkNetworkConnectivity = async (): Promise<boolean> => {
    try {
      // try to fetch from a reliable external source
      await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        mode: 'no-cors',
      });
      return true;
    } catch {
      return false;
    }
  };

  const updateNetworkStatus = async () => {
    const navigatorOnline = navigator.onLine;

    // If navigator says we're offline, trust it
    if (!navigatorOnline) {
      setIsOnline(false);
      return;
    }

    // If navigator says we're online, verify with actual network check (especially for Safari)
    if (isSafari()) {
      try {
        const actuallyOnline = await checkNetworkConnectivity();
        setIsOnline(actuallyOnline);
      } catch {
        setIsOnline(false);
      }
    } else {
      setIsOnline(navigatorOnline);
    }

    lastCheckRef.current = Date.now();
  };

  useEffect(() => {
    const handleOnline = () => {
      updateNetworkStatus();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    // Standard event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    const setupSafariNetworkMonitoring = () => {
      if (!isSafari()) return;

      const performPeriodicCheck = () => {
        const now = Date.now();
        if (now - lastCheckRef.current > 5000) {
          updateNetworkStatus();
        }
      };

      checkIntervalRef.current = setInterval(performPeriodicCheck, 5000);
    };

    // Page visibility change handling
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // When tab becomes visible, check network status
        updateNetworkStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial check
    updateNetworkStatus();
    // Setup Safari monitoring
    setupSafariNetworkMonitoring();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);

  return { isOnline };
};
