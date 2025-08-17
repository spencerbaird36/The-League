import React, { useState, useEffect } from 'react';
import './Toast.css';

export interface ToastData {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  duration?: number;
}

interface ToastProps {
  toast: ToastData;
  onRemove: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    // Slide in animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Auto-remove after duration
    const duration = toast.duration || 4000;
    const timer = setTimeout(() => {
      handleRemove();
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.duration]);

  const handleRemove = () => {
    setIsRemoving(true);
    setTimeout(() => {
      onRemove(toast.id);
    }, 300); // Wait for slide-out animation
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return '✅';
      case 'info':
        return 'ℹ️';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div 
      className={`toast toast--${toast.type} ${isVisible ? 'toast--visible' : ''} ${isRemoving ? 'toast--removing' : ''}`}
      onClick={handleRemove}
    >
      <div className="toast__icon">
        {getIcon()}
      </div>
      <div className="toast__content">
        <div className="toast__message">
          {toast.message}
        </div>
      </div>
      <button 
        className="toast__close" 
        onClick={(e) => {
          e.stopPropagation();
          handleRemove();
        }}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
};

export default Toast;