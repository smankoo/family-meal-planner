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
    <div className={`invalidation-banner md:p-5 md:mb-6 ${className}`}>
      <div className="flex flex-col md:flex-row items-start gap-3 md:gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 hidden md:block">
          <div className="invalidation-banner-icon">
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
            className="btn-invalidation-update"
          >
            {isLoading ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                <span>Update {typeTitle}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvalidationBanner;
