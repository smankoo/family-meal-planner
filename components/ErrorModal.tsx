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
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      setIsVisible(false);
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center p-4
        bg-black/20 backdrop-blur-sm
        transition-all duration-300 ease-out
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
      onClick={handleBackdropClick}
    >
      <div
        className={`
          bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40
          max-w-md w-full max-h-[80vh] overflow-hidden
          ring-1 ring-black/5
          transform transition-all duration-300 ease-out
          ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-100/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
              <AlertCircle size={20} className="text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-zinc-900">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-zinc-700 leading-relaxed">
            {message}
          </p>

          {details && (
            <div className="bg-zinc-50 rounded-2xl p-4">
              <h4 className="text-sm font-semibold text-zinc-600 mb-2">Technical Details</h4>
              <p className="text-xs text-zinc-500 font-mono leading-relaxed break-words">
                {details}
              </p>
            </div>
          )}

          {showSupport && (
            <div className="bg-blue-50 rounded-2xl p-4">
              <h4 className="text-sm font-semibold text-blue-700 mb-2">Need Help?</h4>
              <p className="text-sm text-blue-600 mb-3">
                If this problem persists, please contact support with the technical details above.
              </p>
              <button className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                <ExternalLink size={14} />
                Contact Support
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 pt-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-zinc-100 text-zinc-600 rounded-2xl font-semibold hover:bg-zinc-200 transition-colors"
          >
            Close
          </button>
          {onRetry && (
            <button
              onClick={() => {
                onRetry();
                onClose();
              }}
              className="flex-1 px-4 py-3 bg-zinc-900 text-white rounded-2xl font-semibold hover:bg-black transition-colors flex items-center justify-center gap-2"
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
