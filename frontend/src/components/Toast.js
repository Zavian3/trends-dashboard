import React, { useEffect } from 'react';
import './Toast.css';

const ToastItem = ({ id, message, type, removeToast }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(id);
    }, 10000); // Auto-hide after 10 seconds

    return () => clearTimeout(timer);
  }, [id, removeToast]);

  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-content">
        <span className="toast-icon">
          {type === 'success' && '✓'}
          {type === 'error' && '✕'}
          {type === 'info' && 'ℹ'}
        </span>
        <span className="toast-message">{message}</span>
      </div>
      <button className="toast-close" onClick={() => removeToast(id)}>
        ×
      </button>
    </div>
  );
};

const Toast = ({ toasts, removeToast }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          removeToast={removeToast}
        />
      ))}
    </div>
  );
};

export default Toast;
