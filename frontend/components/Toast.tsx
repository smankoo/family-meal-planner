import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { Toast as ToastType, useToast } from '../contexts/ToastContext';

interface ToastProps {
  toast: ToastType;
}

const Toast: React.FC<ToastProps> = ({ toast }) => {
  const { removeToast } = useToast();
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => removeToast(toast.id), 300); // Match animation duration
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="toast-icon text-emerald-600 dark:text-emerald-500" strokeWidth={2.5} />;
      case 'error':
        return <AlertCircle className="toast-icon text-red-600 dark:text-red-500" strokeWidth={2.5} />;
      case 'warning':
        return <AlertTriangle className="toast-icon text-amber-600 dark:text-amber-500" strokeWidth={2.5} />;
      case 'info':
      default:
        return <Info className="toast-icon text-blue-600 dark:text-blue-500" strokeWidth={2.5} />;
    }
  };

  const getToastTypeClass = () => {
    switch (toast.type) {
      case 'success':
        return 'toast-item-success';
      case 'error':
        return 'toast-item-error';
      case 'warning':
        return 'toast-item-warning';
      case 'info':
      default:
        return 'toast-item-info';
    }
  };

  return (
    <div
      className={`
        toast-item ${getToastTypeClass()}
        ${isVisible && !isExiting ? 'toast-enter' : ''}
        ${isExiting ? 'toast-exit' : ''}
      `}
      role="alert"
      aria-live="polite"
    >
      {/* Icon */}
      {getIcon()}

      {/* Content */}
      <div className="toast-content">
        <p className="toast-message">
          {toast.message}
        </p>
      </div>

      {/* Close Button */}
      <button
        onClick={handleClose}
        className="toast-close-btn"
        aria-label="Close notification"
      >
        <X className="toast-close-icon" strokeWidth={2.5} />
      </button>
    </div>
  );
};

const ToastContainer: React.FC = () => {
  const { toasts } = useToast();

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
};

export default ToastContainer;
