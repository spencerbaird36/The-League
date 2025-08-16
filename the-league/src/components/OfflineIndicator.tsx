import React from 'react';
import { usePWA } from '../hooks/usePWA';
import './OfflineIndicator.css';

const OfflineIndicator: React.FC = () => {
  const { isOnline, isInstallable, installApp } = usePWA();

  if (isOnline && !isInstallable) return null;

  return (
    <div className="offline-indicator">
      {!isOnline && (
        <div className="offline-status">
          <span className="offline-dot">🔴</span>
          <span className="offline-text">Offline</span>
        </div>
      )}
      
      {isInstallable && (
        <button 
          className="install-button"
          onClick={installApp}
          title="Install app for better experience"
        >
          <span className="install-icon">📱</span>
          <span className="install-text">Install</span>
        </button>
      )}
    </div>
  );
};

export default OfflineIndicator;