import React, { useEffect, useState } from 'react';
import { X, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  details?: string;
  onRetry?: () => void;
  retryLabel?: string;
  showSupport?: boolean;
}

const ErrorModal: React.FC<ErrorModalProps> = ({
  isOpen,
  onClose,
  title = "Something went wrong",
  message,
  details,
  onRetry,
  retryLabel = "Try Again",
  showSupport = false
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      setIsVisible(false);
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className={`modal-backdrop ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleBackdropClick}
    >
      <div
        className={`
          modal-container
          transform transition-all duration-300 ease-out
          ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid var(--border-primary)' }}>
          <div className="flex items-center gap-3">
            <div className="error-icon-wrapper">
              <AlertCircle size={20} className="text-red-500" />
            </div>
            <h2 className="heading-card">{title}</h2>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-body">{message}</p>

          {details && (
            <div className="error-detail-box">
              <h4 className="text-sm font-semibold text-primary-600 mb-2">Technical Details</h4>
              <p className="text-xs text-primary-500 font-mono leading-relaxed break-words">{details}</p>
            </div>
          )}

          {showSupport && (
            <div className="error-support-box">
              <h4 className="text-sm font-semibold text-accent-600 mb-2">Need Help?</h4>
              <p className="text-sm text-accent-500 mb-3">
                If this problem persists, please contact support with the technical details above.
              </p>
              <button className="flex items-center gap-2 text-sm font-medium text-accent-600 hover:text-accent-500 transition-colors">
                <ExternalLink size={14} />
                Contact Support
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} className="btn-close-modal">Close</button>
          {onRetry && (
            <button
              onClick={() => { onRetry(); onClose(); }}
              className="btn-retry-modal"
            >
              <RefreshCw size={16} />
              {retryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;
