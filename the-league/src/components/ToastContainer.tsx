import React from 'react';
import Toast, { ToastData } from './Toast';
import './ToastContainer.css';

interface ToastContainerProps {
  toasts: ToastData[];
  onRemoveToast: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemoveToast }) => {
  console.log('🍞 ToastContainer render - toasts:', toasts);
  console.log('🍞 ToastContainer render - toasts length:', toasts.length);
  console.log('🍞 ToastContainer mounted and rendering');
  
  if (toasts.length === 0) {
    console.log('🍞 No toasts to display - rendering empty container for debugging');
    return (
      <div className="toast-container">
        <div style={{ padding: '10px', background: 'yellow', color: 'black' }}>
          DEBUG: ToastContainer mounted (no toasts)
        </div>
      </div>
    );
  }

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          onRemove={onRemoveToast}
        />
      ))}
    </div>
  );
};

export default ToastContainer;