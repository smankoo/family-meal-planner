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
        return <CheckCircle size={18} className="text-primary-900" strokeWidth={2.5} />;
      case 'error':
        return <AlertCircle size={18} className="text-red-600" strokeWidth={2.5} />;
      case 'warning':
        return <AlertTriangle size={18} className="text-amber-600" strokeWidth={2.5} />;
      case 'info':
      default:
        return <Info size={18} className="text-blue-600" strokeWidth={2.5} />;
    }
  };

  return (
    <div
      className={`
        transform transition-all duration-300 ease-out
        ${isVisible && !isExiting
          ? 'translate-y-0 opacity-100 scale-100'
          : '-translate-y-2 opacity-0 scale-95'
        }
      `}
    >
      <div
        className="
          backdrop-blur-xl rounded-card shadow-card-hover
          ring-1 ring-black/5
          px-4 py-3 flex items-center gap-3
          min-w-[320px] max-w-md
        "
        style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)' }}
      >
        {/* Icon */}
        <div className="flex-shrink-0">
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-primary-900 leading-snug">
            {toast.message}
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="flex-shrink-0 w-6 h-6 rounded-full hover:bg-primary-100 transition-colors flex items-center justify-center"
          aria-label="Close notification"
        >
          <X size={14} className="text-primary-400" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};

const ToastContainer: React.FC = () => {
  const { toasts } = useToast();

  return (
    <div className="fixed top-20 md:top-24 right-4 z-50 pointer-events-none">
      <div className="flex flex-col gap-2 pointer-events-auto">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} />
        ))}
      </div>
    </div>
  );
};

export default ToastContainer;
