import React from 'react';
import { usePWA } from '../hooks/usePWA';
import './OfflineIndicator.css';

const OfflineIndicator: React.FC = () => {
  const { isOnline } = usePWA();

  // Only show offline status, PWA install button disabled
  if (isOnline) return null;

  return (
    <div className="offline-indicator">
      {!isOnline && (
        <div className="offline-status">
          <span className="offline-dot">🔴</span>
          <span className="offline-text">Offline</span>
        </div>
      )}
      
      {/* PWA install button disabled */}
    </div>
  );
};

export default OfflineIndicator;