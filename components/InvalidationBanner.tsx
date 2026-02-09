import React from 'react';
import { RefreshCw } from 'lucide-react';

interface InvalidationBannerProps {
  type: 'prep' | 'grocery';
  onRegenerate: () => void;
  onViewAnyway?: () => void;
  isLoading?: boolean;
  className?: string;
}

const InvalidationBanner: React.FC<InvalidationBannerProps> = ({
  type,
  onRegenerate,
  isLoading = false,
  className = ''
}) => {
  const typeLabel = type === 'prep' ? 'prep plan' : 'shopping list';
  const typeTitle = type === 'prep' ? 'Prep Plan' : 'Shopping List';

  return (
    <div className={`
      relative overflow-hidden
      backdrop-blur-md
      rounded-2xl p-4 md:p-5 mb-4 md:mb-6
      shadow-card
      transition-all duration-300
      ${className}
    `}
    style={{
      backgroundColor: 'var(--surface-glass)',
      border: '1px solid var(--border-subtle)',
    }}
    >
      <div className="flex flex-col md:flex-row items-start gap-3 md:gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 hidden md:block">
          <div className="w-9 h-9 rounded-full backdrop-blur-sm flex items-center justify-center" style={{ backgroundColor: 'var(--surface-glass)', border: '1px solid var(--border-subtle)' }}>
            <RefreshCw size={16} className="text-primary-500" strokeWidth={2.5} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 w-full">
          <h3 className="text-sm md:text-base font-semibold text-primary-900 mb-1 md:mb-1.5">
            {typeTitle} Needs Update
          </h3>
          <p className="text-xs md:text-sm text-primary-600 leading-relaxed mb-3 md:mb-4">
            Your meal plan has changed since this {typeLabel} was created. We recommend regenerating it to ensure everything stays in sync.
          </p>

          {/* Action button */}
          <button
            onClick={onRegenerate}
            disabled={isLoading}
            className="btn-glass-primary w-full md:w-auto"
          >
            {isLoading ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span className="text-xs md:text-sm">Updating...</span>
              </>
            ) : (
              <>
                <RefreshCw size={14} />
                <span className="text-xs md:text-sm">Update {typeTitle}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvalidationBanner;
